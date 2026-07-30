---
title: BuildContext 지하 탐사 — Element, 트리, 그리고 단일 스레드
date: 2025-12-28
description: BuildContext는 Flutter에서 가장 자주 쓰면서 가장 덜 이해되는 것입니다. "await 뒤엔 context 쓰지 마라", "of()는 build에서만" 같은 규칙들을 외워서 지키지만 왜 그런지는 모르죠. 이 규칙들은 전부 한 사실에서 나옵니다 — BuildContext는 사실 Element다. 그 Element를 따라 지하까지 내려가, 규칙들이 왜 그렇게 생겼는지 실제 framework.dart 소스와 돌아가는 테스트로 밝혀 봅니다. Flutter 3.44.8 기준. Flutter 지하 탐사 시리즈 1편입니다.
tags: [Flutter, BuildContext, Element, InheritedWidget, 아이솔레이트, 내부구조]
category: [dev, flutter]
draft: false
---

`Navigator.of(context)`, `Theme.of(context)`, `context.read()`… 저도 하루에 수십 번 씁니다. 그런데 이 `context` 에는 이상한 규칙들이 붙어 있죠.

- "`await` 뒤에는 `context` 를 쓰지 마세요."
- "`of(context)` 는 `build` 안에서만 부르세요."
- "`Theme.of(context)` 는 어디서 부르느냐에 따라 값이 달라져요."

외워서 지키고는 있지만, **왜** 그런지는 잘 모릅니다. 그런데 이 규칙들은 사실 전부 **한 가지 사실** 에서 나옵니다 — `BuildContext` 는 별도의 무엇이 아니라 **Element** 라는 것. 이 글은 그 Element 를 따라 밑바닥까지 내려가, 규칙들이 왜 그렇게 생겼는지를 봅니다. 그리고 마지막에 저 세 규칙으로 다시 돌아옵니다.

주장은 말로만 하지 않습니다. 하나하나 **실제 프레임워크 소스** 로 받칩니다.

> 💻 인용한 소스는 **Flutter 3.44.8** 의 `framework.dart` 이고, 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/buildcontext_deep_test.dart` 에 있습니다(`fvm flutter test`).

## Element 부터 — 설계도와 건물

먼저 낯선 주인공 `Element` 를 짚어야 합니다. 여기서 막히면 뒤가 다 막히거든요.

한 문장으로: **Widget 은 매번 버려지는 설계도, Element 는 그 자리를 지키는 건물** 입니다.

`Text('안녕')` 은 화면에 있는 "무엇"이 아니라 "이렇게 그려 달라"는 **설명서** 일 뿐입니다. Widget 은 불변이라, 값 하나만 바뀌어도 통째로 새로 만들어져 버려집니다. 그런데 화면에는 자리를 지키고 서서 "나는 트리의 이 위치", "부모·자식은 누구", "내 상태(State)는 이거" 를 **기억하는** 무언가가 있어야 합니다. 그게 Element 입니다. Widget 이 불변이라 상태도 위치도 못 담으니, Flutter 가 그걸 대신 기억할 **오래 사는 객체** 를 따로 둔 겁니다.

이 설명서를 실제 건물로 세우는 걸 **부풀린다(inflate)** 고 합니다.

> **inflate(부풀리다)?** 납작하게 접힌 풍선(Widget)에 바람을 넣어, 실제 자리를 차지하는 살아있는 노드(Element)로 펼치는 것입니다. 그 동작이 위젯의 `createElement()` 예요 — Flutter 가 위젯을 트리의 한 자리에 꽂을 때 `createElement()` 를 불러 짝이 되는 Element 를 만듭니다(`StatelessWidget → StatelessElement`). 자식들도 같은 식으로 재귀적으로 부풀려집니다.

소스로 보면 이 역할 분담이 딱 드러납니다.

```dart
// framework.dart (3.44.8) — 주석·assert 는 생략
abstract class Widget {
  Element createElement();          // 위젯이 하는 일은 "내 Element 를 만들어라" 하나뿐
}

abstract class Element implements BuildContext {   // ← Element 가 곧 BuildContext
  Element? _parent;                 // 부모
  Widget? _widget;                  // 지금 이 자리의 위젯(매번 갈아끼워짐)
  _ElementLifecycle _lifecycleState; // 살았나 죽었나(수명)
  // …위치·의존성·조상 색인도 전부 여기 산다
}
```

Widget 은 `createElement()` 하나가 전부입니다 — "내가 어디 있는지"는 모릅니다. 그 기억은 전부 Element 가 들고 있죠. 그리고 마지막 줄, `Element implements BuildContext`. **이 Element 가 바로 `context` 입니다.**

## `context` 는 바로 그 Element 다

"내 `build(context)` 로 넘어오는 그 context 가 정말 이 Element냐?" 소스가 직접 답합니다.

```dart
class StatelessElement extends ComponentElement {
  @override
  Widget build() => (widget as StatelessWidget).build(this);  // this(=Element)를 넘긴다
}
```

`build(this)` — 여러분의 `build(BuildContext context)` 에 들어오는 `context` 는 바로 이 Element(`this`)입니다. 새로 만들어 주는 객체가 아니라, 그 자리의 Element 를 그대로 건네는 거죠.

그래서 `context` 는 전역 변수가 아니라 **트리에서의 내 위치** 입니다. `Theme.of(context)` 가 어디서 부르느냐에 따라 값이 달라지는 건 당연합니다 — 위치가 다르면 조상이 다르니까요. (첫 번째 규칙, 벌써 절반은 풀렸습니다.)

## 리빌드해도 State 가 안 날아가는 이유

`StatefulWidget` 의 `State` 는 어디 살까요? 위젯이 매번 버려지는데, 어떻게 상태는 유지될까요? 답은 — **State 를 붙들고 있는 게 Element** 라서입니다.

```dart
class StatefulElement extends ComponentElement {
  StatefulElement(StatefulWidget widget)
      : _state = widget.createState() {   // Element 가 State 를 만들어 들고 있는다
    state._element = this;                // State ↔ Element 서로를 가리킨다
  }
  final State _state;
}
```

위젯이 새로 와도 Element 와 그 안의 `_state` 는 그대로 유지됩니다. `setState` 는 위젯을 갈아끼울 뿐, State 를 새로 만들지 않죠. (같은 자리에 새 위젯을 두 번 넣어도 Element 는 `identical`, Widget 만 교체된다는 걸 테스트로 확인했습니다.)

## 위치니까, 조상을 걸어 올라간다

context 가 트리 위치라서, 거기서 **조상을 향해 걸어 올라갈** 수 있습니다. `Theme.of` 나 `Navigator.of` 가 하는 일이 바로 이겁니다 — "내 위에서 가장 가까운 Theme 를 찾아 줘."

단, `findAncestorStateOfType<T>()` 같은 조회는 부모 사슬을 **한 번 훑고 마는 1회성** 입니다. 값이 나중에 바뀌어도 다시 안 알려 줘요. 그럼 `Theme` 를 바꿨을 때 화면이 저절로 갱신되는 건 어떻게 된 걸까요? 그건 조회가 아니라 **구독** 이라는 다른 메커니즘입니다.

## 상태를 "구독"하는 진짜 자리 — InheritedWidget

`Provider`, `Theme.of`, `MediaQuery.of` 가 전부 이 하나 위에 서 있습니다. 두 가지가 맞물립니다.

**하나, 빠른 조회.** 각 Element 는 조상 InheritedWidget 들을 **미리 색인해 둔 맵** 을 갖고 있어서, 아무리 깊어도 조회는 맵 룩업 한 번(O(1))입니다. 트리를 걸어 올라가지 않아요. (50겹 아래에서도 즉시 찾는 걸 테스트로 확인했습니다.)

**둘, 구독.** `of(context)`(내부적으로 `dependOn…`)는 조회만 하지 않습니다. **나를 그 InheritedWidget 의 구독자 목록에 등록** 하죠. 소스를 한 줄씩 따라가면 등록 → 통지 → 리빌드로 이어집니다.

```dart
// framework.dart (3.44.8)
// (1) of(context) 안: 나를 구독자로 등록
ancestor.updateDependencies(this, aspect);   // InheritedElement._dependents 에 나를 넣는다

// (2) 값이 바뀌면: 등록된 각 구독자에게 알린다
void notifyClients(InheritedWidget old) {
  for (final dependent in _dependents.keys) {
    dependent.didChangeDependencies();
  }
}

// (3) 그 알림은 결국 리빌드다
void didChangeDependencies() => markNeedsBuild();
```

이으면 한 문장입니다 — **`of(context)` 로 구독을 걸어 두면, 값이 바뀔 때 등록된 그 context 들만 리빌드된다.** Provider 가 "watch 한 위젯만 리빌드"되는 것도 여기서 나옵니다. (구독한 자손만 리빌드되고 나머진 그대로라는 걸 테스트로 확인했습니다.)

이제 두 번째 규칙도 풀립니다. **`of()` 를 `build` 밖에서 부르지 말라** 는 건, build 밖(예: `initState`)에서 부르면 이 구독 등록이 제대로 안 걸려 이후 갱신을 놓치기 때문입니다.

## 이 모든 건 한 스레드에서 돈다

지금까지의 리빌드 — `markNeedsBuild` 부터 화면 갱신까지 — 는 전부 **한 프레임 안에서, 한 스레드에서, 동기로** 일어납니다. `setState` 도 마법이 아니라 결국 이 한 줄로 끝납니다.

```dart
void markNeedsBuild() {   // Element
  if (_lifecycleState != _ElementLifecycle.active) return;  // 죽은 Element 면 무시
  _dirty = true;
  owner!.scheduleBuildFor(this);   // 더티 목록에 넣고 다음 프레임을 예약
}
```

다음 프레임에 `BuildOwner` 가 더티 목록을 **얕은 것부터** 리빌드합니다. 위젯 트리에 멀티스레드는 없습니다.

그런데 첫 줄을 눈여겨보세요 — **비활성(죽은) Element 면 그냥 `return`.** 이게 마지막 규칙의 씨앗입니다.

## 지하 바닥 — 아이솔레이트, 그리고 `mounted`

위젯 트리는 **UI 아이솔레이트** 라는 단 하나의 스레드에 삽니다. 엔진에는 GPU·IO 스레드가 따로 있지만, 여러분의 위젯 코드는 거기서 절대 돌지 않습니다.

그리고 **아이솔레이트는 메모리를 공유하지 않습니다.** 그래서 `compute()` 나 `Isolate.run` 에 `BuildContext` 를 **넘길 수 없습니다** — 객체가 아이솔레이트 경계를 못 넘으니까요. 무거운 일은 순수 데이터만 보내고, 결과를 받아 UI 아이솔레이트에서 context 를 만져야 합니다.

한 가지 더. `await` 는 **다른 스레드가 아닙니다.** 같은 스레드의 이벤트 루프가 나중에 이어서 실행하는 것뿐이죠. 스레드는 그대로지만, 그 사이 프레임이 지나 **Element 가 죽었을 수** 있습니다(방금 `markNeedsBuild` 가 무시하던 그 비활성 상태). 그래서 실전에서 이렇게 씁니다.

```dart
onPressed: () async {
  final data = await repo.fetch();   // 이 사이 위젯이 트리에서 빠졌을 수 있다
  if (!context.mounted) return;      // 죽었으면 여기서 멈춘다
  Navigator.of(context).push(...);   // 살아있을 때만 context 사용
}
```

**"`await` 뒤 `context` 금지"** 라는 규칙의 정체가 이겁니다 — 스레드가 바뀌어서가 아니라, 돌아왔을 때 그 Element 가 이미 죽었을 수 있어서. (트리에서 빼면 `context.mounted` 가 `false` 가 되는 걸 테스트로 확인했습니다.)

## 정직하게 — 버전에 묶인 해부다

`_dependents`·`_inheritedElements` 같은 필드는 전부 **private** 입니다. 공개 API 가 아니라, 버전에 따라 얼마든지 바뀔 수 있어요. 이 글은 "3.44.8 에서는 이렇게 생겼다"는 한 시점의 해부이지, 영원한 계약이 아닙니다.

바뀌지 않는 건 **공개 계약** 입니다 — `of(context)` 가 구독을 건다는 것, context 가 트리 위치라는 것, 트리가 단일 아이솔레이트에 산다는 것. 그러니 필드 이름을 외울 게 아니라, **규칙의 근거를 한 번 보는 것** — 그게 이 글의 목적입니다.

## 정리 — 규칙은 전부 여기서 나온다

처음의 세 규칙으로 돌아옵니다. 이제 근거가 보입니다.

- **`context` 마다 값이 다르다** → context 는 전역이 아니라 **트리 위치(Element)** 니까.
- **`of()` 는 build 에서만** → build 밖에서 부르면 **구독 등록** 이 안 걸리니까.
- **`await` 뒤 context 금지** → 돌아왔을 때 그 **Element 가 죽었을(unmounted)** 수 있으니까.

핵심 한 줄 — **외우던 규칙들은 암기할 게 아니라, "context 는 Element 다"라는 한 사실에서 자연히 따라 나오는 결론** 이었습니다. 한 번 지하를 보고 나면, 규칙이 규칙이 아니라 당연한 얘기가 됩니다.

> 아홉 가지 증명 테스트는 리포의 `test/buildcontext_deep_test.dart`, 정리는 `docs/buildcontext.md` 에 있습니다.
