---
title: offset은 왜 밀리나 — keyset 페이징으로 갈아타기
date: 2026-03-09
description: 8편에서 페이징을 offset(LIMIT/OFFSET)으로 짰고, "정직하게" 절에 이렇게 적었습니다 — offset은 페이지 사이에 목록이 바뀌면 항목을 건너뛰거나 중복하고, 그럴 땐 keyset이 답이라고요. 이번 편에서 그 keyset(cursor) 페이징을 실제로 구현합니다. 위치(offset)가 아니라 "마지막으로 본 항목의 정렬 키 이후"를 조회하는 발상, SQLite 행 값 비교로 커서를 한 줄에 담는 법, 그리고 페이지 사이에 앞 항목이 삭제돼도 건너뛰지 않는 걸 돌아가는 테스트로 증명합니다. Flutter 실전 시리즈 9편입니다.
tags: [Flutter, 페이징, keyset, cursor, sqflite, 무한스크롤]
category: [dev, flutter]
draft: false
---

[8편](/blog/flutter-app-pagination)에서 페이징을 `LIMIT`/`OFFSET` 으로 짰습니다. 그리고 "정직하게" 절에 이렇게 남겼죠 — **offset 은 페이지 사이에 목록이 바뀌면 항목을 건너뛰거나 중복하고, 그럴 땐 keyset 이 답이다.** 핵심 한 줄도 "오프셋 페이징은 밀림에 약하고, 그럴 땐 keyset이 답"이었고요.

이번 편은 그 약속을 회수합니다. offset 을 걷어내고 **keyset(cursor) 페이징**으로 갈아탑니다. 먼저 왜 offset 이 밀리는지, 그 병을 정확히 봅니다. 그게 이 편의 규칙이에요.

> **규칙 — offset 페이징은 페이지 사이에 목록이 바뀌면 항목을 건너뛰거나 중복한다.**

이 병이 왜 생기는지, keyset 은 그걸 어떻게 없애는지 실제 코드로 봅니다.

> 💻 코드는 **Flutter 3.44.8**, 예제와 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/data/` 와 `test/features/todos/data/sqflite_todo_local_data_source_test.dart` 입니다.

## offset은 왜 밀리나

`LIMIT 2 OFFSET 2` 는 저장소에게 이렇게 말합니다 — **"앞에서 2개를 세서 버리고, 그다음 2개를 다오."** offset 은 **위치(순번)** 입니다. 그런데 그 위치는 목록이 고정돼 있을 때만 안정적이에요.

목록이 `[1, 2, 3, 4, 5]` 이고 2개씩 넘긴다고 합시다.

- 1페이지: `OFFSET 0 LIMIT 2` → `[1, 2]`
- (여기서 누군가 **1을 삭제**해서 목록이 `[2, 3, 4, 5]` 가 됨)
- 2페이지: `OFFSET 2 LIMIT 2` → 이제 앞 2개(`2, 3`)를 버리고 → **`[4, 5]`**

**3이 사라졌습니다.** 원래 3번째였던 `3` 이 삭제 때문에 2번째로 **당겨졌는데**, offset 2 는 여전히 "앞 2개 버리기"라서 `3` 을 건너뛴 거예요. 반대로 항목이 **삽입**되면 같은 항목을 두 페이지에서 **중복**해서 보게 됩니다. offset 이 세는 "위치"가, 그 사이 목록이 바뀌면서 **의미가 틀어진** 겁니다.

로컬 단일 사용자 할 일 앱에선 드물지만, 원리상 이건 offset 페이징의 **구조적 약점**입니다. 무한 스크롤처럼 페이지를 여러 번 이어 붙이는 동안 목록이 계속 변하는 화면에선 더 잘 드러나고요.

> **규칙 회수 —** offset 은 "위치"라, 페이지 사이 목록이 바뀌면 그 위치가 가리키는 대상이 달라져 건너뜀·중복이 난다.

## keyset의 발상 — 위치가 아니라 "값 이후"

keyset 은 발상을 뒤집습니다. **몇 개를 건너뛸지(offset)가 아니라, "마지막으로 본 항목 다음부터"를 값으로 지목**합니다. 즉 정렬 키를 **커서**로 삼아 "이 값보다 뒤에 오는 것"을 청하는 거예요.

`[1, 2, 3, 4, 5]` 를 다시 봅시다.

- 1페이지: (커서 없음) `LIMIT 2` → `[1, 2]`
- 마지막으로 본 게 `2` 니, **커서 = 2**.
- (여기서 `1` 이 삭제돼도 상관없음)
- 2페이지: **"`2` 보다 뒤"** `LIMIT 2` → `[3, 4]`

**`3` 을 안 건너뜁니다.** 커서는 "위치"가 아니라 항목 자신의 **정렬 키 값**이라, 앞에서 뭐가 지워지든 삽입되든 "`2` 다음"은 언제나 `3` 이거든요. offset 이 "몇 번째"였다면, keyset 은 "무엇 다음"입니다. 이 한 끗 차이가 밀림을 없앱니다.

여기서 전제가 하나 있습니다 — **정렬 키가 총 순서(total order)를 이뤄야** 합니다. 커서로 "이 값보다 뒤"를 판단하려면, 어떤 두 항목이든 앞뒤가 유일하게 정해져야 하니까요. `created_at` 만으로는 같은 시각 항목들의 앞뒤가 모호하므로, **`(created_at, id)`** 를 키로 씁니다 — 시각이 같으면 id 로 가른다.

> **규칙 회수 —** keyset 은 위치 대신 "마지막 본 항목의 정렬 키 이후"를 청한다. 그래서 앞이 바뀌어도 "무엇 다음"은 그대로다. 단, 정렬 키가 총 순서를 이뤄야 한다.

## 정렬 키를 커서로 — 행 값 비교

그래서 조회 조건에 offset 을 빼고 **커서**를 넣습니다. 커서는 마지막 항목의 `(createdAtMillis, id)` 예요.

```dart
class TodoCursor extends Equatable {
  const TodoCursor({required this.createdAtMillis, required this.id});
  final int createdAtMillis;
  final String id;
  @override
  List<Object?> get props => [createdAtMillis, id];
}

class TodoQuery extends Equatable {
  const TodoQuery({this.status = TodosFilter.all, this.text = '', this.limit, this.after});
  // ...
  final int? limit;
  final TodoCursor? after; // null = 첫 페이지
}
```

sqflite 는 이 커서를 **`WHERE (created_at, id) > (?, ?)`** 로 실현합니다. SQLite 의 **행 값 비교(row value)** 예요 — `(a, b) > (x, y)` 는 "a>x, 또는 (a=x 이고 b>y)"를 한 줄로 표현합니다. 정렬 키가 두 컬럼이니 커서 비교도 두 컬럼을 묶어야 하는데, 이걸 딱 한 줄에 담아 줍니다.

```dart
// keyset 커서: "마지막 본 항목 이후"만. 정렬 키와 같은 (created_at, id) 로 비교.
if (query.after case final cursor?) {
  clauses.add('(created_at, id) > (?, ?)');
  args
    ..add(cursor.createdAtMillis)
    ..add(cursor.id);
}

final rows = await _db.query(
  todosTable,
  where: clauses.isEmpty ? null : clauses.join(' AND '),
  whereArgs: args.isEmpty ? null : args,
  orderBy: 'created_at ASC, id ASC', // 커서 비교 키와 반드시 일치
  limit: query.limit, // OFFSET 은 없다
);
```

핵심은 **`ORDER BY` 와 커서 비교 키가 정확히 같아야** 한다는 겁니다(`created_at, id`). 이게 어긋나면 keyset 은 조용히 틀립니다 — 정렬은 이 순서인데 커서는 저 순서로 자르면, 건너뛰거나 겹쳐요. 인메모리 fake 도 같은 정렬로 정렬한 뒤 커서 이후만 `take` 하도록 맞춰, 테스트와 실제가 같은 창을 봅니다.

> **규칙 회수 —** 커서는 정렬 키 그 자체다. SQLite 행 값 비교 `(created_at, id) > (?, ?)` 로 한 줄에 담고, `ORDER BY` 를 반드시 같은 키로 맞춘다.

## bloc: offset 대신 마지막 항목의 커서

화면 쪽 변화는 작습니다. [8편](/blog/flutter-app-pagination)의 `_loadMore` 는 다음 페이지를 `offset: 지금까지_로드한_개수` 로 청했는데, 이제 **지금까지의 마지막 항목**으로 커서를 만들어 청합니다.

```dart
Future<void> _loadMore() async {
  final now = _current;
  if (now is! TodosLoaded || !now.hasMore || now.loadingMore) return;
  // ...
  // 커서 = 지금까지의 마지막 항목. offset 대신 "이 항목 이후"를 청한다.
  final last = now.todos.last;
  final result = await _getTodos(_queryFor(
    after: TodoCursor(
      createdAtMillis: last.createdAt.millisecondsSinceEpoch,
      id: last.id,
    ),
    limit: pageSize + 1,
  ));
  // ... rows.take(pageSize) 를 이어 붙이고 hasMore 갱신
}
```

`now.todos.last` — 이미 화면에 그려진 마지막 항목이 곧 커서입니다. 도메인 `Todo` 가 `createdAt` 과 `id` 를 들고 있으니([1편](/blog/flutter-app-architecture)), 커서를 새 필드 없이 바로 만들 수 있어요. "다음 페이지가 있나"를 판단하는 `pageSize + 1` 기법([8편](/blog/flutter-app-pagination))은 그대로고, 첫 페이지는 커서 없이(`after: null`) 청합니다. offset 이라는 개념 자체가 사라졌죠.

> **규칙 회수 —** 다음 페이지의 커서는 "지금 화면의 마지막 항목"이다. offset 계산이 사라지고, 그 항목의 정렬 키로 이어 붙인다.

## 그래서, 페이지 사이 삭제에도 안 건너뛴다

keyset 의 값어치는 바로 이걸로 증명합니다 — **페이지 사이에 앞 항목이 삭제돼도 건너뛰지 않는다.** 8편의 offset 이라면 밀렸을 상황을 그대로 재현합니다.

```dart
test('keyset 은 페이지 사이 삭제에도 항목을 건너뛰지 않는다', () async {
  for (var i = 1; i <= 5; i++) {
    await ds.insert(titled('$i', '할 일 $i', at: i));
  }
  final page1 = await ds.search(const TodoQuery(limit: 2)); // [1,2]
  expect(page1.map((m) => m.id).toList(), ['1', '2']);

  // 페이지 사이에 앞쪽 항목(1)을 삭제 — offset(2)이었다면 3을 건너뛰었을 상황.
  await ds.delete('1');

  // 커서(2) 이후를 청하므로 3을 안 건너뛴다.
  final page2 = await ds.search(
    TodoQuery(limit: 2, after: TodoCursor(createdAtMillis: 2, id: '2')),
  );
  expect(page2.map((m) => m.id).toList(), ['3', '4']);
});
```

1페이지로 `[1, 2]` 를 보고, 그 사이 `1` 을 지웁니다. offset 방식이면 2페이지는 `OFFSET 2` → 남은 `[2,3,4,5]` 의 앞 2개(`2,3`)를 버려 `[4,5]` 가 되어 **`3` 을 놓쳤을** 겁니다. keyset 은 커서 `2` 이후를 청하니 `[3, 4]` — **놓치지 않습니다.** 이 한 테스트가 이번 편의 전부예요. (일반 keyset 페이지네이션이 `[1,2]→[3,4]→[5]` 로 끊기는 것도 `ffi` 로 함께 증명하고, bloc·위젯 페이징 테스트는 8편 그대로 초록입니다 — 화면에서 본 변화는 없고 아래가 튼튼해진 것뿐이니까요.)

> **규칙 회수 —** 커서는 값이라 앞이 바뀌어도 흔들리지 않는다. 그래서 페이지 사이 삭제·삽입에도 건너뜀·중복이 없다.

## 정직하게 — keyset의 그늘

keyset 이 만능은 아닙니다. 이번 구현에도 짚을 게 있어요.

- **id 문자열 tiebreak 의 함정.** 커서 키를 `(created_at, id)` 로 잡았는데, id 가 문자열이라 **사전순** 비교입니다. `id-2` 와 `id-10` 을 비교하면 네 번째 글자에서 `1 < 2` 라 **`id-10` 이 `id-2` 보다 앞**으로 정렬돼요. 같은 시각 항목이 10개를 넘으면 순서가 사람 직관과 어긋납니다. 다만 **정합성 자체는 깨지지 않아요** — 사전순도 엄연한 총 순서라 keyset 은 여전히 안 건너뜁니다. 순서가 "이상해 보일" 뿐이죠. 제대로 하려면 tiebreak 을 **단조 증가하는 정수 키**(SQLite `rowid`)나 **ULID/스노우플레이크** 같은 정렬 가능한 id 로 두는 게 정공법입니다. 이 앱 규모에선 `(created_at, id)` 로 충분해 그대로 뒀습니다.
- **임의 페이지 점프가 안 된다.** offset 은 "5페이지로 바로"가 되지만, keyset 은 커서를 따라 순차로만 갑니다. 그래서 **번호형 페이저**(1 2 3 … 10)엔 안 맞고, **무한 스크롤**에 딱 맞아요. 우리 화면이 무한 스크롤이라 손해가 없습니다.
- **커서를 밖으로 내보낼 땐 불투명 토큰으로.** 서버 API 라면 `(created_at, id)` 를 날것으로 노출하기보다 base64 같은 **불투명 커서**로 감싸는 게 관례입니다(내부 키 구조를 API 계약에 묶지 않으려고). 로컬 앱은 커서가 메모리 안에만 있어 해당 없음.
- **큰 목록에서 진짜 이득은 성능이다.** 이번 편은 정합성(안 건너뜀)에 집중했지만, keyset 의 또 다른 강점은 **속도**입니다. `OFFSET 100000` 은 건너뛸 10만 행을 실제로 훑어야 하지만, keyset 은 인덱스로 커서 위치를 바로 찾아 `O(log n)` 이에요. `(created_at, id)` 에 인덱스가 있다면요 — 이건 다음 숙제입니다.

이 넷 다 "지금 규모에선 괜찮거나, 다음 숙제"입니다. 중요한 건, offset 을 keyset 으로 바꾸는데 **화면은 한 줄도 안 바뀌었다**는 점이에요 — `_loadMore` 가 커서를 만드는 방식만 달라졌고, 도메인·화면은 그대로입니다.

## 정리 — 위치에서 값으로

- **offset 의 병**: offset 은 "위치"라, 페이지 사이 목록이 바뀌면 건너뜀·중복이 난다.
- **keyset 의 발상**: "몇 개 건너뛰기" 대신 "마지막 본 항목의 정렬 키 **이후**". 앞이 바뀌어도 "무엇 다음"은 그대로.
- **커서 = 정렬 키**: `(created_at, id)`. SQLite 행 값 비교 `(created_at, id) > (?, ?)`, `ORDER BY` 를 같은 키로.
- **bloc**: 다음 페이지 커서는 "지금 화면의 마지막 항목". offset 계산이 사라진다.
- **증명**: 페이지 사이 삭제에도 안 건너뜀.
- **그늘**: id 사전순 tiebreak(→ rowid/ULID), 임의 점프 불가(무한스크롤엔 OK), 불투명 커서, 인덱스로 O(log n) 성능.

이걸로 8편의 예고를 갚았습니다. 페이징을 "몇 번째"에서 "무엇 다음"으로 바꾸니, 목록이 흔들려도 흔들리지 않는 페이지가 됐어요. 검색·필터·페이징이 모두 조회 조건 하나(`TodoQuery`)로 모인 지금, 다음으로 갈 만한 곳은 FTS 전문 검색, 스키마 마이그레이션, 그리고 방금 미룬 커서 인덱스 같은 것들입니다.

**핵심 한 줄 — offset은 "몇 번째"라 앞이 바뀌면 밀린다. keyset은 "무엇 다음"이라 안 밀린다. 정렬 키를 커서로 삼고, ORDER BY를 그 키에 맞추는 것이 전부다.**
