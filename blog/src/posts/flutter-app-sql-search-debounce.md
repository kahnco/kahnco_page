---
title: 미뤄 둔 것을 구현할 때 — SQL 검색과 디바운스
date: 2026-03-01
description: 6편에서 "목록이 커지면 검색을 SQL로 내리고 디바운스가 필요하다"고 미뤄 뒀습니다. 이번 편에서 그걸 실제로 구현합니다. 조회 조건을 도메인 값(TodoQuery)으로 만들어 계약을 따라 내려보내고, sqflite가 WHERE/LIKE로 걸러 오게 하고, 2편에서 일부러 안 짰던 이벤트 트랜스포머를 디바운스로 직접 짭니다. 미뤄 둔 결정을 실제로 구현할 때 계층이 그 변경을 감당하는지, 그리고 injectable이 Duration을 주입하려 해서 실제로 데인 함정까지, 돌아가는 코드와 테스트로 봅니다. Flutter 실전 시리즈 7편입니다.
tags: [Flutter, sqflite, 디바운스, BLoC, 클린아키텍처, 검색]
category: [dev, flutter]
draft: false
---

[6편](/blog/flutter-app-search-filter)에서 검색·필터를 화면(bloc)에서 파생했습니다. 목록이 손안에 있으니 키 입력마다 DB 를 때릴 이유가 없다고요. 그리고 "정직하게" 절에 이렇게 미뤄 뒀습니다 — **목록이 수천 건이 되면 뒤집힌다. 그때는 `readAll` 을 버리고 `WHERE`/`LIKE` 를 내려야 하고, 그러면 디바운스가 필요해진다.** 2편에서 안 짠 트랜스포머가 그때 값을 한다고도 했죠.

이번 편은 그 미뤄 둔 것을 **실제로 구현**합니다. 목록이 커졌다고 상상하고요. 이건 단순히 기능을 옮기는 일이 아니라, 계층을 그어 온 방식이 **미뤄 둔 결정의 실현을 감당하는지** 보는 일입니다. 규칙입니다.

> **규칙 — 미뤄 둔 것을 구현할 때가 온다. 그때 계층이 그 변경을 감당하는가.**

조건을 도메인 값으로 만들고, 계약을 따라 SQL 까지 내려보내고, 디바운스를 직접 짜는 과정을 봅니다. 그리고 그 길에서 제가 실제로 한 번 데인 곳도 정직하게 나눕니다.

> 💻 코드는 **Flutter 3.44.8**, 예제와 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/` 와 `test/features/todos/data/sqflite_todo_local_data_source_test.dart` 입니다.

## 조건을 값으로 만든다

검색·필터가 화면 파생일 때는([6편](/blog/flutter-app-search-filter)) 필터가 프레젠테이션 관심사였습니다. 그런데 이걸 **조회 조건**으로 SQL 에 내리기로 하면, 그건 이제 도메인이 저장소에 건네는 **계약의 일부**가 됩니다. 그래서 조건을 도메인 값으로 만듭니다.

```dart
/// 목록 조회 조건 — 완료 상태 필터와 제목 검색어.
class TodoQuery extends Equatable {
  const TodoQuery({this.status = TodosFilter.all, this.text = ''});
  final TodosFilter status;
  final String text;

  @override
  List<Object?> get props => [status, text];
}
```

`TodosFilter`(all·active·completed) enum 도 **도메인으로 옮겼습니다.** 6편에선 한글 라벨('전체'·'미완료'·'완료')이 붙은 채 프레젠테이션에 있었는데, 조건이 도메인 값이 되면서 enum 자체는 순수해야 하거든요. 라벨은 **표현**이라 도메인에 두지 않고, 프레젠테이션 확장으로 얹습니다.

```dart
extension TodosFilterLabel on TodosFilter {
  String get label => switch (this) {
        TodosFilter.all => '전체',
        TodosFilter.active => '미완료',
        TodosFilter.completed => '완료',
      };
}
```

같은 enum 이지만 순수 값(도메인)과 그 표현(프레젠테이션)이 갈렸습니다. 이게 관심사를 제자리에 두는 방식이에요 — [6편](/blog/flutter-app-search-filter)의 "밑으로 미는 게 능사가 아니다"와 짝을 이루는, 반대 방향의 같은 원칙입니다.

> **규칙 회수 —** 조건을 SQL 로 내리면 그건 도메인의 계약이 된다. 그래서 조건을 도메인 값(`TodoQuery`)으로 만들고, 라벨 같은 표현은 프레젠테이션 확장으로 분리한다.

## 계약을 따라 내려보낸다

`TodoQuery` 가 생겼으니, 이제 계약을 따라 아래로 흘려보냅니다. 저장소 계약의 `getAll()` 이 `search(TodoQuery)` 가 됩니다.

```dart
abstract interface class TodosRepository {
  Future<Either<Failure, List<Todo>>> search(TodoQuery query);
  // add · toggle · remove 는 그대로
}
```

유스케이스도 조건을 받아 넘기고(`GetTodos: UseCase<List<Todo>, TodoQuery>`), 데이터소스 계약에도 `search(TodoQuery)` 가 더해집니다. 이 변경이 도메인 계약(`TodosRepository`)을 건드리긴 하지만, 그 아래 **전 계층이 같은 조건 타입**을 주고받으니 흐름이 깔끔하게 이어져요. 인메모리 fake 도 같은 `search` 를 구현해, 테스트에선 여전히 디스크 없이 도는 걸 유지합니다.

> **규칙 회수 —** 조건이 도메인 값이 되면, 그 타입을 계약을 따라 아래로 흘려보낸다. usecase·repository·datasource 가 같은 `TodoQuery` 를 주고받는다.

## 진짜 SQL — WHERE와 LIKE

이제 sqflite 어댑터가 조건을 **실제 SQL** 로 실현합니다. 상태 필터는 `WHERE completed = ?`, 제목 검색은 `title LIKE ?` 로요.

```dart
Future<List<TodoModel>> search(TodoQuery query) async {
  final clauses = <String>[];
  final args = <Object?>[];

  switch (query.status) {
    case TodosFilter.active:    clauses.add('completed = 0');
    case TodosFilter.completed: clauses.add('completed = 1');
    case TodosFilter.all:       break;
  }

  final text = query.text.trim();
  if (text.isNotEmpty) {
    // LIKE 의 와일드카드(%, _)를 사용자 입력에서 이스케이프한다.
    final escaped = text.replaceAllMapped(RegExp(r'[%_\\]'), (m) => '\\${m[0]}');
    clauses.add("title LIKE ? ESCAPE '\\'");
    args.add('%$escaped%');
  }

  final rows = await _db.query(
    todosTable,
    where: clauses.isEmpty ? null : clauses.join(' AND '),
    whereArgs: args.isEmpty ? null : args,
    orderBy: 'created_at ASC, rowid ASC',
  );
  return rows.map(_fromRow).toList();
}
```

여기 놓치기 쉬운 게 **이스케이프**입니다. 사용자가 검색어에 `%` 를 치면, 이스케이프하지 않은 `LIKE '%%%'` 는 "모든 것"에 걸립니다 — 사용자는 `%` 라는 **글자**를 찾고 싶은데 말이죠. 그래서 `%`·`_`·`\` 를 리터럴로 이스케이프하고 `ESCAPE '\'` 를 붙였습니다. 이걸 증명하려고 "'50% 할인'과 '무엇이든'을 넣고 `%` 로 검색하면 1건만 나온다"는 테스트를 뒀어요(`sqflite_todo_local_data_source_test.dart`). ffi 로 진짜 SQLite 를 돌려 검증하니([4편](/blog/flutter-app-sqflite)), 이런 SQL 세부까지 실기기 없이 못 박습니다.

> **규칙 회수 —** 조건을 SQL 로 실현한다. 필터는 `WHERE`, 검색은 `LIKE` 로. 사용자 입력의 와일드카드는 반드시 이스케이프한다.

## 디바운스 — 2편에서 안 짠 그 트랜스포머

이제 핵심입니다. 검색창은 매 글자마다 `SearchChanged` 를 던지는데([6편](/blog/flutter-app-search-filter)), 이제 그때마다 **SQL 을 왕복**하면 낭비예요. "우유"를 치면 ㅇ·우·울·우유… 매 키 입력마다 질의가 나갑니다. 그래서 **입력이 멈춘 뒤 한 번만** 질의하도록 디바운스합니다.

바로 여기가 [2편](/blog/flutter-app-bloc-from-scratch)에서 미뤄 둔 지점입니다. 그때 `flutter_bloc` 의 이벤트 트랜스포머(debounce·droppable 같은)를 안 짜면서 "필요해지면 그때 직접 짜거나 패키지로"라고 했죠. **그 '그때'가 왔습니다.** 패키지 없이, `Timer` 로 직접 짭니다.

```dart
case SearchChanged(:final query):
  // 타이핑은 멈출 때까지 기다렸다가 한 번만 질의한다(디바운스).
  _query = query;
  _debounce?.cancel();
  _debounce = Timer(searchDebounce, () => add(const QueryRefreshed()));
case QueryRefreshed():
  await _runQuery();
case FilterChanged(:final filter):
  // 탭은 타이핑이 아니니 디바운스 없이 즉시 재질의한다.
  _filter = filter;
  await _runQuery();
```

`SearchChanged` 가 올 때마다 **이전 타이머를 취소**하고 새로 겁니다. 그래서 입력이 계속되는 동안엔 질의가 안 나가고, `searchDebounce`(기본 300ms) 만큼 조용해진 뒤에야 타이머가 깨어 `QueryRefreshed` 를 큐에 넣죠. 이게 debounce 트랜스포머가 하던 일의 알맹이입니다 — 알고 보면 `Timer` 하나예요.

여기서 [2편](/blog/flutter-app-bloc-from-scratch)의 설계가 빛을 봅니다. 타이머 콜백이 `_runQuery()` 를 **직접 부르지 않고** `add(QueryRefreshed())` 로 이벤트 큐에 넣는 것 — 그래야 다른 이벤트들과 **같은 `await for` 줄에 서서 순차 처리**되거든요. 트랜스포머를 얹어도 순차 처리의 규율이 안 깨지는 겁니다. 그리고 필터 탭은 타이핑이 아니니 디바운스 없이 즉시 질의합니다. **무엇을 디바운스하고 무엇을 즉시 처리할지 내가 정하는** 거죠 — 직접 짠 것의 자유입니다.

> **규칙 회수 —** 매 키 입력마다 질의하면 낭비다. 그래서 2편에서 미뤄 둔 트랜스포머를 `Timer` 로 직접 짜, 입력이 멎은 뒤 한 번만 질의한다.

## 파생을 지운다 — SQL이 걸러 오니까

[6편](/blog/flutter-app-search-filter)의 `TodosLoaded` 는 **전체 목록**을 들고 `visibleTodos` 를 파생했습니다. 이제 SQL 이 걸러서 돌려주니, 상태가 든 `todos` 가 **곧 화면에 그릴 목록**입니다. 파생이 사라지죠.

```dart
Future<void> _runQuery() async {
  final result = await _getTodos(TodoQuery(status: _filter, text: _query));
  result.match(
    (failure) => _emit(TodosFailure(failure.message)),
    (todos) => _emit(TodosLoaded(todos, filter: _filter, query: _query)),
  );
}
```

6편에선 "전체는 진실, 보이는 건 파생"이었는데, 7편에선 **저장소가 진실이자 필터**입니다. 이건 퇴보가 아니라 **규모에 맞춘 이동**이에요. 데이터가 손안에 있을 땐 파생이 옳았고(6편), 손 밖으로 나갈 만큼 커지면 조회가 옳습니다(7편). 같은 판단 기준 — **데이터가 손안에 있는가** — 이 규모에 따라 다른 답을 준 것뿐입니다. 화면(`TodosPage`)은 여전히 `todos` 를 그대로 그리기만 하고, 바뀐 건 그 목록이 **어디서 걸러졌나** 뿐이죠.

> **규칙 회수 —** SQL 이 걸러 오면 화면 파생은 필요 없다. 그래서 `visibleTodos` 를 지우고, 상태가 든 목록을 그대로 그린다.

## 화면째, 디바운스까지 증명한다

디바운스는 시간이 얽혀서 테스트가 까다롭습니다. 위젯 테스트에서는 **가짜 시계를 직접 감아** 증명합니다.

```dart
await tester.enterText(searchField, '우유');
// 디바운스(기본 300ms) 전에는 아직 그대로다.
await tester.pump(const Duration(milliseconds: 100));
expect(find.byType(TodoTile), findsNWidgets(2));

// 디바운스 경과 → 질의 → 결과 반영.
await tester.pump(const Duration(milliseconds: 300));
await tester.pumpAndSettle();
expect(find.byType(TodoTile), findsOneWidget);
```

100ms 시점엔 아직 안 좁아지고, 300ms 를 더 감으면 그제야 질의가 나가 목록이 좁아지는 것 — **디바운스가 실제로 기다린다**는 걸 시계로 증명합니다. bloc 단위 테스트에선 `searchDebounce` 를 `Duration.zero` 로 낮춰 즉시 돌리고요. 여기에 sqflite 검색 테스트(WHERE·LIKE·AND·이스케이프)까지 더해, 조건이 도메인에서 SQL 까지 내려가는 전 구간이 초록입니다.

## 정직하게 — 여기서 데인 곳들

이번 편엔 실제로 데인 곳이 있어서, 숨기지 않고 적습니다.

- **injectable 이 `Duration` 을 주입하려 했다.** 디바운스 시간을 테스트에서 바꾸려고 bloc 생성자에 `{Duration searchDebounce = ...}` named 파라미터를 뒀더니, `injectable` 이 그 기본값을 무시하고 **`Duration` 을 컨테이너에서 찾으려다** 앱이 통째로 터졌습니다("Object/factory with type Duration is not registered"). injectable 은 생성자 파라미터의 Dart 기본값을 존중하지 않거든요. 그래서 `searchDebounce` 를 생성자에서 빼 **기본값을 가진 필드**로 옮기고, 테스트는 `..searchDebounce = Duration.zero` 로 세팅하게 바꿨습니다. 코드 생성 DI 를 쓸 때 흔히 데는 곳이에요.
- **`LIKE '%우유%'` 는 인덱스를 못 탄다.** 앞에 와일드카드가 붙으면 B-tree 인덱스가 소용없습니다. 진짜 대용량 검색이라면 SQLite 의 **FTS5**(전문 검색) 같은 걸 써야 하고, 그건 또 한 편짜리 주제예요. 지금은 "SQL 로 내렸다"까지가 목표입니다.
- **페이징은 아직 안 했다.** 6편 예고엔 `LIMIT`(페이징)도 있었는데, 무한 스크롤 UI 와 커서가 얽혀 이번 범위 밖으로 뒀습니다. `search` 가 아직 전체 결과를 한 번에 돌려주니, 진짜 수만 건이면 `LIMIT`/`OFFSET` 이 다음 숙제입니다.
- **300ms 는 매직 넘버다.** 사람이 "멈췄다"고 느끼는 감각값이라 대개 200~400ms 를 쓰지만, 근거가 탄탄한 상수는 아닙니다. 실제 앱이라면 사용성 테스트로 조율할 값이에요.

이 넷 다 "지금 규모에서 옳거나, 다음 숙제"입니다. 중요한 건, 미뤄 둔 걸 실제로 구현했을 때 **계층이 흔들리지 않았다**는 점이에요 — 조건은 도메인 값으로 깔끔히 흘렀고, 화면은 여전히 목록만 그립니다.

## 정리 — 미뤄 둔 것을 구현하는 법

- **조건을 값으로**: `TodoQuery`(필터+검색어)를 도메인에 신설. 필터 enum 은 도메인(순수), 라벨은 프레젠테이션 확장.
- **계약을 따라 아래로**: `getAll` → `search(TodoQuery)`. usecase·repository·datasource 가 같은 조건을 주고받는다.
- **SQL 로 실현**: `WHERE`(필터) + `LIKE`(검색), 와일드카드는 이스케이프.
- **디바운스는 Timer 로**: 2편에서 미뤄 둔 트랜스포머를 직접. 취소-후-재예약, `QueryRefreshed` 로 순차 큐에 태운다. 검색은 디바운스, 필터는 즉시.
- **파생을 지운다**: SQL 이 걸러 오니 `visibleTodos` 불필요. 규모에 맞춘 이동(6편 파생 ↔ 7편 조회).
- **데인 곳**: injectable 은 생성자 기본값을 무시한다(필드로 회피). `LIKE '%…%'` 는 인덱스 못 탐(FTS 는 다음). 페이징·매직넘버는 숙제.

이걸로 6편의 예고를 갚았습니다. 미뤄 둔 결정을 실제로 구현하는 건 아키텍처의 진짜 시험대인데, 뼈대가 그걸 감당했어요 — [1편](/blog/flutter-app-architecture)에서 "자랄 앱이면 뼈대를 먼저"라던 투자가, 앱이 자랄 때마다 이렇게 되갚아집니다.

**핵심 한 줄 — 미뤄 둔 결정을 실제로 구현할 때가 아키텍처의 시험대다. 조건을 도메인 값으로 흘리고, 트랜스포머를 Timer로 직접 짜면, 검색을 SQL로 내려도 화면과 도메인은 흔들리지 않는다.**
