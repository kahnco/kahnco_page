---
title: 테스트가 아키텍처를 드러낸다 — Next.js를 모든 층위에서 테스트하기
date: 2025-11-03
description: 프런트를 붙였으니(17·18편) 이제 이걸 어떻게 믿을까요. "모든 종류의 테스트를 다 해보자" 마음먹고 시작했는데, 곧 진짜 교훈을 만났습니다 — 테스트가 쉬우려면 구조가 좋아야 한다. 라우트 핸들러가 fetch 를 직접 부르던 코드를, 순수 로직·API 어댑터·세션·얇은 핸들러로 계층을 나눴더니 테스트가 술술 붙었습니다. 유닛부터 컴포넌트(RTL), 라우트 통합, 그리고 Playwright E2E 까지 피라미드를 세운 이야기입니다. 이벤트 기반 쇼핑몰 고도화 시리즈 19편입니다.
tags: [테스트, Next.js, Vitest, Playwright, 아키텍처]
category: [dev, backend]
draft: false
---

[17](/blog/go-web-bff)·[18편](/blog/go-compose-nextjs)에서 Next.js 프런트를 붙이고 컴포즈로 띄웠습니다. 그런데 붙여만 놓고 믿을 수는 없죠. "이번엔 **모든 종류의 테스트를 다 해보자**" 마음먹고 시작했는데, 곧 진짜 교훈을 만났습니다.

> **테스트가 쉬우려면, 구조가 좋아야 한다.**

테스트는 아키텍처의 **리트머스지** 였습니다. 목킹이 지옥이면 결합도가 높다는 신호고, 술술 붙으면 계층이 잘 나뉘었다는 뜻입니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-26` 태그(`web/`)에 있습니다.

## 먼저 구조 — 테스트를 부르는 계층

처음 코드는 라우트 핸들러가 `fetch` 를 직접 불렀습니다. 테스트가 되긴 하지만, **I/O 가 여기저기 흩어져** 있으면 테스트도 흩어집니다. 그래서 백엔드로 보내는 방식과 같은 결로 — **포트/어댑터** 를 프런트에도 적용했습니다.

- **순수 로직**(`lib/format`·`lib/product-visual`): 프레임워크 무관. 입력→출력만.
- **API 어댑터**(`lib/api`): Go 서비스로의 **모든** HTTP 호출이 여기 한 곳. `next` 에 의존하지 않아, 테스트에선 `fetch` 만 목킹하면 됩니다.
- **세션**(`lib/session`): `next/headers` 쿠키를 여기로 격리.
- **라우트 핸들러(BFF)**: 얇게. 세션 확인 → 어댑터 호출 → 에러 매핑, 그게 전부.

```ts
// 얇아진 라우트 핸들러 — 조립만 한다
export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();       // 401 게이트
  try {
    const orderId = await checkout(session.customerId, session.token); // 어댑터
    return NextResponse.json({ ok: true, order_id: orderId });
  } catch (e) {
    return apiError(e);                        // ApiError.status 그대로 매핑
  }
}
```

이렇게 나누고 나니, 각 층위가 **따로 테스트 가능** 해졌습니다.

## 테스트 피라미드 — 아래는 넓게, 위는 얇게

### 1) 유닛 — 순수 함수 (Vitest)

가장 아래, 가장 많이. 프레임워크도 목킹도 없이 값만 봅니다.

```ts
expect(won(89000)).toBe("₩89,000");
expect(statusLabel("SHIPPED")).toBe("배송 중");
// 같은 product_id 는 늘 같은 썸네일(결정적)
expect(productVisual({ product_id: "prod-A", name: "x" }).gradient)
  .toBe(productVisual({ product_id: "prod-A", name: "y" }).gradient);
```

### 2) 어댑터 — fetch 만 목킹 (Vitest)

`lib/api` 가 `next` 에 안 묶여 있으니, 전역 `fetch` 하나만 갈아끼우면 됩니다.

```ts
it("login: 실패하면 status 를 담은 ApiError 를 던진다", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fetchResp({ error: "틀림" }, false, 401)));
  await expect(login("a@b.com", "pw")).rejects.toMatchObject({ status: 401 });
});
```

### 3) 컴포넌트 — 사용자 관점 (React Testing Library)

클릭하면 무슨 요청이 나가고, 실패하면 무엇이 보이는지. 구현이 아니라 **행동** 을 봅니다.

```tsx
it("401 이면 로그인 페이지로 보낸다", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
  render(<AddToCart productId="prod-A" />);
  await userEvent.click(screen.getByRole("button", { name: /장바구니 담기/ }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
});
```

### 4) 라우트 통합 — 핸들러+어댑터+세션 함께 (Vitest)

여기선 목을 **최소** 로 — `fetch` 와 `next/headers` 쿠키만 가짜로 두고, 핸들러·어댑터·세션·에러 매핑을 **함께** 돌립니다.

```ts
it("로그인 안 되어 있으면 401 (백엔드 호출도 안 함)", async () => {
  const f = vi.fn();
  vi.stubGlobal("fetch", f);
  const res = await POST();
  expect(res.status).toBe(401);
  expect(f).not.toHaveBeenCalled();   // 게이트가 백엔드를 부르기 전에 막는다
});
```

### 5) E2E — 진짜 브라우저, 진짜 스택 (Playwright)

맨 위, 가장 적게. `docker compose up` 으로 띄운 **실제 8서비스 + 프런트** 를 크롬으로 몹니다.

```ts
test("가입 → 담기 → 결제 → 내 주문 → 반품", async ({ page }) => {
  await page.goto("/login");
  // …회원가입…
  await page.getByRole("link", { name: /무선 이어폰/ }).click();
  await page.getByRole("button", { name: "장바구니 담기" }).click();
  await page.goto("/cart");
  await page.getByRole("button", { name: "결제하기" }).click();
  await expect(page.getByText("주문이 접수되었습니다 🎉")).toBeVisible();
  // 사가가 배송까지 갈 때까지 새로고침하며 기다린다(SSR)
  await expect(async () => {
    await page.reload();
    await expect(page.getByRole("button", { name: "반품 요청" })).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 60_000 });
});
```

## E2E 가 실제로 잡은 버그

이 E2E 는 실제로 **아래 층위가 놓친 버그** 를 잡았습니다. 결제 성공 후 "주문이 접수되었습니다 🎉" 확인 화면이 **깜빡하고 사라지는** 문제였습니다.

원인은 이랬습니다. 결제 핸들러가 성공 뒤 `router.refresh()` 를 불렀는데, 그러면 장바구니 서버 컴포넌트가 **비워진 장바구니** 로 다시 SSR 되고, "비어 있습니다" 뷰가 렌더되면서 **확인 화면을 품은 클라이언트 컴포넌트째로 교체** 됐습니다.

```ts
setOrderId(body.order_id);
// router.refresh();  ← 이 한 줄이 비워진 장바구니를 다시 그려 확인 화면을 날렸다
```

중요한 건, **유닛·컴포넌트 테스트로는 이걸 못 잡는다** 는 겁니다. 컴포넌트 테스트에선 `router.refresh` 가 목이라 아무 일도 안 일어나거든요. 서버가 **진짜로 다시 렌더** 해 클라이언트 상태를 갈아엎는 상호작용은, 진짜 스택 위 E2E 여야 드러납니다. 피라미드의 꼭대기가 얇아도 반드시 있어야 하는 이유입니다.

## 데인 곳 — 실전 팁

- **`vi.hoisted` 가 필수입니다.** `next/navigation` 의 `useRouter` 를 목킹할 때, 목이 참조하는 `push`/`refresh` 를 그냥 `const` 로 두면 **호이스팅된 `vi.mock` 이 먼저 실행** 돼 TDZ 에러가 납니다. `const { push } = vi.hoisted(() => ({ push: vi.fn() }))` 로 끌어올려야 합니다.
- **httpOnly 쿠키는 인메모리 store 로** 목킹합니다. `next/headers` 의 `cookies()` 를 `Map` 기반 가짜로 바꾸면, 세션 왕복(발급→읽기→삭제)을 그대로 검증할 수 있습니다.
- **SSR 은 자동으로 안 갱신됩니다.** Playwright 에서 사가가 진행되길 기다릴 때, `toBeVisible` 의 자동 재시도만으론 부족합니다 — **`page.reload()` 를 `expect(...).toPass()` 로 감싸** 새로고침하며 폴링해야 서버가 다시 렌더한 상태를 봅니다.
- **테스트를 프로덕션 이미지에서 제외** 합니다. `.dockerignore` 에 `**/*.test.tsx`·`e2e` 를 넣어, `next build` 가 테스트를 건드리지 않고 이미지도 가볍게.

## 정직하게 — 피라미드의 무게중심

- **E2E 는 느리고 깨지기 쉽습니다.** 실제 사가 타이밍에 의존하니 간헐적으로 흔들립니다. 그래서 **핵심 여정 하나** 만 E2E 로 두고, 넓은 커버리지는 유닛·컴포넌트로 가져갑니다. 위로 갈수록 얇게.
- **목킹이 지옥이면 구조를 의심하세요.** "이걸 테스트하려면 다섯 개를 목킹해야 해" 는 결합도가 높다는 신호입니다. 리팩터가 답일 때가 많습니다.
- **커버리지 숫자보다 "이 테스트가 깨지면 진짜 버그인가"** 가 중요합니다. 구현 detail 을 박제한 테스트는 리팩터를 방해할 뿐입니다 — 그래서 컴포넌트는 내부 상태가 아니라 **사용자가 보는 것** 을 검증했습니다.

## 정리 — 테스트하기 쉬운 코드가 좋은 코드

- 백엔드에 쓰던 **포트/어댑터** 를 프런트에도 적용해, 순수 로직·API 어댑터·세션·얇은 핸들러로 계층을 나눴습니다.
- 그 위에 **피라미드** 를 세웠습니다 — 유닛·어댑터·컴포넌트(RTL)·라우트 통합(Vitest) 을 아래에 넓게, **E2E(Playwright)** 를 위에 얇게.
- 목킹 기법(`vi.hoisted`·쿠키 store·`toPass` 폴링)과 프로덕션 분리(`.dockerignore`)까지 실전에서 데며 정리했습니다.

핵심 한 줄 — **테스트는 아키텍처의 리트머스지입니다.** 테스트가 술술 붙으면 구조가 좋은 것이고, 자꾸 막히면 그건 테스트 문제가 아니라 **설계가 보내는 신호** 입니다. "모든 종류의 테스트를 다 해보고 싶다" 는 욕심은, 결국 "잘 나뉜 구조를 갖고 싶다" 는 말과 같았습니다.

> 이번 편 전체 코드·테스트는 리포의 `part-26` 태그(`web/`)에 있습니다.
