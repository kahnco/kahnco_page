---
title: 저장소를 sqflite로 갈아 끼우는데 도메인은 한 줄도 안 고쳤다
date: 2026-02-17
description: 앱을 끄면 할 일이 사라졌습니다. 인메모리였으니까요. 이제 진짜 SQLite(sqflite)를 붙입니다. 그런데 저장소를 통째로 바꾸는데 도메인도, 유스케이스도, bloc도, 화면도 한 줄을 안 고쳤습니다 — 1편에서 prod/fake로 갈라 둔 그 자리에 데이터소스만 꽂았거든요. 계약을 행 단위(INSERT/UPDATE/DELETE)로 바꾸고, DB 여는 비동기를 @preResolve로 주입하고, 진짜 SQL을 ffi로 테스트하는 과정을, 클린 아키텍처가 값을 하는 순간으로 봅니다. Flutter 실전 시리즈 4편입니다.
tags: [Flutter, sqflite, SQLite, 클린아키텍처, injectable, 의존성주입]
category: [dev, flutter]
draft: false
---

[3편](/blog/flutter-app-wiring-ui)에서 화면까지 완성했지만, 마지막에 이렇게 적었습니다 — "끄면 사라진다." 저장소가 인메모리였으니까요([1편](/blog/flutter-app-architecture)). 이제 진짜로 남게 만듭니다. **SQLite** 를 `sqflite` 로 붙여서요.

여기서 시험대에 오르는 건 저장소 기술이 아니라 **아키텍처의 약속**입니다. 지금까지 계층을 갈라 온 이유가 바로 이런 순간을 위해서였거든요. 그래서 이 편의 규칙은 도발에 가깝습니다.

> **규칙 — 저장소를 통째로 바꾸는데, 도메인·유스케이스·bloc·화면은 한 줄도 안 고친다.**

정말 그럴 수 있을까요? 결론부터 말하면 그랬습니다. 어떻게 가능했는지, 그리고 그 대가로 무엇을 챙겨야 했는지 봅니다.

> 💻 코드는 **Flutter 3.44.8**, sqflite 어댑터와 그 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/data/` 와 `test/features/todos/data/sqflite_todo_local_data_source_test.dart` 입니다.

## 어디만 바뀌나 — 계층 지도

먼저 바뀔 곳을 지도에 찍어 봅니다. [1편](/blog/flutter-app-architecture)에서 의존성은 이렇게 흘렀죠.

```
presentation ──▶ domain ◀── data
  (화면·bloc)   (규칙·계약)   (저장소 구현)
```

저장소를 바꾼다는 건 **오른쪽 끝(data)만** 손댄다는 뜻입니다. 도메인은 `TodosRepository` 라는 **계약**만 알지, 그 뒤가 인메모리인지 SQLite 인지 모릅니다. 그리고 1편에서 이미 `prod`/`fake` 로 자리를 갈라 뒀어요 — `fake` 엔 인메모리, `prod` 엔… 그때는 비워 뒀던 그 자리에, 이제 sqflite 를 꽂습니다.

```dart
@LazySingleton(as: TodoLocalDataSource, env: ['prod'])
class SqfliteTodoLocalDataSource implements TodoLocalDataSource { ... }

@LazySingleton(as: TodoLocalDataSource, env: ['fake'])
class InMemoryTodoLocalDataSource implements TodoLocalDataSource { ... }
```

같은 `TodoLocalDataSource` 계약을 두 구현이 나눠 답합니다. 환경 인자 하나로 `prod` 면 SQLite, `fake` 면 인메모리가 물리죠. 테스트와 데모는 여전히 디스크 없이 인메모리로 빠르게 돌고, 실제 앱만 SQLite 로 남깁니다. **도메인은 이 갈림을 전혀 모릅니다.**

> **규칙 회수 —** 저장소는 data 계층의 끝단이다. 그래서 도메인이 아는 계약은 그대로 두고, 그 계약을 답하는 구현만 `prod` 자리에 갈아 끼운다.

## 계약을 행 단위로 — 그래도 data 계층 안이다

그런데 계약 자체는 손봤습니다. 1편의 `TodoLocalDataSource` 는 목록을 **통째로 덮는** `writeAll(List)` 이었어요. 인메모리엔 그걸로 충분했지만, SQL 을 제대로 쓰려면 곤란합니다 — 항목 하나 토글하려고 테이블 전체를 지우고 다시 넣는 건 SQLite 를 종이 상자처럼 쓰는 꼴이니까요. 그래서 계약을 **행 단위**로 바꿉니다.

```dart
abstract interface class TodoLocalDataSource {
  Future<List<TodoModel>> readAll();
  Future<void> insert(TodoModel todo);
  Future<void> update(TodoModel todo);
  Future<void> delete(String id);
}
```

여기서 중요한 건, 이 인터페이스가 **data 계층 소유**라는 점입니다. 도메인이 아는 계약(`TodosRepository`)이 아니에요. `TodoLocalDataSource` 도, 그걸 쓰는 `TodosRepositoryImpl` 도 둘 다 data 계층에 삽니다. 그래서 이 둘을 행 단위로 바꿔도 — 계약이 통짜에서 행 단위로 뒤집혀도 — **도메인 경계는 넘지 않습니다.** 리포지토리 구현이 새 계약에 맞춰 호출만 바꾸면 되죠.

```dart
@override
Future<Either<Failure, Unit>> toggle(String id) async {
  try {
    final matches = (await _local.readAll()).where((m) => m.id == id);
    if (matches.isEmpty) return left(const CacheFailure('없는 항목입니다'));
    final target = matches.first;
    await _local.update(target.copyWith(completed: !target.completed));
    return right(unit);
  } catch (_) {
    return left(const CacheFailure());
  }
}
```

`add` 는 `insert` 를, `remove` 는 `delete` 를 부르는 식으로 얇아졌습니다. 예외를 잡아 `Failure` 로 접는 경계는 1편 그대로고요. **계층을 제대로 그어 두면, data 계층의 계약을 뒤집어도 그 파장이 계층 안에 갇힙니다** — 이게 이 편에서 가장 하고 싶은 말입니다.

> **규칙 회수 —** SQL 을 제대로 쓰려면 통짜를 행 단위로 바꿔야 한다. 그래도 그 계약은 data 계층 것이라, 뒤집어도 도메인은 모른다.

## 실제 SQL — INSERT, UPDATE, DELETE, ORDER BY

이제 진짜 SQLite 어댑터입니다. `sqflite` 의 질의 메서드로 계약을 실현합니다.

```dart
@override
Future<List<TodoModel>> readAll() async {
  // 삽입 순서를 유지하려 created_at 동률이면 rowid 로 갈음한다.
  final rows = await _db.query(todosTable, orderBy: 'created_at ASC, rowid ASC');
  return rows.map(_fromRow).toList();
}

@override
Future<void> insert(TodoModel todo) => _db.insert(
      todosTable, _toRow(todo),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

@override
Future<void> update(TodoModel todo) =>
    _db.update(todosTable, _toRow(todo), where: 'id = ?', whereArgs: [todo.id]);

@override
Future<void> delete(String id) =>
    _db.delete(todosTable, where: 'id = ?', whereArgs: [id]);
```

SQLite 엔 boolean 타입이 없어 `completed` 는 `0`/`1` 정수로, `created_at` 은 epoch millis 정수로 저장합니다. 그래서 도메인의 `TodoModel` 과 테이블 행 사이를 `_toRow`/`_fromRow` 로 번역하죠 — 1편에서 `TodoModel` 이 "저장소용 표현"이라던 게 여기서 진가를 냅니다. 도메인의 `Todo`(값 객체 `TodoTitle` 과 `DateTime` 을 든)는 SQL 의 정수·문자열을 전혀 몰라도 됩니다. 그 번역이 이 한 겹에 갇혀 있으니까요.

정렬은 `created_at ASC, rowid ASC` 입니다. `created_at` 만으로 정렬하면 같은 밀리초에 들어온 항목들의 순서가 흔들리는데, SQLite 의 암묵 `rowid`(삽입 순서)를 보조 키로 두어 **삽입 순서를 고정**합니다. 인메모리 fake 도 삽입 순서로 돌려주게 맞춰, 두 구현의 관찰 결과가 어긋나지 않게 했고요.

> **규칙 회수 —** 계약을 SQL 로 실현한다. boolean·시간을 정수로 번역하는 일은 `TodoModel` 한 겹에 가두고, 도메인은 정수를 모른다.

## DB 여는 건 비동기다 — @preResolve로 주입한다

한 가지 걸리는 게 있습니다. SQLite 파일을 **여는 것 자체가 비동기**예요 — 경로를 찾고, 없으면 테이블을 만들고. 이 열린 `Database` 를 어떻게 주입할까요? `injectable` 의 `@preResolve` 가 답입니다. 앱 시작 시 미리 `await` 해서 그래프에 넣어 두는 거죠.

```dart
@module
abstract class DatabaseModule {
  @preResolve
  @Environment('prod')
  Future<Database> database() async {
    final path = p.join(await getDatabasesPath(), 'todos.db');
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) => db.execute(createTodosTableSql),
    );
  }
}
```

`@preResolve` 가 붙으면 의존성 조립 자체가 비동기가 됩니다. 그래서 [1편](/blog/flutter-app-architecture)에서 동기였던 `configureDependencies` 가 이제 `Future` 를 돌려줘요.

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await configureDependencies(); // DB 열기까지 끝난 뒤에 앱을 띄운다
  runApp(const TodoApp());
}
```

`@Environment('prod')` 덕분에 이 DB 열기는 **prod 에서만** 일어납니다. `fake` 로 조립하면 DB 를 아예 열지 않아요 — 그래서 테스트와 위젯 테스트는 디스크를 건드리지 않고 인메모리로 빠르게 돕니다. 그리고 `SqfliteTodoLocalDataSource` 는 이 `Database` 를 **생성자로 주입받습니다.** 스스로 열지 않아요.

```dart
@LazySingleton(as: TodoLocalDataSource, env: ['prod'])
class SqfliteTodoLocalDataSource implements TodoLocalDataSource {
  const SqfliteTodoLocalDataSource(this._db);
  final Database _db;
  // ...
}
```

이게 왜 중요하냐면, 어댑터가 **플러그인을 직접 부르지 않게** 되기 때문입니다. DB 를 여는 지저분한 일(경로·플러그인)은 모듈이 다 하고, 어댑터는 이미 열린 DB 를 받아 SQL 만 씁니다. 그 덕에 테스트에서 **다른 방식으로 연 DB** 를 그대로 물릴 수 있어요 — 바로 다음 절의 ffi 처럼요.

> **규칙 회수 —** DB 열기는 비동기다. 그래서 `@preResolve` 로 시작 시 미리 열어 주입하고, 어댑터는 열린 DB 를 받기만 해 플러그인에서 자유로워진다.

## 도메인은 정말 그대로인가 — 커밋이 증언한다

규칙이 지켜졌는지는 말이 아니라 **변경 파일 목록**이 증명합니다. 이번 편 커밋에서 손댄 파일은 전부 이 셋 안에 있습니다.

- `data/` — 계약(행 단위), sqflite 어댑터, 인메모리 재구현, 리포지토리 구현
- `core/database/`, `core/di/` — DB 모듈, 비동기 조립
- `main.dart` — `await`

그리고 **손대지 않은** 것들:

- `domain/entities/todo.dart`, `domain/value_objects/todo_title.dart` — 엔티티·값 객체
- `domain/repositories/todos_repository.dart` — 도메인이 아는 계약
- `domain/usecases/*` — 유스케이스 넷
- `presentation/bloc/*`, `presentation/pages/*`, `presentation/widgets/*` — bloc, 화면, 위젯 전부

저장소를 인메모리에서 SQLite 로 갈아 끼웠는데, 앱의 **규칙과 화면은 단 한 줄도 바뀌지 않았습니다.** 이게 계층을 그어 온 값입니다. 1편에서 "자랄 앱이면 뼈대를 먼저"라고 했던 그 투자가, 여기서 정확히 회수되는 거예요.

## 진짜 SQL을 테스트한다 — ffi로

마지막으로, 이 SQL 이 정말 도는지 봐야죠. 그런데 `sqflite` 는 원래 모바일 플러그인이라 순수 Dart 테스트(플랫폼 없음)에선 안 돕니다. 여기서 `sqflite_common_ffi` 가 구원자예요 — **SQLite 를 FFI 로 프로세스 안에서** 돌려, 데스크톱·테스트에서도 진짜 SQL 을 실행하게 해줍니다.

```dart
setUpAll(() {
  sqfliteFfiInit();
  databaseFactory = databaseFactoryFfi; // 이후 openDatabase 는 ffi 로 돈다
});

setUp(() async {
  db = await databaseFactory.openDatabase(
    inMemoryDatabasePath,
    options: OpenDatabaseOptions(
      version: 1,
      onCreate: (db, version) => db.execute(createTodosTableSql),
    ),
  );
  ds = SqfliteTodoLocalDataSource(db); // 앱과 똑같은 어댑터에 물린다
});
```

앞에서 어댑터가 DB 를 주입받게 해 둔 덕에, 여기서 **ffi 로 연 인메모리 DB** 를 그대로 물릴 수 있습니다. 그러면 앱의 prod 경로와 **똑같은 코드**(`insert`/`update`/`delete`/`readAll`)가 진짜 SQLite 위에서 실행돼요. `created_at` 순으로 정렬되는지, `completed` 가 컬럼에 `1` 로 저장되는지, `delete` 가 해당 행만 지우는지 — 전부 실제 SQL 로 증명합니다(`sqflite_todo_local_data_source_test.dart` 다섯 개). 어댑터 하나 때문에 에뮬레이터를 띄울 필요가 없는 거죠.

## 정직하게 — 이 SQL은 충분히 SQL다운가

솔직히 더 밀어붙일 여지가 있습니다.

- **토글이 아직 read-modify-write 다.** `toggle` 은 `readAll` 로 다 읽어 대상을 찾은 뒤 `update` 합니다. SQL 을 제대로 쓰면 `UPDATE todos SET completed = 1 - completed WHERE id = ?` 한 방으로, 읽지 않고 뒤집을 수 있어요. 지금 계약(`update(TodoModel)`)이 "완성된 행"을 받게 돼 있어서 그런 건데, 계약에 `toggleCompleted(id)` 같은 걸 더하면 왕복이 사라집니다. 작은 목록이라 미뤘지만, 정직하게는 개선 여지입니다.
- **마이그레이션을 안 다뤘다.** `version: 1` 로 시작만 했지, 스키마가 바뀔 때의 `onUpgrade` 는 없습니다. 컬럼을 더하는 순간 필요해지죠 — 이건 그 자체로 한 편짜리 주제입니다.
- **웹에선 그대로 안 돈다.** `sqflite` 는 모바일·데스크톱용이라, 웹은 `sqflite_common_ffi_web`(WASM SQLite)로 팩토리를 갈아야 합니다. 이 앱의 주 타깃은 모바일이라 붙이지 않았습니다.
- **`readAll` 이 전체를 읽는다.** 목록 전체를 매번 메모리로 올립니다. 수천 건이 되면 페이징·`LIMIT` 이 필요하지만, 할 일 앱 규모에선 과합니다.

이 넷 다 "지금은 과하다"로 미룬 것들입니다. 중요한 건, **미뤄도 도메인이 안전하다**는 점이에요. 나중에 `UPDATE ... SET` 최적화를 넣든, 마이그레이션을 붙이든, 그 변경은 전부 data 계층 안에서 끝납니다 — 오늘 증명한 그대로요.

## 정리 — 저장소를 갈아 끼우는 법

- **오른쪽 끝만 바꾼다**: 저장소는 data 계층. 도메인이 아는 계약은 그대로, 구현만 `prod` 자리에 꽂는다(1편의 prod/fake).
- **계약을 행 단위로**: `writeAll` → `insert`/`update`/`delete`. data 계층 것이라 뒤집어도 도메인 무변경.
- **SQL 로 실현**: INSERT/UPDATE/DELETE/ORDER BY. boolean·시간을 정수로 번역하는 일은 `TodoModel` 한 겹에 가둔다.
- **비동기 조립**: DB 열기는 `@preResolve`(prod 전용)로 미리, `configureDependencies`·`main` 은 `await`. 어댑터는 열린 DB 를 주입받아 플러그인에서 자유롭다.
- **증거는 커밋**: 도메인·유스케이스·bloc·화면 파일은 diff 0.
- **진짜 SQL 테스트**: `sqflite_common_ffi` 로 앱 prod 코드를 프로세스 안에서 검증.

이제 앱은 꺼도 살아남는, 화면부터 저장까지 온전한 할 일 앱이 됐습니다. 다음 편에서는 시리즈를 닫으며 — 통합 테스트로 앱 전체를 한 번에 관통해 보고, 지금까지 쌓은 계층이 실제로 어떻게 맞물려 도는지를 끝에서 끝까지 확인하겠습니다.

**핵심 한 줄 — 계층을 제대로 그어 두면, 저장소를 통째로 SQLite 로 갈아 끼워도 그 파장이 data 계층 안에 갇힌다. 도메인과 화면은 그대로 잔다.**
