---
title: 전부 올리지 않는다 — 페이징과 무한 스크롤
date: 2026-03-05
description: 7편의 마지막 숙제였던 페이징을 구현합니다. 목록이 수천 건이면 한 번에 다 올릴 수 없으니, LIMIT/OFFSET으로 한 페이지씩 끊어 오고 바닥에 닿으면 이어 붙이죠. "다음 페이지가 있는지"를 별도 카운트 없이 N+1로 아는 기법, ScrollController로 바닥을 감지하는 법, 그리고 변경 뒤 왜 첫 페이지로 돌아가는지 — 오프셋 페이징의 정합성 한계와 keyset 페이징이라는 대안까지, 돌아가는 코드와 테스트로 봅니다. Flutter 실전 시리즈 8편입니다.
tags: [Flutter, 페이징, 무한스크롤, sqflite, BLoC, ScrollController]
category: [dev, flutter]
draft: false
---

[7편](/blog/flutter-app-sql-search-debounce)에서 검색을 SQL 로 내리며 "정직하게" 절에 이렇게 적었습니다 — **`readAll` 은 아직 전체를 읽는다. 수만 건이면 `LIMIT`/`OFFSET`(페이징)이 다음 숙제다.** 이번 편이 그 숙제입니다.

지금까지 `search` 는 조건에 맞는 걸 **전부** 돌려줬습니다. 목록이 작을 땐 괜찮았죠. 하지만 수천 건이 되면 그 전부를 메모리로 올리고, 위젯 수천 개를 만들려 드는 건 감당이 안 됩니다. 그래서 이 편의 규칙입니다.

> **규칙 — 전부 한 번에 올리지 말고, 필요한 만큼만 끊어 온다.**

한 페이지씩 끊어 오고, 화면 바닥에 닿으면 다음 페이지를 이어 붙이는 — 무한 스크롤을 만듭니다. 그리고 그 과정에서 드러나는 오프셋 페이징의 미묘한 함정까지 정직하게 봅니다.

> 💻 코드는 **Flutter 3.44.8**, 예제와 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/` 와 `test/features/todos/` 입니다.

## 조건에 페이지를 더한다

7편에서 조회 조건을 `TodoQuery` 로 만들어 뒀습니다([7편](/blog/flutter-app-sql-search-debounce)). 페이징은 그 조건에 **범위**를 더하는 일이에요 — 어디서부터(`offset`) 몇 개(`limit`).

```dart
class TodoQuery extends Equatable {
  const TodoQuery({
    this.status = TodosFilter.all,
    this.text = '',
    this.limit,   // null 이면 제한 없이 전부
    this.offset = 0,
  });
  // ...
}
```

sqflite 는 이걸 `LIMIT`/`OFFSET` 으로 실현합니다. 한 가지 주의점 — **`OFFSET` 은 `LIMIT` 없이 못 씁니다.** SQL 문법이 그래요. 그래서 limit 이 있을 때만 offset 을 함께 건넵니다.

```dart
final rows = await _db.query(
  todosTable,
  where: /* WHERE 필터·검색 (7편) */,
  orderBy: 'created_at ASC, rowid ASC',
  limit: query.limit,
  offset: query.limit == null ? null : query.offset,
);
```

인메모리 fake 도 같은 의미로 `skip(offset).take(limit)` 을 적용해, 테스트가 SQL 과 같은 창을 보게 맞춥니다. 조건이 `TodoQuery` 하나로 모여 있으니, 페이징을 더하는 게 **필드 두 개 추가**로 끝났어요 — 계층을 따라 흐르던 조건에 범위만 얹은 거죠.

> **규칙 회수 —** 페이징은 조회에 범위를 더하는 일이다. 그래서 `TodoQuery` 에 `limit`·`offset` 을 얹고, SQL 의 `LIMIT`/`OFFSET` 으로 내린다.

## "다음 페이지가 있나"를 N+1로 안다

무한 스크롤의 핵심 질문은 **"더 불러올 게 남았나"** 입니다. 이걸 모르면 마지막 페이지에서도 계속 로딩 스피너를 돌리거나, 빈 요청을 쏘게 되죠. 흔한 방법은 `SELECT COUNT(*)` 로 전체 개수를 따로 세는 건데, 질의가 두 번 나갑니다.

더 깔끔한 방법이 있어요. **한 페이지 크기보다 하나 더 청하는** 겁니다. `pageSize` 가 20이면 21개를 달라고 해서, **21개가 오면 "다음 페이지가 있다"**, 20개 이하면 "여기가 끝"이라고 판단하죠. 그리고 화면엔 20개만 그립니다.

```dart
Future<void> _runQuery() async {
  final result = await _getTodos(_queryFor(offset: 0, limit: pageSize + 1));
  result.match(
    (failure) => _emit(TodosFailure(failure.message)),
    (rows) => _emit(TodosLoaded(
      rows.take(pageSize).toList(),          // 화면엔 pageSize 만큼만
      filter: _filter,
      query: _query,
      hasMore: rows.length > pageSize,       // 하나 더 왔으면 더 있다
    )),
  );
}
```

`hasMore = rows.length > pageSize` 한 줄이 카운트 질의를 대신합니다. 이 **N+1 기법**은 커서 페이징에서도 그대로 쓰이는 표준이에요 — 여분의 한 행을 "다음이 있는지"의 **센티넬**로 쓰는 거죠. (sqflite 에 5건을 넣고 `limit:2` 로 페이지를 끊어 `[1,2]`·`[3,4]`·`[5]` 가 나오는지 ffi 로 증명합니다.)

> **규칙 회수 —** 끝을 알아야 스크롤이 멈춘다. 그래서 카운트 질의 대신 `pageSize + 1` 을 청해, 하나 더 오면 `hasMore` 로 삼는다.

## 다음 페이지를 이어 붙인다

바닥에 닿으면 `NextPageRequested` 이벤트가 오고, bloc 은 **지금까지 로드된 개수를 offset 삼아** 다음 페이지를 청해 **이어 붙입니다.**

```dart
Future<void> _loadMore() async {
  final now = _current;
  // 더 없거나 이미 불러오는 중이면 무시 — 중복 요청 방지.
  if (now is! TodosLoaded || !now.hasMore || now.loadingMore) return;
  _emit(TodosLoaded(now.todos,
      filter: _filter, query: _query, hasMore: true, loadingMore: true));

  final result =
      await _getTodos(_queryFor(offset: now.todos.length, limit: pageSize + 1));
  result.match(
    (failure) => _emit(/* 기존 목록 유지 + 오류 */),
    (rows) => _emit(TodosLoaded(
      [...now.todos, ...rows.take(pageSize)], // 누적
      filter: _filter, query: _query,
      hasMore: rows.length > pageSize,
    )),
  );
}
```

두 가지 가드가 중요합니다. **`!now.hasMore`** — 끝에 닿았으면 더 청하지 않고, **`now.loadingMore`** — 이미 불러오는 중이면 무시합니다. 무한 스크롤에서 바닥 근처의 스크롤 이벤트는 **연달아 여러 번** 튀거든요. 이 가드가 없으면 같은 페이지를 두세 번 청해 목록이 중복되거나 offset 이 어긋납니다. `loadingMore` 를 상태에 둔 이유가 이 중복 방지예요. (bloc 테스트로 "더 없으면 NextPageRequested 가 무시된다"를 못 박습니다.)

여기서도 [2편](/blog/flutter-app-bloc-from-scratch)의 순차 처리가 안전망입니다 — 이벤트가 `await for` 로 하나씩 처리되니, `loadingMore` 를 세우고 질의하는 동안 다른 페이지 요청이 끼어들지 않아요.

> **규칙 회수 —** 다음 페이지는 로드된 개수를 offset 삼아 이어 붙인다. 끝·로딩중 가드로 중복 요청을 막는다.

## 바닥을 감지한다

이제 "언제 다음 페이지를 청하나"입니다. 리스트가 **바닥 근처**까지 스크롤되면 던집니다. `ScrollController` 로 스크롤 위치를 보죠.

```dart
void _onScroll() {
  if (!widget.hasMore || widget.loadingMore) return;
  final position = _controller.position;
  if (position.pixels >= position.maxScrollExtent - _threshold) {
    TodosBlocProvider.of(context).add(const NextPageRequested());
  }
}
```

바닥에 **정확히** 닿기 전, `_threshold`(200px) 만큼 여유를 두고 미리 청합니다. 사용자가 끝에 닿아 로딩을 기다리는 게 아니라, 스크롤하는 동안 다음 페이지가 **미리** 준비되게요. 그리고 불러오는 중이면 리스트 맨 아래 한 칸을 스피너로 더 그립니다.

```dart
final itemCount = widget.todos.length + (widget.loadingMore ? 1 : 0);
// ...
if (index >= widget.todos.length) {
  return const Padding(
    padding: EdgeInsets.all(16),
    child: Center(child: CircularProgressIndicator()),
  );
}
return TodoTile(todo: widget.todos[index]);
```

`TodoListView` 가 이번에 `StatefulWidget` 이 된 건 이 `ScrollController` 때문입니다 — 컨트롤러는 생성·폐기가 있는 자원이라([3편](/blog/flutter-app-wiring-ui)의 State 수명), `initState` 에서 리스너를 걸고 `dispose` 에서 컨트롤러를 닫습니다.

> **규칙 회수 —** 바닥 근처에서 미리 청한다. `ScrollController` 로 위치를 보고, 임계값만큼 여유를 두고 다음 페이지를 던진다.

## 변경하면 첫 페이지로 — 왜

한 가지 결정을 짚어야 합니다. 페이지 3까지 스크롤해 60개를 보고 있는데, 항목 하나를 토글하면 어떻게 될까요? 지금 구현은 **첫 페이지로 돌아갑니다.**

```dart
/// 변경(추가·토글·삭제) 뒤에는 첫 페이지부터 다시 읽는다.
Future<void> _mutate(Either<Failure, Object?> result) => result.match(
      (failure) async => _showError(failure.message),
      (_) async => _runQuery(),
    );
```

스크롤 위치를 잃으니 아쉽지만, 이건 **의도한 단순화**입니다. 처음엔 "지금 로드된 창 전체를 다시 읽자"고 짰다가 버그를 만났거든요 — 창 크기를 현재 항목 수로 잡으니, 항목을 **추가**하면 창이 안 늘어나 새 항목이 화면에서 잘려 나갔습니다. 오프셋 페이징에서 "변경 후 로드된 창 보존"은 생각보다 까다로워요. 그래서 정합성이 확실한 "첫 페이지 재적재"를 택했습니다. 왜 까다로운지는 바로 다음 절입니다.

> **규칙 회수 —** 변경 뒤 로드된 창 보존은 정합성이 미묘하다. 그래서 확실한 첫 페이지 재적재를 택하고, 스크롤 보존은 정직하게 미룬다.

## 정직하게 — 오프셋 페이징의 그늘

이번 구현은 **오프셋 페이징**입니다. 간단하지만, 알아 둘 그늘이 있어요.

- **변경 중이면 항목이 밀린다.** `LIMIT 20 OFFSET 20`(2페이지)을 청하기 직전, 다른 곳에서 1페이지의 항목이 **삭제**되면, 원래 21번째였던 항목이 20번째로 당겨집니다. 그러면 2페이지 첫 항목을 **건너뛰게** 되죠. 반대로 삽입되면 **중복**됩니다. 로컬 단일 사용자 앱에선 드물지만, 원리상 오프셋 페이징의 약점이에요.
- **그래서 keyset(cursor) 페이징이 있다.** offset 대신 "마지막으로 본 항목의 정렬 키" 이후를 청하는 방식입니다 — `WHERE created_at > ? ORDER BY created_at LIMIT 20` 처럼요. 밀림·중복에 강하고 큰 offset 에서도 빠릅니다(offset 은 건너뛴 행을 다 훑어야 하거든요). 다만 임의 페이지 점프가 안 되고 커서 관리가 필요해, 무한 스크롤엔 어울리지만 구현이 더 무겁습니다. 이 앱 규모엔 오프셋으로 충분해 택하지 않았습니다.
- **첫 페이지가 화면을 못 채우면 자동 로드가 안 된다.** 지금 감지는 **스크롤 이벤트**에 기대는데, 첫 페이지가 뷰포트보다 작으면 스크롤할 게 없어 다음 페이지를 못 부릅니다. 진짜라면 레이아웃 뒤 `maxScrollExtent == 0 && hasMore` 를 확인해 채워질 때까지 자동 로드해야 해요(다음 숙제).
- **새 항목은 마지막 페이지에 생긴다.** 정렬이 `created_at ASC` 라, 추가한 항목은 맨 뒤 — 스크롤해야 보입니다. 노트·할 일 앱이 흔히 **DESC(최신 먼저)** 를 쓰는 이유죠. 여기선 이전 편들과의 일관성으로 ASC 를 유지했습니다.

이 넷 다 "지금 규모에서 오프셋으로 충분하거나, 다음 숙제"입니다. 중요한 건 — **페이징을 더하는데 도메인·화면의 뼈대가 흔들리지 않았다**는 점이에요. `TodoQuery` 에 필드 둘, 상태에 플래그 둘, 리스트에 컨트롤러 하나가 붙었을 뿐입니다.

## 정리 — 끊어 오는 법

- **조건에 범위를 더한다**: `TodoQuery.limit`·`offset` → SQL `LIMIT`/`OFFSET`(offset 은 limit 있을 때만).
- **끝은 N+1 로**: `pageSize + 1` 을 청해 하나 더 오면 `hasMore`. 카운트 질의가 필요 없다.
- **이어 붙인다**: 로드된 개수를 offset 삼아 누적. 끝·로딩중 가드로 중복 방지.
- **바닥을 감지**: `ScrollController` + 임계값으로 미리 청하고, 로딩 중엔 footer 스피너.
- **변경은 첫 페이지로**: 창 보존은 정합성이 미묘해 단순한 재적재를 택함.
- **그늘을 안다**: 오프셋은 밀림·중복에 약함 → keyset 이 대안. 작은 첫 페이지 자동 로드, 정렬 방향은 다음 숙제.

이것으로 6·7편에서 미뤄 둔 페이징까지 갚았습니다. 검색·필터·페이징이 모두 조회 조건 하나(`TodoQuery`)로 모여, 저장소가 걸러 오는 구조가 완성됐어요. 다음으로 갈 만한 곳은 keyset 페이징, FTS 전문 검색, 스키마 마이그레이션 같은 "그늘"들입니다 — 하나씩, 뼈대가 감당하는 걸 확인하며.

**핵심 한 줄 — 전부 올리지 말고 끊어 온다. 끝은 N+1로 알고, 바닥에서 이어 붙인다. 오프셋 페이징은 간단하지만 밀림에 약하고, 그럴 땐 keyset이 답이다.**
