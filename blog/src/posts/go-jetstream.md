---
title: 영속 스트림 — JetStream과 내구 소비자
date: 2026-08-07
description: 아웃박스로 이벤트가 브로커까지 확실히 나가게 했지만, 브로커 자체(core NATS)는 여전히 무영속입니다. 소비자가 죽어 있는 사이 발행된 이벤트는 그냥 사라지죠. 이 편에서 NATS JetStream으로 컨텍스트별 영속 스트림을 만들고, 내구 소비자(durable consumer)로 각 서비스가 자기 위치를 기억하게 하여, 늦게 붙거나 잠깐 죽어도 놓치지 않는 진짜 at-least-once 전달을 완성합니다. 이벤트 기반 쇼핑몰 고도화 시리즈 5편입니다.
tags: [EDD, JetStream, NATS, Go, 신뢰성]
category: [dev, handson]
draft: false
---

[고도화 4편](/go-outbox-idempotency)에서 트랜잭셔널 아웃박스로 "저장은 됐는데 발행은 안 된" 불일치를 없앴습니다. 이벤트가 **브로커까지** 확실히 나가게 됐죠. 하지만 아직 구멍이 하나 남아 있습니다 — **브로커 그 자체.**

지금까지 써온 core NATS는 **무영속(at-most-once)** 입니다. 이벤트를 발행하는 순간 듣고 있는 구독자가 없으면, 그 이벤트는 **그냥 사라집니다.** 이 시리즈 초반(4편·6편)에 "구독 전에 발행하면 메시지가 유실된다"는 함정을 실제로 만났던 걸 기억하실 겁니다. 아웃박스는 이벤트를 브로커까지 보내지만, 브로커가 그걸 안전하게 붙들고 있으리란 보장은 못 합니다. 이 편에서 **NATS JetStream** 으로 그 마지막 구멍을 메웁니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-13` 태그에 있습니다.

## JetStream — 브로커가 이벤트를 기억한다

JetStream은 NATS에 **영속성** 을 더한 계층입니다. 이벤트를 발행하면 그냥 흘려보내는 게 아니라 **스트림(stream)에 저장** 하고, 소비자는 **자기가 어디까지 읽었는지** 를 브로커가 기억해 줍니다. 그래서:

- 소비자가 **늦게 붙어도** 스트림에 쌓인 이벤트를 처음부터 받습니다.
- 소비자가 **잠깐 죽었다 살아나도** 자기 위치부터 이어서 받습니다(놓치지 않음).
- 처리에 실패하면 **ack 하지 않아** 재전송됩니다(진짜 at-least-once).

우리는 **컨텍스트별 스트림** 으로 갑니다 — 각 bounded context가 자기 subject 대역을 하나의 스트림으로 소유합니다.

```go
var shopStreams = []struct {
	Name     string
	Subjects []string
}{
	{"ORDERING", []string{"ordering.>"}},   // 주문이 내는 모든 이벤트
	{"INVENTORY", []string{"inventory.>"}},  // 재고
	{"PAYMENT", []string{"payment.>"}},      // 결제
	{"SHIPPING", []string{"shipping.>"}},    // 배송
	{"CATALOG", []string{"catalog.>"}},      // 카탈로그
}
```

컨텍스트별로 나누면 스트림의 보존 정책·용량·권한을 컨텍스트마다 따로 관리할 수 있고, 소유권이 명확해집니다. 모든 서비스가 시작할 때 이 스트림들의 존재를 보장하므로(있으면 그대로 둠), 기동 순서와 무관하게 스트림이 준비됩니다.

## 이벤트 버스에 JetStream 얹기 — 포트는 그대로

여기서도 3편에서 만든 포트가 빛납니다. 이벤트 버스의 **겉 인터페이스(`Publish`·`Subscribe`)는 그대로** 두고, 안에서 core냐 JetStream이냐만 갈라줍니다. 상위 서비스 코드는 한 줄도 안 바뀝니다.

**발행** 은 스트림에 저장하는 것으로 바뀝니다.

```go
func (b *Bus) Publish(subject string, env Envelope) error {
	raw, _ := json.Marshal(env)
	if b.js != nil {
		_, err := b.js.Publish(subject, raw) // 스트림에 영속 저장(ack 까지 대기)
		return err
	}
	// core 모드: 그냥 흘려보냄
	b.nc.Publish(subject, raw)
	return b.nc.Flush()
}
```

**구독** 은 **내구 소비자(durable consumer)** 를 만들고, 처리 성공 시 `ack` / 실패 시 `nak`(재전송) 합니다.

```go
func (b *Bus) Subscribe(subject, group string, handler Handler) error {
	if b.js != nil {
		_, err := b.js.QueueSubscribe(subject, group, func(m *nats.Msg) {
			var env Envelope
			_ = json.Unmarshal(m.Data, &env)
			if env.ID == "" { // 아웃박스 ID 가 없으면, 스트림 시퀀스를 멱등 키로
				if meta, err := m.Metadata(); err == nil {
					env.ID = fmt.Sprintf("js-%d", meta.Sequence.Stream)
				}
			}
			if err := handler(env); err != nil {
				_ = m.Nak() // 실패 → 재전송 요청
				return
			}
			_ = m.Ack() // 성공 → "여기까지 처리했다"
		},
			nats.Durable(durableName(group, subject)), // 위치를 기억하는 내구 소비자
			nats.ManualAck(),
		)
		return err
	}
	// core 모드: QueueSubscribe(무영속)
	// ...
}
```

`nats.Durable(...)` 이 핵심입니다. 내구 소비자는 이름으로 식별되고, 브로커가 그 이름별로 "어디까지 ack 됐는지"를 기억합니다. 그래서 소비자 프로세스가 재시작해 같은 이름으로 다시 붙으면, **끊긴 지점부터** 이어받습니다.

켜고 끄는 건 조립 루트에서 환경 변수 하나로 정합니다.

```go
bus, _ := eventbus.Connect(url, eventbus.OptionsFromEnv()...) // NATS_JETSTREAM=1 이면 JetStream
```

## 진짜로 안 잃어버리는지 — 소비자를 죽여 놓고 주문하기

JetStream의 가치를 가장 잘 보여주는 실험을 합니다. **재고 서비스를 아예 띄우지 않은 채** 주문을 넣습니다.

```text
# nats(JetStream) + 카탈로그 + 결제 + 배송 + 주문 은 떠 있고, 재고(inventory)는 꺼져 있다.

$ curl -X POST localhost:8080/orders -H 'X-Correlation-ID: js-001' -d '{...}'
{"order_id":"order_0138cc70…"}

$ curl localhost:8080/orders/order_0138cc70…
"status": "PLACED"     ← 재고가 없어 여기서 멈춰 있다
```

core NATS였다면 이 `order.placed` 이벤트는 **영영 사라졌을** 겁니다(듣는 재고 서비스가 없었으니까). 하지만 JetStream에선 ORDERING 스트림에 **저장돼 기다립니다.** 이제 재고 서비스를 띄우면?

```text
$ (inventory 기동)
# inventory 로그:
"order.placed 처리 완료" correlation_id=js-001 order=order_0138cc70…   ← 밀린 이벤트를 따라잡음!

$ curl localhost:8080/orders/order_0138cc70…
"status": "SHIPPED"    ← 사가가 마저 돌아 배송까지 완주
```

재고 서비스의 내구 소비자가 스트림에 쌓여 있던 `order.placed` 를 **따라잡아** 처리했고, 그 뒤로 결제·확정·배송 사가가 이어져 주문이 **SHIPPED** 까지 갔습니다. 소비자가 죽어 있던 동안 발행된 이벤트가 하나도 유실되지 않았습니다. 이게 초반에 우리를 괴롭혔던 at-most-once 함정의 근본적인 해결입니다.

## ack와 재전송, 그리고 멱등성의 재회

내구 소비자는 처리에 성공해야 `ack` 합니다. 실패하거나 타임아웃이면 브로커가 **다시 보냅니다.** 이 재전송이 진짜 at-least-once를 만들지만 — 당연히 **중복** 을 부릅니다. 여기서 [4편의 멱등성](/go-outbox-idempotency)이 다시, 이번엔 필수로 등장합니다.

중복 제거의 열쇠는 "같은 이벤트엔 같은 ID"입니다. 우리에겐 두 겹의 안전장치가 있습니다.

- 아웃박스로 발행된 주문 이벤트는 **아웃박스 행 ID** 를 답니다(재전송돼도 불변).
- 그 밖의 이벤트는 봉투 ID가 비어 있는데, 이땐 **JetStream 스트림 시퀀스** 를 ID로 채웁니다. 스트림 시퀀스도 재전송 시 그대로라, 멱등 키로 완벽합니다.

```go
if env.ID == "" {
	if meta, err := m.Metadata(); err == nil {
		env.ID = fmt.Sprintf("js-%d", meta.Sequence.Stream)
	}
}
```

그래서 재고 소비자는 같은 `order.placed` 가 재전송돼도 **재고를 한 번만** 깎습니다. **아웃박스(발행 보장) + JetStream(전달 보장) + 멱등성(중복 방어)** 이 세 겹이 겹쳐, 이벤트가 유실되지도 중복으로 망가지지도 않는 파이프라인이 완성됩니다.

## TDD — 사라지지 않음을 테스트로

이 "구독 전에 발행해도 받는다"는 성질을, 임베디드 JetStream 서버로 못 박습니다.

```go
func TestJetStream_구독전에_발행해도_나중에_받는다(t *testing.T) {
	bus, _ := eventbus.Connect(url, eventbus.WithJetStream())

	// 아직 아무도 구독하지 않은 상태에서 먼저 발행(스트림에 저장된다)
	bus.Publish("ordering.order.placed", env)

	// 발행 뒤에 구독을 건다 — core NATS 라면 이미 늦었다
	bus.Subscribe("ordering.order.placed", "test", func(e eventbus.Envelope) error {
		got <- e; return nil
	})

	<-got // JetStream 이면 받는다. 못 받으면 테스트 실패.
}
```

core NATS 시절 이 테스트는 반드시 실패했을 겁니다. JetStream에선 통과합니다 — 그 차이가 곧 영속성의 값어치입니다.

## 운영에서 기억할 것

- JetStream 스트림은 데이터를 디스크에 씁니다. 그래서 쿠버네티스에선 NATS를 **StatefulSet + PVC** 로 두어, 파드가 재시작해도 스트림이 살아남게 합니다.
- 내구 소비자 이름은 **안정적** 이어야 합니다 — 이름이 바뀌면 브로커가 다른 소비자로 여겨 위치 기억을 잃습니다. 우리는 (그룹, subject)에서 결정적으로 이름을 만듭니다.
- JetStream엔 발행 측 중복 제거(`Nats-Msg-Id` + 중복 윈도우)도 있어, 아웃박스 릴레이가 같은 이벤트를 두 번 보내도 브로커가 걸러주게 할 수 있습니다. 소비자 멱등성과 함께 쓰면 방어가 더 두터워집니다.

## 정리 — 유실 없는 파이프라인

- **JetStream 영속 스트림** 으로, 소비자가 죽어 있는 동안 발행된 이벤트도 잃지 않게 했습니다.
- **컨텍스트별 스트림** 으로 소유권과 정책을 컨텍스트마다 분리했습니다.
- **내구 소비자 + ack** 로, 재시작해도 이어받고 실패하면 재전송되는 진짜 at-least-once를 얻었습니다.
- 재전송이 부르는 중복은 **아웃박스 ID·스트림 시퀀스 기반 멱등성** 으로 흡수했습니다.
- 이 모든 걸 이벤트 버스 **포트 뒤에서** 처리해, 상위 서비스 코드는 그대로 두고 환경 변수 하나로 켰습니다.

이제 이벤트가 원자적으로 발행되고(아웃박스), 유실 없이 전달되며(JetStream), 중복에도 견딥니다(멱등성). 이벤트 기반 시스템의 신뢰성 삼각형이 완성됐습니다. 다음 편에서는 사용자를 다시 도메인의 주인공으로 데려옵니다 — **회원과 장바구니** 를 붙여, 지금은 곧바로 주문부터 시작하는 흐름 앞에 "담고 → 확인하고 → 주문하는" 진짜 쇼핑 경험을 얹습니다.

> 이번 편 전체 코드는 리포의 `part-13` 태그에 있습니다.
