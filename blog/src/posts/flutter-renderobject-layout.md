---
title: 레이아웃이 터지는 이유 — RenderObject와 제약
date: 2026-01-12
description: "A RenderFlex overflowed", "Vertical viewport was given unbounded height", "Column 안에 ListView를 넣으면 터진다"… Flutter 레이아웃 에러는 하나같이 무섭게 생겼지만, 전부 한 규약에서 나옵니다 — 제약(constraints)은 내려가고, 크기(size)는 올라오고, 위치는 부모가 정한다. build 아래의 셋째 트리인 RenderObject 층으로 내려가, 레이아웃 프로토콜·tight와 loose 제약·relayout boundary·RepaintBoundary를 실제 rendering 소스(3.44.8)와 커스텀 RenderBox 테스트로 파고듭니다. Flutter 지하 탐사 시리즈 4편입니다.
tags: [Flutter, RenderObject, 레이아웃, 제약, RepaintBoundary, 내부구조]
category: [dev, flutter]
draft: false
---

Flutter 를 하다 보면 무섭게 생긴 레이아웃 에러를 만납니다.

- `A RenderFlex overflowed by 42 pixels.`
- `Vertical viewport was given unbounded height.`
- `BoxConstraints forces an infinite height.`

그리고 늘 듣는 처방들 — "`Column` 안 `ListView` 는 `Expanded` 로 감싸라", "높이를 정해 줘라". 왜일까요? 이 에러와 처방은 전부 **한 규약** 에서 나옵니다 — build 아래, 실제로 크기를 재고 픽셀을 칠하는 **RenderObject 층** 의 레이아웃 프로토콜입니다. [1편](/blog/flutter-buildcontext-internals)의 세 트리 중 아직 안 내려가 본 셋째로, 이번엔 내려갑니다.

> 💻 인용한 소스는 **Flutter 3.44.8** 의 `rendering/object.dart`·`box.dart`, 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/renderobject_test.dart` 입니다.

## 셋째 트리 — build 아래의 RenderObject

1편에서 세 트리를 봤습니다. Widget(설계도) → Element(건물) → **RenderObject(실무자)**. `build` 는 Widget 만 만들 뿐, **실제 크기 계산·픽셀 칠하기·히트 테스트** 는 전부 RenderObject 가 합니다. 그 Element 가 `RenderObjectElement` 면, mount 될 때 `createRenderObject` 로 RenderObject 를 만들어 셋째 트리에 붙이죠.

```dart
// 위젯이 자기 RenderObject 를 만든다(1편의 createElement 와 같은 팩토리 패턴)
@override
RenderObject createRenderObject(BuildContext context) => RenderMyBox();
```

`context.findRenderObject()`, `context.size` 가 이 층에서 옵니다. 즉 **"내 위젯이 실제로 몇 픽셀인가"** 는 Widget 이 아니라 여기서 답이 나옵니다.

## 레이아웃 규약 — 딱 세 줄

RenderObject 층 전체가 이 세 줄 위에 돕니다.

> **제약(constraints)은 내려가고, 크기(size)는 올라오고, 위치는 부모가 정한다.**

부모가 자식의 `layout()` 을 부르며 **제약을 내려줍니다.** 자식은 `performLayout` 에서 그 제약 안으로 **크기를 정해 올려** 보냅니다. 그리고 위치(offset)는 부모가 정합니다.

```dart
// rendering/object.dart (3.44.8) — 부모가 자식에게 제약을 내려주는 진입점
void layout(Constraints constraints, {bool parentUsesSize = false}) {
  // …제약 유효성 검사…
  performLayout();   // 여기서 자식이 size 를 정한다
}

abstract class RenderObject {
  void performLayout();   // 서브클래스가 구현: constraints 를 읽어 size 를 정한다
}
```

커스텀 `RenderBox` 로 구현하면 이렇게 생겼습니다 — 부모가 준 `constraints` 안으로 선호 크기를 눌러 담습니다.

```dart
class _RenderProbe extends RenderBox {
  @override
  void performLayout() {
    size = constraints.constrain(preferred);   // 제약(내려옴) → size(올라감)
  }
}
```

`constraints.constrain(preferred)` 가 열쇠입니다. 제약이 **꽉 조여 있으면(tight)** 선호 크기와 무관하게 그 크기로 강제되고, **느슨하면(loose)** 자식이 선호 크기를 고릅니다. (`SizedBox` 아래에선 100×30 으로 강제되고, `Align` 아래에선 자기 선호대로 80×40 이 되는 걸 테스트로 확인했습니다.)

## 그래서 레이아웃이 "터진다"

에러들의 정체가 여기 있습니다. **제약이 안 맞으면** 터지는 거예요.

`Column` 은 세로로 자식을 쌓으면서, 각 자식에게 **높이 제약을 무한(unbounded)** 으로 줍니다("원하는 만큼 커도 돼"). 그런데 `ListView` 는 무한 높이를 받으면 **"내가 얼마나 커야 할지 알 수 없다"** 며 터집니다 — `Vertical viewport was given unbounded height`.

```dart
Column(children: [
  ListView(...),   // ❌ 무한 높이 제약을 받음 → 터진다
])

Column(children: [
  Expanded(child: ListView(...)),  // ✅ Expanded 가 유한한 높이 제약을 만들어 준다
])
```

`Expanded` 가 하는 일은 딱 하나 — 남은 공간을 계산해 자식에게 **유한한(bounded) 제약** 을 내려주는 것. `RenderFlex overflowed` 도 마찬가지예요. 자식들의 크기 합이 부모가 준 제약을 넘어선 겁니다. **레이아웃 에러의 열에 아홉은 "제약이 안 맞는다"는 한 문장** 으로 읽힙니다.

## 왜 이렇게 빨라도 되나 — 싱글 패스와 relayout boundary

이 규약의 숨은 이점은 **속도** 입니다. 제약이 내려가고 크기가 올라오는 게 **한 번의 트리 순회** 로 끝납니다. 웹 브라우저처럼 여러 번 reflow 하지 않아요 — 각 RenderObject 는 대체로 한 번만 방문됩니다(O(n)).

게다가 화면 일부가 바뀌어도 **전체를 다시 레이아웃하지 않습니다.** `markNeedsLayout` 은 항상 루트까지 올라가지 않고, **relayout boundary** 에서 멈춥니다.

```dart
// rendering/object.dart (3.44.8) — 여기서 위로 전파를 끊는다
void markNeedsLayout() {
  // …
  if (owner case final owner? when (_isRelayoutBoundary ?? false)) {
    owner._nodesNeedingLayout.add(this);   // 내가 경계 → 나부터 다시 레이아웃(여기서 멈춤)
    owner.requestVisualUpdate();
  } else if (parent != null) {
    markParentNeedsLayout();               // 아니면 부모로 전파
  }
}
```

어떤 노드의 크기가 **부모에게 영향을 줄 수 없으면**(제약이 꽉 조여 있거나, 부모가 자식 크기를 안 쓰면) 그 노드가 relayout boundary 가 됩니다. 그래서 리스트 항목 하나의 크기가 바뀌어도, 그 항목만 다시 레이아웃되고 **조상은 건드리지 않습니다.** (국소 크기 변경이 조상의 `performLayout` 을 다시 부르지 않는 걸 테스트로 확인했습니다.)

## 페인트와 RepaintBoundary

레이아웃(크기·위치)이 끝나면 **페인트** 입니다. 각 RenderObject 의 `paint` 가 캔버스에 그림을 그리죠. 그리고 레이아웃에 relayout boundary 가 있듯, 페인트에는 **RepaintBoundary** 가 있습니다 — 자기만의 레이어를 가져, 형제·조상이 다시 그려질 때 **같이 안 그려지게** 격리합니다.

```dart
// rendering/object.dart (3.44.8)
bool get isRepaintBoundary => false;   // RepaintBoundary 가 이걸 true 로 오버라이드
```

(RepaintBoundary 의 렌더 객체는 `isRepaintBoundary == true`, 보통 박스는 false 인 걸 테스트로 확인했습니다.) 그래서 자주 다시 그려지는 부분(애니메이션 등)을 `RepaintBoundary` 로 감싸면, 그 리페인트가 화면 전체로 번지지 않습니다.

직접 그리고 싶을 때 길은 둘입니다. **`CustomPaint` + `CustomPainter`** 는 쉬운 길(캔버스만 받아 그림). **`RenderBox` 를 직접 상속** 하는 건 깊은 길 — 레이아웃까지 손수 정의할 때 씁니다(위의 `_RenderProbe` 처럼).

## 정직하게 — 대부분은 안 내려가도 된다

- **이 층을 직접 만질 일은 드뭅니다.** 기존 위젯(Row·Column·Stack·CustomPaint 등)의 조합으로 거의 다 됩니다. `RenderBox` 직접 상속은 정말로 커스텀 레이아웃/페인트가 필요할 때만.
- **레이아웃 프로토콜은 이게 다가 아닙니다.** intrinsic 크기(`getMinIntrinsicWidth` 등), baseline, 히트 테스트, `sizedByParent`·dry layout 같은 주제가 더 있습니다. 이번 편은 "제약↓·크기↑" 라는 뼈대에 집중했습니다.
- 인용한 소스는 **3.44.8 기준** 입니다. 세부 구현은 버전에 따라 바뀌지만, "제약은 내려가고 크기는 올라온다"는 공개 규약은 유지됩니다.

## 정리 — 에러는 다시 제약으로 돌아온다

처음의 에러들을 회수합니다.

- **"unbounded / overflowed"** → 부모가 준 제약과 자식의 크기가 안 맞아서. 열쇠는 언제나 **제약**.
- **"레이아웃이 빠르다"** → 제약↓·크기↑가 싱글 패스이고, `markNeedsLayout` 이 relayout boundary 에서 멈추니까.
- **"RepaintBoundary 를 써라"** → 리페인트를 자기 레이어로 격리해 화면 전체로 안 번지게.

핵심 한 줄 — **`build` 가 "무엇을 그릴지" 라면, RenderObject 층은 "얼마나 크게, 어디에, 어떤 픽셀로" 입니다.** 그리고 그 "얼마나 크게" 는 언제나 부모가 내려준 **제약** 안에서 정해집니다. 레이아웃 에러가 무섭게 생겼어도, 대부분은 "제약이 안 맞는다"는 한 문장으로 번역됩니다.

> 네 가지 증명 테스트는 리포의 `test/renderobject_test.dart` 에 있습니다. `fvm flutter test` 로 돌려볼 수 있습니다.
