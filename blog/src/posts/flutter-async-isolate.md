---
title: UI가 얼어붙는 이유 — 이벤트 루프와 아이솔레이트
date: 2026-01-16
description: 무거운 계산을 하면 UI가 얼어붙고(jank), async를 붙여도 안 풀리고, print 순서는 이상하죠. 전부 한 사실에서 나옵니다 — Dart는 한 스레드(이벤트 루프 하나)에서 돕니다. async는 스레드가 아니라 그 루프에 "이어서 실행"을 예약하는 것일 뿐이에요. 실행 순서(동기→마이크로태스크→이벤트), async 함수의 동기 첫 줄, 프레임이 왜 밀리는지, 그리고 진짜 병렬을 위한 아이솔레이트까지 — 결정적인 순서를 돌아가는 테스트로 증명합니다. Flutter 지하 탐사 시리즈 5편입니다.
tags: [Flutter, Dart, 비동기, 이벤트루프, 아이솔레이트, async]
category: [dev, flutter]
draft: false
---

Flutter 를 하다 보면 이런 것들에 부딪힙니다.

- 무거운 계산을 한 줄 넣었더니 **UI 가 얼어붙는다**(스크롤이 뚝뚝 끊긴다).
- `async` 를 붙였는데도 여전히 멈춘다.
- `print` 순서가 이상하다 — `Future` 안 게 왜 나중에 찍히지?

이 셋은 전부 **한 사실** 에서 나옵니다 — **Dart 코드는 한 스레드, 이벤트 루프 하나에서 돕니다.** [1편](/blog/flutter-buildcontext-internals)에서 "`await` 는 다른 스레드가 아니다"라고 짚고 넘어갔죠. 이번 편에서 그 루프를 직접 들여다봅니다. 그리고 늘 그렇듯, 마지막에 저 세 현상으로 돌아옵니다.

> 💻 이 글의 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/async_isolate_test.dart` 에 있습니다. 순서가 **결정적** 이라 테스트로 딱 못박힙니다.

## 한 스레드, 두 개의 큐

Dart 코드는 한 아이솔레이트의 **이벤트 루프** 하나에서 돕니다. 이 루프에는 큐가 둘 있어요.

- **마이크로태스크 큐** — 우선순위 높음. `scheduleMicrotask`, `Future.microtask`, 그리고 `await` 재개가 여기로.
- **이벤트 큐(태스크)** — `Future(() => …)`, `Timer`, I/O 완료, 그리고 **프레임 그리기** 가 여기로.

순서는 언제나 같습니다 — **지금 동기 코드를 끝까지 → 마이크로태스크 큐를 전부 비우고 → 이벤트 큐에서 하나** → 다시 마이크로태스크 → 이벤트 하나 … 반복.

```dart
final order = <String>[];
order.add('sync-1');
scheduleMicrotask(() => order.add('microtask-1'));
Future(() => order.add('event-1'));               // 이벤트 큐
Future.microtask(() => order.add('microtask-2')); // 마이크로태스크 큐
order.add('sync-2');
await Future<void>(() {}); // 루프를 한 바퀴 돌린다

expect(order, [
  'sync-1', 'sync-2',              // 동기 코드가 먼저
  'microtask-1', 'microtask-2',    // 그다음 마이크로태스크 전부
  'event-1',                       // 마지막에 이벤트
]);
```

`print` 순서가 이상했던 이유가 이겁니다 — `Future(() => print(...))` 는 **이벤트 큐** 로 가서, 지금 동기 코드와 모든 마이크로태스크가 끝난 뒤에야 실행됩니다.

## async/await 는 스레드가 아니라 예약이다

가장 흔한 오해. `async` 는 "이걸 딴 스레드에서 돌려"가 **아닙니다.** async 함수의 몸통은 **첫 `await` 를 만나기 전까지 동기로** 실행되고, `await` 에서 **루프에 양보** 한 뒤 나머지는 나중에 마이크로태스크로 재개됩니다.

```dart
Future<void> foo() async {
  order.add('foo-start');        // 호출 즉시 동기로 실행
  await null;                    // 여기서 루프에 양보
  order.add('foo-after-await');  // 나중에 재개
}

order.add('before');
final f = foo();          // foo-start 가 여기서 "즉시" 실행됨
order.add('after-call');
await f;

expect(order, ['before', 'foo-start', 'after-call', 'foo-after-await']);
```

`foo()` 를 부르면 `foo-start` 가 **그 자리에서 동기로** 실행되고, `await` 를 만나서야 제어가 돌아옵니다. 그래서 `after-call` 이 `foo-after-await` 보다 먼저죠. **async 는 병렬이 아닙니다.** `await` 하는 동안 다른 일이 끼어들 틈을 줄 뿐, 계산 자체는 여전히 같은 스레드에서 합니다.

## 그래서 무거운 계산이 UI 를 얼린다

여기서 UI 가 얼어붙는 이유가 드러납니다. **프레임 그리기도 이 루프의 콜백** 이거든요. Flutter 의 스케줄러는 프레임을 여러 단계로 나눠 루프에서 실행합니다.

```dart
// scheduler/binding.dart (3.44.8) — 한 프레임은 이 단계들을 거친다
enum SchedulerPhase {
  idle,                // 프레임 사이(대기)
  transientCallbacks,  // 애니메이션 tick
  midFrameMicrotasks,
  persistentCallbacks, // build → layout → paint (4편의 그 파이프라인)
  postFrameCallbacks,
}
```

이 프레임 콜백은 **이벤트 큐** 에서 자기 차례를 기다립니다. 그런데 여러분이 `for` 루프로 100만 번 계산을 돌리면, 그 **동기 코드가 끝날 때까지 루프가 막혀** 프레임 콜백이 못 돕니다. 60fps 면 16ms 마다 프레임이 나와야 하는데, 계산이 100ms 걸리면 그동안 프레임이 없죠 — 그게 **버벅임(jank)** 입니다.

그리고 **`async` 로 감싸도 소용없습니다.** `await` 없는 무거운 `for` 루프는 여전히 루프를 통째로 막아요. async 는 일을 잘게 **나눠주지 않습니다.** 진짜로 다른 데서 돌려야 합니다.

## 무거운 일은 아이솔레이트로

Dart 에서 **진짜 병렬** 은 아이솔레이트입니다. 별도의 **힙 + 스레드** 를 갖죠. CPU 무거운 일(파싱·이미지 처리·암호)은 `Isolate.run`(또는 `compute`)으로 넘깁니다.

```dart
// 별도 아이솔레이트는 top-level 을 공유하지 않는다(별도 힙)
globalCounter = 100;
final inIsolate = await Isolate.run(() => ++globalCounter);
expect(inIsolate, 1);       // 새 아이솔레이트는 메인의 100 을 못 본다
expect(globalCounter, 100); // 메인 힙도 그대로

// CPU 무거운 계산을 다른 스레드로 넘기고, 결과(순수 데이터)만 받는다
final sum = await Isolate.run(() {
  var s = 0;
  for (var i = 0; i < 1000000; i++) { s += i; }
  return s;
});
expect(sum, 499999500000);
```

핵심은 **아이솔레이트가 메모리를 공유하지 않는다** 는 것(1편에서 본 그 성질). 그래서 넘길 수 있는 건 **순수 데이터뿐** 이고, `BuildContext` 같은 객체는 경계를 못 넘습니다. 무거운 계산을 아이솔레이트에 보내 UI 루프를 비워 두고, 결과를 받아 다시 UI 아이솔레이트에서 화면을 갱신하는 거죠. `compute()` 는 이 `Isolate.run` 의 얇은 래퍼입니다.

## 정직하게 — 아이솔레이트가 늘 답은 아니다

- **대부분의 async I/O 는 아이솔레이트가 필요 없습니다.** 네트워크·파일 대기는 루프를 **막지 않아요** — 엔진이 비동기로 처리하다가 완료되면 이벤트로 알려 줍니다. 그동안 루프는 다른 일(프레임 포함)을 계속합니다. 아이솔레이트는 **CPU 로 오래 도는 일** 에만 필요합니다.
- **아이솔레이트도 공짜가 아닙니다.** 생성 비용과, 주고받는 데이터의 직렬화 비용이 듭니다. 작은 일엔 오히려 손해예요.
- **마이크로태스크 폭주를 조심하세요.** 마이크로태스크가 끝없이 자기를 다시 예약하면, 이벤트 큐(프레임 포함)가 영영 차례를 못 얻습니다(starvation).

## 정리 — 동시성은 "나눠서 번갈아"다

처음의 세 현상을 회수합니다.

- **"무거운 계산 = UI 멈춤"** → 프레임도 이 단일 루프의 콜백이라, 동기 계산이 루프를 막으면 프레임이 밀리니까.
- **"async 가 안 빠르다"** → async 는 스레드가 아니라 **루프 예약** 이라, 병렬이 아니니까.
- **"print 순서가 이상하다"** → 언제나 동기 → 마이크로태스크 → 이벤트 순서니까.

핵심 한 줄 — **Dart 의 동시성은 "여러 스레드"가 아니라 "한 스레드가 일을 잘게 나눠 번갈아 하는 것"** 입니다. `async` 는 기다리는 동안 남에게 순서를 양보하는 **예의** 일 뿐, 일을 대신 해주진 않아요. 진짜로 대신 시키려면 — 아이솔레이트입니다.

> 네 가지 증명 테스트는 리포의 `test/async_isolate_test.dart` 에 있습니다. `fvm flutter test` 로 돌려볼 수 있습니다.
