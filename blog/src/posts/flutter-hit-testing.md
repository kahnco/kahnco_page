---
title: 부모 밖 버튼이 안 눌리는 이유 — 히트 테스트
date: 2026-02-01
description: 부모 밖으로 삐져나온 버튼은 왜 안 눌리고, Stack에서 위 위젯이 왜 탭을 먼저 먹고, IgnorePointer와 AbsorbPointer는 뭐가 다를까요? 전부 히트 테스트에서 나옵니다 — 포인터가 내려오면 RenderObject 트리를 훑어 "무엇을 맞혔나"를 정하죠. size 안인가 → 자식(앞부터) → 나 자신, 이 세 줄의 규칙과 그 결과가 8편의 아레나로 가는 흐름을 실제 소스와 돌아가는 테스트로 봅니다. Flutter 지하 탐사 시리즈 9편입니다.
tags: [Flutter, 히트테스트, 포인터, RenderObject, IgnorePointer, 내부구조]
category: [dev, flutter]
draft: false
---

[8편](/blog/flutter-gesture-arena)에서 제스처는 "포인터 하나를 두고 여러 후보가 겨루는 아레나"라고 했습니다. 그럼 애초에 **누가 그 링에 오르느냐** — 그게 이번 편입니다. 답은 **히트 테스트** 이고, 이걸 알면 이런 것들이 풀립니다.

- 부모 밖으로 삐져나온 버튼(음수 `Positioned`, `Transform`, overflow)은 **왜 안 눌리나.**
- `Stack` 에서 **위 위젯이 왜 탭을 먼저 먹나.**
- `IgnorePointer` 와 `AbsorbPointer` 는 **뭐가 다른가.**

> 💻 인용한 소스는 **Flutter 3.44.8** 의 `rendering/box.dart`, 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/hittest_test.dart` 입니다.

## 히트 테스트 — 포인터가 무엇을 맞혔나

포인터가 내려오면, Flutter 는 **RenderObject 트리를 훑어** 그 위치에 걸린 것들을 모읍니다. 결과는 **앞→뒤 순서의 리스트**(`HitTestResult`)예요 — 맨 위(가장 앞)에 걸린 것부터. 그리고 그 리스트에 든 render object 의 제스처 인식기들이 [8편](/blog/flutter-gesture-arena)의 **아레나로** 갑니다.

그래서 히트 테스트는 **layout 다음** 입니다 — 크기·위치가 정해져야 "어디에 걸렸나"를 알 수 있으니까요([4편](/blog/flutter-renderobject-layout)·[6편](/blog/flutter-render-pipeline)). 실제로 레이아웃 안 된 박스를 히트 테스트하면 예외가 납니다.

## 규칙 세 줄 — size 안인가 → 자식 → 나 자신

`RenderBox.hitTest` 의 핵심은 딱 이만큼입니다.

```dart
// rendering/box.dart (3.44.8)
bool hitTest(BoxHitTestResult result, {required Offset position}) {
  if (_size!.contains(position)) {                    // (1) 내 size 안인가?
    if (hitTestChildren(result, position: position)   // (2) 자식들(앞에 그린 것부터)
        || hitTestSelf(position)) {                   // (3) 나 자신
      result.add(BoxHitTestEntry(this, position));
      return true;
    }
  }
  return false;                                       // size 밖이면 자식도 안 본다
}
```

이 짧은 코드에 이번 편의 답이 다 들어 있습니다. **(1)** 내 크기 안에 있어야 하고 — 밖이면 **자식은 아예 안 봅니다**(그냥 `return false`). **(2)** 자식을 **앞에 그린 것부터** 보고, **(3)** 마지막에 나 자신. 하나라도 걸리면 결과에 추가하고 멈춥니다.

## 위가 먼저 먹는다

자식을 **앞(위)부터** 보고 걸리면 거기서 멈추니, 겹친 위젯 중 **위에 있는 게 탭을 먹습니다.** `Stack` 은 마지막 자식이 위죠.

```dart
Stack(children: [gd(() => bottom++), gd(() => top++)]) // top 이 위(마지막)
// 겹친 중앙을 탭하면 →
expect(top, 1);     // 위가 먼저 히트되어 먹는다
expect(bottom, 0);  // 아래는 위가 흡수해서 못 받는다(opaque)
```

(위가 탭을 먹고 아래는 못 받는 걸 테스트로 확인했습니다.) "왜 위 위젯이 탭을 먼저 받나"의 답이 이겁니다 — 히트 테스트가 앞부터 훑으니까.

## 부모 밖 자식은 안 잡힌다

규칙 **(1)** 을 다시 보세요 — `_size!.contains(position)` 이 **먼저** 입니다. 포인터가 부모의 크기 **밖** 이면, 그 안에 아무리 자식이 그려져 있어도 **자식을 보지도 않고** `return false` 합니다.

그래서 자식을 부모 **바깥** 으로 밀어낸 경우 — 음수 `Positioned`, `Transform.translate`, `OverflowBox`, `clipBehavior: Clip.none` 로 삐져나온 버튼 — 그 버튼은 **눈에는 보여도 안 눌립니다.** 부모의 히트 테스트가 자기 크기 밖이라며 그 지점을 걸러 버리거든요. 흔히 겪는 "버튼이 부모 밖으로 나가니 안 눌린다"의 정체입니다. 해법은 **히트 가능한 부모가 그 지점을 덮게** 만드는 것(부모를 키우거나 구조를 바꾸거나)입니다.

## 통과와 흡수 — IgnorePointer, AbsorbPointer

같은 위치라도 **뒤로 통과시킬지, 막을지** 를 고르는 위젯들이 있습니다.

- **`IgnorePointer`** — 히트 테스트에서 **자기를 빼서**, 포인터를 **뒤로 통과** 시킵니다.
- **`AbsorbPointer`** — 자기가 **흡수** 해서, 자식도 뒤도 **막습니다.**

```dart
Stack([gd(back), IgnorePointer(child: gd(front))]);
// → front 0, back 1  (위가 투명해 뒤로 통과)

Stack([gd(back), AbsorbPointer(child: gd(front))]);
// → front 0, back 0  (위가 흡수해 둘 다 막힘)
```

(IgnorePointer 는 뒤로 통과시키고, AbsorbPointer 는 둘 다 막는 걸 테스트로 확인했습니다.) 그리고 [8편](/blog/flutter-gesture-arena)의 `HitTestBehavior` 도 여기 연결됩니다 — `opaque`(자기를 히트), `translucent`(자기도 히트 + 뒤도 통과), `deferToChild`(자식이 히트될 때만). 전부 위 `hitTest`/`hitTestSelf` 를 어떻게 구현하느냐의 문제예요.

## 정직하게 — 더 있는 것들

- 히트 테스트에는 `BoxHitTestResult` 외에 **Sliver** 등 다른 프로토콜, `Transform` 아래의 **좌표 변환**(역행렬로 위치를 바꿔 자식에 전달), 다중 포인터가 더 있습니다. 이번 편은 박스의 세 줄 규칙에 집중했습니다.
- **시맨틱스(접근성)** 는 별개의 트리로, 스크린 리더의 "탭"은 또 다른 경로를 탑니다.
- 소스는 **3.44.8 기준**. 세부는 바뀌어도 "size 안 → 자식 → 자신" 이라는 뼈대는 유지됩니다.

## 정리 — 탭은 누구에게 가나

처음의 의문들을 회수합니다.

- **"부모 밖 버튼이 안 눌린다"** → `size.contains` 가 먼저라, 밖이면 자식을 안 보니까.
- **"위 위젯이 먼저 먹는다"** → 자식을 **앞부터** 훑고 걸리면 멈추니까.
- **"Ignore vs Absorb"** → 하나는 뒤로 통과, 하나는 흡수해 차단.

핵심 한 줄 — 탭이 **누구에게** 가는지는 히트 테스트가 정합니다. **size 안 → 자식(앞부터) → 자신** 순으로 트리를 훑어 앞→뒤 리스트를 만들고, 그 결과가 [8편](/blog/flutter-gesture-arena)의 아레나로 가죠. 그래서 부모 밖은 안 눌리고, 위가 먼저 먹습니다. 포인터가 화면에 닿는 순간부터 콜백이 불리기까지 — 이제 그 전 여정이 손에 잡힙니다.

> 세 가지 증명 테스트는 리포의 `test/hittest_test.dart` 에 있습니다. `fvm flutter test` 로 돌려볼 수 있습니다.
