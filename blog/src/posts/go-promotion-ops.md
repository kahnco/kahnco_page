---
title: 돌려놓고 보이게 — 이벤트 메트릭·k8s 배포·부하 게이트 CI
date: 2025-12-18
description: 24~27편에서 "정확히 N번째"를 정확·견고·분산·다중 인스턴스로 만들었습니다. 이제 운영으로 넘깁니다 — 이벤트가 잘 돌아가는지 메트릭·대시보드로 보이게 하고, 여러 대를 쿠버네티스에 배포하고, 성능 회귀를 CI 부하 게이트로 자동으로 막습니다. 기술 지표(RED)만으론 "이벤트가 잘 되고 있나"를 못 봅니다. 응모율·현재 순번·처리 지연·당첨·종료를 비즈니스 메트릭으로 노출하고, promotion을 replicas 2로 올리고, 부하 테스트에 p99·오류 임계값을 걸어 넘으면 빌드를 깨뜨립니다. 이벤트 기반 쇼핑몰 고도화 28편입니다.
tags: [관측성, Prometheus, Grafana, Kubernetes, CI, Go]
category: [dev, handson]
draft: false
---

[24편](/blog/go-exact-nth-winner)부터 네 편에 걸쳐 "정확히 1000번째 당첨"을 만들었습니다 — 정확성(빈틈없는 카운터), 견고함(아웃박스·큐·레이트리밋), 분산(Redis·SSE), 다중 인스턴스(내구 접수·팬아웃·분산락)까지. 코드는 다 됐습니다. 그런데 **"돌려놓고 나면"** 세 가지가 더 필요합니다.

1. **보여야 합니다** — 이벤트가 지금 잘 돌아가는지, 순번이 어디까지 갔는지, 당첨은 났는지.
2. **여러 대로 떠야 합니다** — 지금까지 만든 분산 장치들이 실제 쿠버네티스에서 값을 합니다.
3. **회귀를 막아야 합니다** — 오늘 빠른 접수가 다음 커밋에 느려지지 않게, 자동으로.

이번 편은 이 셋 — **관측·배포·게이트** 를 채웁니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-35` 태그에 있습니다.

## 1. 이벤트가 보이게 — 비즈니스 메트릭과 대시보드

[16편](/blog/go-metrics-slo)에서 RED(Rate·Errors·Duration)와 SLO를 붙였습니다. 그런데 그건 **기술 지표** 입니다 — "HTTP가 몇 개 오갔나"는 보여도, **"이벤트가 잘 되고 있나"** 는 안 보입니다. 순번이 target에 얼마나 가까운지, 당첨이 났는지, 레이트리밋이 얼마나 거절하는지는 **비즈니스 메트릭** 으로 따로 노출해야 합니다.

promotion 지표를 다섯 개 얹었습니다.

```go
promotion_entries_total{event, result}      // 응모 수 — assigned / already / rejected
promotion_winners_total{event}              // 당첨 확정 수
promotion_current_seq{event}                // 지금까지 배정된 최대 순번(target 에 얼마나 가까운가)
promotion_entry_duration_seconds            // 응모 처리 시간(히스토그램) — 카운터 경합
promotion_events_closed_total{event}        // 종료된 이벤트 수
```

**어디서 기록하느냐** 가 중요합니다. 동기 모드는 HTTP 핸들러가, 큐 모드는 소비자가 응모를 처리하지만 — 둘 다 결국 `Service.Enter` 를 부릅니다. 그래서 **그 한 곳** 에서 기록하면 두 경로가 모두 잡힙니다(주문에서 `RecordOrderPlaced` 를 유스케이스에 둔 것과 같은 자리).

```go
func (s *Service) Enter(ctx, eventID, userID string) (Result, error) {
    t0 := time.Now()
    res, err := s.repo.Enter(ctx, eventID, userID, s.clock())
    result := "assigned"
    if err != nil { result = "rejected" } else if res.Already { result = "already" }
    telemetry.RecordPromotionEntry(eventID, result, res.Seq, time.Since(t0).Seconds())
    if err == nil && res.Winner && !res.Already { telemetry.RecordPromotionWinner(eventID) }
    return res, err
}
```

그리고 RED를 얻으려면 HTTP를 **telemetry 미들웨어로 감싸야** 합니다 — 이게 `http_requests_total` 과 지연을 올리고, 상관 ID·접근 로그까지 붙입니다. promotion 서비스는 이걸 빠뜨리고 있었는데, 이제 mux를 감쌌습니다.

```go
handler := telemetry.Middleware(logger, mux) // RED · 접근 로그 · 상관 ID
http.ListenAndServe(addr, handler)
```

마지막으로 **Grafana 대시보드** 를 하나 더 프로비저닝했습니다(기존 shop 대시보드 ConfigMap에 `promotion.json` 을 키로 추가하면, 프로비저너가 파일 하나로 인식해 자동으로 뜹니다 — Deployment는 안 건드립니다). 패널은 응모율(결과별), **현재 순번(target에 다가가는 곡선)**, 처리 지연 p50/p95/p99, 레이트리밋 429/s, 당첨·종료 스탯입니다. 순번 곡선이 1000에 닿는 순간 당첨 스탯이 1로 튀는 걸 **눈으로** 봅니다.

## 2. 여러 대로 뜨게 — 쿠버네티스 배포

26·27편에서 "여러 대"를 대비해 상태를 전부 밖으로 뺐습니다 — 순번은 Postgres, 레이트리밋·분산락은 Redis, 통지는 NATS. 그 덕에 promotion 배포는 이제 **replicas: 2** 로 그냥 올려도 됩니다.

```yaml
# deploy/k8s/promotion.yaml
spec:
  replicas: 2 # 상태는 Postgres/Redis/NATS 로 공유하므로 안전
  template:
    metadata:
      annotations:                       # 프로메테우스가 자동 발견
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: promotion
          env:
            - { name: INGEST, value: "queue" }       # 202 접수 → 순차 배정 → SSE 팬아웃
            - { name: EVENT_TARGET, value: "1000" }
          envFrom:
            - configMapRef: { name: shop-config }     # NATS_URL, REDIS_URL, …
            - secretRef:    { name: ordering-secret } # DATABASE_URL(같은 Postgres 공유)
```

**두 대가 안전한 이유** 를 한 줄로 정리하면 — 순번은 두 대가 같은 카운터 행을 `FOR UPDATE` 로 다투니 빈틈이 없고, 레이트리밋은 같은 Redis 버킷을 보니 한도가 안 뚫리고, SSE는 NATS 팬아웃으로 어느 대에 붙었든 닿고, 종료 배치는 분산락으로 한 대만 돕니다. **24~27편이 여기서 값을 합니다.** Redis도 매니페스트로 함께 올리고(`redis.yaml`), `REDIS_URL` 을 공용 ConfigMap에 넣었습니다.

프로메테우스는 파드의 `prometheus.io/scrape` 애너테이션을 보고 `/metrics` 를 자동으로 긁습니다 — 그래서 배포만 하면 위의 대시보드가 **바로 채워집니다.** 별도 스크레이프 설정이 필요 없습니다.

## 3. 회귀를 막게 — 부하 게이트 CI

26편에서 부하를 재 큐 완충이 접수 p99를 130ms→7ms로 줄이는 걸 확인했습니다. 그런데 **성능은 한 번 재고 잊으면 조용히 되돌아갑니다.** 누군가 트랜잭션 안에 외부 호출을 하나 넣으면 카운터 경합이 늘고, p99가 슬금슬금 오르죠. 이걸 **사람이 눈치채기 전에** CI가 잡게 합니다.

부하 도구에 **임계값 게이트** 를 넣었습니다.

```go
if bad > *maxErr        { fmt.Printf("FAIL: 오류/5xx %d개\n", bad); failed = true }
if p99 > *maxP99        { fmt.Printf("FAIL: p99 %dms > 상한\n", p99); failed = true }
if failed { os.Exit(1) }
```

그리고 CI에 잡(job)을 하나 더 뒀습니다. NATS·Postgres를 띄우고, promotion을 **동기 모드**(실제 순번 배정 경로 = Postgres 행 잠금)로 올린 뒤, 부하를 걸어 **p99·오류가 임계값을 넘으면 빌드를 깨뜨립니다.**

```yaml
- name: 부하 테스트(p99·오류 게이트)
  run: |
    go run ./cmd/promotion-loadtest -url http://localhost:8080 -event ci \
      -c 50 -n 3000 -max-p99-ms 800 -max-err 0
```

로컬에서 확인해 보면 — 관대한 임계(800ms)엔 `PASS`(exit 0), 일부러 엄격하게(1ms) 걸면 `FAIL: p99 10ms > 상한 1ms`(exit 1)로 빌드가 깹니다. 이제 성능 회귀가 **머지 전에** 걸립니다. 정확성 회귀를 `-race`·testcontainers가 막듯, 성능 회귀는 이 게이트가 막습니다.

## 정직하게 — 관측·배포·게이트의 함정

- **메트릭 라벨은 카디널리티** 입니다. `event` 를 라벨로 뒀는데, 이벤트가 수천 개가 되면 시계열이 폭증합니다. 상시 소수의 이벤트를 가정한 선택이고, 대규모라면 라벨을 줄이거나 집계 후 노출해야 합니다(주문에서 주문 ID를 라벨로 안 쓴 것과 같은 이유).
- **대시보드는 관측이지 알림이 아닙니다.** 눈으로 보는 것과, 문제가 생겼을 때 깨우는 건 다릅니다 — 실제로는 여기에 Alertmanager 규칙(예: "종료됐는데 응모가 계속 들어옴")을 얹어야 합니다.
- **CI 부하 숫자는 러너 환경 편차** 가 큽니다. 그래서 임계값은 **넉넉하게(800ms)** 잡아 "명백한 회귀"만 잡습니다. 절대 성능 측정이 아니라 **회귀 감지** 가 목적입니다. 더 엄밀히 하려면 전용 러너에서 기준선 대비(baseline diff)로 봐야 합니다.
- **이 k8s는 데모** 입니다 — Secret이 평문이고, Redis는 무영속 단일 인스턴스입니다. 실서비스라면 External Secrets·Redis HA·리소스 튜닝이 붙습니다.

## 정리 — 만드는 것과 운영하는 것

- **비즈니스 메트릭**(응모율·순번·당첨·종료)을 `Service.Enter` 한 곳에서 기록하고, RED를 위해 HTTP를 미들웨어로 감싸고, Grafana 대시보드를 프로비저닝했습니다.
- promotion을 **replicas 2로 쿠버네티스에** 올렸습니다 — 24~27편의 분산 장치 덕에 여러 대가 그냥 안전합니다.
- 부하 도구에 **p99·오류 게이트** 를 넣고 CI 잡으로 돌려, 성능 회귀를 자동으로 막습니다.

핵심 한 줄 — **"만들었다"와 "운영한다"는 다릅니다.** 정확한 코드를 짜는 것과, 그게 지금 잘 도는지 보이고·여러 대로 뜨고·느려지지 않게 지키는 것은 별개의 일입니다. 그리고 그 별개의 일까지가 실서비스입니다. 이걸로 promotion 라인은 **정확성 → 견고함 → 분산 → 다중 인스턴스 → 운영** 의 한 흐름을 닫습니다.

> 이번 편 전체 코드·매니페스트·CI는 리포의 `part-35` 태그에 있습니다.
