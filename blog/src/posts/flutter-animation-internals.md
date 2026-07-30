---
title: 애니메이션이 도는 법 — Ticker와 AnimationController
date: 2026-01-24
description: AnimationController에 왜 vsync를 넘기고, 왜 dispose를 해야 하고, Timer로 애니메이션을 하면 왜 끊길까요? 전부 한 사실에서 나옵니다 — 애니메이션은 별도 스레드가 아니라, 매 프레임(vsync)마다 값을 조금씩 바꾸는 것입니다. Ticker가 프레임마다 깨우고, AnimationController가 흐른 시간을 0..1 값으로, Tween과 Curve가 그 값을 화면으로 옮기죠. 6편의 프레임 파이프라인 위에서 애니메이션이 어떻게 도는지, 실제 소스와 돌아가는 테스트로 봅니다. Flutter 지하 탐사 시리즈 7편입니다.
tags: [Flutter, 애니메이션, Ticker, AnimationController, vsync, 내부구조]
category: [dev, flutter]
draft: false
---

애니메이션을 쓰다 보면 늘 나오는 의문들이 있죠.

- `AnimationController` 에 왜 **`vsync: this`** 를 넘기나. `SingleTickerProviderStateMixin` 은 뭔가.
- 왜 **`dispose`** 를 꼭 해야 하나.
- `Timer` 로 16ms 마다 갱신하면 될 것 같은데, 왜 **그러면 끊기나.**

이 셋은 전부 **한 사실** 에서 나옵니다 — **애니메이션은 별도 스레드가 아니라, 매 프레임(vsync)마다 값을 조금씩 바꾸는 것** 입니다. [6편](/blog/flutter-render-pipeline)에서 한 프레임이 어떻게 만들어지는지 봤죠. 애니메이션은 바로 그 프레임 위에서 돕니다. 이번 편에서 그 구동 장치를 뜯어봅니다.

> 💻 인용한 소스는 **Flutter 3.44.8** 의 `animation/animation_controller.dart`·`scheduler/ticker.dart`, 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/animation_test.dart` 입니다.

## Ticker — 매 프레임 깨우는 알람

애니메이션의 심장은 **Ticker** 입니다. Ticker 는 **매 프레임 콜백을 받는** 물건이에요 — 그것도 그냥 타이머가 아니라, 디스플레이의 **vsync(수직 동기)에 물려** 있습니다.

```dart
// scheduler/ticker.dart (3.44.8) — Ticker 는 프레임 콜백에 자기를 문다
_animationId = SchedulerBinding.instance.scheduleFrameCallback(_tick);
```

`scheduleFrameCallback` 은 [5편](/blog/flutter-async-isolate)·[6편](/blog/flutter-render-pipeline)에서 본 그 프레임 콜백(스케줄러의 `transientCallbacks` 단계)입니다. 그래서 Ticker 는 **디스플레이가 그릴 준비가 될 때마다** 정확히 한 번 깨어납니다. `Timer` 와 다른 지점이 여기예요 — Timer 는 디스플레이와 무관하게 도니 리프레시와 어긋나 **드리프트·끊김** 이 생기지만, Ticker 는 vsync 에 맞춰 돕니다.

`vsync: this` 가 하는 일이 이겁니다. `SingleTickerProviderStateMixin`(또는 `TickerProviderStateMixin`)이 **위젯 생명주기에 묶인 Ticker 를 제공** 하죠.

## AnimationController — 흐른 시간을 값으로

`AnimationController` 는 그 Ticker 를 타고 매 프레임 깨어나, **흐른 시간만큼 값(0..1)을 전진** 시키고 리스너에게 알립니다. 소스가 그대로 보여줍니다.

```dart
// animation/animation_controller.dart (3.44.8)
void _tick(Duration elapsed) {
  final elapsedInSeconds = elapsed.inMicroseconds / Duration.microsecondsPerSecond;
  _value = clampDouble(_simulation!.x(elapsedInSeconds), lowerBound, upperBound); // 시간 → 값
  if (_simulation!.isDone(elapsedInSeconds)) {
    _status = AnimationStatus.completed;
    stop(canceled: false);
  }
  notifyListeners(); // "값 바뀌었어" — 3편의 그 ChangeNotifier 알림
}
```

`AnimationController` 는 `Animation<double>`, 즉 **Listenable** 입니다([3편](/blog/flutter-mini-provider)의 그 notifier). 매 틱마다 흐른 시간으로 값을 계산해 `notifyListeners` 를 부르죠. (1초짜리를 500ms 진행하면 값이 0.5, 마저 채우면 1.0·completed 가 되는 걸 테스트로 확인했습니다.)

## 값이 바뀌면 리빌드 — 그래서 부드럽다

값이 바뀌면 그걸 화면에 반영해야죠. `addListener` 로 `setState` 를 부르거나, 더 흔히는 **`AnimatedBuilder`** 로 그 animation 을 구독합니다. 그러면 값이 바뀔 때마다 그 위젯이 **그 프레임의 build 단계** 에서 리빌드됩니다(6편).

```dart
AnimatedBuilder(
  animation: controller,          // 값 바뀌면 이 builder 다시 호출
  builder: (context, child) => Opacity(opacity: controller.value, child: child),
  child: const FlutterLogo(),     // 안 바뀌는 부분은 child 로 빼 리빌드 스킵(2편)
)
```

정리하면 이렇습니다 — **Ticker 가 매 프레임 깨우고 → Controller 가 값을 조금 전진시켜 알리고 → 구독한 위젯이 그 프레임에 리빌드.** 이게 프레임마다 반복되니 애니메이션이 **부드럽게** 흐릅니다. 별도 스레드는 없어요. (애니메이션이 도는 동안 AnimatedBuilder 가 프레임마다 리빌드되는 걸 테스트로 확인했습니다.)

## Tween·Curve — 0..1을 화면으로

Controller 는 **0..1** 이라는 밋밋한 숫자만 만듭니다. 그걸 실제 값과 자연스러운 움직임으로 옮기는 게 **Tween** 과 **Curve** 예요. 둘 다 **순수 함수** 입니다.

```dart
Tween<double>(begin: 10, end: 20).transform(0.5); // → 15 (begin..end 선형 보간)
Curves.easeIn.transform(0.5);                       // → 0.5 보다 작다(초반이 느림)
```

`Curve` 는 시간 0..1 을 다시 0..1 로 구부려(ease-in/out 등) 움직임을 자연스럽게 만들고, `Tween` 은 그 값을 `begin..end`(색·크기·오프셋 등)로 옮깁니다. 보통 `tween.animate(CurvedAnimation(parent: controller, curve: Curves.easeInOut))` 로 엮죠. (Tween·Curve 가 순수 매핑이라는 걸 테스트로 확인했습니다.)

## 생명주기 — dispose 와 TickerMode

이제 `dispose` 규칙이 왜 있는지 보입니다. **Ticker 는 프레임 콜백을 물고 있습니다.** 안 끊으면 위젯이 사라져도 Ticker 가 계속 깨어나 값을 돌리죠 — **리소스 누수** 이자, 죽은 위젯에 `setState` 하려다 예외가 납니다([5편](/blog/flutter-async-isolate)의 그 `mounted` 이야기). 그래서 반드시 `dispose` 에서 `controller.dispose()` 를 부릅니다.

```dart
@override
void dispose() {
  controller.dispose(); // Ticker 를 끊는다 — 안 하면 프레임마다 계속 돈다
  super.dispose();
}
```

`TickerMode` 도 여기 있습니다 — 위젯이 화면 밖(안 보이는 탭 등)에 있으면 그 아래 Ticker 들을 **자동으로 멈춰** 낭비를 막습니다.

## 정직하게 — 뼈대만 봤다

- **implicit vs explicit.** `AnimatedContainer` 같은 암시적 애니메이션은 이 Controller 를 **내부에 감춘** 것뿐입니다. 직접 `AnimationController` 를 드는 명시적 방식은 **제어(반복·역방향·동기화)** 가 필요할 때 씁니다.
- **물리 시뮬레이션.** 스프링(`SpringSimulation`) 같은 것도 같은 `_tick` 위에서 돕니다 — 값이 시간의 함수라는 점은 같아요.
- **Ticker 도 UI 스레드입니다.** 프레임이 무거워 밀리면(5편의 jank) 애니메이션도 같이 끊깁니다. 부드러운 애니메이션의 전제는 결국 **가벼운 프레임** 입니다.

## 정리 — 매 프레임 조금씩

처음의 의문들을 회수합니다.

- **"vsync 가 왜 필요한가"** → Ticker 를 디스플레이 리프레시에 맞춰 **매 프레임** 깨우려고. Timer 로는 어긋나니까.
- **"왜 dispose 하나"** → Ticker 가 프레임 콜백을 물고 있어, 안 끊으면 계속 돌며 새니까.
- **"Timer 로 하면 왜 끊기나"** → vsync 동기가 아니라 디스플레이와 어긋나니까.

핵심 한 줄 — 애니메이션은 마법이 아니라 **매 프레임 값을 조금씩 바꿔 리빌드하는 것** 입니다. Ticker 가 vsync 에 맞춰 깨우고, Controller 가 흐른 시간을 값으로, Tween·Curve 가 값을 화면으로 옮기죠. 전부 6편의 그 한 프레임 파이프라인 위에서 돕니다 — 애니메이션조차, 결국 프레임 이야기였습니다.

> 세 가지 증명 테스트는 리포의 `test/animation_test.dart` 에 있습니다. `fvm flutter test` 로 돌려볼 수 있습니다.
