---
title: 배송과 완전한 보상 — 주문을 배송까지, 실패는 되돌리기
date: 2025-07-29
description: 고도화 1편에서 주문을 확정까지 흐르게 했지만, 두 구멍이 남았습니다. 결제가 실패해도 잡아 둔 재고가 그대로였고, 배송이 없어 주문이 CONFIRMED에서 멈췄죠. 2편에서 배송 서비스를 붙여 주문을 SHIPPED까지 보내고, 재고 서비스가 예약을 기억하게 만들어 결제 실패 시 예약 재고까지 되돌리는 완전한 보상으로 사가를 양방향 모두 닫습니다. 이벤트 기반 쇼핑몰 고도화 시리즈 2편입니다.
tags: [DDD, EDD, saga, Go, 보상]
category: [dev, handson]
draft: false
---

[고도화 1편](/go-saga-payment)에서 결제 서비스를 붙여 주문이 `PLACED → PAID → CONFIRMED` 까지 이벤트만으로 흐르게 만들었습니다. 하지만 정직하게 두 구멍을 남겨 뒀었죠.

1. **결제가 실패해도** 주문만 취소될 뿐, 이미 잡아 둔 **재고는 그대로** 였습니다.
2. **배송** 이 없어 주문이 CONFIRMED에서 멈췄습니다.

이번 편에서 이 둘을 메웁니다. 배송 서비스를 붙여 주문을 **SHIPPED** 까지 보내고, 재고 서비스가 "무엇을 예약했는지" 기억하게 만들어 실패 시 **예약 재고까지 정확히 되돌리는** 완전한 보상으로 사가를 양방향 모두 닫습니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-10` 태그에 있습니다.

## 오늘 완성할 주문의 여정

이번 편이 끝나면 주문의 상태 기계는 이렇게 양방향으로 완성됩니다.

```text
   성공 경로 (이벤트가 앞으로)
   PLACED ──▶ 재고예약 ──▶ 결제 ──▶ CONFIRMED ──▶ 배송 ──▶ SHIPPED

   실패 경로 (보상이 뒤로)
   재고부족 ─────────────────┐
   결제거절 ──▶ 주문취소 ──▶ CANCELLED ──▶ 예약 재고 복원
```

## 배송 서비스 — CONFIRMED를 SHIPPED로

먼저 쉬운 쪽, 배송입니다. 새 배송 컨텍스트가 `ordering.order.confirmed` 를 구독해, 배송을 시작하고(운송장 발급은 목업) `shipping.dispatched` 를 발행합니다.

```go
func (s *Shipment) Dispatch(trackingNo string) {
	s.trackingNo = trackingNo
	s.status = StatusDispatched
	s.record(ShipmentDispatched{OrderID: s.orderID, TrackingNo: trackingNo})
}
```

주문 서비스는 이 `shipping.dispatched` 를 받아 주문을 배송중으로 전이합니다. season 1에서 만들어 뒀던 마지막 상태 전이 `Ship()` 이 여기서 쓰입니다.

```go
func (s *OrderService) ShipOrder(ctx context.Context, id domain.OrderID) error {
	order, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if err := order.Ship(); err != nil { // CONFIRMED → SHIPPED
		return err
	}
	if err := s.repo.Save(ctx, order); err != nil {
		return err
	}
	return s.publisher.Publish(ctx, order.PullEvents()...)
}
```

이제 주문 확정 → 배송 시작 → 주문 배송중이 이벤트로 이어져, 주문이 **SHIPPED** 에 도달합니다. 여정의 앞쪽이 끝까지 뚫렸습니다.

## 어려운 쪽 — 무엇을 예약했는지 기억해야 한다

이제 까다로운 보상입니다. 결제가 실패하면 주문을 취소하는 것까진 쉽습니다. 문제는 **이미 잡아 둔 재고를 되돌리는 것.** 재고 서비스가 "이 주문을 위해 prod-A 2개, prod-B 1개를 예약했다"를 **기억하고 있지 않으면**, 무엇을 얼마나 풀어야 할지 알 수 없습니다.

그래서 재고 컨텍스트에 **예약(Reservation)** 이라는 개념을 도메인으로 들입니다. 예약에 성공하면, "무엇을 얼마나 잡았는지"를 기록해 둡니다.

```go
type Reservation struct {
	orderID OrderID
	items   []ReservedItem
}

type ReservedItem struct {
	ProductID ProductID
	Quantity  int
}
```

예약 유스케이스가 성공하면 이 기록을 저장합니다.

```go
// ... 모든 항목을 성공적으로 예약한 뒤 ...
reservation := domain.NewReservation(domain.OrderID(cmd.OrderID))
for _, it := range cmd.Items {
	reservation.Add(domain.ProductID(it.ProductID), it.Quantity)
}
if err := s.reservations.Save(ctx, reservation); err != nil {
	return err
}
```

이건 사소해 보이지만 중요한 DDD 결정입니다. "예약"은 단순한 재고 차감이 아니라, **되돌릴 수 있어야 하는 하나의 사실** 입니다. 그 사실을 명시적인 도메인 개념으로 모델링해야 보상이 가능해집니다.

## 취소 → 예약 재고 복원 (그리고 멱등하게)

이제 재고 서비스가 `ordering.order.cancelled` 를 구독해, 그 주문의 예약 기록을 찾아 정확히 되돌립니다.

```go
func (s *ReservationService) OnOrderCancelled(ctx context.Context, orderID string) error {
	reservation, err := s.reservations.Find(ctx, domain.OrderID(orderID))
	if errors.Is(err, domain.ErrReservationNotFound) {
		return nil // 예약이 없으면(예: 애초에 예약 실패한 주문) 할 일 없음
	}
	if err != nil {
		return err
	}
	for _, item := range reservation.Items() {
		stock, err := s.stock.FindByProduct(ctx, item.ProductID)
		if err != nil {
			continue
		}
		stock.Release(item.Quantity) // 예약분 복원
		s.stock.Save(ctx, stock)
	}
	return s.reservations.Delete(ctx, domain.OrderID(orderID)) // 기록 삭제
}
```

두 가지가 핵심입니다.

- **예약 기록이 없으면 조용히 넘어갑니다.** 1편에서 재고 **부족** 으로 취소된 주문은 애초에 예약에 실패했으니(내부에서 이미 롤백됨) 되돌릴 게 없습니다. 같은 `order.cancelled` 핸들러가 두 실패 경로를 모두 안전하게 처리합니다.
- **복원 후 기록을 지웁니다.** 이렇게 하면 같은 취소 이벤트가 **두 번 와도 두 번 복원하지 않습니다**(멱등성). EDD에서 이벤트는 중복 전달될 수 있으니, 이런 방어가 중요합니다. (본격적인 멱등 처리는 4편에서 더 다룹니다.)

## 결제를 실패시켜 보기

보상을 시험하려면 결제가 실제로 실패해야 합니다. 목업 결제에 간단한 규칙을 넣습니다 — 한도를 넘는 금액은 거절.

```go
const autoApproveLimit int64 = 1_000_000

func (p *Payment) Process() {
	switch {
	case p.amount <= 0:
		p.decline("유효하지 않은 결제 금액")
	case p.amount > autoApproveLimit:
		p.decline("한도 초과로 결제가 거절되었습니다")
	default:
		p.status = StatusCompleted
		p.record(PaymentCompleted{OrderID: p.orderID, Amount: p.amount})
	}
}
```

이제 결제가 `payment.failed` 를 내면, 주문 서비스가 이를 받아 주문을 취소하고 — 그 취소 이벤트를 재고 서비스가 받아 예약을 되돌립니다. 세 컨텍스트가 실패를 이어받아 **협력해서 원상복구** 하는 겁니다.

## 사가 전체를 TDD하기

두 시나리오를 임베디드 NATS 위에서 종단 간으로 못 박습니다. 하나는 전체 흐름이 **SHIPPED** 까지, 다른 하나는 결제 실패 시 **취소 + 재고 복원** 입니다.

```go
func TestSaga_결제실패면_취소되고_재고가_복원된다(t *testing.T) {
	// ... 재고(prod-A 10개) + 결제 + 주문 배선 ...
	cancelled := make(chan eventbus.Envelope, 1)
	bus.Subscribe("ordering.order.cancelled", "test", func(e eventbus.Envelope) error {
		cancelled <- e; return nil
	})

	// 총액 2,000,000원 → 한도 초과 → 결제 거절
	orderSvc.PlaceOrder(context.Background(), orderingapp.PlaceOrderCommand{
		CustomerID: "c1",
		Items: []orderingapp.OrderItemInput{{ProductID: "prod-A", Quantity: 1, UnitPrice: 2_000_000}},
	})

	<-cancelled // 취소까지 흘렀다

	got, _ := orderRepo.FindByID(ctx, "order-1")
	// 주문은 CANCELLED, 그리고 prod-A 재고는 10 으로 복원돼야 한다.
}
```

전체 흐름(→SHIPPED)·재고 부족(→취소)·결제 실패(→취소+복원) 세 경로가 모두 초록불입니다.

## 다섯 서비스로 진짜 완주 보기

브로커와 네 서비스(주문·재고·결제·배송)를 띄우고, 정상 주문을 넣으면 상관 ID 하나로 다섯 걸음이 이어집니다.

```text
$ curl -X POST localhost:8080/orders -H 'X-Correlation-ID: full-001' -d '{...}'  # 총 5,000원

[ordering]   POST /orders 201
[inventory]  order.placed 처리 완료
[payment]    결제 처리 완료 amount=5000
[ordering]   결제 완료 → 주문 확정
[shipping]   주문 확정 → 배송 시작
[ordering]   배송 시작 → 주문 배송중        ← 최종 상태 SHIPPED
```

그리고 한도를 넘는 주문(200만원)을 넣으면, 실패가 거꾸로 흐르며 되돌려집니다.

```text
$ curl -X POST localhost:8080/orders -H 'X-Correlation-ID: fail-002' -d '{...}'  # 총 2,000,000원

[inventory]  order.placed 처리 완료          (재고 예약됨)
[payment]    결제 거절 (한도 초과)
[ordering]   결제 실패 → 주문 취소
[inventory]  주문 취소 → 예약 재고 복원        ← 잡았던 재고가 정확히 돌아옴
```

주문은 **CANCELLED**로 끝나고, 예약했던 재고는 원래대로 복원됩니다. 그 어떤 서비스도 "롤백해!"라고 명령받지 않았습니다 — 각자 실패 이벤트를 듣고 자기 몫의 보상을 했을 뿐입니다. 이게 코레오그래피 사가로 만든 **분산 트랜잭션의 최종 모습** 입니다.

## 정리 — 양방향으로 닫힌 사가

- **배송 서비스** 로 주문을 SHIPPED까지 보내, 성공 여정을 끝까지 뚫었습니다.
- **예약(Reservation)을 명시적 도메인 개념** 으로 들여, "무엇을 되돌릴지"를 기억하게 했습니다.
- **결제 실패 → 주문 취소 → 예약 재고 복원** 으로, 실패가 여러 컨텍스트를 거꾸로 흐르며 원상복구되게 했습니다.
- 복원 후 예약 기록을 지워 **중복 취소에도 안전(멱등)** 하게 만들었습니다.
- 성공(앞으로)·실패(뒤로) 양쪽 모두 이벤트만으로 흐르는, **완결된 코레오그래피 사가** 가 됐습니다.

이제 주문이 진짜로 처음부터 끝까지 흐르고, 어디서 실패해도 깔끔하게 되돌아옵니다. 하지만 아직 상품이 **그냥 문자열 ID** 일 뿐입니다 — 이름도, 정가도, 재고 정책도 없죠. 가격조차 주문 요청이 직접 실어 보내는데, 이건 사실 위험합니다(클라이언트가 가격을 조작할 수 있으니까요). 다음 3편에서는 **상품 카탈로그 컨텍스트** 를 만들어, 진짜 상품과 가격을 카탈로그에서 가져오도록 바꿉니다.

> 이번 편 전체 코드는 리포의 `part-10` 태그에 있습니다.
