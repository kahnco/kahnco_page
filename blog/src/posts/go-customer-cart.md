---
title: 회원과 장바구니 — 사용자를 다시 주인공으로
date: 2025-09-05
description: 지금까지 우리 쇼핑몰엔 정작 손님이 없었습니다. 아무 customer_id나 지어내 곧바로 주문부터 시작했죠. 6편에서는 회원(customer)과 장바구니(cart) 컨텍스트를 더해 "가입 → 담기 → 결제(checkout)"라는 진짜 쇼핑 흐름을 얹고, 그 결제가 기존 이벤트 사가로 이어지게 합니다. 그리고 여기서 배웁니다 — 모든 통합이 이벤트일 필요는 없다는 걸. 이벤트 기반 쇼핑몰 고도화 시리즈 6편입니다.
tags: [DDD, EDD, Go, 장바구니, 통합]
category: [dev, handson]
draft: false
---

[고도화 5편](/go-jetstream)까지, 이벤트 파이프라인을 아웃박스·JetStream·멱등성으로 단단히 벼렸습니다. 그런데 정작 우리 쇼핑몰엔 **손님이 없습니다.** 지금까지 주문은 이렇게 시작했죠.

```json
POST /orders { "customer_id": "아무거나", "items": [...] }
```

`customer_id` 를 아무렇게나 지어내 곧바로 주문부터 만들었습니다. 회원도, 장바구니도 없었습니다. 이번 편에서 **회원(customer)** 과 **장바구니(cart)** 컨텍스트를 더해, "가입 → 담기 → 결제" 라는 진짜 쇼핑 흐름을 기존 사가 **앞에** 얹습니다. 그리고 이 과정에서 중요한 걸 하나 배웁니다 — **모든 통합이 이벤트일 필요는 없다** 는 것.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-14` 태그에 있습니다.

## 이벤트가 아니라, 물어봐야 할 때

지금까지 컨텍스트들은 **이벤트** 로 협력했습니다 — "주문됐다"는 사실을 공표하면 재고·결제·배송이 알아서 반응했죠. 이건 "무언가 일어났고, 언젠가 반응하면 되는" 관계에 딱 맞습니다(비동기, 결과적 일관성).

그런데 장바구니 결제는 성격이 다릅니다.

- **"이 사람이 회원인가?"** — 결제를 진행할지 말지 **지금 당장** 답이 필요합니다.
- **"주문 번호를 줘"** — 손님에게 **즉시** 주문 확인을 돌려줘야 합니다.

이런 건 "공표하고 기다리는" 이벤트가 아니라, **동기 질의/명령** 이 자연스럽습니다. DDD에서 컨텍스트 통합은 이벤트만이 아니라 여러 방식이 있고, **상황에 맞는 걸 고르는 게** 중요합니다. 그래서 장바구니의 결제는 회원 서비스에 **물어보고**(질의), 주문 서비스에 **주문을 만들라고**(명령) 동기로 호출합니다. 물론 그 호출은 여전히 **포트 뒤** 에 숨깁니다.

```go
// 장바구니가 바깥 컨텍스트에 요구하는 포트들 — 이번엔 이벤트가 아니라 동기 호출.
type CustomerLookup interface {
	Exists(ctx context.Context, customerID string) (bool, error)   // 회원 서비스에 질의
}
type OrderPlacer interface {
	Place(ctx context.Context, customerID string, items []OrderItem) (orderID string, err error) // 주문 서비스에 명령
}
```

## 회원 컨텍스트 — 작지만 자기 규칙을 가진

회원 컨텍스트는 단순합니다 — 등록하고 조회합니다. 하지만 자기 규칙은 있습니다. 이메일이 없으면 거부하고, 중복 등록도 막습니다.

```go
func (s *CustomerService) Register(ctx context.Context, id, email, name string) error {
	if _, err := s.repo.Find(ctx, domain.CustomerID(id)); err == nil {
		return domain.ErrCustomerExists // 이미 있으면 거부
	} else if !errors.Is(err, domain.ErrCustomerNotFound) {
		return err
	}
	customer, err := domain.NewCustomer(domain.CustomerID(id), email, name) // 이메일 검증
	if err != nil {
		return err
	}
	s.repo.Save(ctx, customer)
	return s.publisher.Publish(ctx, customer.PullEvents()...) // customer.registered
}
```

회원 등록은 `customer.registered` 이벤트도 냅니다. 지금은 아무도 안 듣지만, 나중에 환영 메일·마케팅 컨텍스트가 구독할 자리를 열어 둡니다. 이벤트와 동기 호출은 **양자택일이 아닙니다** — 회원 컨텍스트는 동기로 조회되기도 하고(장바구니가), 비동기로 이벤트를 내기도 합니다.

## 장바구니 컨텍스트 — 담고, 합치고, 결제하고

장바구니는 회원별로 상품을 담습니다. 같은 상품은 수량을 합칩니다(작지만 중요한 도메인 규칙).

```go
func (c *Cart) AddItem(productID string, quantity int) error {
	if quantity <= 0 {
		return ErrNonPositiveQuantity
	}
	c.items[productID] += quantity // 같은 상품이면 합산
	return nil
}
```

그리고 하이라이트, **결제(checkout)** 입니다. 네 걸음으로 이뤄집니다.

```go
func (s *CartService) Checkout(ctx context.Context, customerID string) (string, error) {
	// 1) 회원인가? (동기 질의)
	ok, err := s.customers.Exists(ctx, customerID)
	if err != nil {
		return "", err
	}
	if !ok {
		return "", ErrCustomerNotRegistered
	}
	// 2) 빈 장바구니 거부
	cart, _ := s.load(ctx, customerID)
	if cart.IsEmpty() {
		return "", domain.ErrEmptyCart
	}
	// 3) 주문 생성 (동기 명령 → 주문 서비스)
	orderID, err := s.orders.Place(ctx, customerID, toOrderItems(cart))
	if err != nil {
		return "", err
	}
	// 4) 주문이 만들어졌으니 장바구니를 비운다
	s.carts.Delete(ctx, customerID)
	return orderID, nil
}
```

주목할 점 — 주문 서비스는 **한 줄도 안 바뀌었습니다.** 장바구니는 기존 `POST /orders` 를 그대로 호출할 뿐입니다. 그리고 가격은 여전히 싣지 않습니다(3편에서 카탈로그로 옮긴 그대로). 새 컨텍스트들이 기존 시스템 **앞에** 얹혔을 뿐, 뒤는 건드리지 않았습니다.

## 앞 흐름과 뒤 사가를 잇기

결제가 만든 주문은 곧바로 **기존 이벤트 사가** 를 탑니다. 장바구니의 동기 호출로 주문이 생기고, 그 순간부터는 재고→결제→배송이 이벤트로 비동기로 흐릅니다. **동기(앞)와 비동기(뒤)가 자연스럽게 맞물리는** 겁니다. 그리고 8편에서 붙인 상관 ID를, 장바구니가 주문 서비스를 호출할 때 헤더로 이어 넘겨, 결제부터 배송까지 하나의 ID로 추적할 수 있게 합니다.

```go
if cid := telemetry.CorrelationID(ctx); cid != "" {
	req.Header.Set(telemetry.HeaderCorrelationID, cid) // 장바구니 → 주문 → 사가 한 줄로 추적
}
```

## TDD — 결제의 규칙들

결제 유스케이스를, 가짜 회원 조회·주문 생성으로 못 박습니다. 회원이면 주문이 생기고 장바구니가 비워져야 하며, 비회원이면 거부돼야 합니다.

```go
func TestCheckout_회원이면_주문이_생성되고_장바구니가_비워진다(t *testing.T) {
	svc, carts, orders := newService(map[string]bool{"cust-1": true}) // cust-1 은 회원
	svc.AddItem(ctx, "cust-1", "prod-A", 2)

	orderID, err := svc.Checkout(ctx, "cust-1")
	// orderID == "order-1", orders 에 항목이 실렸고, carts 는 비워졌다
}

func TestCheckout_비회원은_거부된다(t *testing.T) {
	svc, _, _ := newService(map[string]bool{}) // 아무도 회원이 아님
	svc.AddItem(ctx, "guest", "prod-A", 1)
	// Checkout(ctx, "guest") == ErrCustomerNotRegistered
}
```

## 진짜 쇼핑처럼 — 가입부터 배송까지

여덟 서비스를 띄우고, 손님의 여정을 그대로 밟아 봅니다.

```text
# 1) 회원 가입
$ curl -X POST localhost:8085/customers -d '{"customer_id":"cust-1","email":"gil@dong.com","name":"홍길동"}'
[201]

# 2) 장바구니에 담기
$ curl -X POST localhost:8086/carts/cust-1/items -d '{"product_id":"prod-A","quantity":2}'
$ curl -X POST localhost:8086/carts/cust-1/items -d '{"product_id":"prod-B","quantity":1}'
$ curl localhost:8086/carts/cust-1
{"customer_id":"cust-1","items":[{"product_id":"prod-A","quantity":2},{"product_id":"prod-B","quantity":1}]}

# 3) 결제 → 주문 생성
$ curl -X POST localhost:8086/carts/cust-1/checkout -H 'X-Correlation-ID: cart-001'
{"order_id":"order_5016fdcf…"}
$ curl localhost:8086/carts/cust-1        # 결제 후 장바구니는 비워졌다
{"customer_id":"cust-1","items":[]}

# 4) 그 주문이 사가를 타고 배송까지
$ curl localhost:8080/orders/order_5016fdcf…
"status": "SHIPPED", 총액 5000원
```

가입 → 담기 → 결제 → (사가) → 배송. 앞의 동기 흐름과 뒤의 비동기 사가가 매끄럽게 이어졌습니다. 그리고 등록되지 않은 손님은 결제 문턱에서 막힙니다.

```text
$ curl -w '[%{http_code}]' -X POST localhost:8086/carts/guest/checkout
{"error":"등록된 회원만 결제할 수 있습니다"}[403]
```

## 정직하게 — 동기 호출의 값과 비용

장바구니의 결제는 회원·주문 서비스를 **동기로** 부릅니다. 덕분에 즉시 답(회원 여부·주문 번호)을 주지만, 그만큼 **그 두 서비스가 살아 있어야** 결제가 됩니다(가용성 결합). 이걸 완전히 비동기로 만들 수도 있습니다 — 결제 시 `cart.checked_out` 이벤트만 내고 주문은 나중에 만드는 식으로요. 하지만 그러면 손님에게 **즉시 주문 번호를 못 줍니다.** 무엇이 옳은지는 도메인이 정합니다. 우리는 "결제는 즉답이 필요하다"고 보고 동기를 택했습니다 — **통합 방식은 목적에 맞춰 고르는 것** 이지, 늘 이벤트가 정답은 아닙니다.

(덧붙여, 우리 장바구니는 메모리에 있습니다. 실서비스라면 세션처럼 다루어 Redis나 TTL 붙은 저장소에 두는 게 보통입니다.)

## 정리 — 손님이 생겼다

- **회원·장바구니** 컨텍스트를 더해, "가입 → 담기 → 결제" 라는 사용자 흐름을 기존 사가 앞에 얹었습니다.
- 결제는 **동기 호출**(회원 확인·주문 생성)로, 즉답이 필요한 통합엔 이벤트보다 질의/명령이 낫다는 걸 보였습니다.
- 그 호출은 **포트 뒤** 에 숨기고, 장바구니 항목을 주문 요청으로 **번역(ACL)** 했습니다.
- 결제가 만든 주문은 **기존 이벤트 사가** 를 그대로 타고, 상관 ID로 앞뒤가 하나로 추적됩니다.
- 주문·재고·결제·배송·카탈로그는 **한 줄도 안 바뀌었습니다** — 새 흐름은 앞에 얹혔을 뿐입니다.

이제 손님이 가입하고, 담고, 결제하면 주문이 배송까지 흐릅니다. 그런데 손님이 "내 주문 목록"이나 "장바구니 요약"을 보려면? 지금 구조로는 여러 서비스를 일일이 물어봐야 합니다. 다음 편에서는 **읽기 모델(CQRS)을 본격적으로 강화** 해, 흩어진 이벤트를 모아 조회에 최적화된 뷰를 만드는 법을 다룹니다.

> 이번 편 전체 코드는 리포의 `part-14` 태그에 있습니다.
