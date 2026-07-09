---
title: TDD로 Go 도메인 모델링하기 — 테스트가 이끄는 애그리거트
date: 2026-07-05
description: 1편에서 그린 DDD 설계를, 이번엔 TDD(테스트 주도 개발)로 Go 코드로 옮깁니다. 실패하는 테스트를 먼저 쓰고(Red), 통과시키고(Green), 다듬는(Refactor) 사이클로 값 객체와 Order 애그리거트의 불변식을 하나씩 쌓아 올립니다. 도메인 규칙을 실행 가능한 명세로 만드는, 이벤트 기반 쇼핑몰 시리즈 2편입니다.
tags: [DDD, TDD, Go, 애그리거트, 테스트]
category: [dev, handson]
draft: false
---

[1편](/ddd-shop-domain-design)에서 이벤트 스토밍으로 도메인을 탐색하고 Order 애그리거트의 불변식을 그렸습니다. 오늘은 그 설계를 Go 코드로 옮기는데, **TDD(테스트 주도 개발)** 로 갑니다. 즉 구현을 먼저 짜고 테스트하는 게 아니라, **실패하는 테스트를 먼저 쓰고 → 그걸 통과시키는 최소 코드를 짜고 → 다듬는** 순서로요.

DDD와 TDD는 궁합이 좋습니다. 도메인의 불변식("주문에는 항목이 하나 이상", "총액은 소계의 합")은 그 자체로 **실행 가능한 명세** — 즉 테스트 — 로 옮기기 딱 좋기 때문입니다. 규칙을 문장으로 적는 대신 테스트로 적으면, 그 규칙이 영원히 검증됩니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-2` 태그에 있습니다. `git checkout part-2 && go test ./...` 로 직접 돌려보세요.

## TDD 한 사이클 — Red · Green · Refactor

TDD의 리듬은 세 박자입니다.

- **Red** — 아직 없는 기능에 대한 **실패하는 테스트** 를 먼저 씁니다. 컴파일이 안 되거나 테스트가 빨갛게 실패합니다. 이 단계에서 "무엇을 만들 건지"를 테스트로 못 박습니다.
- **Green** — 그 테스트를 통과시키는 **최소한의 코드** 를 짭니다. 우아함은 나중, 지금은 초록불이 목표입니다.
- **Refactor** — 테스트가 통과하는 걸 안전망 삼아, 코드를 다듬습니다. 테스트가 있으니 겁 없이 정리할 수 있습니다.

이 사이클을 작게 반복하며 Order 애그리거트를 쌓겠습니다. 프로젝트 구조는 도메인을 가장 안쪽에 두는 계층 구조입니다.

```text
internal/ordering/domain/
├── value_objects.go   # Money, Quantity, ID, 상태
├── order.go           # Order 애그리거트 + OrderLine
├── events.go          # 도메인 이벤트
├── repository.go      # 리포지토리 포트(인터페이스)
└── errors.go          # 도메인 에러
```

도메인 계층은 DB도 HTTP도 모릅니다. 그래서 **아무것도 안 띄우고 테스트만으로** 규칙을 검증할 수 있는데, 이게 TDD를 특히 빠르고 즐겁게 만듭니다.

## 사이클 1 — "빈 주문은 거부된다"

첫 규칙: 항목이 없는 주문은 만들어질 수 없다. **테스트부터** 씁니다(Red).

```go
func TestPlaceOrder_빈_항목이면_에러(t *testing.T) {
	_, err := PlaceOrder("order-1", "cust-1", nil)
	if !errors.Is(err, ErrEmptyOrder) {
		t.Fatalf("빈 주문은 ErrEmptyOrder 여야 하는데: %v", err)
	}
}
```

이 시점엔 `PlaceOrder`도 `ErrEmptyOrder`도 없으니 **컴파일조차 안 됩니다.** 그게 정상입니다 — 빨간불에서 시작합니다. 이제 이걸 통과시킬 최소 코드를 짭니다(Green).

```go
var ErrEmptyOrder = errors.New("주문에는 최소 하나의 항목이 필요합니다")

func PlaceOrder(id OrderID, customerID CustomerID, lines []OrderLine) (*Order, error) {
	if len(lines) == 0 {
		return nil, ErrEmptyOrder
	}
	return &Order{id: id, customerID: customerID, lines: lines, status: StatusPlaced}, nil
}
```

테스트가 초록불이 됩니다. 주목할 점은, "빈 주문 거부"라는 불변식이 **테스트로 먼저 선언되고** 그다음 코드가 그걸 만족시켰다는 겁니다. 규칙이 코드보다 앞섭니다.

## 사이클 2 — "총액은 소계의 합"

다음 규칙: 주문 총액은 항목 소계의 합이다. 역시 테스트 먼저(Red).

```go
func TestPlaceOrder_총액은_소계의_합(t *testing.T) {
	// 상품 A 2개(1,000원) + 상품 B 1개(3,000원) = 5,000원
	lines := []OrderLine{
		NewOrderLine("prod-A", mustQty(t, 2), mustMoney(t, 1000)),
		NewOrderLine("prod-B", mustQty(t, 1), mustMoney(t, 3000)),
	}
	o, _ := PlaceOrder("order-1", "cust-1", lines)
	if got := o.Total().Amount(); got != 5000 {
		t.Fatalf("총액 = 5000 이어야 하는데 %d", got)
	}
}
```

흥미로운 지점입니다. 이 테스트를 쓰다 보니 **금액(Money)과 수량(Quantity)이라는 값 객체가 필요** 해졌습니다. TDD의 부수 효과 중 하나가 이겁니다 — 테스트가 "이런 타입이 있으면 좋겠다"를 자연스럽게 끌어냅니다. 그래서 값 객체를 만듭니다(Green). 값 객체는 **생성 시점에 유효성을 강제** 하고 **불변** 입니다.

```go
type Money struct{ amount int64 } // 원. 음수 불가

func NewMoney(amount int64) (Money, error) {
	if amount < 0 {
		return Money{}, ErrNegativeMoney
	}
	return Money{amount: amount}, nil
}
func (m Money) Add(o Money) Money      { return Money{amount: m.amount + o.amount} }
func (m Money) Times(q Quantity) Money { return Money{amount: m.amount * int64(q.value)} }
```

그리고 총액은 **저장하지 않고 항상 계산** 합니다. 그래야 "총액 = 소계 합" 불변식이 절대 깨지지 않으니까요.

```go
func (o *Order) Total() Money {
	total := Money{}
	for _, l := range o.lines {
		total = total.Add(l.Subtotal())
	}
	return total
}
```

이왕 값 객체를 만든 김에, "음수 금액", "0개 수량"도 테스트로 못 박습니다(Red → Green). 잘못된 값이 **애초에 만들어지지 못하게** 하는 거죠.

```go
func TestMoney_음수는_에러(t *testing.T) {
	if _, err := NewMoney(-1); !errors.Is(err, ErrNegativeMoney) {
		t.Fatalf("음수 금액은 ErrNegativeMoney 여야 하는데: %v", err)
	}
}
```

## 사이클 3 — "정해진 순서로만 전이된다"

주문 상태는 `생성됨 → 결제완료 → 확정 → 배송중` 으로만 가고, 취소는 결제 전까지만 된다. 잘못된 전이를 **거부하는 테스트** 를 먼저 씁니다(Red).

```go
func TestOrder_허용되지_않은_전이는_거부(t *testing.T) {
	o, _ := PlaceOrder("order-1", "cust-1", sampleLines(t))
	// 생성됨 → (결제 없이) 확정 : 거부돼야 한다
	if err := o.Confirm(); !errors.Is(err, ErrInvalidStatusTransition) {
		t.Fatalf("PLACED→CONFIRMED 는 거부돼야 하는데: %v", err)
	}
	if o.Status() != StatusPlaced {
		t.Fatalf("거부됐으면 상태는 PLACED 그대로여야 하는데 %s", o.Status())
	}
}
```

이 테스트가 "허용된 전이만 통과, 나머지는 거부하고 상태 유지"를 못 박습니다. 통과시키는 구현은, 허용된 전이를 **한 곳에 모은 맵** 입니다(Green).

```go
var allowedTransitions = map[OrderStatus][]OrderStatus{
	StatusPlaced:    {StatusPaid, StatusCancelled},
	StatusPaid:      {StatusConfirmed, StatusCancelled},
	StatusConfirmed: {StatusShipped},
}

func (o *Order) transition(to OrderStatus, event DomainEvent) error {
	for _, allowed := range allowedTransitions[o.status] {
		if allowed == to {
			o.status = to
			o.record(event)
			return nil
		}
	}
	return fmt.Errorf("%w: %s → %s", ErrInvalidStatusTransition, o.status, to)
}

func (o *Order) MarkPaid() error { return o.transition(StatusPaid, OrderPaid{OrderID: o.id}) }
func (o *Order) Confirm() error  { return o.transition(StatusConfirmed, OrderConfirmed{OrderID: o.id}) }
```

정상 경로(`생성→결제→확정→배송`)와 "확정된 주문은 취소 불가" 같은 규칙도 각각 테스트로 덮습니다. 규칙 하나 = 테스트 하나 = 명세 하나입니다.

## 사이클 4 — "일어난 일을 이벤트로 기록한다"

마지막으로, 주문이 생성되면 도메인 이벤트가 기록돼야 합니다(4편에서 이 이벤트로 재고·결제를 잇습니다). 테스트 먼저(Red).

```go
func TestPlaceOrder_OrderPlaced_이벤트를_기록(t *testing.T) {
	o, _ := PlaceOrder("order-1", "cust-1", sampleLines(t))
	events := o.PullEvents()
	if len(events) != 1 {
		t.Fatalf("이벤트 1개 여야 하는데 %d개", len(events))
	}
	if _, ok := events[0].(OrderPlaced); !ok {
		t.Fatalf("첫 이벤트는 OrderPlaced 여야 함: %T", events[0])
	}
}
```

이걸 통과시키려고 `PlaceOrder`에 이벤트 기록을 더하고, 이벤트를 꺼내는 `PullEvents`를 만듭니다(Green). 도메인은 이벤트를 **기록만** 하고, 발행(브로커로 보내기)은 나중에 인프라가 합니다.

```go
func (o *Order) record(e DomainEvent) { o.events = append(o.events, e) }

func (o *Order) PullEvents() []DomainEvent {
	e := o.events
	o.events = nil
	return e
}
```

## Refactor — 테스트라는 안전망 위에서

테스트가 초록불인 지금이 **다듬을** 때입니다. 예를 들어, 항목 목록을 그대로 돌려주면 바깥에서 몰래 바꿔 불변식을 깰 수 있으니, 복사본을 반환하도록 캡슐화를 강화합니다.

```go
func (o *Order) Lines() []OrderLine {
	out := make([]OrderLine, len(o.lines))
	copy(out, o.lines)
	return out
}
```

이렇게 구조를 바꿔도 **테스트를 다시 돌려 초록불이면 안전** 합니다. 리팩터링이 무섭지 않은 이유가 이겁니다 — 규칙이 테스트로 고정돼 있으니, 내부를 바꿔도 규칙이 깨지면 즉시 빨간불로 알려줍니다.

리포지토리도 이 단계에서 **포트(인터페이스)** 로만 둡니다. 도메인이 DB를 모르게 하기 위해서죠(의존성 역전). 구현은 다음 편들에서 인프라 계층에.

```go
type OrderRepository interface {
	Save(ctx context.Context, order *Order) error
	FindByID(ctx context.Context, id OrderID) (*Order, error)
}
```

## 전부 초록불

사이클을 다 돌고 나면, 도메인의 모든 규칙이 테스트로 덮여 있습니다. DB를 안 띄우니 순식간에 통과합니다.

```text
$ go test ./...
ok  github.com/kahnco/go-ddd-shop/internal/ordering/domain  0.35s
```

빈 주문 거부, 총액 계산, 값 객체 검증, 상태 전이 규칙, 이벤트 기록 — 이 모두가 **처음에 테스트로 선언되고 나중에 구현이 따라온** 것들입니다.

## 정리 — TDD가 준 것

- **Red → Green → Refactor** 사이클로, 도메인 규칙을 하나씩 테스트로 못 박고 구현이 따라오게 했습니다.
- 테스트가 "이런 타입이 필요하다"를 끌어내(값 객체), 설계를 자연스럽게 이끌었습니다.
- 규칙 하나 = 테스트 하나라, 도메인의 불변식이 **실행 가능한 명세** 로 영원히 검증됩니다.
- 테스트라는 안전망 덕에 **겁 없이 리팩터링** 할 수 있었습니다.
- 도메인이 DB·프레임워크를 모르니(헥사고날), 테스트가 **빠르고 순수** 합니다.

TDD와 DDD가 만나면, 도메인 규칙이 문서가 아니라 **깨지면 즉시 알려주는 살아있는 검증** 이 됩니다. 1편의 설계가 이제 테스트로 고정된 Go 코드가 됐으니, 다음 편에서는 이 도메인 바깥에 **애플리케이션 계층(유스케이스)과 실제 저장소·API** 를 얹어 진짜 도는 서비스를 만듭니다. 물론 거기서도 테스트를 먼저 씁니다.

> 이번 편 전체 코드는 리포의 `part-2` 태그에 있습니다.
