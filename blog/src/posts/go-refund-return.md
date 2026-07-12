---
title: 환불과 반품 — 배송 뒤에 시작되는 사가
date: 2025-09-26
description: 고도화 2편의 보상은 주문이 완성되기 "전"의 실패를 되돌렸습니다. 하지만 배송까지 끝난 주문을 손님이 반품하겠다면? 11편에서는 배송 완료(SHIPPED) 주문에 대한 사후 보상 사가를 붙입니다 — 반품을 요청하면 결제는 환불하고 재고는 다시 채우고 주문은 REFUNDED가 되도록. 주문 흐름 중의 롤백과, 완결된 주문을 되감는 반품이 어떻게 다른지 봅니다. 이벤트 기반 쇼핑몰 고도화 시리즈 11편입니다.
tags: [DDD, EDD, saga, Go, 환불]
category: [dev, handson]
draft: false
---

[고도화 2편](/go-shipping-compensation)에서 사가의 **보상(compensation)** 을 만들었습니다. 재고가 부족하거나 결제가 실패하면, 주문 흐름 **도중에** 앞서 한 일을 되돌렸죠. 하지만 그건 "아직 완성되지 않은 주문"을 정리하는 것이었습니다. 배송까지 **다 끝난** 주문을 손님이 "반품할게요" 하면 어떻게 될까요?

이건 성격이 다릅니다 — 완결된 거래를 **사후에** 되감는 것이니까요. 이번 편에서 배송 완료(SHIPPED) 주문에 대한 **반품·환불 사가** 를 붙입니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-19` 태그에 있습니다.

## 흐름 중의 롤백 vs 완결 후의 되감기

둘을 구분하는 게 중요합니다.

- **취소(cancel) 보상** — 주문이 흐르는 **도중** 무언가 실패하면, 진행 중이던 사가를 롤백합니다. 예약만 하고 아직 팔지 않은 재고를 되돌리고, 주문을 취소합니다. (2편)
- **반품(return) 보상** — 이미 **완결된**(배송된) 주문을 손님 요청으로 되감습니다. 판매된 재고를 **다시 채우고**, 받은 돈을 **환불** 하고, 주문을 환불완료로 마무리합니다. (이번 편)

반품은 "새로운 시작점"이 있는 별도의 사가입니다 — 트리거는 실패 이벤트가 아니라 **손님의 명시적 요청** 이죠.

## 주문의 여정을 뒤로 늘리다

주문 상태 기계에 두 상태를 더합니다.

```text
… → SHIPPED ──(반품 요청)──▶ RETURN_REQUESTED ──(환불 완료)──▶ REFUNDED
```

```go
var allowedTransitions = map[OrderStatus][]OrderStatus{
	// … 기존 …
	StatusShipped:         {StatusReturnRequested}, // 배송된 주문만 반품 가능
	StatusReturnRequested: {StatusRefunded},        // 반품 요청 → 환불 완료
}
```

**배송된 주문만** 반품할 수 있다는 규칙이 전이 표에 그대로 담깁니다. PLACED 주문에 반품을 요청하면 도메인이 거부하고, API는 그걸 **409 Conflict** 로 돌려줍니다.

반품 요청 이벤트는 환불·재입고에 필요한 **금액과 항목** 을 실어 보냅니다(event-carried state transfer — 4편의 그 원칙).

```go
func (o *Order) RequestReturn() error {
	items := /* 주문 라인에서 product·quantity 추출 */
	return o.transition(StatusReturnRequested, OrderReturnRequested{
		OrderID: o.id, Amount: o.Total(), Items: items, // 환불액 + 되돌릴 재고
	})
}
```

## 세 컨텍스트가 되감기에 협력한다

`POST /orders/{id}/return` 이 `order.return_requested` 를 발행하면, 두 컨텍스트가 각자 되감기를 시작합니다.

**결제** 는 환불합니다(목업 — 실제라면 PG 환불 API).

```go
func (s *PaymentService) OnReturnRequested(ctx context.Context, cmd RefundCommand) error {
	return s.publisher.Publish(ctx, domain.PaymentRefunded{
		OrderID: domain.OrderID(cmd.OrderID), Amount: cmd.Amount,
	})
}
```

**재고** 는 팔렸던 상품을 다시 채웁니다. 반품 항목이 이벤트에 실려 오니, 예약 기록이 없어도 처리됩니다.

```go
func (s *ReservationService) OnReturnRequested(ctx context.Context, cmd ReserveForOrderCommand) error {
	for _, it := range cmd.Items {
		stock, _ := s.stock.FindByProduct(ctx, domain.ProductID(it.ProductID))
		stock.Restock(it.Quantity) // 반품 재입고
		s.stock.Save(ctx, stock)
	}
	return s.publisher.Publish(ctx, domain.StockRestocked{OrderID: domain.OrderID(cmd.OrderID)})
}
```

그리고 **주문** 은 결제 환불(`payment.refunded`)을 받아 마지막 매듭을 짓습니다.

```go
func (c *OrderSagaConsumer) OnPaymentRefunded(env eventbus.Envelope) error {
	// … order.MarkRefunded() → REFUNDED …
}
```

취소와 똑같이, **아무도 남을 직접 호출하지 않습니다.** 반품 요청 하나가 공표되면 결제·재고·주문이 각자 자기 몫의 되감기를 할 뿐입니다. 코레오그래피 사가는 앞으로도(주문→배송) 뒤로도(반품→환불) 똑같이 작동합니다.

## 매출도 되감긴다

10편에서 만든 집계 읽기 모델은 이 되감기를 알아서 반영해야 합니다. 환불된 주문은 **매출에서 빠집니다** — 취소와 같은 처리입니다.

```go
if status == "CANCELLED" || status == "REFUNDED" {
	s.revenue -= v.Total // 취소·환불된 주문은 매출에서 뺀다
}
```

## 진짜로 되감기는지

주문을 배송까지 보낸 뒤 반품을 요청합니다.

```text
$ curl localhost:8080/orders/order_68b1…     # 먼저 배송 완료
"status": "SHIPPED"

$ curl -X POST localhost:8080/orders/order_68b1…/return
{"order_id":"order_68b1…","status":"RETURN_REQUESTED"}   [202]

# 잠시 뒤, 사가가 되감긴다:
[payment]   반품 요청 → 환불 처리   amount=5000
[inventory] 반품 요청 → 재고 재입고  items=2
[ordering]  환불 완료 → 주문 환불완료

$ curl localhost:8080/orders/order_68b1…
"status": "REFUNDED"                          # 되감기 완료

$ curl localhost:8087/stats/orders
{ "counts": {"REFUNDED": 1}, "total_revenue": 0 }   # 매출에서 빠짐
```

주문은 **REFUNDED** 로, 재고는 원래대로 다시 채워지고, 매출은 그만큼 줄었습니다. 배송된 상품 하나가 시스템을 **거꾸로** 흘러 제자리로 돌아왔습니다. 그리고 배송 안 된 주문에 반품을 시도하면 도메인이 막습니다.

```text
$ curl -w '[%{http_code}]' -X POST localhost:8080/orders/<배송전주문>/return
… [409]     # 배송되지 않은 주문은 반품 불가
```

## 정직하게 — 현실의 반품은 더 복잡하다

- **부분 반품**: 실무에선 주문 전체가 아니라 일부 상품만 반품하기도 합니다. 그러면 반품 라인·부분 환불액을 이벤트에 담아야 하고, 주문 상태도 "부분 환불" 같은 게 필요해집니다.
- **반품 정책·검수**: 반품 가능 기간, 상품 회수·검수 후 환불 같은 단계가 실제론 더 있습니다. 우리는 요청 즉시 환불·재입고하는 단순한 모델을 썼습니다.
- **환불의 원자성**: 여기선 환불(결제)과 재입고(재고)가 각자 독립으로 성공한다고 봤습니다. 한쪽이 실패하면 어떻게 할지(재시도·수동 개입)는 도메인이 정할 몫입니다.

## 정리 — 앞으로도 뒤로도 흐르는 주문

- **완결된 주문의 사후 보상** 으로 반품·환불을 붙여, 주문 여정을 SHIPPED 너머로 늘렸습니다.
- 흐름 중의 **취소 롤백** 과, 완결 후의 **반품 되감기** 를 구분했습니다 — 트리거도(실패 vs 요청), 대상도(예약 재고 vs 판매 재고) 다릅니다.
- 반품 이벤트에 **금액·항목을 실어**, 결제는 환불하고 재고는 재입고하게 했습니다.
- 읽기 모델의 **매출 집계도 되감기** 를 반영합니다.
- 코레오그래피 사가가 **양방향** 으로 똑같이 작동함을 보였습니다.

이제 주문은 앞으로(주문→배송)도, 뒤로(반품→환불)도 이벤트로 흐릅니다. 그런데 이렇게 재고를 예약·복원·재입고하는 손길이 늘어날수록, 그것들이 **동시에** 같은 재고를 건드릴 때가 문제입니다. 다음 편에서는 바로 그 **동시성** 을 정면으로 다룹니다 — 여러 요청이 같은 재고에 몰릴 때의 레이스 컨디션과, 그걸 원자적으로 막는 법을요.

> 이번 편 전체 코드는 리포의 `part-19` 태그에 있습니다.
