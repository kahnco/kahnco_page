---
title: 검색·필터를 SQL로 안 내리고 화면에 둔 이유
date: 2026-02-25
description: 시리즈를 닫았다고 했는데, 앱을 쓰다 보니 검색과 필터가 필요해졌습니다. 지금까지의 반사신경은 "규칙은 도메인에, 저장은 SQL에"였죠(1·4편). 그런데 이번엔 반대로, 검색·필터를 아래 계층으로 내리지 않고 화면(bloc)에 뒀습니다. 목록이 이미 손안에 있는데 키 입력마다 DB를 때릴 이유가 없거든요. 모든 관심사를 밑으로 미는 게 능사가 아니라는 것, 그리고 검색창이 타이핑 중에도 포커스를 안 잃는 게 지하 탐사의 그 재조정 덕이라는 것을, 실제 코드와 테스트로 봅니다. Flutter 실전 시리즈 6편입니다.
tags: [Flutter, 상태관리, BLoC, 파생상태, 재조정, 아키텍처]
category: [dev, flutter]
draft: false
---

[지난 편](/blog/flutter-app-integration-finale)에서 시리즈를 닫았습니다. 그런데 완성된 할 일 앱을 실제로 써 보니, 목록이 조금만 길어져도 아쉬운 게 생기더군요 — **검색과 필터**입니다. 완료된 것만 보고 싶고, 제목으로 찾고 싶죠. 그래서 첫 확장 기능을 붙입니다. 이건 [1편](/blog/flutter-app-architecture)에서 "자랄 앱이면 뼈대를 먼저"라던 그 뼈대가, 실제로 자랄 때 흔들리지 않는지 보는 일이기도 합니다.

그런데 붙이려는 순간 익숙한 반사신경이 작동합니다 — "저장소에 `WHERE`/`LIKE` 질의를 더하자." [4편](/blog/flutter-app-sqflite)에서 SQL 을 제대로 쓰자고 했으니까요. 그런데 이번엔 그 반사신경을 눌렀습니다. 이 편의 규칙입니다.

> **규칙 — 모든 관심사를 아래 계층으로 미는 게 능사가 아니다. 어떤 건 화면에 둬야 한다.**

왜 검색·필터는 SQL 로 안 내리고 화면에 뒀는지, 그리고 그 결정이 어떤 코드를 만드는지 봅니다.

> 💻 코드는 **Flutter 3.44.8**, 예제와 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/presentation/` 과 `test/features/todos/presentation/` 입니다.

## 어디에 둘까 — SQL WHERE인가, 화면 파생인가

두 갈래가 있습니다.

**아래로 내리기.** 저장소에 `getFiltered(filter, query)` 를 더하고, sqflite 가 `SELECT ... WHERE completed = ? AND title LIKE ?` 를 돌립니다. 수만 건이라 전부 메모리에 못 올릴 때는 이게 정답이에요 — DB 가 인덱스로 걸러 주니까요.

**화면에서 파생하기.** 목록은 이미 `readAll` 로 **전부 메모리에 있으니**([1편](/blog/flutter-app-architecture)), bloc 이 그 목록에 필터·검색어를 적용해 보이는 것만 좁힙니다. 저장소는 안 건드리고요.

할 일 앱은 목록이 손안에 있고 규모가 작습니다. 이때 검색어 한 글자마다 SQL 을 왕복하는 건 **낭비**예요 — 네트워크도 아니고 로컬 메모리에 있는 걸 두고요. 게다가 매 키 입력마다 질의하면 **디바운스**가 필요해지는데, 우리는 [2편](/blog/flutter-app-bloc-from-scratch)에서 `flutter_bloc` 의 트랜스포머를 일부러 안 짰죠. 그러니 지금은 **화면 파생**이 맞습니다. 판단 기준은 하나예요 — **데이터가 이미 손안에 있는가.** 있으면 파생, 없으면(대용량·원격) SQL.

여기서 중요한 건, 검색·필터가 **뷰의 관심사**라는 인식입니다. "이 사용자가 지금 무엇을 보고 싶은가"는 도메인 규칙이 아니라 화면의 상태예요. 그래서 도메인에도, SQL 에도 내리지 않고 프레젠테이션에 둡니다. 계층을 긋는 건 **모든 걸 밑으로 미는 게 아니라, 각 관심사를 제자리에 두는 것**입니다.

> **규칙 회수 —** 데이터가 손안에 있고 검색·필터가 뷰의 관심사라면, 아래로 내리지 말고 화면에서 파생한다.

## 전체는 진실, 보이는 것은 파생

그래서 상태를 이렇게 짭니다. `TodosLoaded` 는 **전체 목록**과 함께 현재 `filter`·`query` 를 들고, 보이는 목록을 **파생**합니다.

```dart
class TodosLoaded extends TodosState {
  const TodosLoaded(this.todos,
      {this.filter = TodosFilter.all, this.query = '', this.error});

  final List<Todo> todos;      // 전체(진실원천)
  final TodosFilter filter;
  final String query;

  /// 필터 탭과 검색어를 전체 목록에 적용한 결과(대소문자 무시, 공백 다듬음).
  List<Todo> get visibleTodos {
    final needle = query.trim().toLowerCase();
    return todos.where((t) {
      final matchesFilter = switch (filter) {
        TodosFilter.all => true,
        TodosFilter.active => !t.completed,
        TodosFilter.completed => t.completed,
      };
      final matchesQuery =
          needle.isEmpty || t.title.value.toLowerCase().contains(needle);
      return matchesFilter && matchesQuery;
    }).toList();
  }
}
```

`todos` 는 **진실원천**이고, `visibleTodos` 는 그로부터 계산되는 **파생값**입니다. 화면은 `visibleTodos` 를 그리고, 필터를 바꿔도 `todos` 자체는 그대로예요 — 그래서 '완료'만 보다가 '전체'로 돌아오면 숨었던 것들이 그대로 다시 나타납니다. 지운 게 아니라 **가렸을** 뿐이니까요. 이 파생은 순수 함수라, bloc 없이 상태 객체만으로 테스트됩니다(`todos_loaded_view_test.dart` 여섯 개 — 필터별, 검색, 둘의 AND, 카운트).

> **규칙 회수 —** 필터는 목록을 바꾸는 게 아니라 가리는 것이다. 그래서 전체를 진실원천으로 두고, 보이는 목록을 파생값으로 계산한다.

## 이벤트로 뷰만 바꾼다

필터 탭과 검색창은 저장소를 건드리지 않으니, 이 이벤트들은 **화면 상태만** 갈아 끼웁니다. 그래도 [2편](/blog/flutter-app-bloc-from-scratch)의 원칙 그대로, 화면은 이벤트만 던지고 bloc 이 처리합니다.

```dart
case FilterChanged(:final filter):
  // 저장소를 건드리지 않는 화면 상태 변경 — 현재 목록에 필터만 갈아 끼운다.
  final now = _current;
  if (now is TodosLoaded) {
    _emit(TodosLoaded(now.todos, filter: filter, query: now.query));
  }
case SearchChanged(:final query):
  final now = _current;
  if (now is TodosLoaded) {
    _emit(TodosLoaded(now.todos, filter: now.filter, query: query));
  }
```

`TodoAdded`·`TodoToggled` 와 달리 유스케이스를 부르지 않아요. 그냥 현재 `todos` 를 그대로 두고 `filter`(혹은 `query`)만 바꿔 새 상태를 흘립니다. `TodosEvent` 가 `sealed` 라, 이 두 갈래를 더하자 bloc 의 `switch` 가 "안 다룬 이벤트가 있다"고 잡아 줬고요 — 새 이벤트를 추가할 때 처리를 빠뜨릴 수 없는 안전망입니다([2편](/blog/flutter-app-bloc-from-scratch)).

한 가지 미묘한 함정이 있습니다. 필터를 '미완료'로 둔 채 할 일을 **추가**하면 어떻게 될까요? 추가는 저장소를 바꾸니 `_reload` 가 목록을 다시 읽는데, 이때 필터를 잊으면 화면이 '전체'로 **리셋**돼 버립니다. 그래서 재적재가 현재 필터·검색어를 **이어 가게** 했습니다.

```dart
Future<void> _reload() async {
  final now = _current;
  final filter = now is TodosLoaded ? now.filter : TodosFilter.all;
  final query = now is TodosLoaded ? now.query : '';
  final result = await _getTodos(const NoParams());
  result.match(
    (failure) => _emit(TodosFailure(failure.message)),
    (todos) => _emit(TodosLoaded(todos, filter: filter, query: query)),
  );
}
```

작아 보여도 이런 게 빠지면 "검색해 놓고 항목 하나 체크했더니 검색이 풀리는" 짜증나는 버그가 됩니다. 그래서 "추가해도 필터·검색어가 유지된다"를 테스트로 못 박아 뒀어요.

> **규칙 회수 —** 필터·검색은 뷰 상태만 바꾼다. 그래서 유스케이스 없이 상태만 갈아 끼우되, 재적재가 그 뷰 상태를 이어 가게 해 리셋을 막는다.

## 검색창이 포커스를 안 잃는 이유 — 그 재조정이다

여기서 지하 탐사가 다시 등장합니다. 검색창은 매 글자마다 `SearchChanged` 를 던지고, 그러면 `StreamBuilder` 가 화면을 **통째로 다시 빌드**합니다([3편](/blog/flutter-app-wiring-ui)). 그런데도 타이핑하던 커서와 포커스는 안 날아가요. 왜일까요?

```dart
class TodosSearchField extends StatefulWidget {
  const TodosSearchField({super.key});
  // ...
}

class _TodosSearchFieldState extends State<TodosSearchField> {
  final TextEditingController _controller = TextEditingController();
  // 상태에서 값을 되받지 않는다. 이 컨트롤러가 검색어의 진실원천이다.

  @override
  Widget build(BuildContext context) => TextField(
        controller: _controller,
        onChanged: (value) {
          TodosBlocProvider.of(context).add(SearchChanged(value));
          setState(() {}); // 지우기 아이콘 표시 갱신
        },
        // ...
      );
}
```

두 가지가 맞물립니다. 첫째, 검색창은 **자기 컨트롤러를 진실원천**으로 삼습니다 — bloc 의 `state.query` 를 매 빌드마다 `_controller.text` 에 되쓰지 않아요. 되썼다면 커서가 매번 끝으로 튀었을 겁니다. 둘째, 화면이 다시 빌드돼도 `TodosSearchField` 는 **트리의 같은 자리에 같은 타입**으로 남습니다. 그래서 [지하 탐사 2편](/blog/flutter-reconciliation-key)에서 본 **재조정**이 작동해요 — Flutter 는 이걸 "같은 위젯의 갱신"으로 보고 Element 와 State 를 **재사용**합니다. State 가 살아 있으니 그 안의 `TextEditingController` 도 살아 있고, 포커스도 커서도 그대로죠.

바로 그 2편에서 "Key 없으면 State 가 위치에 붙는다"고 했던 게, 여기선 **축복**입니다. 검색창의 위치가 안 바뀌니 State 가 눌러앉아 입력 맥락을 지켜 주는 거예요. 원리를 파 두면, 이런 게 "왜 되는지"가 아니라 "당연히 그렇지"가 됩니다.

> **규칙 회수 —** 다시 빌드해도 검색창은 살아 있어야 한다. 그래서 컨트롤러를 진실원천으로 두고, 2편의 재조정이 State 를 재사용하게 맡긴다.

## 화면째 증명한다

늘 그랬듯 화면째 검증합니다. 두 항목을 넣고, 검색창에 타이핑해 목록이 좁아지는지 봅니다.

```dart
testWidgets('검색어를 입력하면 목록이 좁아진다', (tester) async {
  await pumpApp(tester);
  await addTodo(tester, '우유 사기');
  await addTodo(tester, '청소하기');
  expect(find.byType(TodoTile), findsNWidgets(2));

  await tester.enterText(searchField, '우유');
  await tester.pumpAndSettle();

  expect(find.byType(TodoTile), findsOneWidget);
  expect(find.text('청소하기'), findsNothing);
});
```

필터 탭도 마찬가지로, 하나만 완료 처리한 뒤 '완료'·'미완료' 탭을 눌러 걸러지는지 확인합니다(`widget_test.dart`). 화면에 `TextField` 가 둘(입력·검색)이 되면서 기존 테스트의 `find.byType(TextField)` 가 모호해졌는데, 각각을 **조상 위젯으로 특정**해 풀었어요 — `find.descendant(of: find.byType(TodoInputField), ...)` 처럼요. 이런 자잘한 정리도 위젯을 파일당 하나로 끊어 둔([3편](/blog/flutter-app-wiring-ui)) 덕에 깔끔합니다.

## 정직하게 — 언제 SQL로 내려야 하나

화면 파생을 택했지만, 이게 영원한 답은 아닙니다.

- **목록이 커지면 뒤집힌다.** 수천·수만 건이 되면 전부 메모리에 올려 매번 훑는 게 부담입니다. 그때는 `readAll` 을 버리고 저장소에 `WHERE`/`LIKE` + `LIMIT`(페이징)을 내려야 해요. 검색은 인덱스가 걸린 DB 의 일이 되죠.
- **그러면 디바운스가 필요하다.** 키 입력마다 질의하면 과하니, 입력이 멈춘 뒤 한 번만 쏘도록 debounce 해야 합니다. 여기서 [2편](/blog/flutter-app-bloc-from-scratch)에서 미뤄 둔 **이벤트 트랜스포머**가 드디어 값을 합니다 — 손으로 짜거나(`Timer` 로 debounce), 그때 `flutter_bloc` 으로 갈아타거나. "정직하게 미뤄 둔 것"이 실제로 필요해지는 순간이에요.
- **`LIKE '%query%'` 는 앞부분 인덱스를 못 탄다.** 본격 검색이 되면 FTS(전문 검색) 같은 걸 고려해야 하고, 그건 또 한 편짜리 주제입니다.

그래서 이 편의 결정은 "지금 규모에서 옳다"입니다. 중요한 건, **미뤄도 안전하다**는 점이에요. 나중에 SQL 로 내리더라도 그 변경은 데이터 계층과 bloc 안에서 끝나고, 화면과 도메인은 그대로일 겁니다 — [4편](/blog/flutter-app-sqflite)에서 증명한 그대로요.

## 정리 — 관심사를 제자리에

- **밑으로 미는 게 능사가 아니다**: 검색·필터는 뷰의 관심사. 데이터가 손안에 있으면 도메인·SQL 이 아니라 화면에서 파생한다.
- **전체는 진실, 보이는 건 파생**: `todos` 를 진실원천으로 두고 `visibleTodos` 를 계산. 필터는 지우는 게 아니라 가린다.
- **이벤트로 뷰만**: `FilterChanged`/`SearchChanged` 는 유스케이스 없이 상태만 바꾼다. sealed 확장이 처리 누락을 막는다.
- **재적재가 뷰를 이어 간다**: 추가·토글 뒤에도 필터·검색어 유지 — 리셋 버그 방지.
- **재조정이 포커스를 지킨다**: 컨트롤러가 진실원천 + 2편의 재조정 → 다시 빌드해도 검색창은 살아 있다.
- **한계를 안다**: 대용량이 되면 SQL + 페이징 + 디바운스로. 그때 2편의 트랜스포머가 값을 한다.

작은 확장 하나였지만, 1편의 뼈대가 정말 안 흔들리는지 확인하는 일이었습니다 — 도메인도 데이터도 안 건드리고 화면에만 얹혀 붙었으니까요. 골격이 튼튼하면, 기능은 이렇게 **얹히기만** 합니다.

**핵심 한 줄 — 계층을 긋는 건 모든 걸 밑으로 미는 게 아니라, 각 관심사를 제자리에 두는 것이다. 데이터가 손안에 있는 검색·필터는 화면에서 파생하는 게 옳다.**
