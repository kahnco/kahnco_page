---
title: setState부터 픽셀까지 — 한 프레임의 여정
date: 2026-01-20
description: setState를 했는데 화면이 즉시 안 바뀌고, build에서는 위젯 크기를 못 읽고, addPostFrameCallback은 뭔가 나중에 돌죠. 전부 한 사실에서 나옵니다 — 화면은 정해진 순서의 파이프라인으로, 한 프레임에 한 번 만들어집니다. dirty 표시 + 프레임 예약부터 build→layout→paint→합성까지, WidgetsBinding.drawFrame의 실제 순서를 소스와 테스트로 따라가고, 네 번째 트리(Layer)와 16ms 예산까지 봅니다. 앞선 다섯 편이 왜 전부 이 예산을 지키기 위한 것이었는지, 시리즈를 묶는 6편입니다.
tags: [Flutter, 렌더링, 파이프라인, 프레임, Layer, 내부구조]
category: [dev, flutter]
draft: false
---

이 시리즈를 여기까지 읽었다면 이제 익숙한 의문들이 있을 겁니다.

- `setState` 를 했는데 화면이 **즉시** 안 바뀐다(다음 프레임에 바뀐다).
- `build` 안에서 위젯의 **크기(`context.size`)를 못 읽는다.**
- `addPostFrameCallback` 은 대체 **언제** 실행되나.
- "60fps", "16ms 예산" 은 무슨 말인가.

이 넷은 전부 **한 사실** 에서 나옵니다 — **화면은 정해진 순서의 파이프라인으로, 한 프레임에 한 번 만들어집니다.** [4편](/blog/flutter-renderobject-layout)에서 레이아웃을, [5편](/blog/flutter-async-isolate)에서 프레임이 이벤트 루프의 콜백이라는 걸 봤죠. 이번엔 그 둘을 이어, **한 프레임의 전체 여정** 을 따라갑니다. 시리즈를 묶는 편입니다.

> 💻 인용한 소스는 **Flutter 3.44.8** 의 `widgets/binding.dart`·`rendering/binding.dart`, 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/render_pipeline_test.dart` 입니다.

## 무언가 바뀌면 — dirty 표시하고 프레임을 예약한다

`setState` 는 화면을 **즉시** 바꾸지 않습니다. 그저 그 Element 를 **dirty 로 표시** 하고(1편의 `markNeedsBuild`), **다음 프레임을 예약** 할 뿐이에요. 실제 리빌드는 그 프레임이 돌 때 일어납니다.

```dart
key.currentState!.bump();          // setState — dirty 표시 + 프레임 예약
expect(buildCount, 1);             // 아직 리빌드 안 됨

await tester.pump();               // 예약된 프레임 실행
expect(buildCount, 2);             // 이제 리빌드됨
```

그래서 한 프레임 사이에 `setState` 를 세 번 하든 열 번 하든, **리빌드는 한 번** 입니다. dirty 표시는 멱등이라, 다음 프레임에 몰아서(batching) 한 번만 처리하거든요. (세 번 `setState` 해도 `buildCount` 가 1만 오르는 걸 테스트로 확인했습니다.) "상태를 바꿀 때마다 화면이 다시 그려지는 것 아냐?" 하는 걱정이 여기서 풀립니다.

## 한 프레임의 순서 — WidgetsBinding.drawFrame

엔진이 vsync 신호를 주면, Flutter 는 `drawFrame` 을 실행합니다. 그 안이 파이프라인이에요. 소스를 보면 순서가 대놓고 드러납니다.

```dart
// widgets/binding.dart (3.44.8) — 먼저 build
void drawFrame() {
  buildOwner!.buildScope(rootElement!);   // ① build: dirty Element 리빌드(1편)
  super.drawFrame();                       // ↓ 나머지 파이프라인
}

// rendering/binding.dart (3.44.8) — 그다음 layout → paint → 합성
void drawFrame() {
  rootPipelineOwner.flushLayout();          // ② layout: 크기·위치 확정(4편)
  rootPipelineOwner.flushCompositingBits();
  rootPipelineOwner.flushPaint();           // ③ paint: 레이어에 그리기
  for (final renderView in renderViews) {
    renderView.compositeFrame();            // ④ 합성: Scene 을 GPU 로 보낸다
  }
  rootPipelineOwner.flushSemantics();       // ⑤ 접근성 트리
}
```

**build → layout → paint → 합성.** 이 순서는 고정입니다. (한 프레임 안에서 build 순번 < layout 순번 < paint 순번 < postFrame 순번인 걸 테스트로 확인했습니다.) 5편에서 본 `SchedulerPhase`(idle → transientCallbacks → persistentCallbacks → postFrameCallbacks)의 `persistentCallbacks` 단계가 바로 이 `drawFrame` 이고요.

## 그래서 그 규칙들이 나온다

파이프라인 순서 하나로 처음의 의문들이 풀립니다.

- **`build` 에서 크기를 못 읽는다** → **layout 이 build 다음** 이니까. build 하는 시점엔 아직 크기가 안 정해졌어요. 크기가 필요하면 `LayoutBuilder`(레이아웃 시점에 제약을 받아 build)나 `addPostFrameCallback`(파이프라인 끝) 을 씁니다.
- **`setState` 가 즉시 반영 안 된다** → 다음 프레임의 build 에서 처리하니까.
- **`addPostFrameCallback` 이 나중에 돈다** → 이름 그대로 **프레임 끝**(paint·합성 뒤)에 도니까. 그래서 여기선 크기·위치를 안전하게 읽을 수 있죠.

## 네 번째 트리 — Layer 와 두 개의 스레드

여기서 트리가 하나 더 나옵니다. `paint` 는 **픽셀을 직접 그리지 않습니다.** 대신 **Layer 트리** 라는 "합성 지시서"를 만들어요. 그리고 `compositeFrame` 이 그걸 **Scene** 으로 묶어 엔진에 넘깁니다.

그 Scene 을 실제 픽셀로 **래스터(rasterize)** 하는 건 **별도의 raster(GPU) 스레드** 입니다. 정리하면 두 스레드로 나뉘어요.

- **UI 스레드**(Dart 아이솔레이트, 5편) — build·layout·paint 로 **"무엇을 어디에"** 를 담은 Layer 트리를 만든다.
- **Raster 스레드**(GPU) — 그 Layer 트리를 받아 **실제 픽셀** 로 그린다.

[4편](/blog/flutter-renderobject-layout)의 `RepaintBoundary` 가 여기서 값을 합니다 — 자기만의 Layer 를 가져, 그 부분만 따로 래스터되게 하죠. 그리고 5편의 결론과 이어집니다 — **Dart 파이프라인은 UI 아이솔레이트 한 스레드에서 도니까, 그게 막히면 이 프레임 전체가 안 나옵니다.**

## 16ms — 프레임 예산

이 모든 게 **시간 안** 에 끝나야 합니다. 60fps 면 **16.6ms 마다** 한 프레임이 나와야 해요. build + layout + paint 가 그 안에 안 끝나면, 그 프레임을 **놓칩니다**(dropped frame) — 그게 버벅임입니다(5편의 jank 를 이 층위에서 다시 본 거죠). 120Hz 화면이면 예산은 **8.3ms** 로 더 빡빡해집니다.

그래서 이 시리즈에서 본 것들이 **전부 이 16ms 를 지키기 위한 장치** 였습니다.

- **`const`·재조정**(2편) — 안 바뀐 서브트리는 build·layout·paint 를 스킵.
- **InheritedWidget 구독**(1·3편) — 바뀐 걸 보는 위젯만 리빌드.
- **relayout·RepaintBoundary**(4편) — 국소 변경이 전체로 안 번지게.
- **아이솔레이트**(5편) — 무거운 계산을 UI 스레드 밖으로 빼 파이프라인을 안 막게.

## 정직하게 — 뼈대만 봤다

- 실제 `drawFrame` 엔 더 있습니다 — `transientCallbacks`(애니메이션 tick), 시맨틱스, 첫 프레임 처리, 이미지 디코딩 스케줄 등. 이번 편은 build→layout→paint→합성이라는 **뼈대** 에 집중했습니다.
- **드물게** "즉시 반영"이 필요하면 `SchedulerBinding` 으로 프레임을 강제하거나 스케줄을 만질 수 있지만, 대부분은 프레임워크에 맡기면 됩니다.
- 인용한 소스는 **3.44.8 기준**. 세부는 버전에 따라 바뀌어도 build→layout→paint 라는 순서는 유지됩니다.

## 정리 — 화면은 "즉시"가 아니라 "다음 프레임에 한 번"

처음의 의문들을 회수합니다.

- **"setState 가 즉시 반영 안 된다"** → dirty 를 모아 **다음 프레임** 의 build 에서 처리하니까.
- **"build 에서 크기를 못 읽는다"** → **layout 이 build 다음** 이라, build 시점엔 크기가 없으니까.
- **"16ms 예산"** → build→layout→paint 가 그 안에 끝나야 프레임을 안 놓치니까.

핵심 한 줄 — 화면은 "상태를 바꾸면 즉시"가 아니라, **dirty 를 모아 다음 vsync 에 build→layout→paint→합성을 한 번에 흘려** 만들어집니다. Flutter 의 부드러움은 이 파이프라인이 16ms 안에 드느냐에 달렸고, 이 시리즈에서 파고든 구독·재조정·제약·아이솔레이트가 **전부 그 예산을 지키기 위한 것** 이었습니다. 여섯 편을 지나고 나면, `setState` 한 줄 뒤에서 벌어지는 일이 처음부터 끝까지 손에 잡힙니다.

> 세 가지 증명 테스트는 리포의 `test/render_pipeline_test.dart` 에 있습니다. `fvm flutter test` 로 돌려볼 수 있습니다.
