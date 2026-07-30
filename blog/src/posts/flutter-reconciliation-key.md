---
title: State가 엉뚱한 행에 남는 이유 — 재조정과 Key
date: 2026-01-04
description: 리스트에서 항목을 지우거나 순서를 바꿨더니 엉뚱한 행의 입력값·상태가 남는 그 버그. "리스트엔 Key를 주세요", "const가 빠르다" 같은 조언들. 전부 한 메커니즘에서 나옵니다 — 재조정(reconciliation). 부모가 리빌드할 때 새 Widget을 옛 Element에 어떻게 이어 붙이는지, updateChild의 세 갈래와 canUpdate, 리스트의 key 매칭, GlobalKey의 재부모화를 실제 framework.dart(3.44.8) 소스와 돌아가는 테스트로 파고듭니다. Flutter 지하 탐사 시리즈 2편입니다.
tags: [Flutter, Key, Element, 재조정, GlobalKey, 내부구조]
category: [dev, flutter]
draft: false
---

[1편](/blog/flutter-buildcontext-internals)에서 **State 는 Widget 이 아니라 Element 에 산다** 고 했습니다. 그 사실이 이번 편에서 사고를 칩니다.

리스트로 개발하다 보면 꼭 만나는 버그가 있죠.

- 항목을 하나 지웠더니, **엉뚱한 행의 입력값**(TextField 텍스트, 체크박스, 펼침 상태)이 남는다.
- 순서를 바꿨더니 색·애니메이션이 **항목을 안 따라간다.**

그리고 늘 듣는 처방 — "**리스트엔 Key 를 주세요.**" 왜일까요? 여기에 "const 를 붙이면 빠르다"는 조언까지, 전부 **한 가지 메커니즘** 에서 나옵니다 — **재조정(reconciliation)**. 부모가 리빌드할 때, 새 Widget 을 옛 Element 에 **어떻게 이어 붙이는가** 하는 이야기입니다. 늘 그렇듯, 마지막에 저 처방들로 다시 돌아옵니다.

> 💻 인용한 소스는 **Flutter 3.44.8** 의 `framework.dart`, 증명 테스트는 [github.com/kahnco/flutter-study](https://github.com/kahnco/flutter-study) 의 `test/reconciliation_key_test.dart` 입니다.

## 재조정 — 새 설계도를 옛 건물에 잇기

1편의 비유로: Widget(설계도)은 매 빌드 새로 오고, Element(건물)는 자리를 지킵니다. 부모가 리빌드하면 새 설계도 뭉치가 오는데, Flutter 는 건물을 다 부수고 새로 짓지 않아요. **자리마다 [옛 Element] 와 [새 Widget] 을 비교** 해, 셋 중 하나를 고릅니다. 그 판정이 `updateChild` 입니다.

```dart
// framework.dart (3.44.8) — updateChild 의 핵심 세 갈래(간추림)
if (child.widget == newWidget) {
  newChild = child;                            // (1) 완전히 같은 인스턴스 → 통째로 스킵
} else if (Widget.canUpdate(child.widget, newWidget)) {
  child.update(newWidget);                     // (2) 이어 붙임 — 같은 Element 재사용
  newChild = child;
} else {
  // (3) 옛 Element 해체 + 새 Widget 으로 새 Element 를 만든다(inflate)
}
```

(1) 은 리빌드를 **통째로 건너뜁니다.** `const` 위젯이 "빠르다"는 게 이거예요 — const 는 canonical 인스턴스라 매번 identical 이어서, 이 첫 줄에서 바로 스킵됩니다. (const 자식이 부모 리빌드에도 다시 build 되지 않는 걸 테스트로 확인했습니다.)

문제는 (2)와 (3)을 가르는 `canUpdate` 입니다.

## 재사용의 기준은 딱 둘 — 타입과 Key

`canUpdate` 는 놀랄 만큼 단순합니다.

```dart
// framework.dart (3.44.8)
static bool canUpdate(Widget oldWidget, Widget newWidget) {
  return oldWidget.runtimeType == newWidget.runtimeType
      && oldWidget.key == newWidget.key;
}
```

**같은 타입 + 같은 key** 면 옛 Element 를 재사용하고(그 안의 State 도 유지), 아니면 옛 Element 를 버리고 새로 만듭니다(State 리셋). 1편에서 State 는 Element 가 붙들고 있다고 했죠 — 그러니 **`canUpdate` 의 판정이 곧 "State 가 살아남느냐 리셋되느냐" 입니다.**

같은 자리에 같은 타입이면 State 유지, 타입을 바꾸면 State 리셋 — 테스트로도 확인됩니다. 대부분은 이게 옳게 동작해요. 그런데 **리스트** 에서 어긋납니다.

## 그래서 리스트에서 State 가 눌러앉는다

형제가 여럿인 리스트(`Column`·`ListView` 의 자식들)를 재조정할 때, 기본은 **위치로 매칭** 입니다 — 0번은 0번끼리, 1번은 1번끼리 `canUpdate` 를 봅니다. 그런데 리스트 항목은 보통 같은 타입이고 key 가 없으니 `canUpdate` 가 **항상 true** — **위치만 같으면 무조건 재사용** 됩니다.

여기서 순서를 뒤집거나 앞 항목을 지우면? 위치 0 의 Element(그리고 그 State)는 그대로 남고, **위젯 내용만** 새 항목으로 갈아끼워집니다. State 가 **항목이 아니라 위치에 눌러앉는** 거죠. TextField 텍스트가 엉뚱한 행에 남는 그 버그의 정체입니다.

Key 를 주면 매칭 규칙이 바뀝니다. 재조정기는 key 있는 옛 자식들을 **맵으로** 만들어 두고, 새 위젯을 **위치가 아니라 key 로** 찾습니다.

```dart
// framework.dart (3.44.8) — updateChildren(리스트 재조정), 간추림
oldKeyedChildren = <Key, Element>{};
for (final oldChild in oldChildren) {
  if (oldChild.widget.key != null) {
    oldKeyedChildren[oldChild.widget.key!] = oldChild;  // key → Element 색인
  }
}
// 새 위젯마다:
final key = newWidget.key;
if (key != null) {
  oldChild = oldKeyedChildren[key];   // 위치가 아니라 key 로 옛 Element 를 찾는다
}
```

이제 `ValueKey('A')` 가 붙은 항목은 어디로 옮겨 가든 **자기 Element(=State)를 데리고** 갑니다. (순서를 뒤집었을 때, Key 없으면 항목↔State 가 어긋나고 Key 있으면 그대로라는 걸 테스트로 확인했습니다.) **Key 는 "이 Element 는 이 항목의 것" 이라는 정체성 표** 예요 — 재조정을 위치에서 정체로 바꾸는 유일한 손잡이입니다.

## LocalKey 와 GlobalKey — 형제 구분과 트리 이동

Key 는 두 종류입니다.

**LocalKey**(`ValueKey`·`ObjectKey`·`UniqueKey`)는 **형제 사이에서만** 유일하면 됩니다. 방금 리스트 재조정이 이걸 써요. 보통 항목의 안정적 식별자를 줍니다 — `ValueKey(item.id)` 처럼.

**GlobalKey** 는 **트리 전체에서 유일** 합니다. 두 가지 특별한 능력이 있죠. 하나는 **어디서든 그 State·context 에 접근** 하는 것.

```dart
// framework.dart (3.44.8) — 전역 레지스트리에서 꺼낸다
Element? get _currentElement => buildOwner!._globalKeyRegistry[this];
T? get currentState => switch (_currentElement) {
  StatefulElement(:final T state) => state,
  _ => null,
};
```

다른 하나는 더 놀랍습니다 — 위젯이 **다른 부모 밑으로 옮겨 가도, Element 를 State 째로 데려옵니다**(재부모화). 새로 만드는 게 아니라요.

```dart
// framework.dart (3.44.8) — inflateWidget: GlobalKey 면 기존 걸 회수한다
final inactiveChild = key is GlobalKey
    ? _retakeInactiveElement(key, newWidget)   // 레지스트리에서 기존 Element 회수
    : null;
final newChild = inactiveChild ?? newWidget.createElement(); // 없을 때만 새로 생성
```

그래서 GlobalKey 위젯을 트리의 다른 자리로 옮겨도 **State 와 그 안의 값이 그대로** 유지됩니다. (부모를 바꿔도 같은 State, 카운트가 유지되는 걸 테스트로 확인했습니다.)

단, 공짜가 아닙니다. GlobalKey 는 전역 등록·재부모화를 거치고, **같은 GlobalKey 를 동시에 두 곳에 쓰면** *"Multiple widgets used the same GlobalKey"* 로 터집니다(레지스트리는 하나만 담으니까). 꼭 필요할 때만 씁니다.

## 정직하게 — Key 는 만능이 아니다

- **잘못된 Key 는 오히려 버그** 입니다. 재정렬되는 리스트에 `ValueKey(index)` 를 주면, index 는 결국 위치라서 위치 매칭과 똑같아집니다 — 데이터의 안정적 id 를 써야 해요.
- **`UniqueKey` 는 매 빌드 새 값** 이라, 붙이면 `canUpdate` 가 항상 false → **매번 State 가 리셋** 됩니다. "일부러 새로 만들고 싶을 때"만 쓰는 도구입니다.
- **GlobalKey 는 비용** 이 있습니다(전역 등록·재부모화). 상태 "공유"가 목적이라면 GlobalKey 대신 InheritedWidget·상태관리를 먼저 고려하세요 — 3편에서 그걸 직접 만들어 봅니다.
- 인용한 소스 라인은 **3.44.8 기준** 입니다. private 구현은 버전에 따라 바뀔 수 있지만, "canUpdate = 타입+key", "key 로 매칭" 이라는 공개 동작은 유지됩니다.

## 정리 — 규칙은 다시 여기서 나온다

처음의 처방들을 회수합니다. 이제 근거가 보입니다.

- **"리스트엔 Key"** → key 가 없으면 State 가 **위치** 에 눌러앉고, key 가 있으면 State 가 **항목** 을 따라가니까.
- **"const 가 빠르다"** → identical 이면 재조정을 **통째로 스킵** 하니까.
- **"타입을 바꾸면 State 가 초기화된다"** → `canUpdate` 가 false 라 옛 Element 를 버리니까.

핵심 한 줄 — 재조정은 "새 위젯을 어느 옛 Element 에 이을지" 정하는 일이고, **Key 는 그 판정을 '위치'에서 '정체'로 바꾸는 유일한 손잡이** 입니다. 1편에서 "State 는 Element 에 산다"를 봤으니, 이제 "그 Element 를 무엇에 붙들어 둘지" 는 여러분이 정할 수 있습니다.

> 여섯 가지 증명 테스트는 리포의 `test/reconciliation_key_test.dart` 에 있습니다. `fvm flutter test` 로 직접 돌려볼 수 있습니다.
