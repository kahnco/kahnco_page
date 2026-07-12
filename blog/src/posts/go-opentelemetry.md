---
title: 분산추적 — OpenTelemetry로 흐름을 눈으로 보다
date: 2025-09-14
description: 8편에서 상관 ID로 로그를 이었지만, 그건 흩어진 로그를 손으로 꿰는 일이었습니다. OpenTelemetry 분산추적으로 이를 정식화합니다 — trace/span을 만들고 W3C traceparent를 HTTP와 이벤트 경계 모두로 전파해, 하나의 주문이 여러 서비스를 지나는 전체 흐름을 Jaeger에서 한눈에 봅니다. 특히 비동기 이벤트 경계를 넘는 추적이 핵심입니다. 이벤트 기반 쇼핑몰 고도화 시리즈 8편입니다.
tags: [OpenTelemetry, 관찰성, EDD, Go, Jaeger]
category: [dev, handson]
draft: false
---

기본 시리즈 [8편](/go-cicd-observability)에서 **상관 ID(correlation ID)** 로 주문 하나의 로그를 여러 서비스에 걸쳐 이었습니다. 그때 "분산 추적의 축소판"이라고 했었죠. 하지만 그건 결국 **흩어진 로그를 같은 ID로 grep해 손으로 재구성** 하는 일입니다. 어떤 span이 어떤 span의 자식인지, 각 단계가 얼마나 걸렸는지, 어디서 느려졌는지는 로그만으론 보이지 않습니다.

이번 편에서 그 "축소판"을 **본격판** 으로 끌어올립니다 — **OpenTelemetry** 분산추적으로 trace와 span을 만들고, 이를 **HTTP와 이벤트 경계 모두** 로 전파해, 주문 하나의 여정을 **Jaeger에서 그림으로** 봅니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-16` 태그에 있습니다.

## trace와 span — 인과와 시간을 담다

분산추적의 모델은 단순합니다.

- **span** — 하나의 작업 단위(HTTP 요청 처리, 이벤트 소비 등). 이름·시작/끝 시각·서비스·부모를 가집니다.
- **trace** — 하나의 요청에서 비롯된 span들의 **트리**. 부모-자식으로 이어져 전체 흐름을 이룹니다.

상관 ID가 "같은 꼬리표"만 줬다면, trace는 **인과(누가 누구를 유발했나)와 시간(각 단계가 얼마나)** 까지 담습니다. 이 trace 컨텍스트를 서비스 경계 너머로 실어 나르는 표준이 **W3C traceparent** 입니다.

우리 시스템엔 넘어야 할 경계가 둘입니다 — **HTTP(동기)** 와 **이벤트(비동기)**. 둘 다 넘어야 진짜 그림이 나옵니다.

## HTTP 경계 — otelhttp

동기 경계는 쉽습니다. 표준 계측 라이브러리 `otelhttp` 가 서버는 들어온 traceparent를 추출해 span을 열고, 클라이언트는 나가는 요청에 traceparent를 주입합니다. 우리 서비스는 이미 있는 HTTP 핸들러를 감싸기만 하면 됩니다.

```go
// 서버: 들어온 trace 를 잇고 서버 span 을 연다
handler := telemetry.WrapHTTP(telemetry.Middleware(logger, mux), "cart")

// 클라이언트: 나가는 요청에 traceparent 를 주입(전역 트랜스포트 계측)
http.DefaultTransport = otelhttp.NewTransport(http.DefaultTransport)
```

이것만으로 6편에서 만든 장바구니의 동기 호출 — cart → customer(회원 확인), cart → ordering(주문 생성) — 이 하나의 trace로 이어집니다.

## 이벤트 경계 — 진짜 어려운 쪽

문제는 **비동기 이벤트** 입니다. 주문이 `order.placed` 를 발행하고, 한참 뒤 재고 서비스가 그걸 소비합니다. 둘은 **다른 프로세스, 다른 시간, 직접 호출 없음** 이죠. 상관 ID로는 "같은 주문"이라는 것만 알았지, 재고의 처리가 주문의 발행에서 **비롯됐다는 인과** 는 담지 못했습니다.

OpenTelemetry는 이걸 우아하게 풉니다 — trace 컨텍스트를 **이벤트 봉투에 실어** 보내고, 받는 쪽이 그걸 꺼내 **자식 span** 을 엽니다. 4편에서 만든 봉투의 `Meta` 가 마침 그 운반 수단입니다.

발행할 때, 현재 trace 컨텍스트(traceparent)를 메타에 주입합니다.

```go
// 발행 어댑터: 상관 ID + W3C traceparent 를 봉투 메타에 담는다
func MetaFromContext(ctx context.Context) map[string]string {
	m := map[string]string{}
	if cid := CorrelationID(ctx); cid != "" {
		m[MetaCorrelationID] = cid
	}
	otel.GetTextMapPropagator().Inject(ctx, propagation.MapCarrier(m)) // traceparent 주입
	return m
}
```

소비할 때, 메타에서 trace 컨텍스트를 꺼내 복원하고 자식 span을 엽니다.

```go
// 소비 어댑터: 메타에서 trace 를 이어받아 span 을 연다
func (c *OrderPlacedConsumer) Handle(env eventbus.Envelope) error {
	ctx := telemetry.ContextFromMeta(context.Background(), env.Meta) // traceparent 추출
	ctx, span := telemetry.StartSpan(ctx, "consume "+env.Name)
	defer span.End()
	// ... 재고 예약 ...
}
```

이제 재고의 `consume order.placed` span은 주문의 `order.placed` 발행 span의 **자식** 이 됩니다. **비동기 경계를 trace가 건너간** 겁니다 — 상관 ID로는 못 하던 일이죠.

## 아웃박스의 주름 — 나중에 발행되는 이벤트

한 가지 까다로운 지점이 있습니다. 주문 서비스는 이벤트를 **아웃박스에 저장** 하고, 실제 발행은 한참 뒤 **릴레이** 가 합니다(4편). 릴레이가 도는 시점엔 원래 요청의 **살아 있는 trace 컨텍스트가 없습니다.** 그냥 두면 아웃박스로 나간 `order.placed` 는 trace가 끊깁니다.

해법은 **저장할 때 traceparent도 함께 적재** 하는 것입니다. 아웃박스 행에 traceparent를 저장해 두면, 릴레이가 그걸 다시 봉투에 실어 발행합니다.

```go
// 저장: 그 순간의 trace 컨텍스트를 아웃박스 행에 함께 넣는다
tp := telemetry.TraceparentFromContext(ctx)
tx.Exec(ctx, `INSERT INTO outbox (subject, event_name, payload, correlation_id, traceparent)
              VALUES ($1,$2,$3,$4,$5)`, subject, name, payload, cid, tp)
```

```go
// 릴레이: 저장해 둔 traceparent 를 봉투에 되살려 소비자에게 잇는다
if m.Traceparent != "" { meta["traceparent"] = m.Traceparent }
```

이렇게 **아웃박스를 거쳐도** trace가 끊기지 않습니다. 저장·발행을 원자화한 4편의 아웃박스가, 이번엔 trace 컨텍스트까지 실어 나릅니다.

## 켜고 끄기 — 공짜가 아니면 끈다

이 모든 걸 조립 루트에서 켭니다. `OTEL_EXPORTER_OTLP_ENDPOINT` 가 있으면 Jaeger로 span을 내보내고, 없으면 **내보내진 않되 trace/span ID는 여전히 흐릅니다**(끄면 사실상 공짜).

```go
shutdown, _ := telemetry.InitTracer(context.Background(), "ordering")
defer shutdown(context.Background())
```

그리고 늘 그렇듯, 이 계측은 전부 **telemetry 패키지와 봉투 메타 뒤** 에 있습니다. 도메인도, 유스케이스도 추적을 **한 줄도 몰랐습니다.** 관찰성조차 어댑터로 밀어낸 셈이죠.

## 하나의 결제, 하나의 그림

Jaeger를 띄우고, 6편의 결제 흐름(가입 → 담기 → checkout)을 한 번 실행한 뒤, 그 trace를 조회합니다.

```text
$ curl 'http://localhost:16686/api/traces?service=cart&limit=1'

trace ID: 607f471288bf9401
총 span 수: 14
걸친 서비스 (7개): cart, customer, inventory, ordering, payment, readmodel, shipping

  [cart]      HTTP GET(→customer), HTTP POST(→ordering), POST /checkout
  [customer]  GET /customers/{id}
  [ordering]  POST /orders, consume payment.completed, consume shipping.dispatched
  [inventory] consume order.placed
  [payment]   consume stock.reserved
  [shipping]  consume order.confirmed
  [readmodel] project order.placed / paid / confirmed / shipped
```

결제 요청 **하나** 가, **일곱 개 서비스** 를 지나며 남긴 **열네 개 span** 이 **하나의 trace** 로 묶였습니다. 동기 경계(cart→customer, cart→ordering)와 비동기 경계(order.placed→inventory, stock.reserved→payment, order.confirmed→shipping, order.*→readmodel)를 **모두 건너서** 요. Jaeger UI에서 이걸 열면, 주문 하나가 시스템을 어떻게 흐르는지, 각 단계가 얼마나 걸리는지가 **폭포수 그림** 으로 펼쳐집니다.

이게 상관 ID로는 결코 못 보던 것입니다 — 로그는 "무엇이 일어났나"를 흩어진 문장으로 주지만, trace는 **"어떻게 이어졌나"를 하나의 그림** 으로 줍니다.

## 정직하게 — 운영에서의 트레이드오프

- **샘플링**: 운영에선 모든 요청을 100% 추적하면 비용이 큽니다. 보통 확률적(예: 10%) 혹은 꼬리 기반(tail) 샘플링으로 줄입니다. 우리는 데모라 전량 내보냈습니다.
- **span은 신중히**: span이 너무 잘면 노이즈가, 너무 굵으면 통찰이 사라집니다. 의미 있는 경계(요청·이벤트 소비·외부 호출)에 둡니다.
- **로그·메트릭과 함께**: trace는 삼각형의 한 축입니다. 우리는 이미 구조적 로그(상관 ID)와 메트릭(Prometheus)이 있으니, 셋을 같은 trace/correlation ID로 엮으면 "느린 요청 → 그 trace → 그 로그"로 바로 파고들 수 있습니다.
- **한 서비스라도 설정을 빠뜨리면 trace에 구멍이 뚫립니다**: 이건 실제로 겪은 일입니다. 쿠버네티스에 배포해 trace를 열어 보니, **장바구니(cart)만 span이 통째로 사라져** 있었습니다. 원인은 cart 매니페스트만 `OTEL_EXPORTER_OTLP_ENDPOINT`(공용 ConfigMap)를 주입받지 못한 것 — 그래서 cart의 트레이서는 "내보내기 없음" 모드로 돌았습니다. 재미있는 건, cart가 traceparent를 **전파는** 계속 했다는 겁니다(내보내기와 전파는 별개니까요). 그래서 하류 서비스들은 같은 trace ID로 멀쩡히 기록됐고, 오직 **cart의 조각만** 그림에서 빠졌죠. 분산추적은 참여하는 **모든** 서비스가 계측 설정을 받아야 완성됩니다 — 하나라도 빠지면 그 서비스만큼 그림에 구멍이 남습니다. 설정을 코드가 아니라 **배포(ConfigMap)로 주입** 할 때 특히 이런 누락이 쉽게 생기니, "모든 서비스가 같은 관찰성 설정을 받는가"를 꼭 확인해야 합니다.

## 정리 — 흐름이 보인다

- **OpenTelemetry** 로 trace/span을 만들고, W3C traceparent를 **HTTP와 이벤트 경계 모두** 로 전파했습니다.
- 특히 **비동기 이벤트 경계** 를 봉투 메타로 건너, 상관 ID로는 못 담던 **인과와 시간** 을 담았습니다.
- **아웃박스에 traceparent를 저장** 해, 나중에 릴레이가 발행해도 trace가 끊기지 않게 했습니다.
- 결제 요청 하나가 **7개 서비스·14 span의 한 trace** 로 Jaeger에 그려짐을 확인했습니다.
- 이 모든 계측은 **telemetry 어댑터 뒤** 에 있어, 도메인·유스케이스는 그대로였습니다.

기본 시리즈 8편의 상관 ID가 "가난한 자의 추적"이었다면, 이번 편은 그 정식판입니다. 이제 우리 이벤트 기반 쇼핑몰은 유실 없이 흐르고(아웃박스·JetStream), 중복을 견디고(멱등성), 조회에 최적화되고(CQRS), 손님을 맞고(회원·장바구니), 그 모든 흐름을 **눈으로 볼 수 있는**(분산추적) 시스템이 됐습니다.

> 이번 편 전체 코드는 리포의 `part-16` 태그에 있습니다.
