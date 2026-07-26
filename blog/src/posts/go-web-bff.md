---
title: 백엔드에 프런트를 붙이니 보이는 것들 — BFF로 CORS를 지우다
date: 2025-10-25
description: 지금까지 이 쇼핑몰은 API 뿐이었습니다. curl 로만 두드렸죠. 그런데 진짜 브라우저 프런트엔드(Next.js)를 붙이자마자 첫 벽이 나타났습니다 — CORS. 브라우저는 catalog·customer·cart·ordering 을 제각각 부를 수 없습니다. 흔한 답은 모든 서비스에 CORS 헤더를 바르고 게이트웨이를 세우는 것이지만, Next.js SSR 과 docker-compose 를 만나면 더 깔끔한 길이 있습니다 — BFF. 서버 컴포넌트는 컨테이너 안에서 내부 DNS 로 부르고, 변경은 Next Route Handler 로 통과시켜, CORS 를 코드 한 줄 없이 지웁니다. 이벤트 기반 쇼핑몰 고도화 시리즈 17편입니다.
tags: [Next.js, BFF, CORS, 풀스택, Go]
category: [dev, backend]
draft: false
---

여기까지 이 쇼핑몰은 **API 덩어리** 였습니다. 도메인도, 사가도, 인증도, 관찰성도 갖췄지만 정작 사람이 보는 화면은 없었죠. 전부 `curl` 로만 두드렸습니다. 이번엔 진짜 **브라우저 프런트엔드(Next.js)** 를 붙였습니다. 그리고 붙이자마자, API 로만 볼 땐 안 보이던 것들이 드러났습니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-25` 태그(`web/` 디렉터리)에 있습니다.

## 첫 벽 — CORS

프런트의 첫 화면은 상품 목록입니다. 브라우저에서 카탈로그를 부르려고 하면 곧바로 막힙니다.

```text
Access to fetch at 'http://catalog:8080/products' from origin
'http://localhost:3000' has been blocked by CORS policy
```

문제는 하나가 아닙니다. 우리 백엔드는 **서비스마다 다른 오리진** 입니다 — 상품은 catalog, 로그인은 customer, 장바구니는 cart, 주문은 ordering. 브라우저가 이들을 직접 부르려면 **모든 서비스에 CORS 헤더** 를 발라야 하고, 게다가 `http://catalog:8080` 같은 **내부 주소는 브라우저가 아예 닿지도 못합니다**(compose 네트워크 안에서만 유효). 그래서 보통은 API 게이트웨이를 세워 `/api/catalog → catalog` 식으로 라우팅하고 CORS 를 겁니다.

그런데 우리는 **Next.js(SSR)** 를 골랐고, 이게 판을 바꿉니다.

## 더 나은 답 — BFF

핵심 통찰은 이겁니다. **Next.js 서버는 브라우저가 아니다.** 서버 컴포넌트와 Route Handler 는 **컨테이너 안에서** 돕니다. 그러니 Go 서비스를 **내부 DNS(`http://catalog:8080`)로, 서버-투-서버로** 부를 수 있습니다 — CORS 는 브라우저↔서버 사이의 규칙이지, 서버↔서버엔 해당이 없으니까요.

그래서 **BFF(Backend-for-Frontend)** 패턴을 씁니다.

- **읽기**(상품 목록·상세·내 주문)는 **서버 컴포넌트** 가 내부에서 직접 부르고, 완성된 HTML 을 브라우저에 보냅니다.
- **변경**(로그인·담기·결제)은 브라우저가 **Next 의 Route Handler** 를 부르고, 그 핸들러가 다시 Go 서비스를 내부에서 부릅니다.

**브라우저는 오직 Next(3000 포트)하고만 통신합니다.** 그러니 CORS 설정이 **아예 필요 없습니다.** 백엔드 Go 코드는 한 줄도 안 건드렸습니다.

### 읽기 — 서버 컴포넌트가 내부에서 SSR

상품 목록 페이지는 서버 컴포넌트입니다. 브라우저는 로딩 스피너도, `fetch` 도 없이 **완성된 목록** 을 받습니다.

```tsx
// app/page.tsx — 서버(컨테이너) 안에서 catalog 를 직접 호출 → SSR
export default async function Home() {
  const products = await listProducts(); // http://catalog:8080/products (내부)
  return <ProductGrid products={products} />;
}
```

`listProducts` 가 부르는 주소는 환경변수로 주입됩니다. 컨테이너 안에선 `http://catalog:8080`, 로컬 개발에선 compose 가 호스트로 열어 둔 포트. **브라우저는 이 주소를 영원히 못 봅니다.**

### 변경 — Route Handler 가 프록시(BFF)

로그인은 브라우저가 Next 의 `/api/auth/login` 을 부르고, 그 핸들러가 회원 서비스를 대신 부릅니다.

```ts
// app/api/auth/login/route.ts — 브라우저 → 이 핸들러 → customer 서비스
export async function POST(req: Request) {
  const { email, password } = await req.json();
  const res = await fetch(`${services.customer}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return NextResponse.json({ error: "로그인 실패" }, { status: 401 });
  const { token } = await res.json();
  await setSession(token); // 토큰을 httpOnly 쿠키로
  return NextResponse.json({ ok: true });
}
```

## 토큰은 브라우저 JS 가 못 보게 — httpOnly 쿠키

[13편(인증)](/blog/go-auth-jwt)에서 JWT 를 발급했었죠. 그 토큰을 브라우저 어디에 둘까요. `localStorage` 는 **XSS 한 방에 털립니다**(스크립트가 읽어감). 그래서 BFF 가 토큰을 **httpOnly 쿠키** 에 담습니다 — 브라우저 JS 는 못 읽고, 서버로 보낼 때만 자동으로 실립니다.

```ts
(await cookies()).set("shop_session", JSON.stringify({ token, customerId }), {
  httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24,
});
```

그리고 장바구니에 담을 때, BFF 가 쿠키에서 토큰을 꺼내 **Bearer 로** 장바구니 서비스에 붙입니다.

```ts
const session = await getSession(); // 쿠키에서 토큰·회원ID
await fetch(`${services.cart}/carts/${session.customerId}/items`, {
  method: "POST",
  headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ product_id, quantity }),
});
```

## 신원이 브라우저까지 이어집니다

여기서 앞선 편들의 설계가 빛을 봅니다. [13편](/blog/go-auth-jwt)에서 장바구니→주문 호출에 **토큰을 이어 전파** 했었죠. 이제 그 사슬이 **브라우저 끝까지** 늘어납니다.

```text
브라우저 --(httpOnly 쿠키)--> Next(BFF) --(Bearer)--> cart --(Bearer 전파)--> ordering
```

결제를 누르면, 이 신원 하나가 브라우저에서 시작해 주문까지, 그리고 이후 사가(재고→결제→배송)까지 흐릅니다. 그래서 **"내 주문"** 페이지는 정확히 그 사람의 주문만 보여줍니다 — 프런트가 신원을 자칭하는 게 아니라, 서버가 토큰으로 정하니까요.

## 프런트를 붙이니 백엔드 결정들이 증명됐습니다

API 로만 볼 땐 "이렇게 하는 게 맞겠지" 였던 결정들이, 프런트를 붙이자 **왜 그래야 했는지** 로 바뀌었습니다.

- **"신원은 서버가 정한다"([13편](/blog/go-auth-jwt))** — 주문 서비스가 클라이언트의 `customer_id` 를 무시하죠. 그래서 BFF 도 남을 사칭 못 합니다. 프런트가 아무리 몸통을 조작해도 토큰이 곧 신원입니다.
- **"가격은 카탈로그가 정한다"([3편](/blog/go-product-catalog))** — 장바구니는 `product_id·수량` 만 압니다. 그래서 장바구니 화면은 카탈로그에서 이름·가격을 **다시 채워** 합계를 냅니다. 프런트가 가격을 못 지어냅니다.
- **읽기 모델([7편](/blog/go-readmodel-cqrs))** — "내 주문" 은 읽기 모델이 싸게 답합니다. 프런트는 그냥 한 번 부르면 끝입니다.

프런트엔드는 백엔드의 **첫 진짜 사용자** 였고, 좋은 계약은 이때 티가 납니다.

## docker-compose 에 Next 를 한 식구로

이 모든 게 **`docker compose up` 하나** 로 뜹니다. Next 도 그냥 또 하나의 서비스입니다.

```yaml
web:
  build: { context: ./web }        # output: "standalone" → node server.js
  environment:
    CATALOG_URL: http://catalog:8080   # compose 내부 DNS
    CUSTOMER_URL: http://customer:8080
    CART_URL: http://cart:8080
    ORDERING_URL: http://ordering:8080
    READMODEL_URL: http://readmodel:8080
  ports: ["3000:3000"]             # 브라우저는 여기 하나만 본다
```

`output: "standalone"` 으로 빌드하면 Next 가 자체완결 서버 번들을 뽑아, 작은 이미지로 `node server.js` 한 줄에 뜹니다. SSR 서버가 백엔드와 **같은 네트워크에** 있으니 내부 호출이 빠르고, CORS 도 게이트웨이도 없습니다.

## 정직하게 — BFF 의 값과 한계

- **홉이 하나 늘어납니다.** 브라우저→Next→Go. 다만 SSR 서버가 백엔드와 같은 compose 망에 있어 그 홉이 짧고, 읽기는 SSR 로 한 번에 끝나 오히려 왕복이 줄기도 합니다.
- **얇은 프록시 계층을 유지해야** 합니다. 대신 인증·세션·토큰 전파가 **한 곳(BFF)에 모여** 백엔드 토폴로지를 숨기고 클라이언트를 단순하게 합니다.
- **대안은 게이트웨이 + CORS + SPA** 입니다. 유효하지만 움직이는 부품이 많고(게이트웨이 설정, CORS, 브라우저 토큰 저장=XSS 위험), 우리는 토큰을 httpOnly 로 숨겨 그 위험을 없앴습니다.
- **BFF 가 항상 정답은 아닙니다.** 모바일·서드파티 클라이언트가 붙으면 결국 진짜 API 게이트웨이가 필요하고, 실시간(WebSocket) 이 많으면 프록시가 부담이 됩니다. 우리는 "웹 하나 + SSR" 이라 BFF 가 가장 잘 맞았습니다.

## 정리 — 프런트는 백엔드의 첫 사용자

- 브라우저 프런트를 붙이자 **CORS** 라는 첫 벽이 나왔고, Next.js SSR + BFF 로 **코드 한 줄 없이** 지웠습니다.
- 읽기는 **서버 컴포넌트가 내부에서 SSR**, 변경은 **Route Handler(BFF)** 로 프록시 — 브라우저는 Next 하고만 통신합니다.
- 토큰은 **httpOnly 쿠키** 에 숨기고, 신원을 **브라우저→BFF→cart→ordering** 까지 이어 흘립니다.
- 프런트는 백엔드의 첫 진짜 사용자라, "신원은 서버가·가격은 카탈로그가·조회는 읽기 모델이" 같은 앞선 결정들이 여기서 증명됐습니다.

핵심 한 줄 — **프런트엔드는 백엔드 설계의 리트머스지입니다.** 계약이 좋으면 프런트가 얇아지고, 나쁘면 프런트가 그 빈틈을 메우느라 두꺼워집니다. CORS 를 지운 건 시작일 뿐이고, 진짜 소득은 백엔드가 프런트를 만나 스스로를 증명한 것이었습니다.

> 이번 편 전체 코드는 리포의 `part-25` 태그(`web/`)에 있습니다.
