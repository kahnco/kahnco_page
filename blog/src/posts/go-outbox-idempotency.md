---
title: 신뢰할 수 있는 이벤트 — 아웃박스와 멱등성 (고도화 완결)
date: 2025-08-04
description: 이벤트 기반 시스템에는 두 개의 조용한 폭탄이 있습니다. 상태를 저장하고 이벤트를 발행하는 사이에 죽으면 둘이 어긋나는 dual-write 문제, 그리고 재전송으로 같은 이벤트가 두 번 처리되는 문제. 마지막 편에서 트랜잭셔널 아웃박스로 저장과 발행을 원자적으로 묶고, 이벤트 ID 기반 멱등 소비로 중복을 견디게 하여, 쇼핑몰을 진짜 신뢰할 수 있게 다듬으며 시리즈를 마무리합니다. 이벤트 기반 쇼핑몰 고도화 시리즈 완결편입니다.
tags: [EDD, 아웃박스, 멱등성, Go, 신뢰성]
category: [dev, handson]
draft: false
---

[고도화 3편](/go-product-catalog)까지 오면서 쇼핑몰은 기능적으로 완성됐습니다. 주문이 끝까지 흐르고, 실패하면 되돌아오고, 가격은 카탈로그가 정하죠. 하지만 그동안 눈감아 온 **신뢰성의 구멍** 두 개가 있습니다. 이 마지막 편에서 그걸 메우고, 열두 편의 여정을 마무리합니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-12` 태그에 있습니다.

## 조용한 폭탄 하나 — dual-write

주문 유스케이스는 지금까지 이렇게 두 걸음을 밟았습니다.

```go
repo.Save(ctx, order)                       // 1) 상태를 DB에 저장
publisher.Publish(ctx, order.PullEvents()...) // 2) 이벤트를 브로커로 발행
```

문제는 이게 **두 개의 서로 다른 시스템에 대한 두 번의 쓰기(dual-write)** 라는 겁니다. 1번과 2번 **사이** 에 프로세스가 죽으면? 주문은 DB에 저장됐는데 이벤트는 안 나갑니다. 재고 서비스는 영영 그 주문을 모르고, 재고는 예약되지 않습니다. 반대로 이벤트를 먼저 발행하고 저장에 실패하면, 있지도 않은 주문에 대해 재고가 깎입니다. 어느 쪽이든 **시스템이 조용히 어긋납니다.**

이건 이론적 걱정이 아니라, 이벤트 기반 시스템이 반드시 마주치는 근본 문제입니다. 트랜잭션은 한 DB 안에서만 원자적이고, "DB 저장 + 브로커 발행"을 하나로 묶는 분산 트랜잭션은 실무에서 피하는 게 정석이니까요.

## 트랜잭셔널 아웃박스 — 저장과 발행을 하나로

해법은 우아합니다. **이벤트를 브로커가 아니라 DB에 먼저 쓰되, 상태 변경과 같은 트랜잭션으로** 씁니다. 같은 DB 안이니 원자적이죠. 이 이벤트 저장 테이블을 **아웃박스(outbox)** 라고 부릅니다.

```sql
CREATE TABLE outbox (
    id             BIGSERIAL PRIMARY KEY,
    subject        TEXT NOT NULL,
    event_name     TEXT NOT NULL,
    payload        JSONB NOT NULL,
    correlation_id TEXT,
    published_at   TIMESTAMPTZ   -- NULL 이면 아직 발행 전
);
```

주문 저장소의 `Save` 가, 주문을 저장하는 바로 그 트랜잭션 안에서 애그리거트의 이벤트를 아웃박스에 적재합니다.

```go
func (r *PostgresOrderRepository) Save(ctx context.Context, order *domain.Order) error {
	tx, _ := r.pool.Begin(ctx)
	defer tx.Rollback(ctx)

	// ... 주문과 항목을 upsert ...

	// 핵심: 같은 트랜잭션으로 도메인 이벤트를 아웃박스에 적재한다.
	for _, e := range order.PullEvents() {
		payload, _ := json.Marshal(e)
		tx.Exec(ctx, `INSERT INTO outbox (subject, event_name, payload, correlation_id)
		              VALUES ($1, $2, $3, $4)`,
			"ordering."+e.EventName(), e.EventName(), payload, telemetry.CorrelationID(ctx))
	}
	return tx.Commit(ctx) // 주문과 이벤트가 "함께" 커밋된다 — 원자적
}
```

이제 주문 저장과 이벤트 기록은 **함께 성공하거나 함께 실패** 합니다. "저장은 됐는데 발행은 안 된" 상태가 **원천적으로 불가능** 해졌습니다.

## 릴레이 — 아웃박스를 브로커로 흘려보내기

아웃박스에 이벤트가 쌓였지만, 아직 브로커로 나가진 않았습니다. 이 일을 **릴레이(relay)** 가 합니다 — 아웃박스에서 미발행 이벤트를 주기적으로 읽어 발행하고, 발행 시각을 찍습니다.

```go
func (r *OutboxRelay) dispatch(ctx context.Context) {
	msgs, _ := r.store.FetchOutbox(ctx, 100) // published_at IS NULL 인 것들
	var published []int64
	for _, m := range msgs {
		env := eventbus.Envelope{
			ID:   strconv.FormatInt(m.ID, 10), // ← 아웃박스 행 ID = 이벤트 ID
			Name: m.EventName,
			Data: m.Payload,
		}
		if err := r.bus.Publish(m.Subject, env); err != nil {
			break // 실패하면 멈추고 다음 주기에 재시도
		}
		published = append(published, m.ID)
	}
	r.store.MarkOutboxPublished(ctx, published) // 발행 표시
}
```

이 릴레이는 **at-least-once**(최소 한 번) 전달을 보장합니다. 발행은 됐는데 발행 표시 직전에 죽으면? 다음 주기에 **같은 이벤트를 다시 보냅니다.** 그래서 이벤트가 절대 유실되지 않지만 — 대신 **중복** 이 생깁니다. 이게 두 번째 폭탄으로 이어집니다.

## 조용한 폭탄 둘 — 중복 전달

at-least-once의 대가는 중복입니다. 릴레이의 재시도든 브로커의 재전송이든, 소비자는 **같은 이벤트를 두 번 받을 수 있습니다.** 재고 예약을 두 번 하면 재고가 두 번 깎이죠. 이건 치명적입니다.

해법은 소비자를 **멱등(idempotent)** 하게 만드는 것 — 같은 이벤트를 두 번 처리해도 한 번 처리한 것과 결과가 같게요. 그러려면 "이 이벤트를 이미 처리했나?"를 판단할 **안정적인 ID** 가 필요합니다.

여기서 아웃박스가 두 번째로 빛납니다. 아웃박스 행의 ID는 재전송돼도 **바뀌지 않습니다.** 매번 새로 만드는 랜덤 ID였다면 재전송된 이벤트를 같은 것으로 알아볼 수 없었겠지만, 아웃박스 행 ID는 그 이벤트의 **영속적인 정체성** 이라 중복 판별의 열쇠가 됩니다. 봉투에 이 ID를 실어 보냅니다.

```go
type Envelope struct {
	ID   string `json:"id,omitempty"` // 재전송돼도 유지되는 이벤트 ID
	// ...
}
```

소비자는 이 ID로 중복을 거릅니다.

```go
type Guard struct {
	mu   sync.Mutex
	seen map[string]struct{}
}

// 이미 처리한 id 면 fn 을 실행하지 않는다(중복 무시).
func (g *Guard) Do(id string, fn func() error) error {
	if id != "" && g.alreadyDone(id) {
		return nil
	}
	if err := fn(); err != nil {
		return err // 실패는 기록 안 함 — 재시도로 다시 처리되게
	}
	g.mark(id)
	return nil
}
```

재고 소비자가 이걸 두른 뒤로는, 같은 `order.placed` 가 두 번 와도 재고는 **한 번만** 깎입니다.

```go
err := c.guard.Do(env.ID, func() error {
	return c.svc.OnOrderPlaced(ctx, cmd)
})
```

테스트로 못 박습니다 — 같은 이벤트 ID를 두 번 넣어도 재고가 한 번만 줄어야 합니다.

```go
env.ID = "evt-1"
consumer.Handle(env)
consumer.Handle(env) // 중복

a, _ := stock.FindByProduct(ctx, "prod-A")
// a.Available() == 8  (두 번이면 6이 됐을 것)
```

## 조립 루트만 바뀐다 — 또 한 번

가장 마음에 드는 부분입니다. 이 큰 신뢰성 개선을 하는데도, **유스케이스 코드는 한 줄도 안 바뀌었습니다.** 유스케이스는 여전히 `repo.Save(order)` 하고 `publisher.Publish(...)` 할 뿐입니다. 바뀐 건 조립 루트가 무엇을 끼우느냐 뿐입니다.

```go
switch {
case pg != nil && bus != nil: // Postgres + NATS → 아웃박스 모드
	publisher = infra.NoopPublisher{}          // 직접 발행은 끈다
	go infra.NewOutboxRelay(pg, bus, 200*time.Millisecond, logger).Run(ctx) // 릴레이가 발행
case bus != nil:                               // NATS 만 → 직접 발행
	publisher = infra.NewNatsEventPublisher(bus, "ordering")
}
```

아웃박스 모드에선 이벤트가 저장소 트랜잭션으로 아웃박스에 적재되니, 유스케이스의 직접 발행은 `NoopPublisher` 로 꺼 둡니다. 발행은 릴레이가 대신하죠. 3편에서 만든 포트/어댑터가, 시리즈 마지막까지 **핵심을 건드리지 않고 인프라만 바꾸게** 해줬습니다.

## 진짜로 안 새는지

Postgres·릴레이·다섯 서비스를 띄우고 주문을 넣으면, 이벤트가 아웃박스를 거쳐 흐르고 주문은 배송까지 갑니다.

```text
$ curl -X POST localhost:8080/orders -H 'X-Correlation-ID: outbox-001' -d '{...}'
$ curl localhost:8080/orders/…
"status": "SHIPPED"

$ psql -c "SELECT event_name, published_at IS NOT NULL AS 발행됨 FROM outbox ORDER BY id"
 order.placed    | t
 order.paid      | t
 order.confirmed | t
 order.shipped   | t
```

주문의 매 상태 전이가 아웃박스에 트랜잭션으로 적재됐고, 릴레이가 모두 발행했습니다. 저장과 발행이 **원자적으로** 묶인 채 전체 사가가 돌았습니다.

## 정직하게 — "정확히 한 번"은 없다

두 가지를 분명히 해둡니다.

- 우리의 멱등 기록은 **인메모리** 라 파드가 재시작하면 사라집니다. 실서비스에서는 처리한 이벤트 ID를 **DB 테이블(processed_events)** 에 두고, 이상적으로는 **비즈니스 쓰기와 같은 트랜잭션** 으로 함께 커밋합니다(멱등 판정과 처리가 원자적이어야 완벽합니다).
- "정확히 한 번(exactly-once) 전달"은 분산 시스템에서 **신화** 에 가깝습니다. 현실적인 목표는 **at-least-once 전달 + 멱등 소비 = 실질적 한 번(effectively-once)** 입니다. 아웃박스와 멱등성은 바로 이 조합을 이룹니다.

## 고도화 시리즈를 마치며

네 편에 걸쳐, 뼈대만 있던 쇼핑몰을 진짜로 도는 시스템으로 다듬었습니다.

1. **사가를 닫다** — 결제를 붙여 주문이 확정까지 흐르게.
2. **배송과 완전한 보상** — 배송으로 SHIPPED까지, 실패는 예약 재고까지 되돌리게.
3. **상품 카탈로그** — 가격의 주인을 제자리로, 주문은 읽기 프로젝션에서 조회하게.
4. **아웃박스와 멱등성** — 이벤트가 유실되지도, 중복으로 망가지지도 않게.

그리고 이건 [첫 8편](/go-cicd-observability)에서 시작한 더 긴 여정의 끝이기도 합니다. 빈 폴더에서 DDD로 도메인을 그리고, TDD로 쌓고, 이벤트로 잇고, 컨테이너에 담아 쿠버네티스에 올리고, 관찰성과 CI/CD를 붙이고, 마침내 사가를 닫고 신뢰성까지 벼렸습니다.

돌아보면 하나의 문장이 남습니다 — **도메인을 순수하게 지키고, 나머지는 어댑터로 밀어내라.** 저장소는 인메모리에서 Postgres로, 발행은 로그에서 NATS로, 다시 아웃박스로 바뀌었지만, 그 모든 변화 동안 도메인과 유스케이스는 거의 그대로였습니다. 포트와 어댑터가 변화를 흡수했고, 테스트가 매 걸음을 지켜줬습니다. 복잡한 시스템을 **겁내지 않고 계속 진화시킬 수 있게** 하는 것 — 결국 DDD·EDD·TDD가 함께 지향하는 건 그거였습니다.

열두 편의 긴 여정을 끝까지 함께해 주셔서 감사합니다. 전체 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 에 `part-1` 부터 `part-12` 까지 편별 태그로 남아 있습니다. 언제든 원하는 지점에서 직접 돌려보고, 이어서 여러분의 시스템으로 확장해 보시길 바랍니다.

> 이번 편 전체 코드는 리포의 `part-12` 태그에 있습니다.
