---
title: BuildContext 지하 탐사 — Element, 트리, 그리고 단일 스레드
date: 2025-12-28
description: BuildContext는 Flutter에서 가장 자주 쓰면서 가장 덜 이해되는 것입니다. 이번엔 말이 아니라 통과하는 테스트로 지하까지 파봤습니다 — BuildContext가 사실 Element라는 것, Element는 오래 살고 Widget은 매번 갈아끼워진다는 것, InheritedWidget이 어떻게 자손을 구독시켜 상태를 전파하는지, 그리고 이 모든 게 단일 UI 아이솔레이트의 한 스레드에서만 돈다는 것까지. 전부 Flutter 3.44.8에서 실측하고 그 버전의 framework.dart 소스로 교차검증했습니다.
tags: [Flutter, BuildContext, Element, InheritedWidget, 아이솔레이트, 내부구조]
category: [dev, flutter]
draft: false
---

`Theme.of(context)`, `Navigator.of(context)`, `context.read()`… 저도 하루에 수십 번 씁니다. 그런데 "이게 정확히 뭐냐"고 스스로에게 물으면 대답이 궁색해집니다. 문서엔 "위젯 트리에서의 위치를 다루는 핸들"이라고만 적혀 있죠. 이번엔 그 핸들의 정체를 **지하까지** 파보려 합니다 — 스레드 영역까지 내려가서요.

말로만 하면 미덥지 않으니, 이번엔 **통과하는 테스트로 못박았습니다.** 새 학습 리포에 아홉 가지 명제를 담아 전부 초록으로 확인했고, 그 위에 이 글을 씁니다.

> 💻 이 글의 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/buildcontext_deep_test.dart` 에 있습니다. `fvm flutter test` 로 직접 돌려볼 수 있습니다. 전부 **Flutter 3.44.8** 에서 실측하고, 그 버전의 `framework.dart` 소스로 교차검증했습니다.

## 먼저, Element 가 뭔가요 — 설계도와 건물

BuildContext 로 들어가기 전에, 그 정체인 **Element** 부터 짚어야 합니다. 여기서 막히면 뒤가 다 막히거든요.

`Text('안녕')` 이라고 쓰면, 그건 화면에 있는 "무엇"이 아니라 **"이렇게 그려 달라"는 설명서** 입니다. Widget 은 불변(immutable)이라, 값 하나만 바뀌어도 통째로 새로 만들어져 버려집니다 — 매 프레임 수백 개가 생겼다 사라지죠. 그런데 화면에 실제로 **자리를 지키고 서 있는 무언가**, "나는 트리의 이 위치야", "내 부모는 누구·자식은 누구", "내 상태(State)는 이거야" 를 **기억하는** 무언가는 따로 있어야 합니다. 그게 **Element** 입니다.

비유하면 이렇습니다.

- **Widget = 설계도(주문서).** 매번 새로 그려서 던지는 종이 한 장. 그 자체론 화면에 아무것도 아닙니다.
- **Element = 그 설계도로 실제 지어져 자리를 지키는 건물(현장 담당자).** 오래 삽니다. 새 설계도가 와도 건물을 부수고 다시 짓는 게 아니라 **바뀐 부분만 반영(리모델링)** 합니다.
- **RenderObject = 실제로 크기를 재고 픽셀을 칠하는 실무자.**

Flutter 는 여러분이 만든 Widget 마다 `createElement()` 로 Element 를 하나씩 **부풀려(inflate)** 트리를 세웁니다. 이 **Element 트리** 가 진짜로 살아 돌아가는 런타임 트리입니다. Widget 트리는 매 빌드 갈아엎어지지만, Element 트리는 **같은 자리에 호환되는 위젯이 오는 한 그대로 유지** 됩니다.

왜 이런 게 필요할까요? Widget 이 불변이고 매번 버려지기 때문입니다. **버려지는 것에는 상태를 담을 수도, "내가 트리 어디에 있는지"를 기억할 수도 없습니다.** 그래서 Flutter 는 그 역할을 할 **오래 사는 객체** 를 따로 뒀고, 그게 Element 입니다. `StatefulWidget` 의 `State` 객체도 바로 이 Element(정확히는 `StatefulElement`)가 붙들고 있습니다 — **리빌드해도 State 가 안 날아가는 이유** 가 여기 있습니다.

그리고 이 Element 가, 다음 장의 주인공인 `BuildContext` 입니다.

## BuildContext 는 사실 그 Element 다

방금 본 Element — 그게 바로 `BuildContext` 입니다. `BuildContext` 는 별도의 객체가 **아닙니다.** 프레임워크 소스를 열면 한 줄로 끝납니다.

```dart
abstract class Element extends DiagnosticableTree implements BuildContext { … }
```

`Element` 가 `BuildContext` 인터페이스를 **구현** 합니다. 즉 `build(BuildContext context)` 의 `context` 는 **그 위젯 자리의 Element 그 자체** 입니다. 테스트로 확인하면 이렇습니다.

```dart
late BuildContext captured;
await tester.pumpWidget(Builder(builder: (context) {
  captured = context;
  return const SizedBox();
}));

expect(captured, isA<Element>());                            // ✓ Element 다
expect(captured.runtimeType.toString(), 'StatelessElement'); // Builder 는 Stateless
```

`StatefulWidget` 이면 그 자리 Element 는 `StatefulElement` 이고, `State.context` 와 `build` 의 `context` 는 **같은 인스턴스** 입니다(`identical`). 결국 context 는 **살아있는 Element 트리에서 "내 위치"** 였던 겁니다.

## Element 는 오래 살고, Widget 은 잠깐 산다 — 증명

앞서 설계도(Widget)와 건물(Element)로 나눴습니다. 이 "수명 차이"를 표로 정리하고, 코드로 증명해 봅니다.

| 트리 | 정체 | 수명 |
|---|---|---|
| **Widget** | 불변 청사진(`@immutable`) | 짧음 — 매 빌드마다 새로 생성·폐기 |
| **Element** | 살아있는 런타임 노드 = **BuildContext** | 긺 — 같은 자리면 유지 |
| **RenderObject** | 레이아웃·페인트·히트테스트 | 긺 |

여기서 놓치기 쉬운 게 있습니다 — **`setState` 는 위젯을 바꾸지 않습니다.** 새 위젯을 만들어 **같은 Element 에 갈아끼울** 뿐이죠. 같은 자리에 새 위젯을 두 번 주입해 보면 드러납니다.

```dart
expect(identical(elements[0], elements[1]), isTrue);  // Element 는 그대로
expect(identical(widgets[0], widgets[1]), isFalse);   // Widget 은 교체됨
```

그래서 "context 를 필드에 들고 재사용"이 (자리가 그대로인 한) 성립합니다. Widget 은 매 프레임 버려지지만, 그 뒤의 Element 는 살아 있으니까요.

## context 는 "전역"이 아니라 "트리 위치"다

`Theme.of(context)` 가 위치마다 다른 값을 주는 이유가 여기 있습니다. context 는 전역 변수가 아니라 **트리에서의 내 주소** 라서, 어디서 얻었느냐에 따라 조상이 달라집니다. 그래서 context 로 조상을 **걸어 올라갈** 수 있습니다.

```dart
leaf.visitAncestorElements((e) { chain.add(e.widget.runtimeType); return true; });
// → 바로 위 부모부터 루트 방향으로 조상 위젯 타입이 순서대로 쌓인다
```

`findAncestorStateOfType<T>()` 는 이 부모 사슬을 **O(깊이)** 로 훑는 1회성 조회입니다(구독이 아닙니다). 값이 바뀌어도 다시 안 불러 주니, build 에서 반복하면 비쌉니다.

## setState 는 마법이 아니다 — BuildOwner 와 더티 목록

`setState` 가 화면을 어떻게 갱신하는지, 흐름은 전부 **동기·단일 스레드** 입니다.

```
setState()
  → Element.markNeedsBuild()          // _dirty = true
  → owner.scheduleBuildFor(this)      // BuildOwner._dirtyElements 에 추가
  → 다음 프레임 요청

프레임(VSync):
  WidgetsBinding.drawFrame
  → buildOwner.buildScope(root)
      → _dirtyElements 를 depth 오름차순 정렬(얕은 것 먼저)
      → 각 element.rebuild → build() → updateChild()
  → flushLayout → flushPaint → 레이어 합성
```

더티 목록을 **깊이 순** 으로 도는 이유는, 부모를 먼저 리빌드하면 자식은 그 과정에서 갱신되니 중복을 피하려는 겁니다. 그리고 재조정(reconciliation)의 심장인 `updateChild` 에는 이런 단축이 있습니다.

```dart
if (hasSameSuperclass && child.widget == newWidget) {
  // 새 위젯이 옛 위젯과 identical → 이 자식 서브트리는 리빌드하지 않는다
}
```

이 "identical 이면 건너뛴다"가 다음 이야기의 실험을 가능하게 합니다.

## InheritedWidget — context 가 상태를 "구독"하는 진짜 자리

`Provider`, `Theme.of`, `MediaQuery.of` 가 전부 이 하나 위에 서 있습니다. 두 부분으로 나뉩니다.

먼저 **O(1) 조회.** Element 는 mount 될 때 부모의 색인 맵을 물려받습니다.

```dart
PersistentHashMap<Type, InheritedElement>? _inheritedElements;
final InheritedElement? ancestor = _inheritedElements?[T]; // 그냥 맵 룩업
```

자신이 `InheritedElement` 면 이 맵에 자기를 얹어 자손에게 물려줍니다. 그래서 **50겹 아래에서도** `dependOnInheritedWidgetOfExactType<T>()` 는 맵 조회 한 번, **O(1)** 입니다 — 트리를 걸어 올라가지 않습니다. 테스트로 확인했습니다.

두 번째가 진짜 핵심 — **구독.** `dependOn…` 은 조회만 하지 않습니다. 그 InheritedElement 의 `_dependents` 에 **나를 등록** 하고, 내 `_dependencies` 에도 그 조상을 담습니다. 소스 주석이 대놓고 말합니다 — *"registers this build context with the returned widget. When that widget changes, this build context is rebuilt."*

그래서 InheritedWidget 이 새 값으로 교체되고 `updateShouldNotify == true` 면, `notifyClients` 가 **등록된 각 dependent 만** `markNeedsBuild` 합니다. 이걸 깔끔히 증명하려고, 자손 서브트리를 `identical` 로 고정(앞의 단축을 이용)해 구조적 리빌드를 배제한 뒤 값만 바꿨습니다.

```dart
key.currentState!.bump(); // InheritedWidget 값만 변경
await tester.pump();

expect(depBuilds, 2);    // 의존한 자손 → 리빌드됨
expect(nonDepBuilds, 1); // 의존 안 한 자손 → 리빌드 안 됨  ← 이게 핵심
```

Provider 가 "watch 한 위젯만 리빌드"되는 것도, Theme 를 바꾸면 그걸 쓴 위젯만 갱신되는 것도, 전부 이 `_dependents` 통지 한 줄에서 나옵니다.

> 구독 없는 조회도 있습니다. `findAncestorWidgetOfExactType` / `getElementForInheritedWidgetOfExactType` 는 등록을 안 합니다(1회성, 값이 바뀌어도 통지 없음). "of() 는 build 에서만 부르라"는 규칙이 여기서 나옵니다 — build 밖에서 부르면 구독이 안 걸려 갱신을 놓칩니다.

## 지하 바닥 — 스레드와 아이솔레이트

이제 정말 밑바닥입니다. 위젯·엘리먼트·렌더 트리와 빌드/레이아웃/페인트 파이프라인은 **전부 UI(root) 아이솔레이트의 단일 스레드** 에서 돕니다. 위젯 트리에 멀티스레드는 없습니다.

엔진(C++)에는 platform·raster(GPU)·IO 스레드가 따로 있지만, **우리의 Dart 위젯 코드는 거기서 절대 실행되지 않습니다.** raster 스레드는 페인트가 만든 레이어 트리를 소비할 뿐, Element 를 만지지 않습니다.

그리고 결정적으로 — **아이솔레이트는 메모리를 공유하지 않습니다.**

```dart
globalCounter = 41;
final inIsolate = await Isolate.run(() => ++globalCounter);

expect(inIsolate, 1);      // 새 아이솔레이트는 메인의 41 을 못 본다 — 힙이 분리됨
expect(globalCounter, 41); // 메인 힙도 그대로 — 공유되지 않음
```

그래서 `compute()` 나 `Isolate.run` 에 **BuildContext 를 넘길 수 없습니다.** 참조로도 안 됩니다 — 객체가 아이솔레이트 경계를 못 넘으니까요. 무거운 일은 **순수 데이터만** 아이솔레이트로 보내고, 결과를 받아 **UI 아이솔레이트에서** context 를 만져야 합니다.

한 가지 더. `Future`/`await` 는 다른 스레드가 **아닙니다.** 같은 아이솔레이트의 **이벤트 루프** 가 나중에 이어서 실행하는 것뿐입니다. 그래서 await 뒤에도 스레드는 그대로지만, **그 사이 프레임이 지나 Element 가 죽었을 수** 있습니다.

```dart
await tester.pumpWidget(const SizedBox()); // 위젯 제거 → Element unmount(defunct)
expect(ctx.mounted, isFalse);
```

**"async gap 뒤 context 를 쓰지 말라"** 는 그 유명한 규칙이 정확히 여기서 나옵니다. 스레드가 바뀌어서가 아니라, **이벤트 루프가 되돌아왔을 땐 이미 그 Element 가 defunct 일 수 있어서** 입니다.

## 정직하게 — 이건 버전에 묶인 이야기다

여기서 짚고 갈 게 있습니다. `_inheritedElements`·`_dependents` 같은 필드는 전부 **private** 입니다. 공개 API 가 아니라 프레임워크 내부라, **버전에 따라 얼마든지 바뀔 수 있습니다.** 그래서 이 글은 "3.44.8 에서는 이렇게 생겼다"는 **한 시점의 해부** 이지, 영원한 계약이 아닙니다. 다음 메이저에서 자료구조가 바뀌어도 놀랄 일이 아닙니다.

바뀌지 않는 건 **공개 계약** 입니다 — `dependOnInheritedWidgetOfExactType` 가 "구독을 건다"는 것, context 가 트리 위치라는 것, 트리가 단일 아이솔레이트에 산다는 것. 내부 구현은 이 계약을 지키는 **한 방식** 일 뿐입니다. 그래서 이 글을 읽는 법은 "이 필드 이름을 외우자"가 아니라, **"공개 규칙이 왜 그렇게 생겼는지 그 근거를 한 번 보자"** 입니다.

## 정리 — 규칙의 근거는 전부 지하에 있다

- **BuildContext = Element.** context 는 살아있는 Element 트리에서 내 위치입니다.
- **Element 는 오래, Widget 은 잠깐.** setState 는 위젯을 갈아끼울 뿐, Element 는 유지됩니다.
- **InheritedWidget 이 구독의 뿌리.** 색인 맵으로 O(1) 조회, `_dependents` 통지로 의존한 자손만 리빌드 — Provider·Theme 가 다 이 위에 있습니다.
- **단일 UI 아이솔레이트.** 트리는 한 스레드에 갇혀 있고, 아이솔레이트는 메모리를 공유하지 않아 context 를 넘길 수 없으며, await 는 스레드가 아니라 같은 루프의 재개라 `mounted` 확인이 필요합니다.

핵심 한 줄 — **외우던 규칙들은 암기할 게 아니라, 이 지하 구조에서 자연히 따라 나오는 결론** 이었습니다. "async 뒤 context 금지", "of() 는 build 에서만", "context 마다 결과가 다름" — 한 번 밑바닥을 보고 나면, 규칙이 규칙이 아니라 당연한 얘기가 됩니다.

> 이 글의 아홉 가지 증명 테스트는 리포의 `test/buildcontext_deep_test.dart`, 정리는 `docs/buildcontext.md` 에 있습니다.
