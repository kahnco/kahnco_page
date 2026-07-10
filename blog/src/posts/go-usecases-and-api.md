---
title: 유스케이스와 API — 도는 서비스 완성하기
date: 2025-07-08
description: 2편에서 테스트로 덮은 순수한 도메인 바깥에, 이번엔 애플리케이션 계층(유스케이스)·인프라 어댑터(저장소·이벤트 발행)·HTTP API·조립 루트를 얹어 진짜로 요청이 도는 서비스를 완성합니다. 포트와 어댑터(헥사고날)로 도메인을 프레임워크로부터 지키고, 이번에도 테스트를 먼저 쓰는 TDD로 갑니다. 이벤트 기반 쇼핑몰 시리즈 3편입니다.
tags: [DDD, TDD, Go, 헥사고날, API]
category: [dev, handson]
draft: false
---

[2편](/go-domain-modeling)에서 Order 애그리거트를 TDD로 쌓았습니다. 규칙은 전부 테스트로 못 박혔지만, 아직 **아무것도 도는 게 없습니다.** 도메인은 순수해서 DB도 HTTP도 모르니까요. 오늘은 그 도메인 바깥에 껍질을 씌워 진짜 요청이 도는 서비스를 만듭니다 — **애플리케이션 계층(유스케이스) → 인프라 어댑터(저장소·이벤트 발행) → HTTP API → 조립 루트(main)** 순으로요. 물론 이번에도 테스트를 먼저 씁니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-3` 태그에 있습니다. `git checkout part-3 && go run ./cmd/ordering` 으로 직접 띄워볼 수 있습니다.

## 양파의 바깥 껍질 — 포트와 어댑터

도메인을 가장 안쪽에 두는 이 구조를 **헥사고날 아키텍처**(포트와 어댑터)라고 부릅니다. 핵심 규칙은 딱 하나, **의존성은 항상 바깥에서 안쪽으로만 흐른다** 입니다.

```text
        ┌───────────── infra (어댑터) ─────────────┐
        │   메모리 저장소 · ID 생성 · 로그 발행       │
        │   ┌────────── app (유스케이스) ────────┐  │
        │   │      OrderService.PlaceOrder       │  │
        │   │   ┌────── domain (순수) ──────┐    │  │
        │   │   │  Order · Money · 이벤트    │    │  │
        │   │   └───────────────────────────┘    │  │
        │   └────────────────────────────────────┘  │
        └────────────────── api (HTTP) ─────────────┘
```

안쪽(도메인·애플리케이션)은 바깥(DB·HTTP·브로커)을 **인터페이스로만** 압니다. 이 인터페이스를 **포트**, 포트를 실제로 구현한 바깥 코드를 **어댑터** 라고 합니다. 2편에서 이미 저장소 포트를 만들어 뒀죠.

```go
type OrderRepository interface {
	Save(ctx context.Context, order *Order) error
	FindByID(ctx context.Context, id OrderID) (*Order, error)
}
```

이 방향 덕에, 나중에 저장소를 인메모리에서 PostgreSQL로, 이벤트 발행을 로그에서 NATS로 바꿔도 **도메인·애플리케이션 코드는 한 줄도 안 바뀝니다.** 오늘 그 이득을 직접 확인합니다.

## 사이클 1 — "주문하기" 유스케이스

먼저 애플리케이션 계층입니다. 유스케이스는 도메인을 **조율(orchestrate)** 할 뿐, 비즈니스 규칙을 새로 갖지 않습니다. "주문하기"의 흐름은 이렇습니다 — 입력을 도메인 값으로 바꾸고 → 애그리거트를 만들고 → 저장하고 → 이벤트를 발행한다.

TDD니까 **테스트부터**(Red). 여기서 헥사고날의 진가가 나옵니다. 유스케이스가 저장소·발행·ID 생성을 전부 **포트로만** 의존하니, 테스트에서는 진짜 DB 대신 **가짜(fake)** 를 끼울 수 있습니다.

```go
func TestPlaceOrder_성공하면_저장되고_이벤트가_발행된다(t *testing.T) {
	svc, repo, pub := newService() // fakeRepo, fakePublisher, 고정 ID 주입

	id, err := svc.PlaceOrder(context.Background(), validCommand()) // A×2@1000 + B×1@3000
	if err != nil {
		t.Fatalf("PlaceOrder: %v", err)
	}
	if id != "order-fixed" {
		t.Fatalf("반환 ID = order-fixed 여야 하는데 %s", id)
	}

	saved, _ := repo.FindByID(context.Background(), id)
	if saved.Total().Amount() != 5000 {
		t.Fatalf("저장된 총액 = 5000 이어야 하는데 %d", saved.Total().Amount())
	}
	if len(pub.published) != 1 {
		t.Fatalf("이벤트 1개 발행돼야 하는데 %d개", len(pub.published))
	}
}
```

이 테스트를 쓰다 보니 필요한 **포트 두 개** 가 자연스럽게 드러납니다 — 이벤트를 밖으로 보내는 `EventPublisher`, 새 주문 ID를 만드는 `IDGenerator`. (ID를 포트로 둔 덕에 위 테스트가 `"order-fixed"` 라는 고정값으로 결정적으로 검증됩니다.)

```go
type EventPublisher interface {
	Publish(ctx context.Context, events ...domain.DomainEvent) error
}
type IDGenerator interface {
	NewOrderID() domain.OrderID
}
```

이제 통과시킬 유스케이스를 짭니다(Green). 눈여겨볼 점은, **규칙 검증이 하나도 여기 없다** 는 겁니다. 수량이 0인지, 금액이 음수인지, 항목이 비었는지는 전부 도메인(값 객체·`PlaceOrder`)이 판단하고, 유스케이스는 그저 흐름만 엮습니다.

```go
func (s *OrderService) PlaceOrder(ctx context.Context, cmd PlaceOrderCommand) (domain.OrderID, error) {
	lines := make([]domain.OrderLine, 0, len(cmd.Items))
	for _, item := range cmd.Items {
		qty, err := domain.NewQuantity(item.Quantity) // 규칙 위반이면 여기서 에러
		if err != nil {
			return "", err
		}
		price, err := domain.NewMoney(item.UnitPrice)
		if err != nil {
			return "", err
		}
		lines = append(lines, domain.NewOrderLine(domain.ProductID(item.ProductID), qty, price))
	}

	order, err := domain.PlaceOrder(s.ids.NewOrderID(), domain.CustomerID(cmd.CustomerID), lines)
	if err != nil {
		return "", err
	}
	if err := s.repo.Save(ctx, order); err != nil {
		return "", err
	}
	return order.ID(), s.publisher.Publish(ctx, order.PullEvents()...)
}
```

두 번째 테스트로 "실패하면 아무것도 남기지 않는다"를 못 박습니다. 수량 0을 넣으면 `NewQuantity`에서 걸려 **저장도 발행도 일어나지 않아야** 합니다(Red → Green).

```go
func TestPlaceOrder_잘못된_수량이면_에러이고_아무것도_저장안됨(t *testing.T) {
	svc, repo, pub := newService()
	cmd := validCommand()
	cmd.Items[0].Quantity = 0 // 도메인 규칙 위반

	_, err := svc.PlaceOrder(context.Background(), cmd)
	if !errors.Is(err, domain.ErrNonPositiveQuantity) {
		t.Fatalf("수량 0 은 ErrNonPositiveQuantity 여야 하는데: %v", err)
	}
	if len(repo.saved) != 0 || len(pub.published) != 0 {
		t.Fatal("실패 시 저장·발행이 없어야 한다")
	}
}
```

애플리케이션 계층은 이렇게 **원시 입력을 받아 도메인 값으로 변환** 하고(경계에서의 검증), 나머지 판단은 안쪽에 위임합니다.

## 사이클 2 — 어댑터, 포트를 실제로 채우기

이제 포트를 채울 **어댑터** 를 만듭니다. 3편에서는 외부 의존성 없이 도는 걸 목표로, 저장소는 **인메모리** 로 갑니다. 같은 인터페이스라 나중에 PostgreSQL 어댑터로 갈아끼우면 그만입니다.

```go
type MemoryOrderRepository struct {
	mu    sync.RWMutex
	store map[domain.OrderID]*domain.Order
}

func (r *MemoryOrderRepository) Save(_ context.Context, order *domain.Order) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.store[order.ID()] = order
	return nil
}

func (r *MemoryOrderRepository) FindByID(_ context.Context, id domain.OrderID) (*domain.Order, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	order, ok := r.store[id]
	if !ok {
		return nil, domain.ErrOrderNotFound
	}
	return order, nil
}
```

ID 생성기는 `crypto/rand` 로 충돌 걱정이 적은 랜덤 식별자를, 이벤트 발행은 우선 **로그로 찍기** 로 둡니다. 4편에서 이 `LogPublisher` 를 NATS 발행 어댑터로 바꾸는 순간, 다른 서비스가 이 이벤트를 받게 됩니다 — 그때도 애플리케이션 코드는 그대로입니다.

```go
func (p *LogPublisher) Publish(_ context.Context, events ...domain.DomainEvent) error {
	for _, e := range events {
		p.logger.Info("domain event published", "event", e.EventName())
	}
	return nil
}
```

## 사이클 3 — HTTP API

바깥세상을 향한 입구, HTTP입니다. Go 1.22부터 표준 `net/http` 의 `ServeMux` 가 **"메서드 + 경로 패턴"** 을 지원해서, 외부 라우터 없이도 깔끔하게 라우팅됩니다. 여기서도 테스트를 먼저 씁니다(Red). 이번엔 진짜 어댑터(인메모리 저장소·로그 발행)를 그대로 끼운 통합 성격의 테스트로, `httptest` 를 씁니다.

```go
func TestPlaceOrder_201_그리고_조회하면_같은_주문(t *testing.T) {
	srv := newTestServer() // 실제 infra 어댑터를 끼운 핸들러

	body := `{"customer_id":"cust-1","items":[
		{"product_id":"prod-A","quantity":2,"unit_price":1000},
		{"product_id":"prod-B","quantity":1,"unit_price":3000}]}`

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/orders", bytes.NewBufferString(body))
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated { // 201
		t.Fatalf("상태코드 = 201 여야 하는데 %d (%s)", rec.Code, rec.Body.String())
	}
	// 응답의 order_id 로 다시 GET 하면 총액 5000, 상태 PLACED 여야 한다 …
}
```

핸들러의 책임은 좁습니다 — **JSON 디코딩·인코딩과, 도메인 에러를 HTTP 상태코드로 옮기는 것.** 규칙은 여전히 도메인에 있고, 핸들러는 통역사일 뿐입니다.

```go
func (h *OrderHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("POST /orders", h.placeOrder)
	mux.HandleFunc("GET /orders/{id}", h.getOrder)
}

func (h *OrderHandler) placeOrder(w http.ResponseWriter, r *http.Request) {
	var req placeOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "잘못된 JSON"})
		return
	}
	// req → app.PlaceOrderCommand 로 옮긴 뒤 …
	id, err := h.svc.PlaceOrder(r.Context(), cmd)
	if err != nil {
		writeError(w, err) // 도메인 에러 → 상태코드
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"order_id": string(id)})
}
```

에러 매핑이 핵심입니다. 도메인이 던진 **센티넬 에러** 를 `errors.Is` 로 식별해 적절한 상태코드로 옮깁니다. 도메인은 HTTP를 전혀 모르지만, 그 에러가 어떤 종류인지는 타입으로 드러나 있으니 바깥에서 이렇게 번역할 수 있습니다.

```go
func writeError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	switch {
	case errors.Is(err, domain.ErrOrderNotFound):
		status = http.StatusNotFound // 404
	case errors.Is(err, domain.ErrEmptyOrder),
		errors.Is(err, domain.ErrNegativeMoney),
		errors.Is(err, domain.ErrNonPositiveQuantity):
		status = http.StatusBadRequest // 400
	}
	writeJSON(w, status, map[string]string{"error": err.Error()})
}
```

빈 주문이면 400, 없는 주문 조회면 404 — 이 두 경계도 각각 테스트로 덮습니다. 도메인 규칙(빈 주문 거부)이 HTTP 계약(400)으로 자연스럽게 이어집니다.

## 조립 루트 — 모든 선택이 모이는 한 곳

마지막은 `main` 입니다. 헥사고날에서 `main` 은 특별한 자리 — **조립 루트(composition root)** 입니다. 어떤 어댑터를 어떤 포트에 끼울지 **결정하는 유일한 곳** 이죠. 도메인도 유스케이스도 이 선택을 모릅니다.

```go
func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// 여기서만 구체 어댑터를 고른다. 뒤 편에서 이 세 줄만 바꾸면
	// 저장소는 PostgreSQL, 발행은 NATS 가 된다.
	repo := infra.NewMemoryOrderRepository()
	publisher := infra.NewLogPublisher(logger)
	ids := infra.RandomIDGenerator{}

	svc := app.NewOrderService(repo, publisher, ids)

	mux := http.NewServeMux()
	api.NewOrderHandler(svc).Register(mux)

	logger.Info("ordering service 시작", "addr", ":8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		logger.Error("서버 종료", "err", err)
		os.Exit(1)
	}
}
```

이 세 줄 — 어떤 저장소·발행·ID를 쓸지 — 이 시스템에서 **구체 기술을 아는 유일한 지점** 입니다. 나머지 코드는 전부 포트만 보고 있으니, 기술 교체가 이 조립부의 국소 변경으로 끝납니다.

## 진짜로 도는지 확인

테스트가 다 초록불이면, 이제 진짜로 띄워 봅니다.

```text
$ go test ./...
ok  github.com/kahnco/go-ddd-shop/internal/ordering/api     0.83s
ok  github.com/kahnco/go-ddd-shop/internal/ordering/app     0.46s
ok  github.com/kahnco/go-ddd-shop/internal/ordering/domain  0.35s

$ go run ./cmd/ordering
time=… level=INFO msg="ordering service 시작" addr=:8080
```

다른 터미널에서 주문을 넣고, 돌려받은 ID로 조회합니다.

```text
$ curl -s -X POST localhost:8080/orders \
    -d '{"customer_id":"cust-1","items":[
         {"product_id":"prod-A","quantity":2,"unit_price":1000},
         {"product_id":"prod-B","quantity":1,"unit_price":3000}]}'
{"order_id":"order_c9775092c44aaa50924b0a4a"}

$ curl -s localhost:8080/orders/order_c9775092c44aaa50924b0a4a
{"order_id":"order_c977…","customer_id":"cust-1","status":"PLACED",
 "total":5000,"items":[{"product_id":"prod-A","quantity":2},
                       {"product_id":"prod-B","quantity":1}]}
```

총액 5,000원이 **저장된 값이 아니라 도메인이 계산한 값** 으로 돌아오고, 서버 로그에는 `domain event published event=order.placed` 가 찍힙니다. 잘못된 요청도 규칙대로 걸립니다.

```text
$ curl -s -w '[%{http_code}]' -X POST localhost:8080/orders -d '{"customer_id":"c","items":[]}'
{"error":"주문에는 최소 하나의 항목이 필요합니다"}[400]

$ curl -s -w '[%{http_code}]' localhost:8080/orders/order_none
{"error":"주문을 찾을 수 없습니다"}[404]
```

2편에서 테스트로 선언했던 "빈 주문은 거부된다"가, 이제 HTTP 400으로 사용자에게 그대로 전달됩니다. 규칙이 도메인에서 API 경계까지 한 줄로 이어졌습니다.

## 정리 — 도는 서비스, 그러나 여전히 순수한 속

- **애플리케이션 계층(유스케이스)** 은 도메인을 조율만 하고 규칙은 갖지 않습니다. 원시 입력을 도메인 값으로 바꾸는 경계 역할입니다.
- 저장소·발행·ID를 **포트(인터페이스)** 로 둔 덕에, 테스트는 가짜를 끼워 빠르고 결정적으로 돌고, 운영은 진짜 어댑터를 끼웁니다.
- **HTTP 핸들러** 는 JSON과 상태코드만 다루는 얇은 통역사입니다. 도메인 센티넬 에러를 `errors.Is` 로 400/404에 매핑했습니다.
- **조립 루트(main)** 만이 구체 기술을 압니다. 그래서 다음 편들의 기술 교체가 국소 변경으로 끝납니다.
- 이 모든 껍질을 씌우는 동안에도 **도메인은 하나도 안 바뀌었습니다.** 바깥에서 안쪽으로만 의존하는 방향을 지킨 결과입니다.

이제 요청이 도는 서비스가 생겼습니다. 하지만 아직 이벤트는 **로그로 찍히기만** 할 뿐, 아무도 받지 않습니다. 다음 4편에서는 `LogPublisher` 를 메시지 브로커(NATS) 어댑터로 바꿔, `OrderPlaced` 이벤트로 **재고·결제 컨텍스트를 잇습니다** — 드디어 EDD(이벤트 기반 설계)가 본격적으로 등장합니다. 물론 그때도, 애플리케이션 코드는 한 줄도 안 바꾸고요.

> 이번 편 전체 코드는 리포의 `part-3` 태그에 있습니다.
