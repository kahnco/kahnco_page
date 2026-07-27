---
title: 프런트가 백엔드를 비춘다 — 실시간·검색·재고·세션
date: 2025-11-13
description: 핵심 여정(상품→결제→주문)은 있었으니, 이제 백엔드의 강점을 화면에서 살릴 네 가지를 붙였습니다. 실시간 주문 상태로 사가가 움직이는 걸 새로고침 없이 보여주고, 이벤트 전용이던 재고 서비스에 조회 엔드포인트를 열어 품절을 표시하고, URL 쿼리로 검색·정렬을 SSR 하고, 서버 컴포넌트가 세션을 읽어 헤더에 로그아웃·장바구니 배지를 그립니다. 각 기능이 백엔드 개념 하나를 화면으로 끌어냈습니다. 이벤트 기반 쇼핑몰 고도화 시리즈 21편입니다.
tags: [Next.js, 실시간, CQRS, 풀스택, Go]
category: [dev, backend]
draft: false
---

프런트를 붙이고(17~20편) 나니, 화면은 도는데 **백엔드의 좋은 점이 화면에 안 드러난다** 는 게 아쉬웠습니다. 이벤트로 흐르는 사가도, 재고를 지키는 동시성 제어도, CQRS 읽기 모델도, 화면에선 안 보였죠. 그래서 네 가지 UI 기능을 붙였습니다 — 그런데 만들다 보니 각 기능이 **백엔드 개념 하나를 화면으로 끌어내는** 일이었습니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-28` 태그(`web/`)에 있습니다.

## ① 실시간 주문 상태 — 사가를 눈으로

주문하면 뒤에서 사가가 `PLACED → CONFIRMED → SHIPPED` 로 흐릅니다([1·2편](/blog/go-saga-payment)). 그런데 그동안 화면은 **새로고침해야** 상태가 바뀌었습니다. 이벤트 기반 시스템의 정수가 화면에선 죽어 있던 거죠.

여기서 **SSE 냐 폴링이냐** 를 골라야 했습니다.

- **SSE/WebSocket**: 서버가 이벤트를 밀어 준다. 진짜 실시간이지만, 백엔드에 스트리밍 엔드포인트를 새로 만들어야 합니다.
- **폴링**: 클라이언트가 주기적으로 당긴다. 단순하고 견고하며 **백엔드 무변경**.

우리 규모(주문 몇 건, 상태 변화 몇 초)엔 폴링이 맞았습니다. BFF 에 `GET /api/orders` 를 열고, `LiveOrders` 클라이언트가 2초마다 당깁니다. 핵심은 **언제 멈추냐** 입니다 — 모든 주문이 종결 상태(SHIPPED·CANCELLED·REFUNDED)면 폴링을 멈춰 불필요한 요청을 없앱니다.

```tsx
const TRANSIENT = ["PLACED", "CONFIRMED", "RETURN_REQUESTED"];
useEffect(() => {
  if (!orders.some((o) => TRANSIENT.includes(o.status))) return; // 다 끝났으면 폴링 안 함
  let active = true;
  const tick = async () => {
    const res = await fetch("/api/orders");
    if (active && res.ok) {
      const data = await res.json();
      setOrders(data);
      if (!data.some((o) => TRANSIENT.includes(o.status))) return; // 종결되면 멈춤
    }
    if (active) setTimeout(tick, 2000);
  };
  const t = setTimeout(tick, 2000);
  return () => { active = false; clearTimeout(t); };
}, [orders]);
```

이제 결제를 누르면, **새로고침 없이** 주문이 눈앞에서 배송까지 흐릅니다. 반품도 마찬가지로 실시간으로 환불까지 갱신됩니다. 이게 이벤트 기반 백엔드의 가장 강렬한 데모였습니다.

## ② 재고·품절 — 조회는 HTTP, 명령은 이벤트

재고를 화면에 보이려니 문제가 있었습니다. **재고 서비스는 이벤트 전용** 이었거든요 — `order.placed` 를 듣고 재고를 깎을 뿐, "지금 재고 얼마냐" 를 물을 창구가 없었습니다.

그래서 재고 서비스에 **조회 전용 HTTP 엔드포인트** 를 하나 열었습니다.

```go
// inventory: 명령(차감)은 이벤트로, 조회(read)는 값싸게 HTTP 로.
mux.HandleFunc("GET /stock/{productId}", h.get) // → {product_id, available}
```

이건 [CQRS](/blog/go-readmodel-cqrs) 의 결을 서비스 하나 안에서 따른 겁니다 — **쓰기(명령)는 이벤트, 읽기(조회)는 HTTP.** 재고의 소유권은 여전히 재고 서비스에 있고, 프런트는 그 스냅샷을 물어볼 뿐입니다. 화면에선 재고 수를 보여주고, 0이면 **품절** 로 담기를 막습니다.

> **정직하게: 화면의 재고는 "힌트" 입니다.** 이벤트로 계속 변하는 값을 스냅샷으로 읽는 거라, 담는 순간 이미 팔렸을 수 있습니다. 그래서 **진짜 방어는 주문 시점의 서버** 입니다 — [12편(동시성)](/blog/go-concurrency-stock)에서 재고를 원자적으로 지켰고, 초과 주문은 사가가 취소합니다. 화면 재고는 UX 를 위한 힌트일 뿐, 신뢰의 경계가 아닙니다.

## ③ 검색·정렬 — URL 이 곧 상태

상품 검색과 정렬은 **클라이언트 상태** 로 둘 수도 있었지만, **URL 쿼리** 로 SSR 했습니다.

```tsx
// /?q=이어폰&sort=price-asc → 서버가 필터·정렬해서 렌더
const { q = "", sort = "" } = await searchParams;
let products = await listProducts();
if (q) products = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
if (sort === "price-asc") products = [...products].sort((a, b) => a.price - b.price);
```

URL 이 상태이므로 **공유·북마크·뒤로가기가 자연스럽고**, 첫 렌더부터 결과가 서버에서 그려집니다. 검색창·정렬은 작은 클라이언트 컴포넌트가 URL 을 바꾸는 역할만 합니다. (큰 카탈로그라면 여기에 검색 인덱스·디바운스를 얹겠지만, 원칙은 같습니다 — 상태를 URL 에.)

## ④ 세션 헤더 — 서버 컴포넌트가 세션을 읽는다

헤더는 늘 "로그인" 만 보여줬습니다. 로그인 상태를 반영하려면 보통 클라이언트에서 세션을 들고 있어야 하지만, [BFF 의 httpOnly 세션 쿠키](/blog/go-web-bff) 덕에 **서버 컴포넌트(레이아웃)가 직접** 읽으면 됩니다.

```tsx
// app/layout.tsx (서버 컴포넌트)
const session = await getSession();
let cartCount = 0;
if (session) cartCount = (await getCart(session.customerId, session.token))
  .items.reduce((n, it) => n + it.quantity, 0);
// → 로그인 시 로그아웃 버튼 + 장바구니 배지, 아니면 로그인 링크
```

클라이언트 상태 관리 없이, 서버가 세션·장바구니를 읽어 헤더를 조건부로 그립니다. 로그아웃만 작은 클라이언트 버튼(BFF `POST /api/auth/logout` → 새로고침)입니다.

## 정직하게 — 각 결정의 그림자

- **폴링은 공짜가 아닙니다.** 2초 지연 + 주기적 요청. 종결 상태에서 멈춰 낭비를 줄였지만, 사용자·주문이 많아지면 SSE/WebSocket 으로 서버 푸시로 가야 합니다.
- **화면 재고는 최종 일관적** 입니다. 신뢰의 경계는 주문 시점 서버지, 화면 숫자가 아닙니다.
- **SSR 검색은 매 쿼리 서버 왕복** 입니다. 작은 카탈로그엔 충분하지만, 커지면 검색 read model·인덱스가 필요합니다.
- **인메모리 카탈로그** 라 재시작하면 상품이 초기화됩니다(데모 한계) — 그래서 시드 스크립트를 둡니다.

## 정리 — 프런트는 백엔드를 비추는 거울

- **실시간 주문**(폴링) — 이벤트 사가를 화면에서 움직이게.
- **재고·품절**(조회 HTTP) — 이벤트 전용 서비스에 read 창구를, CQRS 의 결로.
- **검색·정렬**(SSR·URL) — 상태를 URL 에 두어 공유 가능하게.
- **세션 헤더**(서버 컴포넌트) — 서버가 세션을 읽어 조건부 렌더.

핵심 한 줄 — **좋은 프런트 기능은 대개 백엔드의 좋은 성질을 화면으로 끌어내는 일** 이었습니다. 사가가 있으니 실시간이 자연스럽고, 소유권이 명확하니 재고 조회가 깔끔하고, 서버가 신원을 정하니 헤더가 단순해집니다. 프런트는 백엔드를 비추는 거울입니다.

> 이번 편 전체 코드·테스트는 리포의 `part-28` 태그(`web/`)에 있습니다.
