---
title: 사가를 닫다 — 결제 서비스와 주문의 완주
date: 2025-08-11
description: 8편 시리즈로 만든 쇼핑몰은 사실 주문이 PLACED에서 멈춰 있었습니다. 재고는 예약되지만 그 뒤로 아무 일도 일어나지 않았죠. 이 심화 시리즈 1편에서 결제(목업) 서비스를 붙이고 주문 컨텍스트가 이벤트에 반응하게 만들어, 주문이 PLACED→PAID→CONFIRMED로 실제로 완주하고 재고 부족 시 자동 취소되도록 사가를 닫습니다. 코레오그래피 사가와 보상 트랜잭션을 진짜로 도는 코드로 확인합니다.
tags: [DDD, EDD, saga, Go, 결제]
category: [dev, handson]
draft: false
---

솔직히 고백할 게 있습니다. [8편짜리 시리즈](/go-cicd-observability)로 이벤트 기반 쇼핑몰을 "완성"했다고 했지만, 실은 주문이 **PLACED 상태에서 멈춰** 있었습니다. 주문을 넣으면 재고가 예약되긴 했는데, 그 뒤로 **아무 일도 일어나지 않았죠.** 결제도, 확정도, 배송도 없었습니다. 이벤트 체인이 재고 예약에서 뚝 끊겨 있었던 겁니다.

이 심화 시리즈에서 그 끊긴 흐름을 잇고 다듬습니다. 첫 편의 목표는 하나 — **사가를 닫는 것.** 결제 서비스를 붙여, 주문이 이벤트만으로 `PLACED → PAID → CONFIRMED` 까지 스스로 흘러가고, 재고가 부족하면 자동으로 취소되게 만듭니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-9` 태그에 있습니다.

## 사가(saga)란 — 분산 트랜잭션의 현실적 답

주문 하나가 완성되려면 여러 컨텍스트가 협력해야 합니다. 재고를 잡고, 결제를 받고, 주문을 확정하죠. 한 대의 DB라면 트랜잭션 하나로 "다 되거나 다 안 되거나"를 보장하겠지만, 이들은 **서로 다른 서비스** 입니다. 분산 환경엔 그런 전역 트랜잭션이 없습니다.

**사가(saga)** 는 이 문제의 현실적인 답입니다. 하나의 큰 트랜잭션을 **여러 개의 로컬 트랜잭션 + 이벤트** 로 쪼개고, 중간에 실패하면 앞서 한 일을 **보상(compensation)** 으로 되돌립니다. 사가를 엮는 방식은 둘입니다.

- **코레오그래피(choreography)** — 지휘자 없이, 각 서비스가 남의 이벤트를 듣고 알아서 반응합니다. 우리가 4편부터 써온 방식이죠.
- **오케스트레이션(orchestration)** — 중앙의 "사가 오케스트레이터"가 각 단계를 명령합니다.

우리는 코레오그래피로 갑니다. 서비스 간 결합이 느슨하고, 새 참여자를 끼우기 쉬우니까요. (흐름이 복잡해지면 추적이 어려워지는 게 단점인데, 이건 8편에서 붙인 상관 ID로 상당 부분 상쇄됩니다.)

우리가 닫을 사가의 전체 안무는 이렇습니다.

```text
[주문]  order.placed ─────────▶ [재고] 예약
                                   │
             ┌── 성공 ────────────┤
             ▼                     └── 실패 ──▶ stock.reservation_failed
[재고] stock.reserved                              │
             │                                     ▼
             ▼                              [주문] 주문 취소 (보상)
[결제] 결제 처리
             │
             ▼
[결제] payment.completed ──▶ [주문] 결제완료 → 주문 확정
```

## 이벤트에 무엇을 더 실을까 — 결제엔 금액이 필요하다

결제 서비스가 결제하려면 **얼마를** 청구할지 알아야 합니다. 그런데 결제가 구독할 `StockReserved` 이벤트에는 주문 ID밖에 없었습니다. 4편에서 배운 원칙 그대로 — 받는 쪽이 되묻지 않도록, 이벤트에 **필요한 데이터를 실어 보냅니다**(event-carried state transfer). 재고 서비스는 주문 이벤트에서 총액을 이미 알고 있으니, 그걸 `StockReserved` 에 실어 다음으로 넘깁니다.

```go
type StockReserved struct {
	OrderID OrderID `json:"order_id"`
	Amount  int64   `json:"amount"` // ← 결제가 청구할 금액
}
```

## 결제 컨텍스트 — 목업이지만 구조는 진짜

새 결제 컨텍스트를 만듭니다. 결제 게이트웨이 연동은 목업으로 두되(금액이 유효하면 승인), **구조는 실제와 똑같이** 잡습니다. 나중에 `Process()` 안을 진짜 PG 호출로 바꾸면 되도록요.

```go
func (p *Payment) Process() {
	if p.amount <= 0 {
		p.status = StatusFailed
		p.record(PaymentFailed{OrderID: p.orderID, Reason: "유효하지 않은 결제 금액"})
		return
	}
	p.status = StatusCompleted
	p.record(PaymentCompleted{OrderID: p.orderID, Amount: p.amount})
}
```

결제 서비스는 `stock.reserved` 를 구독해 결제를 처리하고, 결과를 `payment.completed` 또는 `payment.failed` 로 발행합니다. 이 컨텍스트도 주문·재고의 도메인 타입을 import하지 않고, 이벤트 JSON을 **자기만의 타입으로 번역** 합니다(ACL). 컨텍스트 독립성은 끝까지 지킵니다.

```go
func (s *PaymentService) OnStockReserved(ctx context.Context, cmd ProcessPaymentCommand) error {
	payment := domain.NewPayment(domain.OrderID(cmd.OrderID), cmd.Amount)
	payment.Process() // 승인/거절 + 이벤트 기록(도메인)
	if err := s.repo.Save(ctx, payment); err != nil {
		return err
	}
	return s.publisher.Publish(ctx, payment.PullEvents()...)
}
```

## 주문 서비스가 이제 이벤트를 "듣는다"

지금까지 주문 서비스는 이벤트를 **발행만** 했습니다. 이번에 처음으로 **구독** 도 하게 됩니다 — 결제 완료와 재고 부족에 반응해야 하니까요. 여기서 season 1의 2편에서 만들어 두고 **한 번도 바깥에서 못 불렀던** 도메인 메서드들(`MarkPaid`·`Confirm`·`Cancel`)이 드디어 쓰입니다.

먼저 애플리케이션 계층에 "이벤트에 반응하는" 유스케이스를 더합니다. 저장된 주문을 불러와 상태를 전이하고, 다시 저장하고, 새 이벤트를 발행합니다. 규칙(어떤 전이가 허용되는가)은 여전히 도메인이 판단합니다.

```go
// 결제 완료 → 결제완료 → 확정
func (s *OrderService) ConfirmPaidOrder(ctx context.Context, id domain.OrderID) error {
	order, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if err := order.MarkPaid(); err != nil { // PLACED → PAID
		return err
	}
	if err := order.Confirm(); err != nil {  // PAID → CONFIRMED
		return err
	}
	if err := s.repo.Save(ctx, order); err != nil {
		return err
	}
	return s.publisher.Publish(ctx, order.PullEvents()...)
}
```

그리고 이 유스케이스를 이벤트에 잇는 **사가 소비자** 를 둡니다. `payment.completed` 면 확정, `inventory.stock.reservation_failed` 면 취소(보상)입니다.

```go
func (c *OrderSagaConsumer) OnPaymentCompleted(env eventbus.Envelope) error {
	ctx, log, ref, _ := c.prepare(env)        // 상관 ID 이어받기
	if err := c.svc.ConfirmPaidOrder(ctx, domain.OrderID(ref.OrderID)); err != nil {
		log.Error("주문 확정 실패", "order", ref.OrderID, "err", err)
		return err
	}
	log.Info("결제 완료 → 주문 확정", "order", ref.OrderID)
	return nil
}
```

조립 루트(`main`)에서 이 구독을 겁니다. 주문 서비스는 이제 HTTP도 받고, 이벤트도 발행하고, 이벤트에 반응도 합니다.

```go
saga := infra.NewOrderSagaConsumer(svc, logger)
bus.Subscribe("payment.completed", "ordering", saga.OnPaymentCompleted)
bus.Subscribe("inventory.stock.reservation_failed", "ordering", saga.OnStockReservationFailed)
```

## 사가 전체를 TDD하기

조각조각은 다 테스트했지만, 정말로 **끝까지 흐르는가**? 세 컨텍스트(주문·재고·결제)를 임베디드 NATS 위에 모두 올리고, 주문 하나를 넣어 `order.confirmed` 까지 도달하는지 종단 간으로 확인합니다.

```go
func TestSaga_해피패스면_주문이_확정된다(t *testing.T) {
	// ... 임베디드 NATS + 세 컨텍스트 배선 ...
	wireInventory(t, bus, map[string]int{"prod-A": 10, "prod-B": 5}) // 재고 충분
	wirePayment(t, bus)
	orderRepo, orderSvc := wireOrdering(t, bus)

	confirmed := make(chan eventbus.Envelope, 1)
	bus.Subscribe("ordering.order.confirmed", "test", func(e eventbus.Envelope) error {
		confirmed <- e; return nil
	})

	placeSampleOrder(t, orderSvc) // 주문 → 이벤트 체인 시작

	select {
	case <-confirmed: // 확정까지 흘렀다
	case <-time.After(4 * time.Second):
		t.Fatal("타임아웃: 주문 확정까지 흐르지 않음")
	}
	got, _ := orderRepo.FindByID(context.Background(), "order-1")
	if got.Status() != orderingdomain.StatusConfirmed {
		t.Fatalf("주문 상태 = CONFIRMED 여야 하는데 %s", got.Status())
	}
}
```

재고가 부족한 경우(`prod-B` 재고 0)엔 `order.cancelled` 까지 흘러 주문이 자동 취소되는지도 같은 방식으로 못 박습니다. 두 테스트 모두 초록불입니다.

## 진짜로 완주하는지 — 네 서비스를 띄워서

브로커와 세 서비스(주문·재고·결제)를 띄우고, 상관 ID를 지정해 주문을 넣습니다.

```text
$ curl -X POST localhost:8080/orders -H 'X-Correlation-ID: saga-001' -d '{
    "customer_id":"c1",
    "items":[{"product_id":"prod-A","quantity":2,"unit_price":1000},
             {"product_id":"prod-B","quantity":1,"unit_price":3000}]}'
{"order_id":"order_4b996b47…"}

$ curl localhost:8080/orders/order_4b996b47…
{"order_id":"order_4b996b47…","status":"CONFIRMED","total":5000, ...}   ← PLACED 가 아니라 CONFIRMED!
```

주문이 **CONFIRMED**로 완주했습니다. 그리고 8편에서 붙인 상관 ID 덕에, 이 주문이 세 서비스를 어떻게 지나갔는지 하나의 ID로 꿰어 볼 수 있습니다.

```text
[ordering]   "http request" path=/orders status=201       correlation_id=saga-001
[inventory]  "order.placed 처리 완료" order=order_4b996b47… correlation_id=saga-001
[payment]    "결제 처리 완료" amount=5000                    correlation_id=saga-001
[ordering]   "결제 완료 → 주문 확정" order=order_4b996b47…   correlation_id=saga-001
```

주문 → 재고 예약 → 결제 → 주문 확정. **이벤트만으로** 네 걸음이 자동으로 이어졌습니다. 그 어떤 서비스도 다른 서비스를 직접 호출하지 않았고, 각자 자기가 들어야 할 이벤트에 반응했을 뿐입니다. 이게 코레오그래피 사가입니다.

## 정리 — 그리고 아직 남은 것

- **사가로 분산 트랜잭션을 흉내** 냈습니다. 하나의 큰 거래를 여러 로컬 트랜잭션 + 이벤트로 쪼개고, 실패는 보상으로 되돌립니다.
- 주문이 이벤트만으로 **PLACED → PAID → CONFIRMED** 까지 완주하고, 재고 부족 시 **자동 취소** 됩니다. season 1에서 만들어만 두고 못 쓰던 상태 전이가 드디어 살아났습니다.
- 결제엔 **금액을 이벤트에 실어** 보냈고, 결제 컨텍스트도 남의 도메인을 모른 채 이벤트로만 협력합니다.
- 주문 서비스가 처음으로 이벤트를 **구독** 하며, 발행자이자 소비자가 됐습니다.

물론 아직 정직하게 남은 구멍이 있습니다. **결제 실패(`payment.failed`)** 경로는 아직 안 닫혔습니다 — 결제가 실패하면 주문을 취소하는 건 물론, 이미 **잡아둔 재고를 되돌려야** 하는데, 그러려면 재고 서비스가 "무엇을 예약했는지" 기억해야 합니다. 그리고 **배송** 도 아직 없어서 주문이 CONFIRMED에서 멈춥니다. 다음 2편에서는 배송 서비스를 붙여 주문을 SHIPPED까지 보내고, 결제 실패 시 재고까지 복원하는 **완전한 보상** 으로 사가를 양방향 모두 닫습니다.

> 이번 편 전체 코드는 리포의 `part-9` 태그에 있습니다.
