---
title: BuildContext 지하 탐사 — Element, 트리, 그리고 단일 스레드
date: 2026-07-30
description: BuildContext는 Flutter에서 가장 자주 쓰면서 가장 덜 이해되는 것입니다. 이번엔 말이 아니라 "통과하는 테스트"로 지하까지 파봤습니다 — BuildContext가 사실 Element라는 것, Element는 오래 살고 Widget은 매번 갈아끼워진다는 것, InheritedWidget이 어떻게 자손을 구독시켜 상태를 전파하는지, 그리고 이 모든 게 단일 UI 아이솔레이트의 한 스레드에서만 돈다는 것까지. 전부 Flutter 3.44.8에서 실측하고, 그 버전의 framework.dart 소스 라인으로 교차검증했습니다.
tags: [Flutter, BuildContext, Element, InheritedWidget, 아이솔레이트, 내부구조]
category: [dev, flutter]
draft: false
---

`Theme.of(context)`, `Navigator.of(context)`, `context.read()`… 하루에도 수십 번 쓰는 `BuildContext`. 그런데 "이게 정확히 뭐냐"고 물으면 대답이 궁색해집니다. 문서엔 "위젯 트리에서의 위치를 다루는 핸들"이라고만 적혀 있죠. 이번 편에서는 그 핸들의 정체를 **지하까지** 파봅니다 — 스레드 영역까지 내려가서요.

말로만 하면 미덥지 않으니, 이번엔 **통과하는 테스트로 못박습니다.** 별도 학습 리포([github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study))의 `test/buildcontext_deep_test.dart` 에 아홉 가지 명제를 담아 전부 초록으로 확인했습니다.

> ⚙️ 이 글은 **Flutter 3.44.8**(stable, revision `058e0af2c2`)에서 실측하고, 그 버전의 `package:flutter/src/widgets/framework.dart` 소스 라인으로 교차검증했습니다. Element 의 내부 필드는 private 이라 **버전에 따라 바뀔 수 있습니다** — 인용한 라인 번호는 이 버전 기준입니다.

## 1. BuildContext 는 사실 Element 다

가장 먼저 깰 오해. `BuildContext` 는 별도의 객체가 **아닙니다.** 프레임워크 소스를 열어 보면 한 줄로 끝납니다.

```dart
// framework.dart:3557
abstract class Element extends DiagnosticableTree implements BuildContext { … }
```

`Element` 가 `BuildContext` 인터페이스를 **구현** 합니다. 즉 `build(BuildContext context)` 의 `context` 는 **그 위젯 자리의 Element 그 자체** 입니다. 테스트로 확인하면:

```dart
late BuildContext captured;
await tester.pumpWidget(Builder(builder: (context) {
  captured = context;
  return const SizedBox();
}));

expect(captured, isA<Element>());                       // ✓ Element 다
expect(captured.runtimeType.toString(), 'StatelessElement'); // Builder 는 Stateless
expect(captured.widget, isA<Builder>());                // 이 자리의 위젯
```

`StatefulWidget` 이면 그 자리 Element 는 `StatefulElement` 이고, **`State.context` 와 `build` 의 `context` 는 같은 인스턴스** 입니다(`identical`). context 는 곧 **살아있는 Element 트리에서 "내 위치"** 입니다.

## 2. Element 는 오래 살고, Widget 은 매번 갈아끼워진다

Flutter 에는 세 그루의 나무가 있습니다.

| 트리 | 정체 | 수명 |
|---|---|---|
| **Widget** | 불변 청사진(`@immutable`) | 짧음 — 매 빌드마다 새로 생성·폐기 |
| **Element** | 살아있는 런타임 노드 = **BuildContext** | 긺 — 같은 자리면 유지 |
| **RenderObject** | 레이아웃·페인트·히트테스트 | 긺 |

핵심은 **`setState` 가 위젯을 바꾸지 않는다** 는 점입니다. 새 위젯을 만들어 **같은 Element 에 갈아끼울** 뿐이죠. 같은 자리에 새 위젯을 두 번 주입해 보면:

```dart
expect(identical(elements[0], elements[1]), isTrue);  // Element 는 그대로
expect(identical(widgets[0], widgets[1]), isFalse);   // Widget 은 교체됨
```

그래서 "context 를 필드에 들고 재사용"이 (자리가 그대로인 한) 성립합니다. context 가 가리키는 Element 는 프레임을 넘겨도 살아 있으니까요.

## 3. context 는 "전역"이 아니라 "트리 위치"다

`Theme.of(context)` 가 위치마다 다른 값을 주는 이유가 여기 있습니다. context 는 전역 변수가 아니라 **트리에서의 내 주소** 라서, 어디서 얻었느냐에 따라 조상이 달라집니다.

그래서 context 로 조상을 **걸어 올라갈** 수 있습니다.

```dart
leaf.visitAncestorElements((e) { chain.add(e.widget.runtimeType); return true; });
// → 바로 위 부모부터 루트 방향으로 조상 위젯 타입이 순서대로 쌓인다
```

`findAncestorStateOfType<T>()` 는 이 부모 사슬을 **O(깊이)** 로 훑는 1회성 조회입니다(구독 아님). 값이 바뀌어도 다시 안 불러 주니, build 에서 매번 쓰면 비쌉니다.

## 4. 리빌드 루프의 심장 — BuildOwner 와 더티 목록

`setState` 는 마법이 아닙니다. 흐름은 전부 **동기·단일 스레드** 입니다.

```
setState()
  → Element.markNeedsBuild()          // framework.dart:5339, _dirty = true
  → owner.scheduleBuildFor(this)      // BuildOwner._dirtyElements 에 추가
  → 다음 프레임 요청

프레임(VSync):
  WidgetsBinding.drawFrame
  → buildOwner.buildScope(root)       // framework.dart:3056
      → _dirtyElements 를 depth 오름차순 정렬(얕은 것 먼저)
      → 각 element.rebuild → build() → updateChild()
  → flushLayout → flushPaint → 레이어 합성
```

더티 목록을 **깊이 순** 으로 도는 이유는, 부모를 먼저 리빌드하면 자식은 그 과정에서 갱신되니 중복을 피하려는 겁니다. 그리고 재조정(reconciliation)의 심장인 `updateChild` 에는 이런 단축이 있습니다.

```dart
// framework.dart:4014
if (hasSameSuperclass && child.widget == newWidget) {
  // 새 위젯이 옛 위젯과 identical → 이 자식 서브트리는 리빌드하지 않는다
}
```

이 "identical 이면 건너뛴다"가 다음 항목의 실험을 가능하게 합니다.

## 5. InheritedWidget — context 가 상태를 "구독"하는 진짜 메커니즘

`Provider`, `Theme.of`, `MediaQuery.of` 가 전부 이 하나 위에 서 있습니다. 두 부분으로 나뉩니다.

**(1) O(1) 조회.** Element 는 mount 될 때 부모의 색인 맵을 물려받습니다.

```dart
// framework.dart:5042
PersistentHashMap<Type, InheritedElement>? _inheritedElements;
// 조회는 그냥 맵 룩업 (framework.dart:5083)
final InheritedElement? ancestor = _inheritedElements?[T];
```

자신이 `InheritedElement` 면 이 맵에 자기를 얹어 자손에게 물려줍니다. 그래서 **50겹 아래에서도** `dependOnInheritedWidgetOfExactType<T>()` 는 맵 조회 한 번, **O(1)** 입니다. 트리를 걸어 올라가지 않습니다. 테스트로 확인했습니다(50겹 중첩 아래서 조상 값을 즉시 조회).

**(2) 구독.** `dependOn…` 은 조회만 하지 않습니다. 그 InheritedElement 에 **나를 등록** 합니다.

```dart
// InheritedElement 안 (framework.dart:6256)
final Map<Element, Object?> _dependents = HashMap<Element, Object?>();
// dependOn 시: ancestor.updateDependencies(this, aspect)  (framework.dart:5076)
//              내 _dependencies 에도 그 조상을 담는다     (framework.dart:5043)
```

소스 주석이 대놓고 말합니다 — *"calling dependOnInheritedWidgetOfExactType registers this build context with the returned widget. When that widget changes, this build context is rebuilt."*

**(3) 통지.** InheritedWidget 이 새 값으로 교체되고 `updateShouldNotify == true` 면, `InheritedElement.notifyClients` 가 **등록된 각 dependent 만** `markNeedsBuild` 합니다. 그래서 **의존한 자손만** 리빌드됩니다. 이걸 깔끔히 증명하려고, 자손 서브트리를 `identical` 로 고정(4번의 단축을 이용)해 구조적 리빌드를 배제한 뒤 값만 바꿨습니다.

```dart
key.currentState!.bump(); // InheritedWidget 값만 변경
await tester.pump();

expect(depBuilds, 2);    // 의존한 자손 → 리빌드됨
expect(nonDepBuilds, 1); // 의존 안 한 자손 → 리빌드 안 됨  ← 이게 핵심
```

Provider 가 "watch 한 위젯만 리빌드"되는 것도, Theme 를 바꾸면 그걸 쓴 위젯만 갱신되는 것도, 전부 이 `_dependents` 통지 한 줄에서 나옵니다.

> 구독 없는 조회도 있습니다. `findAncestorWidgetOfExactType` / `getElementForInheritedWidgetOfExactType` 는 등록을 안 합니다(1회성, 값이 바뀌어도 통지 없음). "of() 는 build 에서만 부르라"는 규칙이 여기서 나옵니다 — build 밖에서 부르면 구독이 안 걸려 갱신을 놓칩니다.

## 6. 지하 바닥 — 스레드와 아이솔레이트

이제 정말 밑바닥입니다. 위젯·엘리먼트·렌더 트리와 빌드/레이아웃/페인트 파이프라인은 **전부 UI(root) 아이솔레이트의 단일 스레드** 에서 돕니다. 위젯 트리에 멀티스레드는 없습니다.

엔진(C++)에는 platform·raster(GPU)·IO 스레드가 따로 있지만, **여러분의 Dart 위젯 코드는 거기서 절대 실행되지 않습니다.** raster 스레드는 페인트가 만든 레이어 트리를 소비할 뿐, Element 를 만지지 않습니다.

그리고 결정적으로 — **아이솔레이트는 메모리를 공유하지 않습니다.**

```dart
globalCounter = 41;
final inIsolate = await Isolate.run(() => ++globalCounter);

expect(inIsolate, 1);      // 새 아이솔레이트는 메인의 41 을 못 본다 — 힙이 분리됨
expect(globalCounter, 41); // 메인 힙도 그대로 — 공유되지 않음
```

그래서 `compute()` 나 `Isolate.run` 에 **BuildContext 를 넘길 수 없습니다.** 참조로도 안 됩니다 — 객체가 아이솔레이트 경계를 못 넘으니까요. 무거운 일은 **순수 데이터만** 아이솔레이트로 보내고, 결과를 받아 **UI 아이솔레이트에서** context 를 만져야 합니다.

한 가지 더. `Future`/`await` 는 다른 스레드가 **아닙니다.** 같은 아이솔레이트의 **이벤트 루프** 가 나중에 이어서 실행하는 것뿐입니다. 그래서 await 뒤에도 스레드는 그대로지만, **그 사이 프레임이 지나 Element 가 죽었을 수** 있습니다. 트리에서 빠지면:

```dart
await tester.pumpWidget(const SizedBox()); // 위젯 제거 → Element unmount(defunct)
expect(ctx.mounted, isFalse);
```

**"async gap 뒤 context 를 쓰지 말라"** 는 그 유명한 규칙이 정확히 여기서 나옵니다. 스레드가 바뀌어서가 아니라, **이벤트 루프가 되돌아왔을 땐 이미 그 Element 가 defunct 일 수 있어서** 입니다.

## 정리 — 규칙의 근거는 전부 지하에 있다

- **BuildContext = Element.** context 는 살아있는 Element 트리에서 내 위치입니다(소스 L3557).
- **Element 는 오래, Widget 은 잠깐.** setState 는 위젯을 갈아끼울 뿐, Element 는 유지됩니다.
- **InheritedWidget 이 구독의 뿌리.** `_inheritedElements` 로 O(1) 조회, `_dependents` 통지로 의존한 자손만 리빌드 — Provider·Theme 가 다 이 위에 있습니다.
- **단일 UI 아이솔레이트.** 트리는 한 스레드에 갇혀 있고, 아이솔레이트는 메모리를 공유하지 않아 context 를 넘길 수 없으며, await 는 스레드가 아니라 같은 루프의 재개라 `mounted` 확인이 필요합니다.

실무에서 외우던 규칙들 — "async 뒤 context 금지", "of() 는 build 에서만", "context 마다 결과가 다름" — 은 암기할 게 아니라, **이 지하 구조에서 자연히 따라 나오는 결론** 이었습니다. 한 번 밑바닥을 보고 나면, 규칙이 규칙이 아니라 당연한 얘기가 됩니다.

> 이 글의 아홉 가지 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/buildcontext_deep_test.dart` 에, 정리는 `docs/buildcontext.md` 에 있습니다. `fvm flutter test` 로 직접 돌려볼 수 있습니다.
