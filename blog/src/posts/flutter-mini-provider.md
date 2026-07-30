---
title: Provider를 40줄로 만들기 — watch와 read의 정체
date: 2026-01-08
description: Provider·Riverpod은 대체 무엇을 해주는 걸까요? 사실 재료는 1편(InheritedWidget 구독)과 2편(동일 인스턴스 스킵)에서 이미 다 봤습니다. 그래서 이번엔 파고들지 않고 직접 만듭니다. 상태관리의 알맹이를 40줄로 구현해, context.watch와 context.read가 사실 프레임워크 메서드 두 개(dependOn / getInherited)일 뿐임을 확인합니다. 실제 동작하는 미니 Provider와 "watch한 것만 리빌드된다"는 증명 테스트까지. Flutter 지하 탐사 시리즈 3편입니다.
tags: [Flutter, Provider, InheritedWidget, 상태관리, ChangeNotifier]
category: [dev, flutter]
draft: false
---

[2편](/blog/flutter-reconciliation-key) 끝에서 "상태를 공유하려면 GlobalKey 말고 상태관리를 쓰라"고 했습니다. 그 상태관리 — `Provider`, `Riverpod` — 는 대체 무엇을 해주는 걸까요?

사실 우리는 그 재료를 이미 다 봤습니다. [1편](/blog/flutter-buildcontext-internals)에서 **InheritedWidget 이 자손을 구독시켜, 값이 바뀌면 리빌드** 시키는 걸 봤죠. [2편](/blog/flutter-reconciliation-key)에서는 **동일 인스턴스 자식은 리빌드를 통째로 스킵** 하는 걸 봤고요. 이 둘이면 상태관리가 됩니다.

그래서 이번엔 파고들지 않고 **직접 만듭니다.** Provider 의 알맹이를 **40줄로** 구현해서, `context.watch` 와 `context.read` 가 사실 프레임워크 메서드 두 개일 뿐이라는 걸 확인합니다.

> 💻 이 글의 미니 Provider 와 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `lib/mini_provider.dart` · `test/mini_provider_test.dart` 에 있습니다.

## 필요한 건 세 조각

정리하면 상태관리는 이 셋이 전부입니다.

1. **값을 들고, 바뀌면 알리는 것** — 관찰 가능한 객체(notifier).
2. **그걸 트리에 내려주는 것** — 자손이 타입으로 찾게(InheritedWidget).
3. **꺼내 쓰는 법** — 구독하며 볼지(watch), 구독 없이 볼지(read).

하나씩 만들어 봅니다.

## (1) 값이 바뀌면 알린다 — Store

값을 들고 있다가 바뀌면 관심 있는 쪽에 알리는 객체가 필요합니다. Flutter 에 이미 있어요 — `ChangeNotifier`. `notifyListeners()` 를 부르면 등록된 listener 들에게 알립니다. 사용자는 이걸 상속해 자기 모델을 만듭니다.

```dart
abstract class Store extends ChangeNotifier {}

// 사용자 모델
class CounterStore extends Store {
  int count = 0;
  void increment() {
    count++;
    notifyListeners();   // "값 바뀌었어" 라고 알린다
  }
}
```

이게 상태의 출처입니다. 이제 트리에 내려줄 차례예요.

## (2) 트리에 내려준다 — Provide

Store 를 자손이 찾을 수 있게 InheritedWidget 으로 감쌉니다. 그런데 InheritedWidget 은 불변이라 스스로 못 바뀌죠. 그래서 **StatefulWidget 이 Store 의 알림을 듣고 있다가, 알림이 오면 `setState` 로 InheritedWidget 을 새 버전으로 갈아 세웁니다.**

```dart
class Provide<T extends Store> extends StatefulWidget {
  const Provide({super.key, required this.create, required this.child});
  final T Function() create;
  final Widget child;
  @override
  State<Provide<T>> createState() => _ProvideState<T>();
}

class _ProvideState<T extends Store> extends State<Provide<T>> {
  late final T _store = widget.create();
  int _version = 0;

  @override
  void initState() { super.initState(); _store.addListener(_onChange); }
  @override
  void dispose() { _store.removeListener(_onChange); _store.dispose(); super.dispose(); }

  void _onChange() => setState(() => _version++);   // 알림 → 버전 올리고 리빌드

  @override
  Widget build(BuildContext context) {
    // child 는 부모가 한 번 준 동일 인스턴스 → 이 리빌드에서 구조적으로 안 바뀐다(2편).
    return _Scope<T>(store: _store, version: _version, child: widget.child);
  }
}

class _Scope<T extends Store> extends InheritedWidget {
  const _Scope({required this.store, required this.version, required super.child});
  final T store;
  final int version;
  @override
  bool updateShouldNotify(_Scope<T> old) => old.version != version;
}
```

여기 **2편의 교훈** 이 숨어 있습니다 — `child` 로 넘긴 서브트리는 매번 동일 인스턴스라, Provide 가 리빌드해도 그 서브트리는 **구조적으로 리빌드되지 않습니다.** 갱신되는 건 오직 `_Scope` 를 **구독한** 위젯뿐이에요. "상태 바꿨더니 화면 전체가 리빌드되는 것 아냐?" 하는 걱정이 여기서 풀립니다.

## (3) 꺼내 쓴다 — watch 와 read 의 정체

마지막 조각, 그리고 이 글의 핵심. `context.watch` 와 `context.read` 는 특별한 마법이 아니라 **프레임워크 메서드 두 개** 입니다.

```dart
extension StoreContext on BuildContext {
  T watch<T extends Store>() =>
      dependOnInheritedWidgetOfExactType<_Scope<T>>()!.store;  // 구독한다

  T read<T extends Store>() =>
      getInheritedWidgetOfExactType<_Scope<T>>()!.store;       // 구독하지 않는다
}
```

둘의 유일한 차이가 이겁니다.

- `watch` → `dependOnInheritedWidgetOfExactType` — [1편](/blog/flutter-buildcontext-internals)에서 본, **구독을 거는** 그 메서드. 값이 바뀌면 이 위젯이 리빌드됩니다. 그래서 `build` 안에서 씁니다.
- `read` → `getInheritedWidgetOfExactType` — 소스를 보면 그냥 위젯을 꺼낼 뿐, **구독을 안 겁니다.** 그래서 값이 바뀌어도 안 리빌드되고, `onPressed` 같은 콜백에서 안전합니다.

```dart
// framework.dart (3.44.8) — read 가 쓰는 메서드는 구독(dependOn)이 아니다
T? getInheritedWidgetOfExactType<T extends InheritedWidget>() {
  return getElementForInheritedWidgetOfExactType<T>()?.widget as T?;
}
```

"`of(context)` 는 build 에서만", "`read` 는 콜백에서" 라는 규칙이 왜 그런지 — 이제 한 줄로 설명됩니다. **watch/read 가 dependOn/getInherited 니까.**

## 써보기 — 40줄이면 상태관리다

조립하면 익숙한 그림이 나옵니다.

```dart
Provide<CounterStore>(
  create: CounterStore.new,
  child: Scaffold(
    // watch: 값이 바뀌면 이 Text 만 리빌드
    body: Center(child: Text('${context.watch<CounterStore>().count}')),
    // read: 콜백에서 store 를 꺼내 부른다(이 버튼은 리빌드 안 됨)
    floatingActionButton: FloatingActionButton(
      onPressed: () => context.read<CounterStore>().increment(),
      child: const Icon(Icons.add),
    ),
  ),
)
```

`package:provider` 를 써본 적 있다면 소름 돋을 만큼 똑같죠. 그게 핵심입니다 — provider 도 결국 이걸 합니다.

## 증명 — watch 한 것만 리빌드된다

상태관리의 존재 이유는 "**바뀐 걸 보는 위젯만** 리빌드"입니다. 미니 Provider 가 그러는지 테스트로 못박습니다. watch 하는 위젯과, 구독 안 하는 위젯을 나란히 두고 값을 바꿉니다.

```dart
store.increment();
await tester.pump();

expect(watcherBuilds, 2);   // watch 한 위젯 → 리빌드됨
expect(readerBuilds, 1);    // 구독 안 한 위젯 → 그대로  ← 핵심
```

통과합니다. `read` 로 꺼낸 store 로 값을 바꿔도 그 위젯 자신은 리빌드되지 않는 것까지 확인했습니다.

## 정직하게 — 이건 축소판이다

이 40줄은 provider 의 **알맹이** 이지 전부는 아닙니다. 실전 provider·riverpod 은 여기에 더 얹습니다.

- **부분 구독(select)** — "count 중에서도 짝수 여부만" 같은 세밀한 구독. 지금은 알림마다 모든 watcher 가 리빌드됩니다.
- **생명주기·조합** — store 를 언제 dispose 할지, 여러 개를 겹칠지(MultiProvider), 다른 store 에 의존할지(ProxyProvider).
- **컴파일타임 안전성** — riverpod 은 "Provide 안 하고 watch" 를 런타임 assert 가 아니라 컴파일 단계에서 잡습니다.

하지만 뼈대는 정확히 이것입니다 — **InheritedWidget 구독 + notifier.** 나머지는 이 위에 얹은 편의와 안전장치예요.

## 정리 — Provider 는 마법이 아니다

- **Store** = 값 + 알림(`ChangeNotifier`).
- **Provide** = 알림이 오면 InheritedWidget 을 새로 세우는 StatefulWidget. `child` 를 고정해 watcher 만 리빌드(2편).
- **watch / read** = `dependOnInheritedWidgetOfExactType` / `getInheritedWidgetOfExactType` — 구독하느냐 마느냐, 그 차이뿐(1편).

핵심 한 줄 — **상태관리 라이브러리는 마법이 아니라, 1편의 구독과 2편의 재조정을 40줄로 감싼 것** 이었습니다. 직접 만들어 보면 `context.watch` 를 부를 때마다 무슨 일이 일어나는지 손에 잡히고, 그게 남의 라이브러리를 안심하고 쓰는 가장 확실한 방법이죠.

> 미니 Provider 전체 코드와 증명 테스트는 리포의 `lib/mini_provider.dart` · `test/mini_provider_test.dart` 에 있습니다. `fvm flutter test` 로 돌려볼 수 있습니다.
