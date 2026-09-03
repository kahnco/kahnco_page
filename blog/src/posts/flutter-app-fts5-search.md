---
title: LIKE를 버리고 FTS5로 — 진짜 전문 검색
date: 2026-03-17
description: 7편부터 계속 미뤄온 숙제입니다. 제목 검색을 LIKE '%…%'로 짜면서 매 편 "정직하게" 절에 "이건 인덱스를 못 타니 진짜 검색은 FTS의 몫"이라고 적어 왔죠. 이번 편에 그걸 갚습니다. SQLite의 FTS5 가상 테이블로 제목을 역색인하고, 트리거로 원본과 동기화하고, LIKE를 MATCH로 바꿉니다. 이미 깔린 DB엔 마이그레이션으로 FTS를 얹고 기존 행을 백필하죠. 그리고 한글 토크나이저의 함정까지 — 돌아가는 테스트와 함께 봅니다. Flutter 실전 시리즈 11편입니다.
tags: [Flutter, sqflite, FTS5, 전문검색, 트리거, 마이그레이션]
category: [dev, flutter]
draft: false
---

[7편](/blog/flutter-app-sql-search-debounce)에서 제목 검색을 `LIKE '%…%'` 로 짰습니다. 그리고 그 뒤로 검색 이야기가 나올 때마다 "정직하게" 절에 같은 문장을 적어 왔어요 — **`LIKE '%…%'` 는 앞에 와일드카드가 붙어 인덱스를 못 탄다. 진짜 전문 검색은 FTS 의 몫이다.** 이번 편이 그 마지막 숙제입니다.

`LIKE` 는 쓰기 쉽지만, 검색이 커지면 벽에 부딪힙니다. 그 벽이 뭔지 먼저 보고, SQLite 의 **FTS5** 로 어떻게 넘는지 봅니다. 이 편의 규칙입니다.

> **규칙 — `LIKE '%…%'` 는 색인을 못 타 풀스캔이다. 전문 검색은 따로 색인해야 한다.**

왜 LIKE 가 색인을 못 타는지, FTS5 는 어떻게 다른지, 그리고 이미 깔린 DB 에 어떻게 얹는지 실제 코드로 봅니다.

> 💻 코드는 **Flutter 3.44.8**, 예제와 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/data/datasources/sqflite_todo_local_data_source.dart` 입니다.

## LIKE의 벽 — 왜 색인을 못 타나

[10편](/blog/flutter-app-migration-index)에서 인덱스는 "정렬된 트리라 이진 탐색으로 시작점을 바로 찾는다"고 했습니다. 그건 값의 **앞에서부터** 비교할 때 이야기예요. `title LIKE '우유%'`(앞이 고정)라면 인덱스로 "우유로 시작하는" 구간을 찾을 수 있습니다.

그런데 우리가 원한 건 `LIKE '%우유%'` — **앞에 `%` 가 붙은** 부분 일치였습니다. "우유가 어디든 들어간" 걸 찾으려면, 인덱스의 정렬 순서가 아무 소용이 없어요. `우유` 가 문자열 맨 앞일 수도, 중간일 수도 있으니 **모든 행을 처음부터 끝까지 훑어** 하나하나 `contains` 를 해봐야 합니다. 행이 몇 만 개면 매 검색이 풀스캔이에요.

FTS(Full-Text Search)는 발상이 다릅니다. 문서를 통째로 비교하는 대신, **단어(토큰)를 뽑아 "이 단어가 어느 문서에 있나"를 미리 뒤집어 놓은 역색인(inverted index)** 을 만듭니다. 그러면 "우유가 들어간 문서"는 역색인에서 `우유` 항목만 보면 바로 나와요. 풀스캔이 색인 조회가 됩니다. SQLite 는 이걸 **FTS5** 라는 확장으로 내장하고 있고요.

> **규칙 회수 —** `LIKE '%…%'` 는 앞 와일드카드라 정렬 인덱스가 무용, 풀스캔이 된다. FTS 는 단어→문서 역색인이라 색인 조회로 끝난다.

## FTS5 가상 테이블 — 원본은 두고 색인만

FTS5 는 **가상 테이블**로 만듭니다. 그런데 제목을 FTS 에 넣으면 원본(`todos.title`)과 **중복 저장**되죠. 그래서 **external content** 옵션을 씁니다 — FTS 는 **색인만** 갖고, 실제 텍스트는 원본 `todos` 테이블을 가리키게 하는 거예요. 둘은 `rowid` 로 잇습니다.

```dart
const String createTodosFtsSql = '''
CREATE VIRTUAL TABLE todos_fts USING fts5(
  title,
  content='todos',          -- 원본은 todos 테이블
  content_rowid='rowid'      -- rowid 로 원본과 연결
)
''';
```

`content='todos'` 가 "텍스트 원본은 todos 에 있다"는 뜻이고, `content_rowid='rowid'` 가 "둘을 rowid 로 잇는다"는 뜻입니다. 이렇게 하면 제목이 두 벌 저장되지 않고, FTS 는 역색인만 유지해요. 저장 공간을 아끼면서 검색만 빨라지는 거죠.

> **규칙 회수 —** external content FTS5 는 원본 텍스트를 중복 저장하지 않고 **색인만** 갖는다. `content`·`content_rowid` 로 원본 테이블과 rowid 로 잇는다.

## 트리거로 동기화 — external content의 대가

external content 의 대가가 있습니다 — FTS 가 원본을 **자동으로 따라가지 않아요.** `todos` 에 행을 넣거나 지워도 `todos_fts` 는 모릅니다. 그래서 **트리거**로 직접 이어 줘야 합니다. `todos` 가 바뀔 때마다 FTS 색인을 갱신하는 거죠.

```dart
Future<void> _createTodosFts(Database db) async {
  await db.execute(createTodosFtsSql);
  // 추가되면 색인에 넣고
  await db.execute('''
    CREATE TRIGGER todos_fts_ai AFTER INSERT ON todos BEGIN
      INSERT INTO todos_fts(rowid, title) VALUES (new.rowid, new.title);
    END''');
  // 지워지면 색인에서 빼고
  await db.execute('''
    CREATE TRIGGER todos_fts_ad AFTER DELETE ON todos BEGIN
      INSERT INTO todos_fts(todos_fts, rowid, title) VALUES('delete', old.rowid, old.title);
    END''');
  // 바뀌면 옛 것을 빼고 새 것을 넣는다
  await db.execute('''
    CREATE TRIGGER todos_fts_au AFTER UPDATE ON todos BEGIN
      INSERT INTO todos_fts(todos_fts, rowid, title) VALUES('delete', old.rowid, old.title);
      INSERT INTO todos_fts(rowid, title) VALUES (new.rowid, new.title);
    END''');
}
```

`'delete'` 라는 특별한 INSERT 는 FTS5 external content 가 "이 rowid 를 색인에서 빼라"고 지시하는 관용구예요(external content 는 그냥 DELETE 대신 이 형태를 써야 색인이 정합하게 유지됩니다). 삭제는 옛 것을 빼고, 수정은 옛 것을 빼고 새 것을 넣습니다.

이 트리거들 덕에 **데이터소스 코드는 하나도 안 바뀝니다.** `insert`/`update`/`delete` 는 여전히 `todos` 테이블에만 쓰고([1편](/blog/flutter-app-architecture)), FTS 동기화는 DB 안에서 트리거가 알아서 해요. 실제로 "제목을 바꾸면 옛 단어로는 안 잡히고 새 단어로 잡히는지"를 테스트로 못 박았습니다(`update` 후 `우유` → 없음, `커피` → 잡힘).

> **규칙 회수 —** external content 는 자동 동기화가 안 된다. 그래서 INSERT/UPDATE/DELETE 트리거로 FTS 색인을 원본과 맞춘다. 데이터소스는 그대로.

## LIKE를 MATCH로

이제 검색 자체를 바꿉니다. `LIKE` 조건을 **FTS 의 `MATCH`** 로 갈아 끼웁니다. FTS 가 매칭한 `rowid` 만 추려, 나머지 조건(필터·keyset 커서)과 AND 로 묶어요.

```dart
final text = query.text.trim();
if (text.isNotEmpty) {
  // LIKE 대신 FTS5 MATCH — 색인된 전문 검색으로. 매칭된 rowid 만 추린다.
  clauses.add('rowid IN (SELECT rowid FROM todos_fts WHERE todos_fts MATCH ?)');
  args.add(_ftsQuery(text));
}
```

핵심은 검색이 **정렬·페이징과 분리**된다는 겁니다. FTS 는 "어떤 행이 매칭되나"라는 **필터**로만 쓰고, 정렬은 여전히 `ORDER BY created_at, id`, 페이징은 keyset 커서([9편](/blog/flutter-app-keyset-pagination)) 그대로예요. 검색·필터·페이징이 각자 제 일만 하며 한 쿼리에 얹히는 거죠.

사용자 입력은 그대로 `MATCH` 에 넣으면 위험합니다(FTS 쿼리 구문에 특수문자가 있으니). 그래서 **접두 질의**로 안전하게 변환합니다.

```dart
/// 공백으로 나눠 각 토큰을 "..."* (암묵 AND). 예: "우유 데우기" → `"우유"* "데우기"*`.
String _ftsQuery(String text) => text
    .split(RegExp(r'\s+'))
    .where((t) => t.isNotEmpty)
    .map((t) => '"${t.replaceAll('"', '')}"*')
    .join(' ');
```

각 단어를 큰따옴표로 감싸(구문 깨짐 방지) 뒤에 `*`(접두)를 붙입니다. "우유"만 쳐도 "우유 사기"·"우유 데우기"가 잡히고("우유"로 시작하는 토큰), "우유 데우"처럼 두 단어면 **둘 다** 가진 것만 남죠(암묵 AND). LIKE 의 부분 일치를 토큰 접두 매칭으로 옮긴 겁니다.

> **규칙 회수 —** 검색은 FTS `MATCH` 로 매칭 rowid 를 추리는 **필터**일 뿐. 정렬·페이징은 keyset 그대로. 사용자 입력은 접두 질의로 안전하게 변환한다.

## 마이그레이션 v3 — FTS를 얹고 백필한다

FTS 는 스키마 변경이니, [10편](/blog/flutter-app-migration-index)에서 뚫어 둔 마이그레이션 길로 얹습니다. 버전을 `v2 → v3` 로 올리고, `onUpgrade` 에 블록을 **아래로 쌓아요.** 여기서 한 가지가 더 필요합니다 — **이미 `todos` 에 있던 행들을 FTS 에 채워 넣는 백필.**

```dart
Future<void> onUpgradeTodosDb(Database db, int oldVersion, int newVersion) async {
  if (oldVersion < 2) {
    await db.execute(createTodosIndexSql);        // v2: keyset 인덱스
  }
  if (oldVersion < 3) {
    await _createTodosFts(db);                     // v3: FTS + 트리거
    await db.execute(                              // 기존 행을 색인에 백필
      'INSERT INTO todos_fts(rowid, title) SELECT rowid, title FROM todos',
    );
  }
}
```

트리거는 **앞으로** 들어올 변경만 잡습니다. 마이그레이션 시점에 **이미 있던** 할 일들은 트리거를 안 거쳤으니 색인에 없어요. 그래서 `SELECT ... FROM todos` 로 전부 긁어 한 번 넣어 줍니다. 이 백필을 빠뜨리면 "옛 할 일은 검색이 안 되는" 미묘한 버그가 나죠. 그래서 **v1 DB 를 최신으로 올린 뒤, 백필된 옛 행이 검색으로 잡히는지**까지 테스트로 확인합니다(마이그레이션 후 `search('우유')` 로 옛 데이터가 나오는지).

> **규칙 회수 —** 트리거는 앞으로의 변경만 잡는다. 그래서 마이그레이션에서 FTS 를 만든 뒤 **기존 행을 백필**하고, 백필된 행이 검색되는지까지 검증한다.

## 정직하게 — 토크나이저와 그 너머

FTS5 로 검색이 색인을 타게 됐지만, 짚을 게 많습니다. 특히 **한글**이요.

- **기본 토크나이저는 단어·접두 매칭이다.** FTS5 의 기본 `unicode61` 토크나이저는 **공백·문장부호로 단어를 나눕니다.** "우유 사기"는 `[우유, 사기]` 로 잘 쪼개지지만, **"우유데우기"(공백 없음)는 한 토큰**이라 `데우` 같은 **중간 부분 검색이 안 됩니다.** 우리 접두 질의도 토큰의 **앞**만 매칭하고요. 즉 지금 구현은 LIKE 의 "아무 데나 부분 일치"보다 좁습니다.
- **CJK 중간 검색은 trigram 이 답이다.** 한글·한자·일어처럼 공백으로 단어가 안 갈리는 언어에서 진짜 부분 검색을 하려면, SQLite 3.34+ 의 **`tokenize='trigram'`** 토크나이저를 씁니다 — 3글자 단위로 색인해 중간 부분 문자열도 매칭해요(대신 2글자 미만 질의엔 약하고 색인이 커집니다). 이 앱은 제목이 대개 공백을 포함하는 짧은 문장이라 `unicode61` + 접두로 충분해 그대로 뒀지만, 본격 한글 검색이면 `trigram` 이나 형태소 기반 토크나이저를 고려해야 합니다.
- **관련도(bm25) 랭킹을 안 썼다.** FTS5 는 `ORDER BY bm25(todos_fts)` 로 **관련도 순** 정렬을 줄 수 있습니다 — LIKE 로는 못 하던 거죠. 하지만 우리는 정렬·페이징을 keyset(created_at, id)로 고정했기에 관련도 랭킹을 쓰지 않았습니다. 관련도 순 검색을 하려면 정렬을 bm25 로 바꿔야 하고, 그러면 keyset 커서도 다시 설계해야 해요(관련도는 단조롭지 않으니). "무한 스크롤 + 최신순"과 "관련도 랭킹"은 함께 가기 어렵습니다.
- **인메모리 fake 는 여전히 contains 다.** 테스트용 인메모리 구현은 FTS 를 흉내 내지 않고 `contains` 로 두었습니다([6편](/blog/flutter-app-search-filter)). 접두 매칭 케이스에선 결과가 같지만, 엄밀히는 실제(FTS)와 미세하게 다릅니다 — 그래서 **진짜 검색 동작은 sqflite 를 ffi 로 돌려** 검증합니다([4편](/blog/flutter-app-sqflite)).

이 넷 다 "지금 규모에선 괜찮거나, 본격 검색이면 갈아탈 것"입니다. 중요한 건 — 검색이 이제 **색인을 타는 구조**가 됐고, 토크나이저만 바꾸면 한글 부분 검색까지 확장할 길이 열렸다는 점이에요.

## 정리 — 검색이 색인을 타게

- **LIKE 의 벽**: `'%…%'` 는 앞 와일드카드라 정렬 인덱스가 무용, 풀스캔.
- **FTS5 역색인**: 단어→문서로 뒤집어 색인 조회로. external content 로 원본은 중복 저장 안 함.
- **트리거 동기화**: external content 는 자동 동기화 안 됨 → INSERT/UPDATE/DELETE 트리거. 데이터소스는 그대로.
- **LIKE → MATCH**: 검색은 매칭 rowid 를 추리는 필터. 정렬·페이징은 keyset 그대로. 입력은 접두 질의로 안전 변환.
- **마이그레이션 v3 + 백필**: FTS 를 얹고 **기존 행을 색인에 채운다**. 백필된 행이 검색되는지 검증.
- **정직하게**: 기본 토크나이저는 단어·접두(한글 중간검색은 trigram), bm25 랭킹은 keyset 과 상충, fake 는 contains.

이걸로 7편부터 미뤄온 검색 숙제를 갚았습니다. 검색·필터·페이징·인덱스·마이그레이션·전문검색이 모두 조회 조건 하나(`TodoQuery`)와 sqflite 한 어댑터 안에 정리됐어요. 작은 할 일 앱이지만, 여기 담긴 저장소 계층의 규율은 어떤 앱으로 커져도 그대로 값을 합니다.

**핵심 한 줄 — LIKE '%…%'는 색인을 못 타 풀스캔이다. FTS5는 단어를 역색인해 검색을 색인 조회로 바꾸고, 트리거로 원본과 동기화하며, 마이그레이션으로 이미 있던 데이터까지 백필해 검색에 태운다.**
