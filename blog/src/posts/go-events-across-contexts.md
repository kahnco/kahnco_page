---
title: 이벤트로 컨텍스트 잇기 — EDD와 결과적 일관성
date: 2026-07-11
description: 3편까지 만든 주문 서비스의 이벤트는 로그로 찍히기만 할 뿐 아무도 듣지 않았습니다. 4편에서는 NATS 메시지 브로커를 붙여 OrderPlaced 이벤트를 발행하고, 새 재고(inventory) 바운디드 컨텍스트가 이를 구독해 재고를 예약하도록 잇습니다. event-carried state transfer, 컨텍스트 간 계약, 보상 트랜잭션(saga), 결과적 일관성, 그리고 임베디드 NATS로 이벤트 흐름을 TDD하는 법까지. 이벤트 기반 쇼핑몰 시리즈 4편입니다.
tags: [EDD, DDD, Go, NATS, 이벤트, saga]
category: [dev, handson]
draft: false
---

[3편](/go-usecases-and-api)에서 요청이 도는 주문 서비스를 완성했습니다. 하지만 주문이 생성될 때 나오던 그 이벤트, 기억하시나요? `domain event published event=order.placed` 라고 **로그로 찍히기만** 할 뿐, 아무도 듣고 있지 않았습니다. 오늘은 그 이벤트에 진짜 청중을 붙입니다 — 메시지 브로커(NATS)로 이벤트를 내보내고, **새 재고(inventory) 컨텍스트** 가 그걸 받아 재고를 예약하게요. 드디어 EDD(이벤트 기반 설계)가 본격적으로 등장합니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-4` 태그에 있습니다. `git checkout part-4 && go test ./...` 로 이벤트 흐름 검증까지 돌려볼 수 있습니다.

## 왜 이벤트인가 — 컨텍스트를 떼어놓기 위해

주문이 들어오면 재고를 줄여야 합니다. 가장 단순한 방법은 주문 서비스가 재고 서비스를 **직접 호출** 하는 것입니다. 하지만 그러면 주문은 재고를 알아야 하고, 재고가 느리거나 죽으면 주문도 같이 막힙니다. 결제·배송·포인트까지 붙으면 주문 서비스는 온 세상을 다 아는 거대한 덩어리가 됩니다.

이벤트 기반 설계는 이 관계를 뒤집습니다. 주문 서비스는 그저 **"주문이 생성되었다"는 사실을 공표** 할 뿐, 누가 그걸 듣는지 모릅니다. 재고·결제·배송은 각자 알아서 그 사실을 구독해 반응합니다. 이걸 **코레오그래피(choreography)** 라고 합니다 — 지휘자 없이, 각자 자기 안무를 아는 춤이죠.

- **느슨한 결합** — 주문은 재고의 존재조차 몰라도 됩니다. 새 소비자(예: 추천 시스템)를 붙여도 주문 코드는 안 바뀝니다.
- **시간적 분리** — 재고가 잠깐 죽어 있어도 주문은 받아집니다. 이벤트는 남아 있다가 나중에 처리됩니다(브로커가 영속성을 줄 때).
- **결과적 일관성** — 대신, "주문됨"과 "재고 차감됨"이 **동시에** 참인 순간은 없습니다. 아주 짧은 시차 뒤 일관돼집니다. 이 트레이드오프가 EDD의 핵심입니다.

## 이벤트 버스 — 도메인을 모르는 전송 계층

먼저 브로커를 감싸는 얇은 계층을 만듭니다. 이 계층은 주문도 재고도 몰라야 합니다 — 오직 **이벤트 이름과 JSON 페이로드** 만 다룹니다. 그래서 도메인 바깥, `platform/eventbus` 에 둡니다.

브로커로 오가는 메시지는 **봉투(envelope)** 에 담습니다. 봉투 겉면에 이벤트 이름을 적고, 안에 도메인 이벤트의 JSON을 넣습니다.

```go
type Envelope struct {
	Name string          `json:"name"`
	Data json.RawMessage `json:"data"`
}

func NewEnvelope(name string, payload any) (Envelope, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return Envelope{}, err
	}
	return Envelope{Name: name, Data: data}, nil
}
```

버스 자체는 NATS 클라이언트를 감싸 발행/구독만 노출합니다. 여기서도 **테스트를 먼저** 씁니다(Red). 그런데 브로커 테스트는 외부 서버가 필요하니 느리고 번거롭지 않을까요? NATS는 서버를 **프로세스 안에 임베디드** 로 띄울 수 있어서, 외부 설치 없이도 진짜 TCP 프로토콜 위에서 테스트할 수 있습니다.

```go
func TestBus_발행하면_구독자가_봉투를_받는다(t *testing.T) {
	url, shutdown, _ := embeddednats.Start() // 인메모리 NATS 서버
	defer shutdown()

	bus, _ := eventbus.Connect(url)
	defer bus.Close()

	got := make(chan eventbus.Envelope, 1)
	bus.Subscribe("demo.hi", "test", func(env eventbus.Envelope) error {
		got <- env
		return nil
	})

	env, _ := eventbus.NewEnvelope("demo.hi", map[string]string{"hello": "world"})
	bus.Publish("demo.hi", env)

	select {
	case e := <-got:
		// e.Name == "demo.hi", 안의 payload 도 온전한지 검증 …
	case <-time.After(2 * time.Second):
		t.Fatal("타임아웃: 메시지를 받지 못함")
	}
}
```

이 테스트를 통과시키는 버스 구현입니다(Green). 구독은 **큐 그룹** 으로 합니다 — 같은 그룹의 인스턴스가 여럿이면 각 메시지는 그중 하나에만 가서, 나중에(7편) 수평 확장할 때 중복 처리를 막아줍니다.

```go
func (b *Bus) Publish(subject string, env Envelope) error {
	raw, _ := json.Marshal(env)
	if err := b.nc.Publish(subject, raw); err != nil {
		return err
	}
	return b.nc.Flush() // 실제 전송 보장
}

func (b *Bus) Subscribe(subject, group string, handler Handler) error {
	_, err := b.nc.QueueSubscribe(subject, group, func(m *nats.Msg) {
		var env Envelope
		if json.Unmarshal(m.Data, &env) == nil {
			_ = handler(env)
		}
	})
	return err
}
```

## 이벤트에 무엇을 실을까 — event-carried state transfer

여기서 중요한 설계 결정이 하나 나옵니다. 재고 컨텍스트가 재고를 예약하려면 **"어떤 상품을 몇 개"** 인지 알아야 합니다. 그런데 3편의 `OrderPlaced` 이벤트에는 주문 ID·고객·총액만 있고, **항목이 없었습니다.**

방법은 둘입니다. 하나는 재고가 이벤트를 받고 주문 서비스에 "그 주문 내용 좀 알려줘" 하고 **되묻는** 것(과도한 결합·왕복). 다른 하나는 이벤트가 애초에 필요한 데이터를 **실어 나르는** 것 — 이걸 **event-carried state transfer** 라고 합니다. 후자를 택합니다.

```go
type OrderPlacedItem struct {
	ProductID ProductID `json:"product_id"`
	Quantity  int       `json:"quantity"`
}

type OrderPlaced struct {
	OrderID    OrderID           `json:"order_id"`
	CustomerID CustomerID        `json:"customer_id"`
	Total      Money             `json:"total"`
	Items      []OrderPlacedItem `json:"items"` // ← 항목을 실어 보낸다
}
```

json 태그를 눈여겨보세요. 이 태그가 곧 **컨텍스트 사이의 계약(schema)** 입니다. 다른 컨텍스트는 이 JSON 모양에만 의존하지, 이 Go 타입을 import 하지 않습니다. 계약을 안정적인 snake_case로 고정하는 이유입니다.

한 가지 걸림돌 — `Total` 은 `Money` 값 객체인데, 내부 필드가 비공개라 그냥 직렬화하면 `{}` 가 됩니다. Money가 겉으로는 그냥 정수(원)로 나가도록 직렬화를 손봐줍니다.

```go
func (m Money) MarshalJSON() ([]byte, error) { return json.Marshal(m.amount) }
```

## 발행 어댑터 — 포트는 그대로, 어댑터만 교체

3편에서 유스케이스는 `EventPublisher` **포트** 만 보고 있었고, 구현은 로그로 찍는 `LogPublisher` 였습니다. 이제 같은 포트를 NATS로 구현한 어댑터를 만듭니다.

```go
func (p *NatsEventPublisher) Publish(_ context.Context, events ...domain.DomainEvent) error {
	for _, e := range events {
		subject := p.prefix + "." + e.EventName() // "ordering.order.placed"
		env, err := eventbus.NewEnvelope(e.EventName(), e)
		if err != nil {
			return err
		}
		if err := p.bus.Publish(subject, env); err != nil {
			return err
		}
	}
	return nil
}
```

그리고 조립 루트(`main`)에서 어느 어댑터를 끼울지만 고릅니다. 이게 3편에서 예고한 **"애플리케이션 코드는 한 줄도 안 바뀐다"** 의 실현입니다 — `OrderService` 도, `PlaceOrder` 유스케이스도 전혀 손대지 않았습니다.

```go
var publisher app.EventPublisher = infra.NewLogPublisher(logger)
if url := os.Getenv("NATS_URL"); url != "" {
	bus, _ := eventbus.Connect(url)
	defer bus.Close()
	publisher = infra.NewNatsEventPublisher(bus, "ordering") // ← 여기만 바뀐다
}
svc := app.NewOrderService(repo, publisher, ids)
```

`NATS_URL` 이 없으면 로그 발행으로 단독 실행되고, 있으면 브로커로 발행합니다. 포트/어댑터의 이점이 이렇게 구체적으로 드러납니다.

## 받는 쪽 — 새 재고 컨텍스트

이제 이벤트를 들을 재고 컨텍스트를 만듭니다. **주문 컨텍스트와 코드를 공유하지 않는다** 는 게 원칙입니다 — 별개의 도메인이니 자기만의 `ProductID`·`StockItem` 을 갖습니다. 재고 도메인의 핵심 불변식은 "가진 것보다 많이 예약할 수 없다" 이고, 늘 그렇듯 테스트로 먼저 못 박습니다.

```go
func TestStockItem_재고보다_많이_예약하면_거부된다(t *testing.T) {
	item := NewStockItem("prod-A", 2)
	if err := item.Reserve(5); !errors.Is(err, ErrInsufficientStock) {
		t.Fatalf("초과 예약은 ErrInsufficientStock 여야 하는데: %v", err)
	}
	if item.Available() != 2 { // 거부됐으면 재고는 그대로
		t.Fatalf("거부 후 가용 = 2 그대로여야 하는데 %d", item.Available())
	}
}
```

```go
func (s *StockItem) Reserve(qty int) error {
	if qty <= 0 {
		return ErrNonPositiveQuantity
	}
	if qty > s.available {
		return ErrInsufficientStock
	}
	s.available -= qty
	return nil
}
```

### 계약으로만 잇기 — 부패 방지 계층

주문 이벤트를 받는 **소비자 어댑터** 가 이 컨텍스트의 입구입니다. 핵심은, 이 어댑터가 주문 컨텍스트의 `domain.OrderPlaced` 를 import 하지 **않는다** 는 점입니다. 대신 그 이벤트 JSON을 재고 컨텍스트가 이해하는 **자기만의 타입** 으로 풀어냅니다. 이게 부패 방지 계층(ACL, Anti-Corruption Layer)의 축소판입니다 — 남의 도메인 모델이 내 도메인으로 새어 들어오지 못하게 막는 번역 지점이죠.

```go
// 주문 컨텍스트의 타입이 아니라, 재고 컨텍스트가 이해하는 모양으로 "번역"한다.
type orderPlacedPayload struct {
	OrderID string `json:"order_id"`
	Items   []struct {
		ProductID string `json:"product_id"`
		Quantity  int    `json:"quantity"`
	} `json:"items"`
}

func (c *OrderPlacedConsumer) Handle(env eventbus.Envelope) error {
	var p orderPlacedPayload
	if err := env.Into(&p); err != nil {
		return err
	}
	cmd := app.ReserveForOrderCommand{OrderID: p.OrderID}
	for _, it := range p.Items {
		cmd.Items = append(cmd.Items, app.ReservationItem{ProductID: it.ProductID, Quantity: it.Quantity})
	}
	return c.svc.OnOrderPlaced(context.Background(), cmd)
}
```

두 컨텍스트를 잇는 유일한 끈은 저 JSON 계약뿐입니다. 주문 팀이 내부 구조를 바꿔도, 이벤트 JSON만 유지되면 재고 팀은 아무 영향을 받지 않습니다.

## 실패는 어떻게 다루나 — 보상 트랜잭션(saga)

한 주문에 상품이 여럿이면 문제가 생깁니다. A는 재고가 있어 예약했는데 B가 부족하면? 이미 잡은 A의 예약을 **되돌려야** 합니다. 분산 환경에는 여러 서비스를 아우르는 DB 트랜잭션이 없으니, "모두 아니면 전무"를 **보상(compensation)** 으로 흉내 냅니다. 이 패턴이 **사가(saga)** 입니다. 역시 테스트로 규칙을 고정합니다.

```go
func TestOnOrderPlaced_한_항목이라도_부족하면_보상하고_실패발행(t *testing.T) {
	// prod-A 는 넉넉하지만 prod-B 가 부족하다
	svc, repo, pub := newService(map[string]int{"prod-A": 10, "prod-B": 0})

	_ = svc.OnOrderPlaced(context.Background(), cmd()) // A×2, B×1

	// 먼저 예약했던 prod-A 는 보상으로 원상복구(10)돼야 한다
	a, _ := repo.FindByProduct(context.Background(), "prod-A")
	if a.Available() != 10 {
		t.Fatalf("보상 후 prod-A 재고 = 10 이어야 하는데 %d", a.Available())
	}
	// 실패 이벤트가 발행됐는가
	if _, ok := pub.published[0].(domain.StockReservationFailed); !ok {
		t.Fatalf("StockReservationFailed 여야 함: %T", pub.published[0])
	}
}
```

유스케이스는 항목을 하나씩 예약하다가 실패하면, 지금까지 잡은 것을 전부 풀고 **실패 이벤트** 를 냅니다. 성공하면 **성공 이벤트** 를 내고요. 눈여겨볼 점 — 재고 부족은 **에러가 아니라 비즈니스 결과** 라서, 예외로 터뜨리지 않고 이벤트로 표현합니다.

```go
func (s *ReservationService) OnOrderPlaced(ctx context.Context, cmd ReserveForOrderCommand) error {
	var done []reserved
	rollback := func() {
		for _, r := range done { // 지금까지 잡은 예약을 되돌린다(보상)
			r.item.Release(r.qty)
			_ = s.stock.Save(ctx, r.item)
		}
	}
	for _, it := range cmd.Items {
		item, err := s.stock.FindByProduct(ctx, domain.ProductID(it.ProductID))
		if err != nil {
			rollback()
			return s.publishFailed(ctx, cmd.OrderID, err)
		}
		if err := item.Reserve(it.Quantity); err != nil {
			rollback()
			return s.publishFailed(ctx, cmd.OrderID, err) // stock.reservation_failed
		}
		_ = s.stock.Save(ctx, item)
		done = append(done, reserved{item: item, qty: it.Quantity})
	}
	return s.publisher.Publish(ctx, domain.StockReserved{OrderID: domain.OrderID(cmd.OrderID)})
}
```

`StockReservationFailed` 는 나중에 주문 컨텍스트가 구독해 **주문을 자동 취소** 하는 데 쓰입니다(사가의 실패 경로). 그렇게 이벤트가 양방향으로 흐르며 컨텍스트들이 협력하게 됩니다.

## 흐름 전체를 TDD하기

개별 조각은 다 테스트했지만, **정말로 이어지는가?** 주문이 발행한 이벤트가 브로커를 건너 재고까지 도달해 예약이 일어나는지, 종단 간으로 확인하고 싶습니다. 임베디드 NATS 위에서 진짜 발행→구독을 돌리는 통합 테스트를 씁니다.

```go
func TestOrderPlaced_흐르면_재고가_예약된다(t *testing.T) {
	url, shutdown, _ := embeddednats.Start()
	defer shutdown()
	bus, _ := eventbus.Connect(url)
	defer bus.Close()

	// 재고 컨텍스트: prod-A 10, prod-B 5, order.placed 구독
	repo := wireInventory(t, bus, map[string]int{"prod-A": 10, "prod-B": 5})

	// 재고가 내보내는 결과 이벤트를 관찰(동기화용)
	reserved := make(chan eventbus.Envelope, 1)
	bus.Subscribe("inventory.stock.reserved", "test", func(e eventbus.Envelope) error {
		reserved <- e
		return nil
	})

	// 주문 컨텍스트: 유스케이스가 하듯 OrderPlaced 발행
	orderingPub := orderinginfra.NewNatsEventPublisher(bus, "ordering")
	orderingPub.Publish(context.Background(), orderingdomain.OrderPlaced{
		OrderID: "order-1",
		Items:   []orderingdomain.OrderPlacedItem{{ProductID: "prod-A", Quantity: 2}, {ProductID: "prod-B", Quantity: 1}},
	})

	select {
	case <-reserved: // 재고가 처리해 StockReserved 를 낼 때까지 대기
	case <-time.After(3 * time.Second):
		t.Fatal("타임아웃: 재고 예약 이벤트를 받지 못함")
	}

	a, _ := repo.FindByProduct(context.Background(), "prod-A")
	b, _ := repo.FindByProduct(context.Background(), "prod-B")
	if a.Available() != 8 || b.Available() != 4 {
		t.Fatalf("예약 후 재고 A=8,B=4 여야 하는데 A=%d,B=%d", a.Available(), b.Available())
	}
}
```

이 테스트는 **비동기** 라, 결과를 `time.After` 로 기다립니다. EDD 테스트의 전형적인 모습이죠 — "요청하고 곧바로 확인"이 아니라 "발행하고 결과 이벤트를 기다림". 전부 초록불입니다.

```text
$ go test ./...
ok  github.com/kahnco/go-ddd-shop/internal/integration            3.1s
ok  github.com/kahnco/go-ddd-shop/internal/inventory/app          0.4s
ok  github.com/kahnco/go-ddd-shop/internal/inventory/domain       2.2s
ok  github.com/kahnco/go-ddd-shop/internal/ordering/infra         1.5s
ok  github.com/kahnco/go-ddd-shop/internal/platform/eventbus      2.6s
...
```

## 진짜로 흐르는지 — 두 서비스를 띄워보기

이제 브로커와 두 서비스를 각각 띄웁니다. 재고 서비스는 **HTTP를 열지 않습니다** — 입구가 오직 이벤트입니다. 이게 EDD 소비자 서비스의 전형입니다.

```text
# NATS 브로커
$ nats-server -p 4222

# 재고 소비자 (order.placed 구독)
$ NATS_URL=nats://localhost:4222 go run ./cmd/inventory
level=INFO msg="inventory 서비스 시작 — order.placed 구독 중"

# 주문 서비스 (이벤트를 브로커로 발행)
$ NATS_URL=nats://localhost:4222 go run ./cmd/ordering
level=INFO msg="이벤트 발행 = NATS"
```

주문을 넣으면, 재고 서비스 로그에 처리 흔적이 찍힙니다.

```text
$ curl -X POST localhost:8080/orders \
    -d '{"customer_id":"c1","items":[{"product_id":"prod-A","quantity":2,"unit_price":1000},
                                     {"product_id":"prod-B","quantity":1,"unit_price":3000}]}'
{"order_id":"order_66cbc173…"}

# inventory 로그:
level=INFO msg="order.placed 처리 완료" order=order_66cbc173… items=2
```

주문 API는 재고의 존재조차 모른 채 201을 즉시 돌려주고, 재고 예약은 그 **뒤에서 비동기로** 일어납니다. 방금 본 결과적 일관성입니다.

## 함정 하나 — "구독 전에 발행하면 사라진다"

이 데모를 처음 돌렸을 때, 재고 서비스가 아무 반응이 없었습니다. 원인은 타이밍이었습니다 — 재고의 구독이 **활성화되기 전에** 주문이 발행됐던 겁니다. 기본 NATS(core)는 **at-most-once** 라, 그 순간 듣는 구독자가 없으면 메시지를 그냥 버립니다.

이건 버그가 아니라 EDD에서 반드시 마주치는 **전달 보장** 문제입니다. 실무에서는 이걸 두 축으로 다룹니다.

- **영속성** — NATS의 **JetStream**(또는 Kafka)을 쓰면 메시지가 스트림에 저장돼, 소비자가 늦게 붙거나 잠깐 죽어도 나중에 받아 처리합니다. at-least-once가 됩니다.
- **멱등성** — at-least-once는 **중복 전달** 을 부릅니다. 그래서 소비자는 같은 이벤트를 두 번 받아도 결과가 같도록(예약을 두 번 하지 않도록) 처리를 멱등하게 만들어야 합니다 — 보통 이벤트 ID로 중복을 걸러냅니다.

이번 편은 흐름을 선명히 보여주려 core NATS로 갔지만, 실서비스라면 JetStream + 멱등 소비가 정석입니다. 이 주제는 상태·확장을 다루는 뒤 편에서 더 깊이 들어갑니다.

## 정리 — 이벤트가 만든 것

- 주문은 **"주문됨"을 공표만** 하고, 누가 듣는지 모릅니다. 재고·결제·배송을 붙여도 주문 코드는 안 바뀝니다(코레오그래피, 느슨한 결합).
- 이벤트가 필요한 데이터를 **실어 나르게**(event-carried state transfer) 해서, 받는 쪽이 되묻지 않게 했습니다.
- 두 컨텍스트는 코드가 아니라 **JSON 이벤트 계약** 으로만 이어지고, 소비자는 남의 모델을 자기 타입으로 **번역**(ACL)합니다.
- 여러 항목의 부분 실패는 **보상 트랜잭션(saga)** 으로 되돌리고, 실패조차 **이벤트로 표현** 했습니다.
- **결과적 일관성** 을 받아들인 대가로 확장성과 회복력을 얻었고, 그 대신 **전달 보장·멱등성** 이라는 새 숙제를 떠안았습니다.
- 발행 어댑터를 NATS로 바꾸는 동안 **애플리케이션·도메인은 한 줄도 안 바뀌었습니다.** 포트/어댑터의 배당금입니다.

이제 이벤트로 협력하는 두 서비스가 생겼습니다. 그런데 지금은 둘 다 `go run` 으로 제 노트북에서만 돕니다. 다음 5편에서는 이 서비스들을 **컨테이너에 담아**(멀티스테이지 Dockerfile로 작고 안전한 이미지를 만들어), 어디서든 똑같이 뜨도록 만듭니다. 쿠버네티스로 가는 첫걸음입니다.

> 이번 편 전체 코드는 리포의 `part-4` 태그에 있습니다.
