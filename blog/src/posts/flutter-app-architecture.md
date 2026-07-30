---
title: UI를 한 줄도 안 짜고 앱을 시작하는 이유 — 뼈대부터 세우기
date: 2026-02-05
description: 할 일 앱을 만드는데 첫 편에서 화면을 한 장도 안 그립니다. 대신 도메인·데이터·의존성 주입이라는 뼈대를 먼저 세우죠. 왜냐고요? UI부터 짠 앱은 커질수록 무너지거든요. 실패를 예외가 아니라 값(Either)으로 흘리고, 잘못된 값은 값 객체에서 막고, 시간과 id는 주입해서 테스트를 결정적으로 만드는 — 작지만 완성된 앱의 골격을 실제 코드와 돌아가는 테스트로 세웁니다. Flutter 실전 시리즈 1편입니다.
tags: [Flutter, 클린아키텍처, BLoC, 의존성주입, injectable, 값객체]
category: [dev, flutter]
draft: false
---

[지하 탐사 시리즈](/blog/flutter-buildcontext-internals) 아홉 편에서 Flutter 가 **왜 이렇게 도는지**를 지하까지 팠습니다. Element, 재조정, 렌더 파이프라인, 제스처 아레나 — 프레임워크의 속을 봤죠. 이제 그 원리로 **실제 앱**을 짓습니다. 소재는 할 일(Todo) 앱입니다. 작지만, 아키텍처부터 테스트까지 **제대로** 짓는 게 목표예요.

그런데 이 첫 편에서는 **화면을 한 장도 그리지 않습니다.** 버튼도, 리스트도, `Scaffold` 하나 없어요. 대신 도메인·데이터·의존성 주입이라는 **뼈대**를 먼저 세웁니다. 이상하게 들릴 수 있는데, 이게 이 편의 규칙입니다.

> **규칙 — UI부터 짠 앱은 커질수록 무너진다.**

왜 그런지, 그리고 뼈대를 먼저 세우면 뭐가 달라지는지 — 하나씩 실제 코드로 보겠습니다.

> 💻 코드는 **Flutter 3.44.8**, 예제와 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/` 와 `test/features/todos/` 입니다. 스택은 `flutter_bloc` + `get_it`/`injectable` + `fpdart` 입니다.

## 왜 UI부터 짜면 무너지나

작은 앱을 빨리 만들 때 흔히 이렇게 시작합니다. `StatefulWidget` 하나에 `List<String> todos` 를 두고, `onPressed` 안에서 `setState(() => todos.add(text))` 하고, 화면에 뿌리죠. 30분이면 돕니다.

문제는 그다음입니다. 저장을 붙이려니 위젯 안에서 `SharedPreferences` 를 부르게 되고, 검증을 넣으려니 `onPressed` 가 부풀고, 테스트를 짜려니 위젯을 띄워야만 로직을 건드릴 수 있습니다. **비즈니스 규칙이 화면에 눌어붙어서** 화면 없이는 아무것도 검증할 수 없는 상태가 됩니다. 할 일 앱은 버티지만, 조금만 커지면 무너집니다.

지하 탐사에서 봤듯 위젯은 **자주, 통째로 다시 만들어지는** 일회용 설정값입니다([1편](/blog/flutter-buildcontext-internals)). 그렇게 덧없는 것에 **오래 살아야 할 규칙**을 얹으니 흔들리는 거죠. 그래서 방향을 뒤집습니다. 규칙을 화면 밖 — **도메인** 에 두고, 화면은 그걸 **호출만** 하게 만듭니다.

의존성 방향은 이렇게 흐릅니다.

```
presentation ──▶ domain ◀── data
   (화면)       (규칙·계약)    (저장소 구현)
```

화면과 저장소가 **둘 다 도메인을 향합니다.** 도메인은 누구도 향하지 않아요 — Flutter 도, `SharedPreferences` 도 모릅니다. 순수 Dart 규칙만 있죠. 그래서 화면을 갈아엎어도, 저장소를 메모리에서 SQLite 로 바꿔도 도메인은 그대로입니다. 뼈대를 먼저 세운다는 건 **이 도메인을 먼저 세운다**는 뜻입니다.

> **규칙 회수 —** UI부터 짜면 규칙이 덧없는 위젯에 눌어붙는다. 그래서 규칙을 도메인에 먼저 두고, 화면은 나중에 그걸 호출만 하게 한다.

## 실패를 예외가 아니라 값으로 흘린다

앱에서 저장이 실패하고, 입력이 틀리고, 네트워크가 끊깁니다. 이걸 `throw` 로 다루면 **어디서 터질지가 타입에 안 보입니다.** `repository.add(...)` 의 시그니처만 봐선 이게 예외를 던질지 알 수 없죠. 그래서 실패를 **값**으로 만듭니다. 반환 타입이 `Either<Failure, T>` — 왼쪽은 실패, 오른쪽은 성공입니다. 호출한 쪽은 **둘 다 처리하지 않으면 컴파일이 안 되므로**, 실패를 잊을 수가 없습니다.

실패의 종류는 `sealed` 로 닫아 둡니다.

```dart
sealed class Failure extends Equatable {
  const Failure(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

class CacheFailure extends Failure {
  const CacheFailure([super.message = '저장소에 접근하지 못했습니다']);
}

class ValidationFailure extends Failure {
  const ValidationFailure(super.message);
}
```

`sealed` 라서 하위 타입이 이 파일에 다 모여 있고, 나중에 `switch` 로 갈래를 나눌 때 **하나라도 빠뜨리면 컴파일러가 잡아 줍니다.** 화면에서 "검증 실패면 빨간 글씨, 저장 실패면 스낵바" 처럼 갈래별로 다르게 반응할 때 이게 안전망이 됩니다. `throw` 였다면 `catch (e)` 안에서 `e is ...` 를 손으로 확인해야 했을 일이죠.

> **규칙 회수 —** 실패를 던지면 타입에 안 보인다. 그래서 `Either<Failure, T>` 로 값으로 만들어, 성공과 실패를 **둘 다 처리하도록 강제**한다.

## 잘못된 값이 도메인에 못 들어오게 막는다

할 일 제목은 **빈 문자열이면 안 됩니다.** 이 규칙을 어디에 둘까요? 화면의 `onPressed` 에? 그러면 다른 진입점(가져오기, 동기화)에서 또 검사해야 합니다. 규칙이 여러 곳에 흩어지면 언젠가 한 곳을 빠뜨리죠.

그래서 제목을 **그냥 `String` 으로 두지 않고** 값 객체로 감쌉니다. `TodoTitle` 은 **검증을 통과한 제목만** 존재할 수 있는 타입입니다. 생성자를 `private` 으로 막고, 만드는 길은 검증하는 `create` 하나뿐이에요.

```dart
class TodoTitle extends Equatable {
  const TodoTitle._(this.value);

  final String value;
  static const int maxLength = 200;

  /// 사용자 입력에서 만든다. 규칙 위반이면 [ValidationFailure].
  static Either<ValidationFailure, TodoTitle> create(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) {
      return left(const ValidationFailure('할 일을 입력하세요'));
    }
    if (trimmed.length > maxLength) {
      return left(ValidationFailure('제목은 $maxLength자 이하여야 합니다'));
    }
    return right(TodoTitle._(trimmed));
  }

  factory TodoTitle.trusted(String value) => TodoTitle._(value);

  @override
  List<Object?> get props => [value];
}
```

이제 함수 시그니처에 `TodoTitle` 이 보이면 **그 값은 이미 검증됐다는 뜻**입니다. `add(TodoTitle title)` 을 받는 리포지토리는 다시 빈 문자열을 걱정할 필요가 없어요 — 애초에 빈 `TodoTitle` 은 만들 수 없으니까요. 규칙이 타입 안으로 들어가서, **검증을 한 곳(생성)에 못 박아** 둔 겁니다. (`create` 가 공백을 다듬고, 빈 값·과길이를 각각 `ValidationFailure` 로 막는 걸 `todo_title_test.dart` 네 개로 증명합니다.)

`trusted` 는 뭘까요? 저장소에서 읽어 온 값처럼 **이미 검증을 통과했던** 데이터를 되살릴 때만 쓰는 뒷문입니다. 사용자 입력은 항상 `create` 를 지나야 하고, `trusted` 는 data 계층 안쪽에서만 씁니다.

> **규칙 회수 —** 규칙을 화면에 두면 진입점마다 흩어진다. 그래서 값 객체로 **타입 안에** 넣어, 잘못된 값은 **애초에 만들어지지 못하게** 한다.

## 경계에서 예외를 접는다

방금 실패를 값으로 흘린다고 했는데, 현실의 저장소 API — `SharedPreferences`, `sqflite`, 파일 IO — 는 **예외를 던집니다.** 이 둘을 어떻게 잇느냐가 핵심입니다. 규칙은 이렇습니다. **바깥(DataSource)은 예외를 던지고, 그 예외를 잡아 `Failure` 로 접는 곳은 리포지토리 딱 한 곳입니다.**

DataSource 계약은 예외를 던지는, 날것의 저장소 그대로입니다.

```dart
/// 로컬 저장소 계약. 실패는 예외를 **던진다**(repository 가 잡아 Either 로 바꾼다).
abstract interface class TodoLocalDataSource {
  Future<List<TodoModel>> readAll();
  Future<void> writeAll(List<TodoModel> todos);
}
```

리포지토리가 그 경계에 서서 예외를 잡아 `Either` 로 바꿉니다.

```dart
@override
Future<Either<Failure, Todo>> add(TodoTitle title) async {
  try {
    final todo = Todo(
      id: _ids.next(),
      title: title,
      completed: false,
      createdAt: _clock.now(),
    );
    final next = [...await _local.readAll(), TodoModel.fromDomain(todo)];
    await _local.writeAll(next);
    return right(todo);
  } catch (_) {
    return left(const CacheFailure());
  }
}
```

이 `try/catch` 가 **온 앱에서 예외를 잡는 유일한 경계**입니다. 이 위로는 — 유스케이스도, 화면도 — `Either` 만 봅니다. 예외를 어디서 잡아야 하나 하는 고민이 사라져요. "경계는 리포지토리, 그 위는 값" 한 줄이면 끝입니다. (throw 하는 가짜 DataSource 를 물려서 예외가 `CacheFailure` 로 접히는지, 즉 **예외가 위로 새지 않는지**를 `todos_repository_impl_test.dart` 로 증명합니다.)

DataSource 와 도메인 사이에는 `TodoModel` 이 있습니다. 도메인의 `Todo` 는 `TodoTitle` 값 객체와 `DateTime` 을 든 순수 타입이고, `TodoModel` 은 JSON 으로 오갈 수 있는 **저장소용 표현**입니다. `toDomain()`/`fromDomain()` 으로 둘 사이를 번역하죠. 이 한 겹 덕분에 저장 포맷이 바뀌어도 도메인은 안 흔들립니다.

> **규칙 회수 —** 저장소는 예외를 던지고 도메인은 값을 원한다. 그래서 **리포지토리 한 곳**에서만 예외를 잡아 접고, 그 위는 전부 `Either` 로 통일한다.

## 시간과 id를 주입해서 테스트를 결정적으로 만든다

위 `add` 코드에 `_clock.now()` 와 `_ids.next()` 가 보였을 겁니다. `DateTime.now()` 도, `Uuid().v4()` 도 아니에요. 왜일까요? 이 둘을 코드에 **직접 박으면 테스트가 매번 달라지기** 때문입니다. 생성 시각이 실행할 때마다 다르고, id 가 랜덤이면 "저장된 결과가 기대와 같은가"를 못 박을 수가 없죠.

그래서 시간과 id 를 **인터페이스로 뽑아 주입**합니다. 실제(prod)와 가짜(fake)를 환경으로 가르죠.

```dart
abstract interface class Clock {
  DateTime now();
}

@LazySingleton(as: Clock, env: ['prod'])
class SystemClock implements Clock {
  @override
  DateTime now() => DateTime.now();
}

@LazySingleton(as: Clock, env: ['fake'])
class FixedClock implements Clock {
  @override
  DateTime now() => DateTime.fromMillisecondsSinceEpoch(0);
}
```

테스트에서는 `FixedClock`(항상 epoch 0)과 `SequentialIdGenerator`(`id-1`, `id-2`, …)를 씁니다. 그러면 "제목 하나 넣으면 `id-1`, 시각은 epoch 0 인 할 일이 저장된다"를 **한 치 흔들림 없이** 단언할 수 있습니다. 이건 지하 탐사에서 얻은 감각이기도 합니다 — 프레임워크가 `Ticker` 로 시간을 바깥에서 주입받아 테스트에서 가짜 시간을 흘려보냈듯([7편](/blog/flutter-animation-internals)), 우리 앱도 시간을 **바깥에서 받는** 것으로 다룹니다.

> **규칙 회수 —** `now()` 와 랜덤 id 를 박으면 테스트가 매번 달라진다. 그래서 시간·id 를 **주입**해, 가짜로 갈아 끼워 결과를 결정적으로 만든다.

## 조립은 DI 컨테이너에 맡긴다

계층을 나눴으니 이제 **누가 누구를 조립하느냐**가 남습니다. `TodosRepositoryImpl` 은 DataSource·IdGenerator·Clock 을 필요로 하고, `AddTodo` 는 리포지토리를 필요로 하고… 이걸 화면에서 손으로 `new` 하며 엮으면 그 배선이 또 화면에 눌어붙습니다. 그래서 조립을 **의존성 주입 컨테이너**(`get_it`)에 맡기고, 배선표는 `injectable` 이 애노테이션을 읽어 **코드 생성**해 줍니다.

```dart
@InjectableInit()
void configureDependencies({String environment = 'prod'}) =>
    getIt.init(environment: environment);
```

`build_runner` 를 돌리면 각 클래스의 `@LazySingleton` 애노테이션을 모아 `injection.config.dart` 를 생성합니다. 실제로 나온 배선의 한 토막입니다 — 리포지토리가 필요한 세 의존성을 컨테이너에서 꺼내 물려 주죠.

```dart
gh.lazySingleton<TodosRepository>(
  () => TodosRepositoryImpl(
    gh<TodoLocalDataSource>(),
    gh<IdGenerator>(),
    gh<Clock>(),
  ),
);
```

`environment` 인자 하나로 **그래프 전체가 갈립니다.** `'prod'` 면 `SystemClock`·실제 저장소, `'fake'` 면 `FixedClock`·인메모리 저장소가 물립니다. 화면 코드는 `getIt<AddTodo>()` 만 부르면 되고, 그 뒤에 뭐가 물려 있는지는 몰라도 됩니다. 배선은 컨테이너의 일이니까요.

> **규칙 회수 —** 손으로 조립하면 배선이 화면에 눌어붙는다. 그래서 DI 컨테이너에 맡기고, 환경 인자 하나로 실제/가짜 그래프를 통째로 가른다.

## 그래서, 화면 없이 앱이 돈다

뼈대를 이렇게 세운 결과가 이 편의 보상입니다. **화면을 한 장도 안 그렸는데 앱의 로직이 끝까지 돕니다.** 테스트에서 fake 환경으로 그래프를 세우고, 유스케이스를 실제로 실행해 보죠.

```dart
test('fake 환경: 그래프 전체가 인메모리 어댑터로 해소된다', () async {
  configureDependencies(environment: 'fake');

  expect(getIt<Clock>(), isA<FixedClock>());
  expect(getIt<IdGenerator>(), isA<SequentialIdGenerator>());

  // 실제로 유스케이스를 끝까지 실행해 그래프가 살아있는지 확인
  final result = await getIt<AddTodo>()(TodoTitle.trusted('스모크'));
  expect(result.isRight(), isTrue);
});
```

이게 뼈대를 먼저 세운 이유입니다. 할 일을 더하고, 토글하고, 지우는 **모든 규칙이 화면 없이 검증됩니다.** 다음 편에서 UI 를 얹을 때, 화면은 이미 돌아가는 이 로직을 **호출만** 하면 됩니다. 화면이 규칙을 짊어지지 않아요. (1편의 뼈대는 값 객체·유스케이스·리포지토리·DI 그래프까지 **테스트 11개**로 덮여 있고, 지하 탐사의 38개와 합쳐 전부 초록입니다.)

## 정직하게 — 할 일 앱에 이건 과한가

솔직히 말하면, 화면 하나에 `List<String>` 두고 `setState` 하는 버전이 **이 앱만 놓고 보면 더 빠릅니다.** 파일 수도 1/10 이고요. 값 객체·Either·DI 는 분명 초기 비용입니다.

그런데 이 시리즈의 목적은 할 일 앱 자체가 아니라, **커져도 안 무너지는 골격**을 몸에 익히는 겁니다. 이 구조가 값을 하는 순간은 정해져 있어요 — 저장소를 메모리에서 SQLite 로 바꿀 때, 검증 규칙이 늘어날 때, 화면을 새로 디자인할 때, 팀이 늘어 "이 로직 어디서 테스트하죠"를 물을 때. 그때 도메인이 화면과 저장소로부터 **떨어져 있다는 사실**이 비용을 되갚습니다.

반대로 정말 30분짜리 프로토타입이라면 이 구조는 과합니다. 판단 기준은 **"이 앱이 살아남아 자랄 것인가"** 예요. 자랄 앱이면 뼈대를 먼저, 아니면 `setState` 로 빠르게. 저는 이 시리즈에서 전자를 골랐습니다.

## 정리 — 뼈대가 하는 일

- **계층 방향**: 화면과 저장소가 **둘 다 도메인을 향한다.** 도메인은 Flutter 도 저장소도 모르는 순수 규칙이라, 위아래를 갈아엎어도 안 흔들린다.
- **실패는 값으로**: `Either<Failure, T>` + `sealed Failure` 로, 성공과 실패를 **둘 다 처리하도록 강제**한다.
- **규칙은 타입 안에**: `TodoTitle` 값 객체로, 잘못된 값은 **애초에 만들어지지 못한다.**
- **예외는 한 경계에서**: DataSource 는 던지고, **리포지토리 한 곳**만 잡아 접는다. 그 위는 전부 값.
- **시간·id 는 주입**: 가짜로 갈아 끼워 테스트를 **결정적으로** 만든다.
- **조립은 컨테이너에**: `injectable` 이 배선을 생성하고, 환경 인자로 실제/가짜 그래프를 가른다.
- **보상**: 화면 없이 앱의 모든 규칙이 돈다. 다음 편의 UI 는 이걸 **호출만** 한다.

다음 편에서는 이 뼈대 위에 `flutter_bloc` 으로 상태를 얹고, 실제 화면을 그려 이 로직을 호출로 잇겠습니다. 지하 탐사에서 본 위젯·Element·재조정의 감각이, 이제 화면을 짤 때 어떻게 손끝에서 쓰이는지 볼 차례입니다.

**핵심 한 줄 — UI를 먼저 짜면 규칙이 덧없는 화면에 눌어붙는다. 그래서 도메인·실패·검증·주입이라는 뼈대를 먼저 세우고, 화면은 나중에 그걸 호출만 하게 둔다.**
