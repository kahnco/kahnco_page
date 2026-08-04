---
title: 조립된 앱이 진짜로 도는지 — 통합 테스트로 시리즈를 닫다
date: 2026-02-21
description: 계층마다 테스트는 다 초록이었습니다. 그런데 실제 컨테이너로 조립하고 실제 SQLite에 붙였을 때 전부 맞물려 도는지는, 따로 증명해야 합니다. 실제 조립 루트로 앱을 부팅해 bloc→유스케이스→repository→sqflite까지 관통하고, 파일 DB로 '재시작'해 데이터가 살아남는지까지 확인합니다. 그 과정에서 pumpAndSettle이 실제 IO를 못 몰아 무한히 도는 함정도 정직하게 짚고, 다섯 편으로 쌓은 앱을 회고하며 실전 시리즈를 닫습니다. Flutter 실전 시리즈 5편(마지막)입니다.
tags: [Flutter, 통합테스트, integration, sqflite, 의존성주입, 회고]
category: [dev, flutter]
draft: false
---

[1편](/blog/flutter-app-architecture)부터 [4편](/blog/flutter-app-sqflite)까지, 계층마다 테스트를 붙였습니다. 값 객체 검증, 유스케이스 위임, 리포지토리 오류 매핑, bloc 상태 스트림, 위젯 상호작용, 실제 SQL — 전부 초록이었죠. 그런데 여기엔 아직 안 본 게 하나 있습니다.

단위 테스트는 **가짜로 계층을 격리해서** 봅니다. bloc 테스트는 인메모리 저장소를 물렸고, 위젯 테스트는 `fake` 환경으로 돌았고, 리포지토리 테스트는 손으로 조립했어요. 정작 **실제 컨테이너가 조립한 그래프**가, **실제 SQLite** 에 붙어서, **끝에서 끝까지** 맞물려 도는지는 — 아무도 안 봤습니다. 그게 이 마지막 편의 규칙입니다.

> **규칙 — 계층이 각각 초록인 것과, 조립된 전체가 도는 것은 다른 문제다.**

앱을 실제 조립 루트로 부팅해 전 계층을 관통시키고, 저장한 데이터가 재시작 후에도 살아남는지 봅니다. 그리고 그 과정에서 제가 실제로 헛디딘 함정도 정직하게 나누고, 다섯 편을 회고하며 시리즈를 닫겠습니다.

> 💻 코드는 **Flutter 3.44.8**, 통합 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/app_integration_test.dart` 입니다.

## 왜 통합이 따로 필요한가

단위 테스트가 초록인데 앱이 안 도는 일은 흔합니다. 이유는 단위 테스트가 **이음매를 안 보기** 때문이에요. 각 계층을 가짜 이웃으로 격리해서, "이 조각은 제 역할을 한다"만 증명하죠. 하지만 실제 앱에서 문제는 **조각 사이**에서 터집니다 — DI 배선이 어긋나거나, 실제 저장소가 인메모리와 미묘하게 다르게 굴거나, `@preResolve` 로 여는 DB 가 제때 준비되지 않거나.

그래서 통합 테스트는 정반대로 갑니다. **아무것도 가짜로 두지 않고**, 실제 조립 루트로 그래프를 세워 실제 저장소까지 관통시킵니다. [4편](/blog/flutter-app-sqflite)에서 붙인 sqflite, 그걸 여는 `@preResolve` 모듈, `injectable` 이 생성한 배선 — 이 이음매들이 실제로 맞물리는지를 보는 거죠.

```dart
setUpAll(() {
  sqfliteFfiInit();
  databaseFactory = databaseFactoryFfi; // 앱의 openDatabase 를 ffi 로 돌린다
});
```

`sqflite_common_ffi` 로 SQLite 를 프로세스 안에서 돌리면([4편](/blog/flutter-app-sqflite)), 실기기·에뮬레이터 없이 **진짜 DB** 로 통합 테스트를 할 수 있습니다. `getDatabasesPath()` 는 `.dart_tool` 아래를 가리키니, 파일 DB 를 써도 저장소를 더럽히지 않고요.

> **규칙 회수 —** 단위 테스트는 이음매를 안 본다. 그래서 아무것도 가짜로 두지 않고, 실제 조립 루트로 실제 저장소까지 관통시킨다.

## 실제 조립 루트로 부팅한다

통합의 핵심은 **`main()` 과 같은 경로**로 앱을 세우는 것입니다. `configureDependencies()` 를 prod 로 부르면([1편](/blog/flutter-app-architecture)), 실제 sqflite 어댑터·실제 시간·실제 id 생성기가 물린 그래프가 섭니다. 그리고 컨테이너에서 bloc 을 꺼내면, 그 뒤엔 온전한 앱이 달려 있어요.

```dart
await configureDependencies(); // prod: 실제 DI + sqflite 파일 오픈
final bloc = getIt<TodosBloc>();

final started = nextLoaded(bloc, (s) => s.todos.isEmpty);
bloc.add(const TodosStarted());
await started;
```

`getIt<TodosBloc>()` 한 줄 뒤에 유스케이스 넷, 리포지토리, sqflite 데이터소스, 열린 `Database` 가 전부 매달려 있습니다 — 화면이 하던 것과 **똑같이**요([3편](/blog/flutter-app-wiring-ui)). 그래서 여기에 이벤트를 던지는 건 사용자가 화면을 조작하는 것과 같은 흐름을 태우는 겁니다. 다만 화면 대신 **상태 스트림**을 관찰하죠.

`nextLoaded` 는 원하는 상태가 나올 때까지 기다리는 작은 헬퍼입니다. 구독을 먼저 걸고 이벤트를 던져, 방출을 놓치지 않게 합니다.

```dart
Future<TodosLoaded> nextLoaded(
  TodosBloc bloc,
  bool Function(TodosLoaded) predicate,
) =>
    bloc.stream
        .where((s) => s is TodosLoaded && predicate(s))
        .cast<TodosLoaded>()
        .first;
```

> **규칙 회수 —** 통합은 `main()` 과 같은 경로여야 한다. 그래서 `configureDependencies()` 로 실제 그래프를 세우고, 컨테이너가 내준 bloc 을 화면과 똑같이 구동한다.

## 전 계층을 관통시킨다

이제 이벤트를 넣어 봅니다. 추가·토글·삭제가 **실제 sqflite 를 거쳐** 상태로 돌아오는지 하나씩 확인합니다.

```dart
final added = nextLoaded(bloc, (s) => s.todos.length == 1);
bloc.add(const TodoAdded('우유 사기'));
final id = (await added).todos.single.id;
expect((await added).todos.single.title.value, '우유 사기');

final toggled = nextLoaded(bloc, (s) => s.todos.single.completed);
bloc.add(TodoToggled(id));
await toggled;
```

`TodoAdded('우유 사기')` 하나가 지나가는 길을 되짚어 보면, 이 시리즈 전체가 보입니다. 날것 문자열이 값 객체 `TodoTitle` 로 검증되고([2편](/blog/flutter-app-bloc-from-scratch)), `AddTodo` 유스케이스를 지나([1편](/blog/flutter-app-architecture)), 리포지토리가 `Failure` 경계를 세우고([1편](/blog/flutter-app-architecture)), sqflite 어댑터가 `INSERT` 를 날리고([4편](/blog/flutter-app-sqflite)), 저장소를 다시 읽어 새 상태가 스트림으로 흘러([2편](/blog/flutter-app-bloc-from-scratch)) `TodosLoaded` 로 관찰됩니다. **다섯 편이 이 한 줄에 다 들어 있는** 거죠. 통합 테스트가 초록이라는 건, 그 이음매가 전부 맞물린다는 뜻입니다.

> **규칙 회수 —** 이벤트 하나가 전 계층을 지난다. 그래서 추가·토글·삭제를 실제 DB 로 태워, 다섯 편의 이음매가 맞물리는지 한 번에 본다.

## 재시작해도 남는가

[4편](/blog/flutter-app-sqflite)에서 "이제 꺼도 안 사라진다"고 했습니다. 그 약속을 **앱 레벨에서** 증명할 차례입니다. 파일 DB 를 쓰니, 그래프를 헐고 같은 파일로 다시 세우는 것으로 '앱 재시작'을 흉내 낼 수 있어요.

```dart
// 1) 첫 부팅 — 두 건 저장
await configureDependencies();
final bloc1 = getIt<TodosBloc>();
// ... '첫째 일', '둘째 일' 추가 ...
await bloc1.dispose();

// 2) 재시작 — DB 닫고 그래프 비우기
await getIt<Database>().close();
await getIt.reset();

// 3) 같은 파일로 재부팅 — 저장된 두 건이 다시 올라와야 한다
await configureDependencies();
final bloc2 = getIt<TodosBloc>();
final reloaded = nextLoaded(bloc2, (s) => s.todos.length == 2);
bloc2.add(const TodosStarted());
final titles = (await reloaded).todos.map((t) => t.title.value).toList();
expect(titles, containsAll(['첫째 일', '둘째 일']));
```

두 번째 부팅에서 만든 `bloc2` 는 **첫 부팅을 전혀 모릅니다.** 새 그래프, 새 bloc 이죠. 그런데 `TodosStarted` 를 던지자 '첫째 일'·'둘째 일'이 다시 올라옵니다 — 그 사이에 남은 건 오직 **디스크의 SQLite 파일** 뿐이니까요. 인메모리였다면 여기서 빈 목록이 나왔을 겁니다. 4편의 클린 아키텍처 교체가 실제로 영속을 만들어 냈다는, 앱 레벨의 증거입니다.

> **규칙 회수 —** 영속은 재시작이 증명한다. 그래서 파일 DB 에 저장하고, 그래프를 헐어 다시 세워, 데이터가 디스크에서 되살아나는지 본다.

## 정직하게 — 나는 여기서 한 번 헛디뎠다

이 통합 테스트, 처음엔 다르게 짰습니다. 실제 화면(`TodoApp`)을 통째로 띄우고 `tester.pumpAndSettle()` 로 버튼을 눌러 검증하려 했어요. 그게 더 '진짜 통합' 같았거든요. 그런데 **10분 타임아웃이 나며 멈췄습니다.**

원인은 이랬습니다. `pumpAndSettle` 은 "더 그릴 프레임이 없을 때까지" 펌프하는데, 앱이 로딩 스피너(`CircularProgressIndicator`)를 띄운 채 **실제 sqflite 의 비동기 IO 가 끝나기를** 기다리고 있었어요. 그런데 위젯 테스트의 펌프 루프는 그 실제 IO 완료를 제때 몰아주지 못했고, 스피너는 영영 안 멈췄습니다 — 애니메이션이 매 프레임 다음 프레임을 예약하니, `pumpAndSettle` 은 무한히 돌았죠.

여기서 배운 게 있습니다. **위젯 렌더링과 실제 파일 IO 를 한 테스트에서 동시에 굴리는 건 결이 안 맞습니다.** 위젯 테스트의 시간은 펌프로 제어되는 가짜 시간에 가깝고, 실제 IO 는 진짜 이벤트 루프를 원하거든요. 그래서 저는 통합의 무게중심을 **조립 루트**로 옮겼습니다 — 위젯을 띄우지 않고, 실제 그래프의 bloc 을 평범한 async 테스트로 구동하는 것으로요. 위젯 렌더링 계층은 이미 `fake` 환경의 위젯 테스트([3편](/blog/flutter-app-wiring-ui))가 덮고 있으니, 역할을 이렇게 나누는 게 정직합니다.

- **위젯이 상태를 제대로 그리나** → `fake` 인메모리로 빠르게 (`widget_test.dart`).
- **실제 배선과 실제 저장소가 맞물리나** → 조립 루트 + 실제 sqflite (`app_integration_test.dart`).

덧붙이면, 이 통합 테스트도 안 덮는 게 있습니다. **실기기 플랫폼 채널**(권한·경로·파일시스템 차이)은 ffi 가 아니라 진짜 기기에서만 드러나고, 그건 `integration_test` 패키지로 디바이스에서 돌려야 합니다. 성능·메모리도 여기선 안 봅니다. "이음매가 논리적으로 맞물린다"까지가 이 테스트의 몫이에요.

## 회고 — 다섯 편이 이룬 한 그림

이걸로 실전 시리즈를 닫습니다. 다섯 편을 멀리서 보면 하나의 곡선이 그려져요.

- **[1편](/blog/flutter-app-architecture) 뼈대** — UI 를 한 줄도 안 짜고 도메인·데이터·DI 를 세웠습니다. "자랄 앱이면 뼈대를 먼저."
- **[2편](/blog/flutter-app-bloc-from-scratch) bloc** — `flutter_bloc` 을 지우고 BLoC 을 60줄로 직접 짰습니다. 패턴의 알맹이는 스트림 두 개였죠.
- **[3편](/blog/flutter-app-wiring-ui) 화면** — `InheritedWidget` 으로 bloc 을 트리에 얹고, `StreamBuilder` 로 그렸습니다. 붙이는 법은 지하에 이미 있었고요.
- **[4편](/blog/flutter-app-sqflite) 저장소** — 인메모리를 sqflite 로 갈아 끼웠는데 도메인은 한 줄도 안 바뀌었습니다. 계층을 그은 값이 회수됐죠.
- **5편 통합** — 조립된 전체가 실제로 돌고, 재시작해도 남는 걸 증명했습니다.

그리고 이 곡선은 [지하 탐사 시리즈](/blog/flutter-buildcontext-internals) 위에 그어졌습니다. 3편의 `InheritedWidget` 구독은 여기서 `BlocProvider` 가 됐고, 1편의 State 수명은 bloc 을 dispose 하는 자리가 됐고, 5편의 이벤트 루프 감각은 bloc 의 `await for` 로 이어졌어요. **원리를 파 두면, 실전에서 그게 손끝에서 쓰입니다.** 그게 두 시리즈를 관통하는 한 문장입니다.

작은 할 일 앱이었지만, 여기 담긴 규율 — 실패를 값으로, 규칙을 타입 안에, 경계를 한 곳에, 조립을 컨테이너에, 저장을 계층 뒤로, 그리고 이 모두를 테스트로 — 은 앱이 커질수록 값을 합니다. 이 골격 위에 화면을 더하고, 기능을 얹고, 저장소를 바꿔도, 뼈대는 흔들리지 않을 거예요.

## 정리 — 통합이 마지막에 하는 일

- **이음매를 본다**: 단위 테스트가 격리한 계층 사이를, 실제 조립 루트 + 실제 저장소로 관통시킨다.
- **`main()` 과 같은 경로**: `configureDependencies()` 로 실제 그래프를 세우고, 컨테이너가 내준 bloc 을 구동한다.
- **재시작으로 영속을 증명**: 파일 DB, close + reset, 재부팅 → 디스크에서 되살아나는지.
- **역할을 나눈다**: 위젯 렌더는 `fake` 로 빠르게, 배선·저장소는 실제로. 둘을 한 테스트에 욱여넣지 않는다.
- **한계를 안다**: 실기기 채널·성능은 이 테스트 밖. `integration_test` 패키지의 몫.

이 시리즈를 여기서 닫습니다. 지하 탐사에서 파낸 원리로 작은 앱 하나를 뼈대부터 통합 테스트까지 제대로 지어 봤습니다. 읽어 주셔서 고맙습니다.

**핵심 한 줄 — 계층이 각각 초록인 것과 조립된 전체가 도는 것은 다른 문제다. 실제 루트로 부팅해 실제 저장소까지 관통시키고, 재시작으로 영속을 증명할 때 비로소 앱이 '완성됐다'고 말할 수 있다.**
