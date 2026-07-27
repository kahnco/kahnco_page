---
title: 역할이 필요해질 때 — 관리자 페이지와 RBAC
date: 2025-11-18
description: 지금까지 모든 사용자는 동등했습니다. 그런데 관리자 페이지를 만들려니 "누가 관리자인가"를 정해야 했습니다 — 역할(role)이 처음 필요해진 순간입니다. JWT에 role을 심어 인증(누구냐)에 인가(무엇을 할 수 있냐)를 더하고, 게이트를 서버(SSR)와 BFF 두 겹으로 두고, 읽기 모델의 집계를 통계 대시보드로, 카탈로그 write를 상품 관리로 끌어왔습니다. 이벤트 기반 쇼핑몰 고도화 시리즈 22편입니다.
tags: [RBAC, 인가, Next.js, CQRS, Go]
category: [dev, backend]
draft: false
---

[13편](/blog/go-auth-jwt)에서 인증을 붙인 뒤로, 모든 사용자는 **동등** 했습니다. 로그인하면 누구나 자기 주문을 보고 결제할 수 있었죠. 그런데 관리자 페이지(상품 등록·가격 변경·통계)를 만들려니 벽에 부딪혔습니다 — **"누가 관리자인가"** 를 시스템이 알아야 했습니다. **역할(role)** 이 처음 필요해진 순간입니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-29` 태그에 있습니다.

## 인증에 인가를 더하기 — JWT 에 role

인증(authentication)이 "누구냐" 라면, 인가(authorization)는 "무엇을 할 수 있냐" 입니다. 이미 있는 JWT 에 **role** 클레임을 얹으면, 토큰 하나가 신원과 권한을 함께 나릅니다.

```go
type Claims struct {
	Subject string `json:"sub"`
	Role    string `json:"role,omitempty"` // "customer" | "admin"
	// …
}
```

로그인할 때 그 회원의 역할로 토큰을 발급합니다. 이제 토큰을 검증하면 신원(`sub`)과 함께 권한(`role`)이 딸려 옵니다.

```go
return s.tokens.Issue(string(customer.ID()), customer.Role())
```

## 관리자는 어떻게 만드나 — 멱등 시드

그럼 admin 역할을 가진 계정은 누가 만들까요. 가입은 모두 `customer` 로 시작합니다. 관리자는 **기동 시 시드** 로 보장합니다 — 없으면 만들고, 있으면 그냥 둡니다(멱등).

```go
func (s *CustomerService) EnsureAdmin(ctx, email, password, name string) error {
	_, err := s.register(ctx, email, password, name, "admin")
	if errors.Is(err, domain.ErrCustomerExists) {
		return nil // 이미 있으면 통과
	}
	return err
}
// main: svc.EnsureAdmin(ctx, "admin@shop.com", "adminadmin", "관리자")
```

## 게이트를 어디에 둘까 — 두 겹으로

관리자 화면과 API 를 막아야 합니다. 여기서 **어디서 막느냐** 가 중요했습니다. 두 겹으로 뒀습니다.

- **서버 컴포넌트(SSR)에서 — UX 게이트.** `/admin` 페이지가 서버에서 role 을 보고, 관리자가 아니면 **화면 자체를 안 보여줍니다.**

```tsx
const session = await getSession();
if (!session || session.role !== "admin") return <권한없음 />;
```

- **BFF Route Handler 에서 — 보안 게이트.** 상품 등록·가격 변경 API 는 role 을 다시 확인합니다. **화면을 우회해 API 를 직접 때려도** 막히게요.

```ts
const session = await getSession();
if (!session) return unauthorized();        // 401
if (session.role !== "admin") return forbidden(); // 403
```

실제로 비로그인은 401, 일반 회원은 403, 관리자만 200 으로 갈립니다. **SSR 게이트는 편의(UX), BFF 게이트는 방어** 입니다 — 둘 다 있어야 합니다. 화면만 숨기고 API 를 안 막으면, 열려 있는 문입니다.

## 통계 대시보드 — 읽기 모델이 빛나는 자리

관리자 대시보드의 통계는 **새로 계산하지 않았습니다.** [10편(검색·집계 읽기 모델)](/blog/go-readmodel-search)에서 이미 주문 이벤트로 **상태별 건수·매출을 증분 집계** 해 뒀거든요. `/stats/orders` 하나만 부르면 됩니다.

```tsx
const stats = await getStats(); // { counts: {SHIPPED: 12, …}, order_count, total_revenue }
```

CQRS 의 집계 읽기 모델이 여기서 값을 합니다 — 대시보드는 그저 **이미 만들어진 뷰를 그리는 일** 이었습니다. 총 주문·매출 카드와 상태 분포 막대를, 서버에서 렌더합니다.

## 상품 관리 — 명령이 이벤트를 낳는다

상품 등록·가격 변경은 카탈로그의 **write** 입니다. 관리자가 가격을 바꾸면 `catalog.product.price_changed` 이벤트가 나가고, 그게 [주문 서비스의 가격 프로젝션까지 갱신](/blog/go-product-catalog)합니다. 관리자의 한 번의 명령이 이벤트가 되어 시스템을 타고 흐릅니다 — 우리가 앞에서 쌓은 이벤트 배관이 그대로 쓰입니다.

## 정직하게 — RBAC 의 경계

- **역할 하나로 끝이 아닙니다.** `customer`·`admin` 둘로 시작했지만, 실무는 **권한(permission)** 단위(상품쓰기·환불승인·통계열람)로 쪼개고, 리소스별 정책이 필요하면 RBAC 를 넘어 **ABAC/OPA** 로 갑니다.
- **카탈로그 자체는 아직 내부 신뢰** 입니다. BFF 가 문지기라 브라우저는 못 우회하지만, 카탈로그 서비스는 호출자를 검증하지 않습니다. 서비스 간 인증(mTLS·서비스 토큰)은 [13편에서 남겨 둔 숙제](/blog/go-auth-jwt) 그대로입니다.
- **시드된 관리자 비밀번호는 데모용** 입니다. 운영에선 안전한 부트스트랩(최초 1회 초대·환경변수·볼트)이 필요합니다.

## 정리 — 인증에서 인가로

- JWT 에 **role** 을 얹어 인증에 인가를 더했습니다. 관리자는 **멱등 시드** 로 보장합니다.
- 게이트를 **SSR(UX) + BFF(보안)** 두 겹으로 뒀습니다 — 화면을 숨기는 것과 API 를 막는 것은 다른 일입니다.
- 통계는 **CQRS 집계 읽기 모델** 을 그대로 그렸고, 상품 관리는 **명령→이벤트** 배관을 그대로 탔습니다.

핵심 한 줄 — **역할 하나가 화면·API·데이터를 가릅니다.** "누구냐" 를 알던 시스템에 "무엇을 할 수 있냐" 를 더하는 순간, 인증은 인가로 확장됩니다. 그리고 좋은 관리자 기능은 대개 앞에서 쌓아 둔 것(읽기 모델·이벤트 배관)을 **다시 쓰는** 일이었습니다.

> 이번 편 전체 코드·테스트는 리포의 `part-29` 태그에 있습니다.
