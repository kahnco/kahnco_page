---
title: CI/CD와 관찰성 — 자동화하고, 꿰뚫어 보기 (완결)
date: 2026-07-23
description: 시리즈의 마지막 편입니다. 지금까지 시스템은 돌고, 확장되고, 상태를 지키게 됐지만 배포는 수작업이고 무슨 일이 일어나는지 들여다볼 눈이 없었습니다. 관찰성으로 상관 ID를 이벤트에 실어 주문 하나를 여러 서비스에 걸쳐 추적하고 Prometheus 메트릭을 노출하며, GitHub Actions로 빌드·테스트·이미지까지 파이프라인을 세웁니다. 그리고 8편에 걸친 여정을 관통한 하나의 원칙을 돌아봅니다. 이벤트 기반 쇼핑몰 시리즈 완결편입니다.
tags: [DevOps, 관찰성, CICD, Go, Observability]
category: [dev, handson]
draft: false
---

[7편](/go-state-config-scaling)까지 오면서 시스템은 제법 어른스러워졌습니다. 상태를 안전하게 보관하고, 건강을 스스로 알리고, 부하에 맞춰 몸집을 바꿉니다. 그런데 두 가지가 여전히 원시적입니다. 배포는 제 손으로 `docker build` 하고 `kubectl apply` 하는 **수작업** 이고, 무언가 잘못됐을 때 시스템 안에서 무슨 일이 벌어지는지 **들여다볼 눈** 이 없습니다. 마지막 편에서 이 둘을 채웁니다 — **관찰성(observability)** 으로 안을 꿰뚫어 보고, **CI/CD** 로 커밋에서 이미지까지를 자동화합니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-8` 태그에 있습니다.

## EDD의 관찰성 난제 — 흩어진 흐름을 어떻게 잇나

관찰성의 세 기둥은 **로그·메트릭·추적** 입니다. 우리는 이미 `log/slog` 로 구조적 로그를 남기고 있죠. 그런데 EDD에는 특유의 어려움이 있습니다. 하나의 주문 요청이 **여러 서비스에 흩어져 비동기로** 처리됩니다 — 주문 서비스가 받고, NATS를 건너, 재고 서비스가 뒤늦게 처리하죠. 무언가 잘못됐을 때, 이 흩어진 조각들이 **같은 주문** 에 속한다는 걸 어떻게 알아볼까요?

답은 **상관 ID(correlation ID)** 입니다. 요청이 처음 들어올 때 꼬리표를 하나 붙이고, 그 요청에서 비롯된 모든 로그와 이벤트에 같은 꼬리표를 달고 다니는 겁니다.

### 요청 입구에서 꼬리표 붙이기

HTTP 미들웨어가 들어오는 요청마다 상관 ID를 확보합니다 — 헤더에 있으면 잇고, 없으면 새로 만들어 컨텍스트에 심습니다.

```go
func Middleware(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cid := r.Header.Get(HeaderCorrelationID)
		if cid == "" {
			cid = NewID()
		}
		w.Header().Set(HeaderCorrelationID, cid)
		ctx := WithCorrelationID(r.Context(), cid) // ctx 에 심는다

		rec := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(rec, r.WithContext(ctx))

		httpRequests.WithLabelValues(r.Method, req.Pattern, http.StatusText(rec.status)).Inc()
		logger.Info("http request", "status", rec.status, "correlation_id", cid, ...)
	})
}
```

### 이벤트에 꼬리표를 실어 보내기

핵심은 여기입니다. 상관 ID가 컨텍스트에 있으니, 그 컨텍스트로 발행되는 이벤트에도 실을 수 있습니다. 4편에서 만든 이벤트 봉투에 `Meta` 칸을 하나 더해, 도메인과 무관한 이런 횡단 관심사를 담습니다.

```go
type Envelope struct {
	Name string            `json:"name"`
	Data json.RawMessage   `json:"data"`
	Meta map[string]string `json:"meta,omitempty"` // ← 상관 ID 등
}
```

```go
// NATS 발행 어댑터: 컨텍스트의 상관 ID 를 이벤트 봉투에 실는다.
func (p *NatsEventPublisher) Publish(ctx context.Context, events ...domain.DomainEvent) error {
	for _, e := range events {
		env, _ := eventbus.NewEnvelope(e.EventName(), e)
		if cid := telemetry.CorrelationID(ctx); cid != "" {
			env.Meta = map[string]string{telemetry.MetaCorrelationID: cid}
		}
		p.bus.Publish(subject, env)
	}
}
```

받는 쪽 재고 서비스는 봉투에서 상관 ID를 **이어받아**, 그 ID로 로그를 남깁니다.

```go
func (c *OrderPlacedConsumer) Handle(env eventbus.Envelope) error {
	cid := env.Meta[telemetry.MetaCorrelationID]
	log := c.log.With("correlation_id", cid) // 같은 ID 로 로그
	// ...
	log.Info("order.placed 처리 완료", "order", p.OrderID)
}
```

### 하나의 주문을 두 서비스에서 같은 눈으로

이제 상관 ID를 지정해 주문을 넣고, 두 서비스의 로그를 봅니다.

```text
$ curl -X POST localhost:8080/orders -H 'X-Correlation-ID: trace-abc-999' -d '{...}'

# ordering 로그
msg="http request" method=POST path=/orders status=201 correlation_id=trace-abc-999

# inventory 로그 (다른 서비스, 다른 파드!)
msg="order.placed 처리 완료" correlation_id=trace-abc-999 order=order_0eadb54d…
```

**같은 `trace-abc-999`** 가 주문 서비스와 재고 서비스 양쪽에 찍혔습니다. 로그를 이 ID로 모으면, 흩어져 비동기로 처리된 하나의 주문 흐름을 한눈에 꿰어 볼 수 있습니다. 이게 **분산 추적(distributed tracing)의 축소판** 입니다. 본격적으로 가려면 OpenTelemetry로 trace·span을 전파하고 Jaeger 같은 도구로 시각화하지만, 원리는 방금 본 것 그대로 — **하나의 ID를 경계 너머로 실어 나르는 것** 입니다.

## 메트릭 — 숫자로 보는 시스템

로그가 "무슨 일이 있었나"라면, 메트릭은 "지금 얼마나·어떤 속도로"입니다. Prometheus 형식으로 `/metrics` 를 노출하고, HTTP 요청과 이벤트를 계측합니다.

```go
var httpRequests = promauto.NewCounterVec(prometheus.CounterOpts{
	Name: "http_requests_total",
}, []string{"method", "path", "status"})

var eventsConsumed = promauto.NewCounterVec(prometheus.CounterOpts{
	Name: "events_consumed_total",
}, []string{"event", "result"})
```

```text
$ curl localhost:8080/metrics
http_requests_total{method="POST",path="POST /orders",status="Created"} 1
http_requests_total{method="GET",path="GET /orders/{id}",status="Not Found"} 1
events_published_total{event="order.placed"} 1

# inventory
events_consumed_total{event="order.placed",result="ok"} 1
```

여기 **함정** 이 하나 숨어 있습니다. `path` 라벨에 실제 URL(`/orders/order_0eadb54d…`)을 쓰면, 주문 ID마다 새 라벨이 생겨 메트릭이 폭발합니다(카디널리티 폭증). 그래서 URL 경로 대신 **매칭된 라우트 패턴**(`GET /orders/{id}`)을 라벨로 씁니다. Go 1.22+ ServeMux가 `req.Pattern` 으로 이 패턴을 알려주니 딱 맞습니다.

쿠버네티스에서는 파드에 애노테이션을 달아, 프로메테우스가 이 `/metrics` 를 긁어가게 합니다. 재고 서비스도 비즈니스 입구는 이벤트뿐이지만, 관찰성과 probe를 위해 최소한의 HTTP 서버(`/healthz`·`/metrics`)를 엽니다.

```yaml
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
```

## CI/CD — 커밋에서 이미지까지 자동으로

지금까지 배포는 매번 손으로 빌드하고 적용하는 수작업이었습니다. 사람 손은 실수하고, 잊고, 느립니다. 이걸 파이프라인으로 자동화합니다.

**CI(지속적 통합)** — main에 푸시하거나 PR을 열 때마다, 포맷·정적검사·테스트·이미지 빌드를 자동으로 돌립니다.

```yaml
# .github/workflows/ci.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: "1.26" }
      - run: gofmt -l .            # 포맷 검사
      - run: go vet ./...          # 정적 검사
      - run: go test -race ./...   # 러너에 도커가 있어 testcontainers·임베디드 NATS 까지 그대로 돈다
  images:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build --build-arg SERVICE=ordering  -t ordering:ci  .
      - run: docker build --build-arg SERVICE=inventory -t inventory:ci .
```

여기서 이 시리즈 내내 쌓아온 **테스트가 진가를 발휘** 합니다. 도메인 규칙(2편), 유스케이스(3편), 이벤트 흐름(4편), Postgres 저장소(7편)까지 — 이 모든 테스트가 매 커밋마다 자동으로 검증됩니다. TDD로 쌓은 안전망이 있어서, 자동 배포가 **겁나지 않게** 되는 거죠. 자동화는 테스트 위에서만 안전합니다.

**CD(지속적 배포)** — 태그를 밀면 이미지를 빌드해 레지스트리(GHCR)에 올립니다.

```yaml
# .github/workflows/release.yml — part-N 태그 시 GHCR 로 푸시
    steps:
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v6
        with:
          build-args: SERVICE=${{ matrix.service }}
          push: true
          tags: ghcr.io/kahnco/go-ddd-shop/${{ matrix.service }}:${{ github.ref_name }}
```

여기서 한 걸음 더 가면 **GitOps** 입니다 — 올린 이미지 태그를 배포 매니페스트 리포에 커밋하면, Argo CD 같은 도구가 그 변화를 감지해 클러스터를 **선언한 상태로 스스로 맞춥니다.** "배포 = 매니페스트를 git에 커밋" 이 되는 거죠.

> 🔧 참고로 이 튜토리얼 리포에서는 두 워크플로우를 **수동 실행(`workflow_dispatch`)** 으로 뒀습니다. 학습용 저장소라 커밋마다 파이프라인이 실제로 도는 걸 피하려는 것뿐입니다(공개 리포는 Actions가 무료입니다). 실제 프로젝트라면 주석 처리된 `push`·`tags` 트리거를 켜서 자동으로 돌립니다.

## 여덟 편을 관통한 하나의 원칙

여기까지, 빈 폴더에서 시작해 이벤트로 협력하고 쿠버네티스에서 자동 확장되며 스스로를 관찰하는 시스템까지 왔습니다. 지나온 길을 돌아봅니다.

1. **DDD 설계** — 이벤트 스토밍으로 도메인을 탐색하고 bounded context를 그렸습니다.
2. **TDD 도메인** — 규칙을 테스트로 먼저 못 박고 애그리거트를 쌓았습니다.
3. **유스케이스·API** — 도메인 바깥에 얇은 껍질을 씌워 도는 서비스를 만들었습니다.
4. **EDD** — 이벤트로 컨텍스트를 잇고 결과적 일관성을 받아들였습니다.
5. **컨테이너** — 작고 안전한 이미지로 담았습니다.
6. **쿠버네티스** — 클러스터에 올리고 상태의 한계를 마주했습니다.
7. **상태·스케일링** — 상태를 파드 밖으로 빼고 자동 확장을 붙였습니다.
8. **CI/CD·관찰성** — 자동화하고 안을 꿰뚫어 봤습니다.

이 여정을 관통한 원칙이 하나 있습니다. **도메인을 순수하게, 바깥을 어댑터로.** 저장소는 인메모리에서 Postgres로, 이벤트 발행은 로그에서 NATS로, 실행은 `go run` 에서 쿠버네티스로 바뀌었지만 — 그때마다 **도메인과 유스케이스 코드는 거의 한 줄도 바뀌지 않았습니다.** 규칙을 안쪽에 가두고 기술을 바깥 어댑터로 밀어낸 덕입니다. 포트와 어댑터, 그리고 그걸 지켜준 테스트가 이 모든 변화를 감당했습니다.

DDD는 "무엇이 규칙인가"를, EDD는 "어떻게 협력하는가"를, TDD는 "어떻게 안전하게 바꾸는가"를 답했습니다. 이 셋이 만나면, 복잡한 시스템도 **겁내지 않고 계속 진화시킬 수 있는** 것이 됩니다. 그게 이 여덟 편이 진짜로 전하고 싶었던 이야기입니다.

긴 시리즈를 끝까지 따라와 주셔서 감사합니다. 전체 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 에 `part-1` 부터 `part-8` 까지 편별 태그로 남아 있으니, 원하는 지점부터 언제든 직접 돌려보시길 바랍니다.

> 이번 편 전체 코드는 리포의 `part-8` 태그에 있습니다.
