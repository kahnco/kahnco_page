---
title: 아웃박스 신뢰성 — 다중 replica에서 중복 없이 발행하기
date: 2025-09-18
description: 주문 서비스를 replica 2개로 굴리면, 아웃박스 릴레이도 둘이 됩니다. 둘이 같은 이벤트를 두 번 발행하면? 지금까지는 소비자 멱등성이 겨우 흡수했지만, 낭비이자 위험입니다. 이 편에서 뿌리부터 잡습니다 — JetStream 발행측 dedup(Nats-Msg-Id)과 FOR UPDATE SKIP LOCKED 행 잠금으로, 여러 릴레이가 경쟁해도 각 이벤트가 정확히 한 번만 나가게 합니다. 그리고 그 과정에서 만난 동시 스키마 생성 경합까지. 이벤트 기반 쇼핑몰 고도화 시리즈 9편입니다.
tags: [EDD, 아웃박스, PostgreSQL, JetStream, 신뢰성]
category: [dev, handson]
draft: false
---

7편에서 주문 서비스를 쿠버네티스에 replica 2개로 굴렸고, 4편에서 트랜잭셔널 아웃박스로 이벤트 발행을 안전하게 만들었습니다. 그런데 이 둘을 겹치면 조용한 문제가 생깁니다 — **주문 파드가 둘이면, 아웃박스 릴레이도 둘** 입니다. 두 릴레이가 아웃박스를 각자 폴링하다, **같은 이벤트를 둘 다 발행** 할 수 있죠.

지금까지는 [4편의 소비자 멱등성](/go-outbox-idempotency)이 이 중복을 겨우 흡수했습니다. 하지만 그건 최후의 방어일 뿐, 브로커 트래픽은 두 배가 되고 경합의 여지도 남습니다. 이 편에서 **뿌리부터** 잡습니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-17` 태그에 있습니다.

## 두 겹의 방어

중복 발행을 두 층위에서 막습니다.

1. **발행측 dedup(브로커가 걸러냄)** — 이벤트에 안정적인 ID를 붙여 발행하면, JetStream이 중복을 제거합니다.
2. **행 잠금(애초에 두 번 안 집음)** — 릴레이가 아웃박스 행을 트랜잭션으로 잠그고 처리해, 다른 릴레이가 같은 행을 집지 못하게 합니다.

둘은 상호 보완입니다. 행 잠금이 평상시의 이중 폴링을 막고, 발행측 dedup이 그 사이 틈(크래시 등)을 메웁니다.

## 발행측 dedup — Nats-Msg-Id

JetStream에는 발행 중복 제거가 내장돼 있습니다. 발행 메시지에 `Nats-Msg-Id` 헤더를 실으면, 브로커가 **중복 윈도우**(우리는 2분) 안에서 같은 ID의 메시지를 하나만 받아들입니다. 우리에겐 마침 완벽한 ID가 있죠 — **아웃박스 행 ID.** 재전송돼도 바뀌지 않으니까요.

```go
// 봉투 ID(=아웃박스 행 ID)를 Nats-Msg-Id 로 실는다
func (b *Bus) Publish(subject string, env Envelope) error {
	raw, _ := json.Marshal(env)
	if b.js != nil {
		var opts []nats.PubOpt
		if env.ID != "" {
			opts = append(opts, nats.MsgId(env.ID)) // ← 브로커가 이 ID 로 중복 제거
		}
		_, err := b.js.Publish(subject, raw, opts...)
		return err
	}
	// ...
}
```

```go
// 스트림에 중복 윈도우를 설정
b.js.AddStream(&nats.StreamConfig{
	Name: s.Name, Subjects: s.Subjects, Storage: nats.FileStorage,
	Duplicates: 2 * time.Minute, // 이 안에서 같은 Nats-Msg-Id 는 한 번만
})
```

이제 두 릴레이가 같은 아웃박스 행(같은 ID)을 발행해도, **브로커가 두 번째를 조용히 버립니다.** 테스트로 못 박습니다 — 같은 ID로 두 번 발행하면 소비자는 한 번만 받습니다.

## 행 잠금 — FOR UPDATE SKIP LOCKED

발행측 dedup은 안전망이지만, 애초에 두 번 발행하지 않는 게 낫습니다. PostgreSQL의 `FOR UPDATE SKIP LOCKED` 가 우아하게 해결합니다. 릴레이가 미발행 행을 트랜잭션으로 **잠그되, 이미 잠긴 행은 건너뜁니다.** 그러면 릴레이 A가 1~100번을 잠그는 동안, 릴레이 B의 조회는 그 행들을 **건너뛰고** 101번부터 집습니다. 겹치지 않습니다.

```go
func (r *PostgresOrderRepository) DispatchOutbox(ctx context.Context, publish func(OutboxMessage) error) (int, error) {
	tx, _ := r.pool.Begin(ctx)
	defer tx.Rollback(ctx)

	rows, _ := tx.Query(ctx, `
        SELECT id, subject, event_name, payload, ...
        FROM outbox WHERE published_at IS NULL
        ORDER BY id LIMIT 100
        FOR UPDATE SKIP LOCKED`)   // ← 잠긴 행은 건너뛴다
	// ... 행들을 읽어 slice 로 ...

	var published []int64
	for _, m := range msgs {
		if err := publish(m); err != nil { break } // 브로커로 발행
		published = append(published, m.ID)
	}
	tx.Exec(ctx, `UPDATE outbox SET published_at = now() WHERE id = ANY($1)`, published)
	return len(published), tx.Commit(ctx) // 커밋해야 잠금이 풀린다
}
```

핵심은 잠금이 **커밋될 때까지 유지** 된다는 겁니다. 발행하는 동안 행이 잠겨 있으니, 다른 릴레이가 끼어들 수 없습니다. 처리가 끝나 커밋하면(발행 표시 포함) 잠금이 풀리죠.

### 리더 선출은 왜 안 썼나

"릴레이가 여럿이니 하나만 일하게 리더를 뽑자"고 할 수도 있습니다(리더 선출). 하지만 그건 **병목**(리더 하나가 다 처리)이자 **취약점**(리더가 죽으면 새 리더 뽑힐 때까지 공백)입니다. `SKIP LOCKED` 는 리더가 없습니다 — **모든 replica가 서로 다른 행을 나눠** 동시에 처리하니, 병목도 공백도 없이 확장됩니다. 아웃박스엔 이쪽이 더 맞습니다.

## 그 과정에서 만난 진짜 버그 — 동시 스키마 생성

replica 2개로 실제로 돌려보니, 두 번째 인스턴스가 기동하다 **죽었습니다.**

```text
ERROR: 스키마 생성: duplicate key value violates unique constraint "pg_type_typname_nsp_index" (SQLSTATE 23505)
```

원인은 뜻밖이었습니다 — 두 인스턴스가 **동시에** `CREATE TABLE IF NOT EXISTS` 를 돌렸는데, PostgreSQL의 이 구문은 동시 실행에 완전히 안전하지 않습니다. 내부 카탈로그(`pg_type`)에서 경합해 하나가 23505로 실패하죠. 흔히 "IF NOT EXISTS니까 괜찮겠지" 하고 넘어가는 함정입니다.

해법은 스키마 생성을 **자문 잠금(advisory lock)으로 직렬화** 하는 것입니다.

```go
conn, _ := r.pool.Acquire(ctx)
defer conn.Release()
conn.Exec(ctx, `SELECT pg_advisory_lock(727274)`)          // 한 번에 하나만
defer conn.Exec(context.Background(), `SELECT pg_advisory_unlock(727274)`)
conn.Exec(ctx, ddl)                                        // 안전하게 DDL
```

이 버그는 **라이브로 두 인스턴스를 돌려보지 않았으면 못 잡았을** 것입니다 — 단위 테스트나 단일 인스턴스에선 절대 안 나니까요. 분산 시스템은 "여럿을 동시에" 돌려봐야 진짜 문제가 드러납니다.

## 진짜로 중복이 없는지 — 경쟁하는 두 릴레이

주문 서비스 **두 인스턴스** 를 같은 Postgres·JetStream에 붙여(둘 다 릴레이 가동), 주문 6건을 번갈아 넣습니다.

```text
=== 결과 ===
주문 상태:            SHIPPED | 6
아웃박스(이벤트별):   order.placed    적재 6  발행 6
                     order.paid      적재 6  발행 6
                     order.confirmed 적재 6  발행 6
                     order.shipped   적재 6  발행 6
재고 소비 처리:        6건  (중복 소비 0)
상태 전이 에러:        0건
```

각 이벤트가 **정확히 6번씩** — 주문 수만큼만 — 발행됐습니다. 릴레이가 둘이 경쟁했는데도 **이중 발행이 없습니다.** 재고 서비스도 6건만 처리했고(중복 소비 0), 상태 전이 에러도 없습니다. `SKIP LOCKED`(안 겹치게) + `Nats-Msg-Id`(브로커 dedup) + 소비자 멱등성(최후 방어)이 함께, 다중 replica 아웃박스를 **정확히 한 번** 에 수렴시켰습니다.

## 정직하게 — 방어의 깊이

- **중복 윈도우는 시간 제한** 입니다(우리는 2분). 어떤 이유로 그보다 늦게 재전송된 중복은 발행측 dedup을 빠져나갑니다 — 그래서 **소비자 멱등성** 이 여전히 최후의 방어로 남습니다. 세 겹(SKIP LOCKED → Nats-Msg-Id → 멱등 소비)의 방어 심도(defense in depth)죠.
- **잠금 보유 시간**: 릴레이는 발행하는 동안 행을 잠급니다. 발행이 아주 느리면 잠금이 길어질 수 있으니, 배치 크기(LIMIT 100)로 조절합니다.
- 이 모든 건 **주문 서비스가 Postgres를 쓸 때**(아웃박스 모드)의 이야기입니다. 인메모리 단독 모드는 애초에 replica가 상태를 안 나누니 해당 없습니다.

## 정리 — 여럿이 돌아도 한 번

- **JetStream 발행측 dedup**(Nats-Msg-Id)으로, 같은 이벤트가 두 번 발행돼도 브로커가 하나만 받습니다.
- **FOR UPDATE SKIP LOCKED**로 릴레이가 행을 나눠 잠가, 여러 replica가 **리더 없이** 경쟁하며 겹치지 않게 처리합니다.
- **자문 잠금** 으로 동시 스키마 생성 경합(pg_type 23505)까지 없앴습니다 — 라이브 다중 인스턴스에서만 드러난 버그였죠.
- 세 겹 방어(잠금 → 브로커 dedup → 소비자 멱등)로, 다중 replica 아웃박스가 **정확히 한 번** 에 수렴함을 6건 라이브로 확인했습니다.

이제 주문 서비스는 몇 개로 늘려도 이벤트를 중복 없이 흘려보냅니다. 이벤트 기반 시스템의 발행 경로가 진짜 운영급으로 단단해졌습니다.

> 이번 편 전체 코드는 리포의 `part-17` 태그에 있습니다.
