---
title: 이미 깔린 DB에 인덱스 더하기 — 스키마 마이그레이션
date: 2026-03-13
description: 9편에서 keyset 페이징을 짜며 "인덱스가 있으면 O(log n), 근데 인덱스를 더하려면 스키마 버전을 올려야 하고 그건 다음 숙제"라고 미뤘습니다. 이번 편에 그걸 갚습니다. keyset 정렬 키에 복합 인덱스를 거는 것 자체는 CREATE INDEX 한 줄이지만, 이미 사용자 폰에 깔려 있는 DB엔 그냥 못 넣습니다. onCreate는 새 설치만 타니까요. 그래서 버전을 v1→v2로 올리고 onUpgrade로 데이터를 지키며 인덱스를 더하는 마이그레이션을, 실제로 v1을 v2로 올려 보는 테스트까지 함께 봅니다. Flutter 실전 시리즈 10편입니다.
tags: [Flutter, sqflite, 마이그레이션, 인덱스, onUpgrade, keyset]
category: [dev, flutter]
draft: false
---

[9편](/blog/flutter-app-keyset-pagination)에서 keyset 페이징을 짜며 "정직하게" 절에 이렇게 남겼습니다 — **`(created_at, id)` 에 인덱스가 있다면 keyset 은 커서 위치를 바로 찾아 `O(log n)` 이다. 근데 인덱스를 더하려면 스키마 버전을 올려야 하고, 그건 다음 숙제.** 이번 편이 그 숙제입니다.

인덱스를 거는 것 자체는 `CREATE INDEX` 한 줄이에요. 문제는 **이미 사용자 폰에 v1 DB 가 깔려 있다**는 겁니다. [4편](/blog/flutter-app-sqflite)의 `onCreate` 는 **DB 를 처음 만들 때만** 실행되니, 기존 설치엔 인덱스가 안 생겨요. 그래서 이 편의 규칙은 인덱스가 아니라 **마이그레이션**입니다.

> **규칙 — 이미 깔린 앱의 DB 스키마를 바꾸려면(인덱스 추가도), 데이터를 지키며 버전을 올려야 한다.**

왜 그냥 `CREATE INDEX` 로는 안 되는지, sqflite 의 버전·`onUpgrade` 로 어떻게 안전하게 올리는지 실제 코드로 봅니다.

> 💻 코드는 **Flutter 3.44.8**, 예제와 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/data/` 와 `lib/core/database/` 입니다.

## 왜 인덱스인가

먼저 인덱스가 왜 필요한지 짚습니다. [9편](/blog/flutter-app-keyset-pagination)의 keyset 조회는 이렇게 돌았죠.

```sql
SELECT * FROM todos
WHERE (created_at, id) > (?, ?)
ORDER BY created_at ASC, id ASC
LIMIT ?
```

인덱스가 없으면 SQLite 는 이걸 **테이블 전체를 훑어(full scan) 조건을 거르고, 다시 정렬**해서 처리합니다. 행이 몇 만 개면 매 페이지마다 그 비용을 치러요. 그런데 **`(created_at, id)` 순서 그대로 만든 복합 인덱스**가 있으면, 인덱스는 이미 그 순서로 정렬된 트리라서 — 커서 위치를 **이진 탐색으로 바로 찾고**, 거기서부터 `LIMIT` 만큼 **순서대로 읽으면** 끝입니다. 정렬도 공짜(인덱스가 곧 정렬)고요. `O(n)` 풀스캔이 `O(log n)` 탐색이 됩니다.

핵심은 인덱스의 컬럼 순서가 **정렬·커서 키와 정확히 같아야** 한다는 거예요.

```dart
const String createTodosIndexSql =
    'CREATE INDEX IF NOT EXISTS idx_todos_created_at_id '
    'ON $todosTable(created_at, id)';
```

`(created_at, id)` — `ORDER BY created_at, id` 와도, `WHERE (created_at, id) > (?, ?)` 와도 같은 순서죠. 이 정렬 키가 곧 keyset 의 뼈대이므로([9편](/blog/flutter-app-keyset-pagination)), 인덱스도 그 뼈대를 그대로 덮습니다.

> **규칙 회수 —** keyset 이 빠른 건 정렬 키에 인덱스가 있을 때다. 인덱스의 컬럼 순서를 정렬·커서 키와 똑같이 맞춘다.

## 그냥 CREATE INDEX 를 못 하는 이유

인덱스 SQL 은 나왔으니, `onCreate` 에 한 줄 더하면 될까요? **새 설치는 됩니다.** 하지만 이미 앱을 쓰던 사용자는 **v1 스키마의 DB 파일이 폰에 그대로** 있어요. `onCreate` 는 DB 파일이 **처음 만들어질 때 딱 한 번**만 실행되니([4편](/blog/flutter-app-sqflite)), 기존 사용자의 DB 는 아무리 앱을 업데이트해도 `onCreate` 를 다시 타지 않습니다. 결과: **새 사용자만 인덱스가 있고, 기존 사용자는 없는** 갈라진 상태가 됩니다.

게다가 이걸 앱 시작 때 `db.execute('CREATE INDEX ...')` 로 매번 무작정 실행하면, 스키마 변경 이력이 코드 곳곳에 흩어져 "지금 이 DB 가 어느 버전인지"를 아무도 모르게 됩니다. 그래서 SQLite/sqflite 는 **버전 번호 + 마이그레이션 훅**이라는 정식 장치를 줍니다. DB 파일에 **현재 스키마 버전이 새겨져** 있고, 앱이 더 높은 버전으로 열면 그 차이만큼 `onUpgrade` 가 실행돼요.

> **규칙 회수 —** `onCreate` 는 새 설치만 탄다. 기존 설치를 올리려면 버전을 올리고 그 차이를 메우는 **마이그레이션 훅**이 필요하다.

## version + onCreate + onUpgrade

그래서 스키마 버전을 `1 → 2` 로 올리고, 두 갈래를 둡니다 — **새 설치(`onCreate`)** 는 테이블과 인덱스를 한 번에 만들고, **기존 설치(`onUpgrade`)** 는 인덱스만 더합니다(테이블은 이미 있으니).

```dart
/// 스키마 버전. v2 = keyset 정렬 키에 복합 인덱스 추가.
const int todosDbVersion = 2;

/// 새 DB 생성(현재 버전): 테이블 + keyset 인덱스.
Future<void> onCreateTodosDb(Database db, int version) async {
  await db.execute(createTodosTableSql);
  await db.execute(createTodosIndexSql);
}

/// 스키마 업그레이드. 낮은 버전에서 올라올 때 필요한 변경만 순차 적용한다.
/// v1 → v2: keyset 인덱스 추가(테이블은 이미 있으므로 인덱스만).
Future<void> onUpgradeTodosDb(Database db, int oldVersion, int newVersion) async {
  if (oldVersion < 2) {
    await db.execute(createTodosIndexSql);
  }
}
```

`onUpgrade` 의 `if (oldVersion < 2)` 가 중요합니다. 마이그레이션은 **어느 버전에서 올라오든** 맞아야 해요. v1 사용자는 `oldVersion == 1` 이라 이 블록을 타 인덱스를 얻고, 이미 v2 인 사용자는 `onUpgrade` 자체가 안 불립니다. 나중에 v3 가 생기면 `if (oldVersion < 3) { ... }` 를 **아래에 덧붙이면**, v1 사용자는 `< 2` 와 `< 3` 을 **둘 다** 순서대로 타 v1 → v3 를 한 번에 따라잡습니다. 마이그레이션을 버전 순으로 쌓는 이 패턴이 핵심이에요.

그리고 DB 를 여는 곳([4편](/blog/flutter-app-sqflite)의 모듈)은 이 버전과 훅을 그대로 넘깁니다.

```dart
return openDatabase(
  path,
  version: todosDbVersion,
  onCreate: onCreateTodosDb,
  onUpgrade: onUpgradeTodosDb,
);
```

> **규칙 회수 —** 버전을 올리고, 새 설치는 `onCreate`(테이블+인덱스), 기존 설치는 `onUpgrade`(인덱스만). `if (oldVersion < N)` 을 쌓아 어느 버전에서든 따라잡게 한다.

## 단일 소스로 — 모듈과 테스트가 같은 걸 쓴다

여기서 흔한 실수가 있습니다. 마이그레이션 로직을 **모듈에 한 번, 테스트에 또 한 번** 손으로 적으면, 둘이 어긋나는 순간 "테스트는 통과하는데 실기기 마이그레이션은 깨지는" 최악의 버그가 납니다. 그래서 `onCreateTodosDb`·`onUpgradeTodosDb` 를 **한 곳에 함수로 두고**, 모듈도 테스트도 **그 함수를 그대로** 씁니다.

```dart
db = await databaseFactory.openDatabase(
  inMemoryDatabasePath,
  options: OpenDatabaseOptions(
    version: todosDbVersion,
    onCreate: onCreateTodosDb,     // 프로덕션과 같은 함수
    onUpgrade: onUpgradeTodosDb,   // 프로덕션과 같은 함수
  ),
);
```

이렇게 하면 sqflite 어댑터 테스트 전부가 **실제 prod 스키마(테이블+인덱스)** 위에서 돌게 됩니다. 스키마의 단일 진실원천이 코드 한 곳에 모이는 거죠([1편](/blog/flutter-app-architecture)의 "번역은 한 겹에" 정신이 스키마에도).

> **규칙 회수 —** 마이그레이션 로직은 모듈·테스트가 **공유하는 함수 하나**로. 손으로 두 번 적으면 어긋나 실기기에서 깨진다.

## 마이그레이션을 테스트한다

마이그레이션은 "될 거야"로 넘기면 안 됩니다 — **실제로 v1 을 v2 로 올려 봐야** 해요. `sqflite_common_ffi` 로 **파일 DB** 를 v1 로 열어 데이터를 넣고, 닫았다가 v2 로 다시 열어(=앱 업데이트를 흉내) 인덱스가 생기고 데이터가 그대로인지 봅니다.

```dart
test('v1 DB 를 v2 로 열면 keyset 인덱스가 생기고 데이터는 보존된다', () async {
  // 1) v1(테이블만, 인덱스 없음)으로 열어 데이터 저장 후 닫기.
  final v1 = await databaseFactory.openDatabase(path, options: OpenDatabaseOptions(
    version: 1, onCreate: (db, _) => db.execute(createTodosTableSql)));
  await v1.insert(todosTable, {'id': 'id-1', 'title': '옛 데이터', 'completed': 0, 'created_at': 0});
  expect(await indexNames(v1), isNot(contains('idx_todos_created_at_id')));
  await v1.close();

  // 2) v2 로 재오픈 → onUpgrade 로 인덱스 추가.
  final v2 = await databaseFactory.openDatabase(path, options: OpenDatabaseOptions(
    version: todosDbVersion, onCreate: onCreateTodosDb, onUpgrade: onUpgradeTodosDb));
  expect(await indexNames(v2), contains('idx_todos_created_at_id')); // 인덱스 생김
  expect((await v2.query(todosTable)).single['title'], '옛 데이터'); // 데이터 보존
  await v2.close();
});
```

v1 엔 우리 인덱스가 **없다가**, v2 로 열자 **생기고**, 그 사이 넣은 '옛 데이터'는 **그대로** 남아 있는 것 — 마이그레이션이 파괴적이지 않다는 걸 못 박습니다. 새로 까는 v2 는 `onCreate` 로 처음부터 인덱스를 갖는지도 따로 확인하고요(`sqflite_todo_local_data_source_test.dart`, 마이그레이션 2종). 인메모리가 아니라 **진짜 파일 DB 를 닫았다 다시 여는** 게 포인트예요 — 그래야 sqflite 가 파일의 버전을 읽고 `onUpgrade` 를 실제로 부릅니다.

> **규칙 회수 —** 마이그레이션은 실제로 옛 버전을 새 버전으로 올려 봐야 안다. 파일 DB 를 v1 로 열어 데이터를 넣고, v2 로 재오픈해 인덱스 생성 + 데이터 보존을 검증한다.

## 정직하게 — 마이그레이션의 함정들

인덱스 하나 더하는 단순한 마이그레이션이었지만, 실서비스로 가면 조심할 게 많습니다.

- **`onUpgrade` 는 누적·순차여야 한다.** 위에서 말했듯 v3 를 내면 `if (oldVersion < 3)` 을 **덧붙여야** v1 사용자도 따라옵니다. 기존 블록을 고치지 말고 **아래로 쌓는 게** 원칙이에요 — 이미 배포된 마이그레이션을 바꾸면 특정 버전 사용자만 깨집니다.
- **파괴적 변경은 더 까다롭다.** 인덱스 추가는 안전하지만, **컬럼 삭제·타입 변경**은 SQLite 에서 `ALTER TABLE` 로 잘 안 됩니다. 보통 **새 테이블을 만들어 데이터를 옮기고 옛 테이블을 드롭**하는 절차를 `onUpgrade` 안에서 밟아야 해요. 컬럼 **추가**(`ALTER TABLE ADD COLUMN`)는 간단하지만요.
- **인덱스가 실제로 쓰이는지는 `EXPLAIN QUERY PLAN` 으로.** 인덱스를 만들었다고 옵티마이저가 꼭 쓰는 건 아닙니다. `EXPLAIN QUERY PLAN SELECT ...` 로 `SEARCH ... USING INDEX` 가 뜨는지 확인하는 게 정공법입니다(이번 편은 "인덱스가 생겼다"까지만 테스트했고, "쿼리가 그걸 탄다"는 별도 검증거리).
- **`IF NOT EXISTS` 로 멱등하게.** 인덱스 SQL 에 `IF NOT EXISTS` 를 둔 건, 어떤 경로로 두 번 실행돼도 안 깨지게 하기 위해서입니다. 마이그레이션은 재실행에 안전할수록 좋아요.
- **`LIKE '%…%'` 검색은 이 인덱스를 못 탄다.** 앞에 와일드카드가 붙는 제목 검색([7편](/blog/flutter-app-sql-search-debounce))은 `(created_at, id)` 인덱스와 무관합니다. 그건 여전히 **FTS 전문 검색**의 몫이에요(다음 숙제).

이 다섯 다 "지금 규모에선 괜찮거나, 다음 숙제"입니다. 중요한 건 — 인덱스든 뭐든 **스키마를 바꿀 때 기존 사용자의 데이터를 안전하게 데려오는 길**이 이제 뚫렸다는 점이에요. 앞으로 어떤 스키마 변경이 필요하든 `onUpgrade` 에 블록 하나 쌓으면 됩니다.

## 정리 — 데이터를 지키며 스키마를 올리기

- **왜 인덱스**: keyset 의 `(created_at, id)` 정렬·커서를 그대로 덮는 복합 인덱스 → 풀스캔+정렬이 `O(log n)` 탐색으로.
- **왜 마이그레이션**: `onCreate` 는 새 설치만 탄다. 기존 설치엔 인덱스가 안 생김.
- **version + onUpgrade**: 버전 v1→v2, 새 설치는 테이블+인덱스, 기존은 인덱스만. `if (oldVersion < N)` 을 쌓는다.
- **단일 소스**: 마이그레이션 함수를 모듈·테스트가 공유 → 어긋나 실기기에서 깨지는 걸 막는다.
- **테스트**: 파일 DB 를 v1→v2 로 실제로 올려 인덱스 생성 + 데이터 보존 검증.
- **함정**: 누적 순차, 파괴적 변경(테이블 재생성), `EXPLAIN QUERY PLAN`, 멱등성, LIKE 는 여전히 FTS 몫.

이걸로 9편의 성능 숙제를 갚았습니다. keyset 이 빨라졌고, 앞으로 스키마를 바꿀 길도 열렸어요. 조회 조건 하나로 검색·필터·페이징·인덱스가 모인 지금, 남은 큰 숙제는 `LIKE '%…%'` 를 대신할 **FTS 전문 검색** 하나입니다.

**핵심 한 줄 — 인덱스를 더하는 건 CREATE INDEX 한 줄이지만, 이미 깔린 DB에 넣으려면 버전을 올리고 onUpgrade로 데이터를 지키며 따라잡아야 한다. 그리고 그 마이그레이션은 실제로 올려 보는 테스트로만 믿을 수 있다.**
