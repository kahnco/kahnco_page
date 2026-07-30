---
title: flutter_bloc을 지우고 BLoC을 60줄로 짠 이유
date: 2026-02-09
description: 상태 관리 하면 으레 flutter_bloc을 import하지만, 이번엔 지웁니다. BLoC 패턴의 본질은 패키지가 아니라 "이벤트가 sink로 들어가고 → UI 없는 로직이 돌고 → 상태가 stream으로 나온다" 이 세 줄이거든요. StreamController 두 개로 직접 짜면, 패키지가 감춰 두던 순차 처리·상태 방출이 전부 눈에 보입니다. 3편에서 Provider를 40줄로 짰듯, BLoC을 60줄로 짜서 원리를 드러내고, 날것 입력이 값 객체를 만나는 지점까지 실제 코드와 돌아가는 테스트로 봅니다. Flutter 실전 시리즈 2편입니다.
tags: [Flutter, BLoC, 상태관리, Stream, StreamController, 값객체]
category: [dev, flutter]
draft: false
---

[1편](/blog/flutter-app-architecture)에서 뼈대 — 도메인·데이터·의존성 주입 — 를 세우고 "화면 없이도 앱의 규칙이 끝까지 돈다"고 했습니다. 이제 그 규칙과 화면을 잇는 계층, **상태 관리**입니다. 보통 여기서 `flutter_bloc` 을 `import` 하죠. 그런데 이번 편에서는 반대로 갑니다 — **패키지를 지웁니다.** `pubspec.yaml` 에서 `flutter_bloc` 을 걷어내고 BLoC 을 직접 짭니다.

이상하게 들릴 수 있어요. 검증된 표준 패키지를 왜 마다할까요. 이 편의 규칙이 그 답입니다.

> **규칙 — 패키지를 import 하면 '어떻게 도는지'가 안 보인다.**

이건 [지하 탐사 3편](/blog/flutter-mini-provider)에서 `provider` 대신 미니 Provider 를 40줄로 짜 봤던 것과 같은 정신입니다. 그때 `watch`/`read` 의 정체가 `InheritedWidget` 구독이라는 걸 눈으로 봤죠. 이번엔 BLoC 을 60줄로 짜서, 패키지가 감춰 두던 걸 드러냅니다. 그리고 그게 실전에서 왜 남는 장사인지도 짚겠습니다.

> 💻 코드는 **Flutter 3.44.8**, 예제와 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/presentation/bloc/` 과 `test/features/todos/presentation/` 입니다.

## BLoC은 패키지가 아니다

먼저 오해부터 풉니다. **BLoC 은 라이브러리가 아니라 패턴입니다.** 이름은 Business Logic Component 의 약자이고, 2018년 DartConf 에서 Paolo Soares 가 처음 보였을 때 거기엔 어떤 패키지도 없었습니다. 그냥 스트림이었어요. 본질은 세 줄로 끝납니다.

1. 이벤트가 **들어온다**(sink).
2. 그 사이에서 화면을 모르는 **로직**이 돈다.
3. 상태가 **나간다**(stream).

`flutter_bloc` 은 이 패턴에 편의를 입힌 것 — `BlocProvider`, `BlocBuilder`, 이벤트 트랜스포머, 옵저버를 얹은 겁니다. 편의는 분명 가치가 있지만, 그걸 걷어내면 **패턴의 알맹이가 얼마나 작은지** 보입니다. 우리가 짤 `TodosBloc` 의 뼈대는 이게 전부예요 — 들어오는 스트림 하나, 나가는 스트림 하나.

```dart
@injectable
class TodosBloc {
  final StreamController<TodosEvent> _events = StreamController<TodosEvent>();
  final StreamController<TodosState> _states =
      StreamController<TodosState>.broadcast();

  Stream<TodosState> get stream => _states.stream; // 화면이 구독
  void add(TodosEvent event) => _events.add(event); // 화면이 던짐
}
```

`_events` 는 화면이 던지는 이벤트가 들어오는 **입구(sink)**, `_states` 는 화면이 구독하는 상태가 나가는 **출구**입니다. 이 둘 사이를 잇는 게 로직이고, 그게 BLoC 이에요. 패키지가 하던 일의 심장이 이 두 줄이었던 겁니다.

> **규칙 회수 —** 패키지를 import 하면 원리가 감춰진다. 그래서 sink 하나·stream 하나로 직접 짜, BLoC 이 실은 **스트림 두 개**라는 걸 드러낸다.

## 이벤트는 sealed로 닫아 던진다

화면은 "무슨 일이 일어났는지"만 이벤트로 던지고, 그걸 어떻게 처리하는지는 몰라야 합니다. 그래야 로직이 화면에 눌어붙지 않아요(1편의 규칙). 이벤트는 `sealed` 로 닫아 둡니다 — 종류가 이 파일에 다 모여 있고, bloc 의 처리부에서 하나라도 빠뜨리면 컴파일러가 잡거든요.

```dart
sealed class TodosEvent extends Equatable {
  const TodosEvent();
  @override
  List<Object?> get props => [];
}

class TodosStarted extends TodosEvent { const TodosStarted(); }

/// 사용자가 입력한 **날것의** 제목. 검증은 bloc 이 값 객체로 한다.
class TodoAdded extends TodosEvent {
  const TodoAdded(this.rawTitle);
  final String rawTitle;
  @override
  List<Object?> get props => [rawTitle];
}
```

`TodoAdded` 가 든 건 검증된 `TodoTitle` 이 아니라 **날것의 `String`** 입니다. 화면은 텍스트 필드의 값을 그대로 던질 뿐, 그게 빈 문자열인지 아닌지 판단하지 않아요. 그 판단은 잠시 뒤 bloc 안에서 값 객체가 합니다. 화면이 규칙을 짊어지지 않게 하는 첫 매듭이죠.

> **규칙 회수 —** 화면이 로직을 알면 안 된다. 그래서 이벤트를 sealed 로 닫아, 화면은 **무슨 일이 일어났는지만** 던지게 한다.

## 그 사이의 로직 — await for로 하나씩

이제 입구와 출구를 잇습니다. 여기가 이 편에서 가장 볼 만한 부분이에요. 이벤트가 여러 개 몰려 들어올 때 어떻게 처리할까요? `_events.stream.listen(_handle)` 로 콜백을 걸면, 콜백이 async 여도 **서로 기다려 주지 않아서** 처리가 겹칠 수 있습니다. 그래서 `await for` 로 **하나를 끝내야 다음으로** 넘어가게 짭니다.

```dart
TodosBloc(this._getTodos, this._addTodo, this._toggleTodo, this._removeTodo) {
  _drain();
}

/// 이벤트 큐를 순서대로 비운다. 스트림이 닫히면 루프도 끝난다.
Future<void> _drain() async {
  await for (final event in _events.stream) {
    await _handle(event);
  }
}
```

이 `await for` 한 줄이 바로 **`flutter_bloc` 의 기본 순차 트랜스포머가 하던 일**입니다. 패키지에서 `EventTransformer` 니 `sequential()` 이니 하던 개념의 정체가, 알고 보면 "이벤트 스트림을 `await for` 로 순서대로 소비한다"였던 거예요. [지하 탐사 5편](/blog/flutter-async-isolate)에서 이벤트 루프가 마이크로태스크·이벤트 큐를 순서대로 비운다고 했는데, 여기 `_drain` 이 딱 그 위에서 돕니다 — 우리 앱만의 작은 이벤트 루프인 셈이죠.

그리고 이 `_drain()` 을 **생성자에서 불 붙여** 둡니다. bloc 이 태어나는 순간부터 입구를 지키고 서서, 들어오는 이벤트를 하나씩 처리하기 시작하는 겁니다.

> **규칙 회수 —** 이벤트가 겹치면 상태가 꼬인다. 그래서 `await for` 로 **하나씩 순차 처리**하고, 이게 패키지의 '트랜스포머'가 감춰 두던 알맹이다.

## 이벤트를 유스케이스로, 결과를 상태로 접는다

`_handle` 은 이벤트 종류를 갈라 **1편에서 만든 유스케이스**를 부릅니다. 유스케이스는 `Either<Failure, T>` 를 돌려주니, 그걸 **상태로 접는** 게 bloc 의 일이에요. `switch` 가 sealed 이벤트를 전부 덮는지 컴파일러가 지켜봅니다.

```dart
Future<void> _handle(TodosEvent event) async {
  switch (event) {
    case TodosStarted():
      _emit(const TodosLoading());
      await _reload();
    case TodoAdded(:final rawTitle):
      await _onAdded(rawTitle);
    case TodoToggled(:final id):
      await _mutate(await _toggleTodo(id));
    case TodoRemoved(:final id):
      await _mutate(await _removeTodo(id));
  }
}

/// 목록을 다시 읽어 성공/실패 상태로 방출한다(단일 진실원천).
Future<void> _reload() async {
  final result = await _getTodos(const NoParams());
  result.match(
    (failure) => _emit(TodosFailure(failure.message)),
    (todos) => _emit(TodosLoaded(todos)),
  );
}
```

변경(추가·토글·삭제) 뒤에는 항상 `_reload()` 로 목록을 다시 읽어 방출합니다. 저장소를 **단일 진실원천**으로 두는 거예요 — bloc 이 로컬 리스트를 손으로 갱신해 저장소와 어긋날 여지를 없앱니다. 상태는 `sealed` 라 `Loading`·`Loaded`·`Failure` 를 화면이 `switch` 로 남김없이 그릴 수 있고요. `_emit` 은 현재 상태를 기억해 두고 출구 스트림에 흘리는, 이것도 몇 줄짜리입니다.

```dart
void _emit(TodosState next) {
  _current = next;         // 늦게 붙는 구독자(StreamBuilder)가 첫 프레임에 쓸 값
  _states.add(next);
}
```

`_current` 를 왜 들고 있냐면, `_states` 가 **broadcast** 스트림이라 늦게 구독하는 쪽은 **이전에 흘러간 상태를 못 받기** 때문입니다. 화면이 처음 붙을 때 `bloc.state` 로 현재 값을 집어 첫 프레임을 그리고, 그다음부터 `stream` 으로 갱신을 받는 식이죠. `flutter_bloc` 의 `state` 게터가 하던 일이 이겁니다.

> **규칙 회수 —** 화면은 완결된 장면만 그리면 된다. 그래서 유스케이스의 `Either` 를 **sealed 상태로 접어** 흘리고, 변경 뒤엔 저장소를 다시 읽어 단일 진실원천을 지킨다.

## 날것 입력이 값 객체를 만나는 지점

이제 아까 미뤄 둔 검증입니다. `TodoAdded` 는 날것의 `String` 을 들고 왔죠. 그 문자열이 **값 객체를 통과하는 곳**이 바로 여기, `_onAdded` 입니다.

```dart
Future<void> _onAdded(String rawTitle) async {
  // 날것의 문자열이 값 객체를 거치는 지점 — 규칙 위반은 여기서 걸린다.
  final title = TodoTitle.create(rawTitle);
  await title.match(
    (failure) async => _showError(failure.message),
    (value) async => _mutate(await _addTodo(value)),
  );
}
```

`TodoTitle.create` 는 [1편](/blog/flutter-app-architecture)에서 만든 값 객체입니다 — 빈 값·과길이를 `ValidationFailure` 로 막고, 통과한 것만 `TodoTitle` 로 내주죠. 그래서 이 한 줄이 **경계**가 됩니다. 왼쪽(실패)이면 목록은 그대로 두고 화면에 오류 한 줄만 얹고(`_showError`), 오른쪽(통과)이면 그때서야 `_addTodo` 유스케이스로 넘어갑니다. 도메인 안쪽으로는 **검증된 값만** 들어가는 거예요.

여기서 계층이 어떻게 맞물리는지 보입니다. 화면은 날것을 던지고 → bloc 이 값 객체로 검증하고 → 통과분만 유스케이스로 → 리포지토리가 저장하고 → 저장소 예외는 `Failure` 로 접혀 다시 상태로. 1편에서 세운 뼈대의 각 마디가 **이 한 흐름에서 제 몫**을 합니다.

> **규칙 회수 —** 잘못된 값은 도메인에 못 들어가야 한다. 그래서 bloc 이 날것 입력을 **값 객체로 검증**해, 통과분만 유스케이스로 넘긴다.

## 그래서, 화면 없이 상태 흐름을 증명한다

BLoC 을 직접 짠 보상이 여기 있습니다. bloc 은 위젯이 아니라 **평범한 클래스**예요. 그래서 화면을 띄우지 않고, 이벤트를 넣고 나오는 **상태 스트림**을 그대로 단언할 수 있습니다.

```dart
test('제목을 넣으면 목록에 한 건이 쌓인다', () {
  expectLater(
    bloc.stream,
    emitsInOrder([
      isA<TodosLoading>(),
      isA<TodosLoaded>().having((s) => s.todos, 'todos', isEmpty),
      isA<TodosLoaded>()
          .having((s) => s.todos.length, 'length', 1)
          .having((s) => s.todos.first.title.value, 'title', '우유 사기'),
    ]),
  );
  bloc
    ..add(const TodosStarted())
    ..add(const TodoAdded('우유 사기'));
});
```

`emitsInOrder` 로 "시작하면 로딩 → 빈 목록 → 한 건 쌓인 목록" 이라는 **상태의 순서**를 통째로 못 박습니다. 빈 제목을 넣으면 목록은 그대로고 `error` 만 실리는지, 토글하면 `completed` 가 뒤집히는지 — 전부 화면 없이 스트림으로 증명합니다(`todos_bloc_test.dart` 다섯 개). `FixedClock`·`SequentialIdGenerator` 로 시간·id 가 결정적이라([1편](/blog/flutter-app-architecture)), 추가된 항목의 id 가 `id-1` 인 것까지 못 박을 수 있고요. 이게 지하 탐사에서 5편의 `widget_test` 대신 여기선 **순수 스트림 테스트**로 끝나는 이유입니다 — bloc 이 Flutter 를 모르니까요.

## 정직하게 — 직접 짜면 잃는 것

솔직히 말하면, `flutter_bloc` 을 지운 대가는 분명합니다. 이 앱엔 필요 없어서 안 짰지만, 커지면 아쉬워질 것들이에요.

- **이벤트 트랜스포머** — 검색어 디바운스, 처리 중 이벤트 버리기(droppable), 재시작(restartable) 같은 동시성 제어. 지금 우리는 순차(`await for`) 하나뿐이라, 저런 게 필요해지면 `switchMap`/`exhaustMap` 을 손으로 짜야 합니다.
- **`BlocObserver`** — 모든 상태 전이를 한 곳에서 로깅·분석하는 훅. 직접 짜려면 `_emit` 마다 콜백을 꽂아야죠.
- **`BlocProvider`·`buildWhen`** — element 트리에 얹는 스코핑·자동 폐기, 세밀한 리빌드 억제. 우리는 `dispose()` 를 **손으로** 불러 `StreamController` 를 닫아야 합니다(안 닫으면 누수예요). 3편에서 본 `InheritedWidget` 위에 얹으면 되지만, 그건 다음 편의 몫입니다.
- **`bloc_test`·생태계** — `blocTest(...)` 헬퍼, 방대한 예제, 팀 친숙도. 표준을 버린 비용이죠.

그래서 기준은 이겁니다. **트랜스포머로 동시성을 다스려야 하거나, 옵저버로 전이를 관측해야 하거나, 팀이 표준을 원하면 — 그때 `flutter_bloc` 으로 갈아타는 게 맞습니다.** 할 일 앱은 그중 어느 것도 아니라서, 저는 원리가 드러나는 60줄을 택했습니다. 다만 이 60줄을 짜 봤다면, 나중에 패키지를 쓸 때 그게 **무엇을 대신 해주는지** 알고 쓰게 됩니다. 그게 직접 짜 본 진짜 소득이에요.

## 정리 — BLoC의 알맹이

- **BLoC 은 패턴이지 패키지가 아니다**: 이벤트 in(sink) → UI 없는 로직 → 상태 out(stream). 알맹이는 `StreamController` 두 개.
- **이벤트는 sealed 로**: 화면은 무슨 일이 일어났는지만 던지고, 처리는 모른다.
- **`await for` 로 순차 처리**: 이게 패키지의 '순차 트랜스포머'의 정체. 우리 앱만의 작은 이벤트 루프.
- **`Either` 를 sealed 상태로 접는다**: 변경 뒤엔 저장소를 다시 읽어 단일 진실원천을 지킨다.
- **날것 입력은 bloc 에서 값 객체로 검증**: 통과분만 도메인으로.
- **broadcast + `current`**: 늦게 붙는 구독자를 위해 현재 상태를 들고 있는다.
- **보상과 비용**: 화면 없이 스트림으로 증명된다. 대신 트랜스포머·옵저버·자동 폐기는 직접 챙겨야 하고, 필요해지면 그때 패키지로.

다음 편에서는 이 bloc 을 **실제 화면**에 붙입니다. `StreamBuilder` 로 상태를 그리고, 텍스트 필드가 `TodoAdded` 를 던지고, `dispose` 로 스트림을 닫는 — 지하 탐사에서 판 위젯·Element·`InheritedWidget` 의 감각이 드디어 화면을 짜는 손끝에서 쓰일 차례입니다.

**핵심 한 줄 — BLoC은 스트림 두 개다. 패키지를 지우고 직접 짜 보면, 트랜스포머도 옵저버도 그 위에 얹힌 편의였음을 알고 쓰게 된다.**
