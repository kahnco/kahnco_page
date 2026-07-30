---
title: 화면을 붙이다 — BlocProvider를 직접 짜서 트리에 얹기
date: 2026-02-13
description: 1편에서 뼈대를, 2편에서 손수 짠 bloc을 만들었지만 둘 다 화면이 없었습니다. 이제 붙입니다. 그런데 bloc을 화면 깊은 곳의 위젯이 어떻게 집고, StreamController는 누가 닫을까요? 답은 지하 탐사에서 이미 팠습니다 — InheritedWidget으로 트리에 얹고(BlocProvider의 정체), StatefulWidget의 수명으로 dispose하죠. StreamBuilder로 sealed 상태를 그리고, 텍스트 필드·체크박스는 이벤트만 되던지는 단방향 흐름을, 실제 코드와 화면째 돌아가는 위젯 테스트로 완성합니다. Flutter 실전 시리즈 3편입니다.
tags: [Flutter, StreamBuilder, InheritedWidget, BlocProvider, 위젯테스트, 단방향]
category: [dev, flutter]
draft: false
---

[1편](/blog/flutter-app-architecture)에서 뼈대를, [2편](/blog/flutter-app-bloc-from-scratch)에서 `flutter_bloc` 없이 손수 짠 bloc 을 만들었습니다. 그런데 둘 다 **화면이 없었죠.** 지금까지 앱은 테스트에서만 돌았습니다. 이제 진짜 화면을 붙입니다.

그런데 붙이려는 순간 두 가지 물음이 걸립니다. bloc 은 하나인데, **화면 깊은 곳의 체크박스가 그 bloc 을 어떻게 집을까요?** 그리고 손수 짠 bloc 은 `StreamController` 두 개를 들고 있는데, **그건 누가 닫을까요?**(안 닫으면 누수입니다.) 이 편의 규칙이 그 답의 방향입니다.

> **규칙 — 화면에 bloc 을 얹는 법도, 지하 탐사에서 이미 팠다.**

`BlocProvider` 를 직접 짜서 트리에 얹고, `StreamBuilder` 로 상태를 그리고, 위젯은 이벤트만 되던지는 — 그 전부가 지하 탐사에서 본 `InheritedWidget`·Element·State 수명 위에서 돕니다. 하나씩 붙여 보죠.

> 💻 코드는 **Flutter 3.44.8**, 화면과 위젯 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/features/todos/presentation/` 과 `test/widget_test.dart` 입니다.

## bloc을 트리에 얹는다 — BlocProvider의 정체

먼저 "깊은 곳의 위젯이 bloc 을 어떻게 집나" 입니다. 생성자로 `TodosPage(bloc) → TodoListView(bloc) → TodoTile(bloc)` 처럼 일일이 넘기면, 중간 위젯들이 쓰지도 않는 bloc 을 나르기만 하는 **prop drilling** 이 됩니다. `flutter_bloc` 이 `BlocProvider`/`context.read` 로 푸는 문제인데, 그 정체는 [지하 탐사 3편](/blog/flutter-mini-provider)에서 본 `InheritedWidget` 입니다. 그래서 직접 짭니다.

```dart
class TodosBlocProvider extends InheritedWidget {
  const TodosBlocProvider({super.key, required this.bloc, required super.child});

  final TodosBloc bloc;

  static TodosBloc of(BuildContext context) {
    final provider =
        context.dependOnInheritedWidgetOfExactType<TodosBlocProvider>();
    assert(provider != null, 'TodosBlocProvider 를 상위 트리에 두어야 합니다');
    return provider!.bloc;
  }

  @override
  bool updateShouldNotify(TodosBlocProvider oldWidget) =>
      bloc != oldWidget.bloc;
}
```

`dependOnInheritedWidgetOfExactType` — 3편에서 판 바로 그 메서드입니다. 자식이 `TodosBlocProvider.of(context)` 를 부르면, Element 트리를 위로 훑어 가장 가까운 `TodosBlocProvider` 를 찾아 그 `bloc` 을 돌려줍니다. 중간 위젯은 아무것도 나르지 않아요. 이게 `flutter_bloc` 의 `BlocProvider.of` 가 하던 일의 알맹이입니다 — **트리 자체를 전달 통로로** 쓰는 것.

`updateShouldNotify` 가 `bloc != oldWidget.bloc` 인 건, bloc 인스턴스가 그대로면 굳이 의존 위젯들을 다시 부를 필요가 없기 때문입니다. bloc 은 한 번 만들면 계속 같은 놈이니, 실질적으로 이 알림은 거의 안 웁니다. 화면 갱신은 bloc **안의 스트림**이 맡고, 이 provider 는 그저 bloc 을 **찾게** 해줄 뿐이죠.

> **규칙 회수 —** 깊은 위젯이 bloc 을 집어야 한다. 그래서 `InheritedWidget` 으로 트리에 얹어, 3편에서 판 `dependOnInheritedWidgetOfExactType` 로 집게 한다.

## 수명은 StatefulWidget이 쥔다 — dispose로 스트림을 닫는다

두 번째 물음, "`StreamController` 는 누가 닫나". 손수 짠 bloc 의 대가입니다([2편](/blog/flutter-app-bloc-from-scratch)의 "정직하게") — `flutter_bloc` 은 `BlocProvider` 가 자동으로 닫아 주지만, 우리는 **손으로** 닫아야 합니다. 이 책임을 한 곳에 모으는 게 `StatefulWidget` 입니다. State 는 [지하 탐사 1편](/blog/flutter-buildcontext-internals)에서 봤듯 **Element 에 매달려 위젯보다 오래 사는** 객체라, 수명을 쥐기에 딱 맞아요.

```dart
class _TodosScopeState extends State<TodosScope> {
  late final TodosBloc _bloc = widget.bloc ?? getIt<TodosBloc>();

  @override
  void initState() {
    super.initState();
    _bloc.add(const TodosStarted()); // 화면이 뜨면 목록을 불러온다
  }

  @override
  void dispose() {
    _bloc.dispose(); // StreamController 두 개를 닫는다 — 누수 방지
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      TodosBlocProvider(bloc: _bloc, child: widget.child);
}
```

`initState` 에서 bloc 을 컨테이너(`getIt`)로부터 만들고 첫 이벤트를 던지고, `dispose` 에서 스트림을 닫습니다. bloc 의 생애가 이 State 의 생애에 **정확히 포개지는** 거죠. `late final ... = widget.bloc ?? getIt<TodosBloc>()` 는 테스트에서 bloc 을 갈아 끼울 뒷문입니다 — 평소엔 컨테이너가 만들고, 위젯 테스트에선 원하는 bloc 을 주입할 수 있게요. 그리고 `build` 은 앞서 만든 `TodosBlocProvider` 로 자식을 감싸 bloc 을 트리에 내려보냅니다.

여기서 1편의 DI 가 화면과 만납니다. `getIt<TodosBloc>()` 한 줄이 유스케이스·리포지토리·데이터소스·시간·id 를 전부 물린 bloc 을 내주니([1편](/blog/flutter-app-architecture)), 화면은 그 뒤에 뭐가 물렸는지 몰라도 됩니다.

> **규칙 회수 —** 손수 짠 스트림은 손으로 닫아야 한다. 그래서 `StatefulWidget` 의 State 에 bloc 수명을 포개, `initState` 에서 켜고 `dispose` 에서 닫는다.

## 상태를 그린다 — StreamBuilder와 sealed switch

이제 화면 차례입니다. `TodosPage` 는 **스스로 상태를 하나도 안 듭니다.** bloc 의 상태 스트림을 구독해, 흘러온 sealed 상태에 따라 **완결된 한 장면**을 그릴 뿐이죠. `StreamBuilder` 가 그 구독을 맡습니다.

```dart
StreamBuilder<TodosState>(
  stream: bloc.stream,
  initialData: bloc.state, // 늦게 붙는 구독자용 첫 프레임(2편)
  builder: (context, snapshot) {
    final state = snapshot.data!;
    return switch (state) {
      TodosInitial() || TodosLoading() =>
        const Center(child: CircularProgressIndicator()),
      TodosFailure(:final message) => _retryView(message),
      TodosLoaded(:final todos, :final error) => Column(children: [
          TodoInputField(error: error),
          Expanded(child: TodoListView(todos: todos)),
        ]),
    };
  },
)
```

`switch` 가 `TodosState` 의 네 갈래를 **남김없이** 덮습니다 — 상태를 sealed 로 닫아 둔([2편](/blog/flutter-app-bloc-from-scratch)) 보상이에요. 나중에 상태를 하나 더 늘리면, 컴파일러가 "이 `switch` 에서 안 다뤘다"고 화면 코드를 콕 집어 줍니다. 빠뜨린 로딩 스피너, 안 그린 오류 화면 같은 게 런타임까지 안 새는 거죠.

`initialData: bloc.state` 가 왜 필요한지도 2편에서 깔아 뒀습니다. `bloc.stream` 은 broadcast 라 **늦게 붙는 구독자는 이전 상태를 못 받습니다.** `StreamBuilder` 가 처음 붙는 그 프레임에 쓸 값이 없으면 `null` 스냅샷이 되니, bloc 이 기억해 둔 현재 상태(`bloc.state`)를 첫 데이터로 건네는 겁니다.

> **규칙 회수 —** 화면은 완결된 장면만 그리면 된다. 그래서 `StreamBuilder` 로 sealed 상태를 구독해 `switch` 로 남김없이 그리고, `initialData` 로 첫 프레임을 채운다.

## 동작을 되던진다 — 단방향으로 흐른다

화면이 상태를 **아래로** 그렸으니, 사용자 동작은 **위로** 흘러야 합니다. 위젯은 상태를 직접 바꾸지 않고 **이벤트만 되던져요.** 체크박스도, 휴지통도, 입력창도 전부 그렇습니다.

```dart
// TodoTile — 체크박스로 토글, 휴지통으로 삭제. 둘 다 이벤트만 던진다.
Checkbox(
  value: todo.completed,
  onChanged: (_) => bloc.add(TodoToggled(todo.id)),
),
// ...
IconButton(
  icon: const Icon(Icons.delete_outline),
  onPressed: () => bloc.add(TodoRemoved(todo.id)),
),
```

`Checkbox` 는 자기 `value` 를 스스로 뒤집지 않습니다. 탭하면 `TodoToggled` 를 던지고 — 그러면 bloc 이 유스케이스를 돌리고, 저장소를 다시 읽어 새 상태를 흘리고, `StreamBuilder` 가 다시 그려서, **그제야** 체크박스가 채워집니다. 데이터가 `이벤트 ↑ → 상태 ↓` 한 방향으로만 도는 거죠. 이 단방향이 좋은 건, 화면 어디를 봐도 "이 위젯이 지금 뭘 들고 있나"를 **상태 하나**만 보면 알기 때문입니다. 위젯이 제멋대로 쥔 로컬 상태가 없어요.

입력창도 마찬가지입니다. `TextField` 는 날것의 문자열을 `TodoAdded` 로 던질 뿐, 그게 유효한지 판단하지 않습니다 — 검증은 bloc 안 값 객체가 하죠([2편](/blog/flutter-app-bloc-from-scratch)). 그리고 그 결과인 `error` 가 상태에 실려 내려오면, 필드는 그걸 `errorText` 로 띄우기만 합니다.

```dart
TextField(
  controller: _controller,
  onSubmitted: (_) => _submit(), // TodoAdded(_controller.text) 를 던지고 비운다
  decoration: InputDecoration(hintText: '새 할 일', errorText: widget.error),
)
```

## 위젯은 파일당 하나, private 위젯은 없다

여기까지 `TodosBlocProvider`, `TodosScope`, `TodosPage`, `TodoInputField`, `TodoListView`, `TodoTile` — 위젯 하나에 파일 하나씩 나눴습니다. `flutter_bloc` 이 흔히 쓰는 `_InheritedBloc` 같은 **private 위젯도 안 만들었고요.** 이건 제 [플레이북](/portfolio) 규칙입니다.

이유는 이렇습니다. `_SomeWidget` 같은 private 위젯은 파일 안에 숨어서 **따로 테스트하기도, 미리보기(preview)로 띄우기도 어렵습니다.** 한 파일에 위젯 서넛이 엉키면 각각의 리빌드 경계도 흐려지고요. 파일당 public 위젯 하나로 끊으면, 위젯마다 독립적으로 테스트·미리보기가 되고, "이 위젯이 언제 다시 그려지나"의 경계가 파일 경계와 맞아떨어집니다. 이 작은 앱에선 과해 보여도, 화면이 늘어날수록 값을 하는 규율입니다.

## 그래서, 화면째 증명한다

bloc 을 화면에 얹었으니, 이젠 **화면째** 검증합니다. 위젯을 띄우고, 실제로 타이핑하고 탭해서, 상태가 화면에 반영되는지 봅니다. fake 그래프(인메모리)를 물려서요.

```dart
testWidgets('입력하고 추가하면 목록에 뜬다', (tester) async {
  await pumpApp(tester); // TodosScope + TodosPage 를 fake 환경으로 띄운다

  await tester.enterText(find.byType(TextField), '우유 사기');
  await tester.tap(find.byIcon(Icons.add));
  await tester.pumpAndSettle();

  expect(find.text('우유 사기'), findsOneWidget);
  expect(find.byType(TodoTile), findsOneWidget);
});
```

`enterText` → `tap` → `pumpAndSettle` 은 사용자가 실제로 하는 동작 그대로입니다. 그리고 이 흐름은 우리가 지금까지 쌓은 **모든 계층을 관통**해요 — 텍스트가 `TodoAdded` 로 던져지고(3편 UI), 값 객체를 통과하고(2편 검증), 유스케이스를 지나(1편 도메인), 인메모리 저장소에 담기고(1편 데이터), 새 상태로 흘러나와 `StreamBuilder` 가 다시 그립니다. 그 끝에 화면에 '우유 사기'가 떠 있는지를 단언하는 거죠. 빈 제목이면 오류 문구가 뜨고 추가되지 않는지, 체크박스·휴지통이 도는지 — 전부 화면째 증명합니다(`widget_test.dart` 다섯 개). 지하 탐사에서 판 `pump`/`pumpAndSettle` 의 감각이([6편](/blog/flutter-render-pipeline)), 이제 앱을 검증하는 손끝에서 쓰입니다.

## 정직하게 — StreamBuilder면 충분한가

솔직히 짚을 게 몇 가지 있습니다.

- **리빌드 범위.** `StreamBuilder` 를 `TodosPage` 최상단에 두었으니, 상태가 바뀌면 입력창·목록이 **통째로** 다시 빌드됩니다. 항목 하나 토글했는데 전체가 다시 그려지는 거죠. 할 일 앱 규모에선 안 보이지만, `flutter_bloc` 의 `BlocBuilder` 에 `buildWhen` 을 걸거나 `StreamBuilder` 를 더 잘게 쪼개 **바뀐 부분만** 다시 그리는 게 정공법입니다. 손수 짠 대가의 하나예요.
- **라우터·반응형을 안 넣었다.** `go_router` 도, `flutter_screenutil` 도 안 썼습니다. 화면이 하나뿐인 앱에 라우터는 배선만 늘리고, 이 단순한 레이아웃에 화면 비례 스케일링은 아직 이릅니다. 필요해질 때 — 상세 화면이 생기고, 태블릿을 받쳐야 할 때 — 넣는 게 정직합니다.
- **재시작하면 사라진다.** 지금 저장소는 인메모리라([1편](/blog/flutter-app-architecture)), 앱을 끄면 할 일이 전부 날아갑니다. prod 도 인메모리로 돌고 있죠. 이걸 진짜 디스크 저장소로 가르는 게 다음 편입니다.

이 셋 다 "지금은 과하다"로 미룬 것들입니다. 앱이 자라면서 하나씩 값을 하게 될 때 붙이면 됩니다 — 미리 넣어 배선만 무겁게 만들지 않고요.

## 정리 — 화면이 붙는 법

- **bloc 을 트리에**: `InheritedWidget`(`TodosBlocProvider`)으로 얹고, `dependOnInheritedWidgetOfExactType` 로 집는다 — `BlocProvider` 의 정체(3편).
- **수명은 State 에**: `StatefulWidget` 이 `initState` 에서 켜고 `dispose` 에서 스트림을 닫는다 — 손수 짠 bloc 의 폐기 책임(1편 State 수명).
- **상태는 StreamBuilder 로**: sealed `switch` 로 남김없이 그리고, `initialData` 로 첫 프레임을 채운다.
- **동작은 이벤트로**: 위젯은 상태를 직접 안 바꾸고 이벤트만 되던진다 — `이벤트 ↑ → 상태 ↓` 단방향.
- **위젯 파일당 하나**: private 위젯 없이, 테스트·미리보기·리빌드 경계를 또렷하게(플레이북).
- **화면째 증명**: `enterText`/`tap`/`pumpAndSettle` 로 모든 계층을 관통해 검증한다.
- **미룬 것들**: 잘게 쪼갠 리빌드, 라우터, 반응형, 진짜 저장소 — 자랄 때 붙인다.

이제 앱은 화면까지 완성됐지만, 끄면 사라집니다. 다음 편에서는 인메모리 저장소를 **진짜 디스크 저장소**로 가릅니다 — 1편에서 `prod`/`fake` 로 갈라 둔 그 자리에, 도메인은 한 줄도 안 건드리고 데이터소스만 갈아 끼워서요. 클린 아키텍처가 값을 하는 순간입니다.

**핵심 한 줄 — 화면을 붙이는 법도 지하에 이미 있었다. bloc 은 InheritedWidget 으로 얹고 State 수명으로 닫으며, 화면은 상태를 그리고 이벤트만 되던진다.**
