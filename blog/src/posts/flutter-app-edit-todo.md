---
title: CRUD의 빈칸 채우기 — 수정도 값 객체로 재검증한다
date: 2026-03-21
description: 지금까지 앱은 추가·토글·삭제는 했지만 제목 수정이 없었습니다. CRUD의 U(Update)가 비어 있었죠. 이번 편에 그 빈칸을 채웁니다. 핵심은 수정도 추가와 똑같이 도메인 값 객체(TodoTitle)로 재검증한다는 것 — 빈 제목·과길이는 편집에서도 막혀야 하니까요. 그리고 편집 다이얼로그가 왜 bloc에 직접 접근하지 못하는지(showDialog는 새 라우트라 InheritedWidget 밖), 그래서 다이얼로그는 텍스트만 모으고 타일이 이벤트를 던지는 단방향 패턴까지, 돌아가는 코드와 테스트로 봅니다. Flutter 실전 시리즈 12편입니다.
tags: [Flutter, CRUD, 값객체, 다이얼로그, BLoC, 재검증]
category: [dev, flutter]
draft: false
---

지금까지 이 할 일 앱은 추가([2편](/blog/flutter-app-bloc-from-scratch))·토글·삭제([3편](/blog/flutter-app-wiring-ui))는 했지만, **제목을 고치는** 기능이 없었습니다. CRUD 로 치면 Create·Read·Delete 는 있는데 **Update(수정)** 가 비어 있었던 거죠. 이번 편에 그 빈칸을 채웁니다.

수정을 붙이는 건 별거 아닌 것 같지만, 놓치기 쉬운 게 하나 있어요. **추가할 때 걸었던 규칙을, 수정할 때도 똑같이 걸어야** 합니다. 빈 제목으로 **추가**는 못 하게 막았는데([1편](/blog/flutter-app-architecture)), 빈 제목으로 **수정**은 되게 두면 규칙에 구멍이 나니까요. 그게 이 편의 규칙입니다.

> **규칙 — 수정도 추가와 똑같이 도메인 값 객체로 재검증해야 한다.**

수정을 어떻게 계층을 따라 얹는지, 편집 다이얼로그가 왜 bloc 에 직접 손을 못 대는지, 실제 코드로 봅니다.

> 💻 코드는 **Flutter 3.44.8**, 예제와 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/` 입니다.

## 값 객체로 재검증 — _onEdited는 _onAdded의 쌍둥이

수정의 핵심은 **입력 검증이 추가와 완전히 같다**는 겁니다. [2편](/blog/flutter-app-bloc-from-scratch)에서 추가는 날것의 문자열을 `TodoTitle.create` 로 검증해, 통과분만 도메인으로 넣었죠. 수정도 **똑같은 경계**를 지납니다.

```dart
Future<void> _onAdded(String rawTitle) async {
  final title = TodoTitle.create(rawTitle);
  await title.match(
    (failure) async => _showError(failure.message),
    (value) async => _mutate(await _addTodo(value)),
  );
}

Future<void> _onEdited(String id, String rawTitle) async {
  // 수정도 같은 값 객체로 재검증한다 — 빈 제목·과길이는 여기서 걸린다.
  final title = TodoTitle.create(rawTitle);
  await title.match(
    (failure) async => _showError(failure.message),
    (value) async => _mutate(await _editTodo((id, value))),
  );
}
```

두 함수가 **쌍둥이**입니다. 다른 건 오른쪽 한 줄뿐이에요 — 추가는 `_addTodo(value)`, 수정은 `_editTodo((id, value))`. 검증(`TodoTitle.create`), 실패 처리(`_showError`), 성공 후 재조회(`_mutate`)가 전부 같습니다. 규칙이 **값 객체 하나에** 못 박혀 있으니([1편](/blog/flutter-app-architecture)), 추가든 수정이든 그 문을 지나기만 하면 자동으로 같은 규칙이 걸리는 거죠. 이게 검증을 값 객체에 둔 값입니다 — 새 진입점(수정)이 생겨도 규칙을 다시 적을 필요가 없어요.

> **규칙 회수 —** 규칙은 값 객체에 있다. 그래서 수정도 추가와 같은 `TodoTitle.create` 를 지나, 새 진입점이 생겨도 규칙이 자동으로 걸린다.

## 계약을 따라 — edit 유스케이스와 데이터 재사용

`_editTodo` 는 이번에 더한 유스케이스입니다. id 와 검증된 제목을 받아 리포지토리로 넘겨요. 입력이 둘(id, title)이라 **레코드**로 묶었습니다.

```dart
@lazySingleton
class EditTodo implements UseCase<Unit, (String, TodoTitle)> {
  const EditTodo(this._repo);
  final TodosRepository _repo;

  @override
  Future<Either<Failure, Unit>> call((String, TodoTitle) params) =>
      _repo.edit(params.$1, params.$2);
}
```

리포지토리 구현은 **이미 있던 데이터소스를 재사용**합니다. 대상을 찾아 제목만 바꾼 모델로 `update` 하죠 — 토글이 완료 상태를 바꿔 `update` 하던([1편](/blog/flutter-app-architecture)) 것과 똑같은 통로예요.

```dart
Future<Either<Failure, Unit>> edit(String id, TodoTitle title) async {
  try {
    final matches = (await _local.readAll()).where((m) => m.id == id);
    if (matches.isEmpty) return left(const CacheFailure('없는 항목입니다'));
    await _local.update(matches.first.copyWith(title: title.value));
    return right(unit);
  } catch (_) {
    return left(const CacheFailure());
  }
}
```

데이터소스 계약(`update`)은 손도 안 댔습니다. `TodoModel.copyWith` 에 `title` 인자 하나 더한 게 데이터 계층 변경의 전부예요. 계층을 제대로 그어 두면([4편](/blog/flutter-app-sqflite)), 새 동작(수정)이 **기존 계약 위에 얹히기만** 합니다.

> **규칙 회수 —** 수정도 계약을 따라 흐른다. 유스케이스는 (id, title) 을 넘기고, 리포지토리는 기존 `update` 를 재사용한다.

## 편집 UI — 다이얼로그는 왜 bloc에 손을 못 대나

이제 화면입니다. 할 일 줄을 **탭하면** 편집 다이얼로그가 뜨게 합니다. 그런데 여기 함정이 하나 있어요. `showDialog` 로 띄운 다이얼로그는 **새 라우트**라, 우리가 [3편](/blog/flutter-app-wiring-ui)에서 트리에 얹은 `TodosBlocProvider`(InheritedWidget) **바깥**에 있습니다. 즉 **다이얼로그 안에서는 `TodosBlocProvider.of(context)` 가 bloc 을 못 찾아요.**

그래서 역할을 나눕니다 — **다이얼로그는 텍스트만 모아 돌려주고, bloc 에 이벤트를 던지는 건 타일**이 합니다(타일은 provider 안에 있으니 bloc 을 압니다).

```dart
Future<void> _edit(BuildContext context) async {
  final bloc = TodosBlocProvider.of(context); // await 전에 잡아 둔다.
  final newTitle = await showDialog<String>(
    context: context,
    builder: (_) => TodoEditDialog(initial: todo.title.value),
  );
  if (newTitle != null) bloc.add(TodoEdited(todo.id, newTitle));
}
```

두 가지가 중요합니다. 첫째, **bloc 을 `await` 전에 잡아** 둡니다. 다이얼로그가 닫히길 기다린 뒤에는 이 `context` 가 여전히 유효한지 보장이 없으니(`use_build_context_synchronously` 경고의 이유), await 전에 확보하는 거죠. 둘째, 다이얼로그는 `Navigator.pop(텍스트)` 로 **입력만** 돌려주고, 실제 이벤트(`TodoEdited`)는 타일이 던집니다. 다이얼로그는 "무슨 제목을 원하나"만 알고, "그걸로 뭘 하나"는 모릅니다 — [3편](/blog/flutter-app-wiring-ui)의 "위젯은 이벤트만 되던진다"는 단방향 원칙이 다이얼로그에도 그대로예요.

```dart
class TodoEditDialog extends StatefulWidget {
  const TodoEditDialog({super.key, required this.initial});
  final String initial;
  // ...
  void _save() => Navigator.of(context).pop(_controller.text);
}
```

> **규칙 회수 —** 다이얼로그는 `showDialog` 라 bloc(InheritedWidget) 밖이다. 그래서 bloc 을 await 전에 잡고, 다이얼로그는 텍스트만 pop, 이벤트는 타일이 던진다.

## 검증 실패는 같은 통로로

빈 제목으로 저장하면 어떻게 될까요? 다이얼로그는 그냥 그 텍스트를 던지고 닫힙니다. 그러면 bloc 의 `_onEdited` 가 `TodoTitle.create` 로 검증하다 걸려, `_showError` 로 **화면의 오류 한 줄**(`state.error`)을 띄웁니다 — 추가할 때 빈 제목이 걸리던 것과 **똑같은 통로**예요.

핵심은 원래 제목이 **그대로 유지**된다는 겁니다. 검증 실패면 `_editTodo` 를 아예 안 부르니 저장소는 안 바뀌고, 화면엔 오류만 얹힙니다. "빈 제목으로 수정 시 오류가 뜨고 원래 제목이 남는지"를 bloc·위젯 양쪽에서 테스트로 못 박았어요(`todos_bloc_test.dart`, `widget_test.dart`). 타일을 탭해 '커피'로 바꾸면 목록이 '커피'로 갱신되고, 공백으로 저장하면 '할 일을 입력하세요'가 뜨며 원래대로 남습니다.

> **규칙 회수 —** 수정의 검증 실패는 추가와 같은 `state.error` 통로로 화면에 뜬다. 실패면 저장소는 안 바뀌고 원래 제목이 남는다.

## 정직하게 — 편집의 아쉬운 구석들

CRUD 를 완성했지만, 편집엔 더 다듬을 데가 있습니다.

- **오류가 다이얼로그 밖에 뜬다.** 지금은 빈 제목으로 저장하면 다이얼로그가 **닫힌 뒤** 페이지에 오류가 떠요. 검증의 진실원천이 도메인(bloc)이라 그런 건데, UX 로는 **다이얼로그 안에서 즉시** 빨간 글씨가 뜨는 게 낫습니다. 그러려면 다이얼로그도 `TodoTitle.create` 를 불러 즉시 검증하거나, 저장 버튼을 빈 값일 때 비활성화하는 식으로 **이중 방어**를 하면 됩니다(도메인 검증은 그대로 두고, 화면은 앞당겨 보여주는 것). 이 앱에선 통로를 하나로 유지하는 단순함을 택했습니다.
- **낙관적 업데이트가 아니다.** 수정 후 저장소를 **다시 조회**해 화면을 갱신합니다([8편](/blog/flutter-app-pagination)의 재적재). 로컬이라 즉각적이지만, 원격 API 라면 응답을 기다리는 동안 화면이 멈춘 것처럼 보일 수 있어요. 그땐 **낙관적 업데이트**(먼저 화면을 바꾸고, 실패하면 되돌리기)가 필요합니다.
- **편집 중 동시성.** 다이얼로그가 열려 있는 동안 그 항목이 다른 경로로 삭제되면? 지금은 저장 시 "없는 항목입니다" 실패로 떨어집니다. 단일 사용자 로컬 앱이라 드물지만, 원리상 편집과 삭제의 경합은 존재합니다.
- **편집 어포던스.** "줄을 탭하면 편집"은 익숙하지만, 체크박스·삭제 버튼과 탭 영역이 가까워 오조작 여지가 있어요. 연필 아이콘을 따로 두거나, 길게 눌러 편집 같은 대안도 있습니다. 접근성(스크린리더)엔 명시적 버튼이 더 낫고요.

이 넷 다 "지금 규모에선 괜찮거나, 더 다듬을 것"입니다. 중요한 건 — 수정이라는 새 동작을 붙이는데 **도메인 규칙도, 데이터 계약도 거의 안 바뀌었다**는 점이에요. 값 객체와 계층이 제 자리를 지키니, 기능은 얹히기만 합니다.

## 정리 — 수정을 얹는 법

- **CRUD 완성**: 추가·토글·삭제에 **수정(제목 변경)** 을 더해 U 를 채운다.
- **값 객체로 재검증**: `_onEdited` 는 `_onAdded` 의 쌍둥이. 같은 `TodoTitle.create` 를 지나 빈 제목·과길이를 막는다.
- **계약 재사용**: `edit` 유스케이스는 (id, title) 을 넘기고, 리포지토리는 기존 `update` 를 쓴다. `copyWith` 에 title 추가가 데이터 변경의 전부.
- **다이얼로그 패턴**: `showDialog` 는 InheritedWidget 밖. bloc 을 await 전에 잡고, 다이얼로그는 텍스트만 pop, 이벤트는 타일이 던진다.
- **실패는 같은 통로**: 검증 실패면 `state.error` 로 화면에 뜨고 원래 제목이 남는다.
- **아쉬운 구석**: 다이얼로그 내 즉시 검증, 낙관적 업데이트, 편집 동시성, 어포던스·접근성.

이걸로 CRUD 가 완성됐습니다. 작은 할 일 앱이지만 만들고·읽고·고치고·지우는 네 동작이 모두 값 객체와 계층을 지나며, 새 동작이 규칙을 다시 적지 않고 얹히는 걸 봤어요. 저장소 계층에 이어 이제 기능도 완결에 가까워졌습니다.

**핵심 한 줄 — 새 동작을 붙일 때 규칙을 다시 적지 않아도 되는 게 값 객체와 계층의 값이다. 수정도 추가와 같은 문(TodoTitle.create)을 지나면, 규칙은 저절로 걸린다.**
