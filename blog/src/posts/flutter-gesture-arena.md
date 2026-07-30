---
title: 끌면 탭이 취소되는 이유 — 제스처 아레나
date: 2026-01-28
description: 스크롤 리스트 안에서 항목은 탭이 되는데, 끌면 탭이 취소되고 스크롤이 되죠. GestureDetector 두 개가 겹치면 누가 이기고, Listener는 GestureDetector와 뭐가 다를까요? 전부 한 메커니즘에서 나옵니다 — 제스처 아레나. 포인터 하나를 두고 여러 인식기(tap·drag·scroll)가 경쟁하고, 움직임이 승부를 가릅니다. 원시 포인터부터 아레나 resolve/sweep, HitTestBehavior까지 실제 소스와 돌아가는 테스트로 봅니다. Flutter 지하 탐사 시리즈 8편입니다.
tags: [Flutter, 제스처, GestureDetector, 아레나, 포인터, 내부구조]
category: [dev, flutter]
draft: false
---

제스처는 은근히 헷갈립니다.

- 스크롤 리스트 안에서 항목은 **탭이 되는데**, 손가락을 조금 끌면 **탭이 취소되고 스크롤** 이 된다.
- `GestureDetector` 두 개가 겹치면 **누가 이기나?**
- `Listener` 랑 `GestureDetector` 는 대체 뭐가 **다른가?**

이 셋은 전부 **한 메커니즘** 에서 나옵니다 — **제스처 아레나(gesture arena)**. 포인터 하나를 두고 여러 인식기가 링에 올라 겨루고, 움직임이 승부를 가르죠. 이번 편에서 그 링을 들여다봅니다. 그리고 "누가 링에 오르는가"는 다음 편(히트 테스트)으로 이어집니다.

> 💻 인용한 소스는 **Flutter 3.44.8** 의 `gestures/arena.dart`, 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/gesture_test.dart` 입니다.

## 맨 아래는 원시 포인터 — Listener

제스처의 맨 밑바닥에는 **원시 포인터 이벤트** 가 있습니다 — `PointerDownEvent`, `PointerMoveEvent`, `PointerUpEvent`. 이건 "손가락이 여기 닿았다/움직였다/뗐다"는 날것의 사실일 뿐, "탭"이나 "드래그" 같은 의미는 아직 없어요. 이 원시 이벤트를 그대로 받는 게 **`Listener`** 입니다.

`GestureDetector` 는 그 위에 **인식기(recognizer)** 를 얹어, 원시 포인터들을 모아 "탭·드래그·스케일" 같은 **의미** 로 해석합니다. 그래서 둘의 결정적 차이는 이겁니다 — **`Listener` 는 아레나와 무관하게 매 포인터를 받고, `GestureDetector` 는 아레나를 거친 "해석된 제스처"를 받습니다.**

```dart
await tester.tap(...);
expect(pointerDowns, 1); // Listener — 원시 포인터
expect(taps, 1);         // GestureDetector — 해석된 제스처

await tester.drag(..., const Offset(120, 0));
expect(pointerDowns, 2); // Listener 는 끌어도 매 포인터를 받는다
expect(taps, 1);         // 하지만 탭은 발동 안 함(드래그가 이겼으니)
```

(끌어도 `Listener` 의 `onPointerDown` 은 그대로 오지만, `onTap` 은 안 오는 걸 테스트로 확인했습니다.)

## 아레나 — 하나의 포인터, 여러 후보

포인터가 내려오면, 그 자리에서 반응할 수 있는 인식기들이 **아레나에 등록** 됩니다(tap 하나, drag 하나, scroll 하나…). 그리고 포인터가 움직이는 동안 하나씩 **승리를 선언하거나 패배** 합니다. 소스로 보면 규칙이 둘이에요.

```dart
// gestures/arena.dart (3.44.8)
// (1) 포인터를 뗄 때까지 아무도 안 나서면 → 첫 멤버가 이기고 나머지는 진다
void sweep(int pointer) {
  // …
  state.members.first.acceptGesture(pointer);          // 첫 후보 승
  for (var i = 1; i < state.members.length; i++) {
    state.members[i].rejectGesture(pointer);           // 나머지 패
  }
}

// (2) 도중에 한 멤버가 "내가 확실해" 하고 나서면 → 그가 즉시 이기고 나머지는 진다
void resolve(GestureDisposition disposition) { /* accepted → 그가 승 */ }
```

**탭** 은 움직임이 없으니 아무도 강하게 나서지 않다가, 포인터를 뗄 때 `sweep` 으로 **첫 후보(tap)가 이깁니다.** 반면 손가락을 **충분히 끌면** 드래그 인식기가 "이건 드래그다"라며 `resolve(accepted)` 로 **즉시 이기고**, 탭은 그 자리에서 **패배(취소)** 합니다.

```dart
await tester.tap(...);          // 움직임 없음
expect(taps, 1); expect(drags, 0);   // sweep → tap 승

await tester.drag(..., const Offset(120, 0)); // 충분히 끌기
expect(drags, greaterThan(0));       // resolve → drag 승
expect(taps, 1);                     // tap 은 취소(안 늘어남)
```

## 그래서 스크롤 속에서도 탭이 된다

이제 그 헷갈리던 동작들이 풀립니다.

**스크롤 리스트 안의 항목** — 손가락을 가만히 뗐다 하면(움직임 없음) `sweep` 으로 **탭 승**, 조금이라도 끌면 스크롤(drag)이 **resolve 로 승** 하고 탭은 취소됩니다. 그래서 "탭도 되고 스크롤도 되는" 자연스러운 동작이 나오는 거예요 — 아레나가 그 **애매함을 대신 풀어** 줍니다.

**겹친 `GestureDetector` 들** 도 같은 링에 함께 올라 경쟁합니다. 각자 자기 제스처를 주장하고, 움직임과 순서에 따라 아레나가 하나를 고르죠. "누가 이기나"는 곧 "누가 먼저 `resolve` 로 확신하느냐"의 문제입니다.

## 누가 링에 오르나 — 히트 테스트와 HitTestBehavior

그런데 애초에 **어떤 인식기가 아레나에 등록되나요?** 포인터가 내려온 **그 위치를 히트 테스트** 해서, 걸린 위젯들의 인식기가 오릅니다. 그래서 이런 흔한 함정이 생겨요 — **투명한(그리는 게 없는) 영역은 탭이 안 잡힙니다.** 히트가 안 되니 아레나에 오르지도 못하거든요.

`HitTestBehavior` 로 이걸 조절합니다. `opaque` 는 그 영역을 **무조건 히트 대상** 으로 만들어, 빈 공간의 탭도 잡히게 하죠.

```dart
GestureDetector(
  behavior: HitTestBehavior.opaque, // 투명해도 이 영역을 히트로 친다
  onTap: ...,
  child: const SizedBox(width: 120, height: 120),
)
```

(opaque 면 투명한 `SizedBox` 영역의 탭도 잡히는 걸 테스트로 확인했습니다.) `deferToChild`(기본)는 자식이 히트될 때만, `translucent` 는 자기도 히트되면서 **뒤쪽까지** 통과시킵니다. 이 "히트 테스트가 무엇을 어떻게 고르는가"가 바로 **다음 편의 주제** 입니다.

## 정직하게 — 아레나는 더 복잡하다

- 실제 아레나는 **다중 포인터**(멀티터치), 오래 잡아 두는 멤버(`isHeld`, 롱프레스), 지연 인식 등으로 더 정교합니다. 이번 편은 "경쟁하고 하나가 이긴다"는 뼈대에 집중했습니다.
- 커스텀 제스처가 필요하면 **`RawGestureDetector`** 로 인식기를 직접 등록합니다.
- **`Listener`(원시 포인터)를 직접 쓸 일은 드뭅니다** — 대부분 `GestureDetector` 로 충분하고, 아레나가 애매함을 풀어 주니까요.

## 정리 — 포인터 하나를 두고 겨루는 링

처음의 의문들을 회수합니다.

- **"끌면 탭이 취소된다"** → 드래그가 `resolve` 로 이기면서 탭이 패배하니까.
- **"겹친 detector 는 누가 이기나"** → 같은 아레나에서 먼저 확신하는 쪽이니까.
- **"Listener vs GestureDetector"** → 원시 포인터냐, 아레나를 거친 해석된 제스처냐.

핵심 한 줄 — 제스처는 **포인터 하나를 두고 여러 후보가 겨루는 아레나** 입니다. 움직임이 승부를 가르고(끌면 drag, 가만두면 tap), 애초에 **누가 링에 오르는지는 히트 테스트가** 정하죠. 그 히트 테스트를, 다음 편에서 파고듭니다.

> 세 가지 증명 테스트는 리포의 `test/gesture_test.dart` 에 있습니다. `fvm flutter test` 로 돌려볼 수 있습니다.
