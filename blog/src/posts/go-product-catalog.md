---
title: 상품 카탈로그 — 가격의 주인은 누구인가
date: 2025-08-01
description: 지금까지 상품은 그냥 문자열 ID였고, 가격은 주문 요청이 직접 실어 보냈습니다. 클라이언트가 가격을 정한다는 건 사실 위험한 구멍이죠. 3편에서는 상품과 가격을 소유하는 카탈로그 컨텍스트를 만들고, 주문 서비스가 클라이언트 가격을 믿는 대신 카탈로그의 권위 있는 가격을 조회하도록 리팩터링합니다. 동기 호출 대신 이벤트로 갱신되는 로컬 가격 프로젝션(읽기 모델·CQRS)을 두어, 결합을 느슨하게 유지합니다. 이벤트 기반 쇼핑몰 고도화 시리즈 3편입니다.
tags: [DDD, EDD, CQRS, Go, 카탈로그]
category: [dev, handson]
draft: false
---

[고도화 2편](/go-shipping-compensation)에서 주문이 처음부터 끝까지 흐르고, 실패하면 깔끔하게 되돌아오게 만들었습니다. 그런데 계속 눈감아 온 문제가 하나 있습니다. 지금까지 **상품은 그냥 문자열 ID** 였고, 무엇보다 **가격을 주문 요청이 직접 실어 보냈습니다.**

```json
{ "product_id": "prod-A", "quantity": 2, "unit_price": 1000 }
```

이 `unit_price` 를 클라이언트가 보낸다는 건, **클라이언트가 가격을 정한다** 는 뜻입니다. 누군가 `"unit_price": 1` 로 요청을 조작하면 1원에 살 수 있다는 거죠. 명백한 구멍입니다. 이번 편에서 상품과 가격을 소유하는 **카탈로그 컨텍스트** 를 만들고, 주문 서비스가 **클라이언트 가격을 믿지 않도록** 바꿉니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-11` 태그에 있습니다.

## 가격은 누가 정하는가 — 소유권의 문제

DDD에서 중요한 질문은 "이 데이터의 **주인(source of truth)** 이 누구인가"입니다. 가격의 주인은 분명 **카탈로그** 이지 주문이나 클라이언트가 아닙니다. 그러니 주문 서비스는 가격을 **받는** 게 아니라 카탈로그에서 **가져와야** 합니다.

새 카탈로그 컨텍스트는 상품과 가격을 소유하고, HTTP로 조회·등록·가격 변경을 제공하며, 변화를 이벤트로 알립니다.

```go
func (p *Product) ChangePrice(newPrice int64) {
	p.price = newPrice
	p.record(ProductPriceChanged{ProductID: p.id, Price: newPrice})
}
```

이제 핵심 질문 — **주문 서비스는 이 가격을 어떻게 가져올까요?**

## 동기 호출 vs 로컬 프로젝션

두 갈래가 있습니다.

- **동기 호출** — 주문할 때마다 카탈로그의 HTTP API를 불러 가격을 물어봅니다. 항상 최신 가격을 얻지만, 주문이 **카탈로그가 살아 있어야만** 동작합니다(결합·지연·장애 전파).
- **로컬 프로젝션(읽기 모델)** — 주문 서비스가 카탈로그 이벤트를 구독해 **가격 사본을 자기 안에** 들고 있습니다. 주문할 땐 이 로컬 사본에서 조회하니 카탈로그에 매번 묻지 않습니다. 대신 가격이 **잠깐 낡을 수 있습니다**(결과적 일관성).

이건 **CQRS**(Command Query Responsibility Segregation)의 축소판입니다. 카탈로그가 쓰기 모델(진실의 원천)이라면, 주문이 든 프로젝션은 **읽기에 최적화한 사본** 이죠. 우리는 EDD의 결을 살려 **프로젝션** 으로 갑니다 — 주문이 카탈로그 장애에 발목 잡히지 않게요.

```go
// 주문 컨텍스트가 든 가격 읽기 모델. ProductPriceLookup 포트를 구현한다.
type ProductProjection struct {
	mu     sync.RWMutex
	prices map[domain.ProductID]int64
}

func (p *ProductProjection) PriceOf(_ context.Context, id domain.ProductID) (domain.Money, error) {
	p.mu.RLock()
	price, ok := p.prices[id]
	p.mu.RUnlock()
	if !ok {
		return domain.Money{}, domain.ErrUnknownProduct // 카탈로그에 없는 상품
	}
	return domain.NewMoney(price)
}
```

프로젝션은 카탈로그 이벤트로 갱신됩니다.

```go
func (p *ProductProjection) OnProductPriceChanged(env eventbus.Envelope) error {
	var payload struct {
		ProductID string `json:"product_id"`
		Price     int64  `json:"price"`
	}
	if err := env.Into(&payload); err != nil {
		return err
	}
	p.set(domain.ProductID(payload.ProductID), payload.Price) // 로컬 사본 갱신
	return nil
}
```

## 콜드 스타트 문제 — 이벤트만으론 부족하다

프로젝션엔 함정이 하나 있습니다. 주문 서비스가 **방금 떴을 때**, 이미 등록돼 있던 상품들의 이벤트는 **과거에 지나가 버렸습니다.** core NATS는 지난 이벤트를 다시 주지 않으니(4편의 at-most-once), 프로젝션이 텅 빈 채로 시작해 모든 주문이 "모르는 상품"으로 거부될 수 있습니다.

현실적인 해법은 **부트스트랩** 입니다 — 시작할 때 카탈로그의 현재 상태를 **동기로 한 번** 읽어 프로젝션을 채우고, 그다음부터는 이벤트로 최신을 유지합니다. "시작은 쿼리로, 이후는 이벤트로."

```go
func (p *ProductProjection) Bootstrap(ctx context.Context, catalogBaseURL string) error {
	resp, err := http.Get(catalogBaseURL + "/products") // 현재 카탈로그를 한 번 읽는다
	// ... 응답을 디코딩해 프로젝션을 채운다 ...
}
```

조립 루트에서 이 둘을 엮습니다 — 부트스트랩으로 채우고, 이벤트 구독으로 갱신합니다.

```go
projection := infra.NewProductProjection()
if catalogURL := os.Getenv("CATALOG_URL"); catalogURL != "" {
	projection.Bootstrap(ctx, catalogURL)                       // 시작: 동기 부트스트랩
}
bus.Subscribe("catalog.product.added", "ordering", projection.OnProductAdded)          // 이후: 이벤트
bus.Subscribe("catalog.product.price_changed", "ordering", projection.OnProductPriceChanged)
```

## 주문 서비스가 가격을 믿지 않게 만들기

이제 주문의 유스케이스를 고칩니다. 입력에서 `unit_price` 를 **아예 없앱니다.** 가격은 프로젝션에서 가져옵니다.

```go
for _, item := range cmd.Items {
	qty, err := domain.NewQuantity(item.Quantity)
	if err != nil {
		return "", err
	}
	// 가격은 요청이 아니라 카탈로그(프로젝션)에서. 클라이언트 가격 조작을 막는다.
	price, err := s.prices.PriceOf(ctx, domain.ProductID(item.ProductID))
	if err != nil {
		return "", err // 모르는 상품이면 ErrUnknownProduct
	}
	lines = append(lines, domain.NewOrderLine(domain.ProductID(item.ProductID), qty, price))
}
```

HTTP 요청 구조체에서도 `unit_price` 필드를 지웁니다. 이제 클라이언트가 가격을 보내봤자 **읽지도 않습니다.** 그리고 카탈로그에 없는 상품은 400으로 거부합니다. 이게 season 1의 3편에서 만든 포트/어댑터가 또 한 번 빛나는 지점입니다 — `OrderService` 는 `ProductPriceLookup` 이라는 **포트** 만 알고, 그게 이벤트로 갱신되는 프로젝션인지 동기 호출인지 모릅니다. 나중에 마음이 바뀌어 동기 호출로 가더라도 유스케이스는 그대로입니다.

## 리팩터링의 신호 — 테스트가 먼저 아팠다

가격을 `PlaceOrderCommand` 에서 빼는 건 꽤 큰 변경이라, 이 명령을 쓰던 **테스트들이 먼저 깨졌습니다.** 그게 좋은 신호입니다 — 테스트가 "가격이 어디서 오는지"라는 설계 결정이 바뀌었음을 즉시 알려준 거죠. 테스트에는 프로젝션 대신 가짜 가격 조회를 끼웁니다.

```go
type fakePrices struct{ m map[domain.ProductID]int64 }

func (f fakePrices) PriceOf(_ context.Context, id domain.ProductID) (domain.Money, error) {
	p, ok := f.m[id]
	if !ok {
		return domain.Money{}, domain.ErrUnknownProduct
	}
	return domain.NewMoney(p)
}
```

그리고 "카탈로그에 없는 상품은 거부된다"를 새 테스트로 못 박습니다. 규칙이 바뀌면 명세(테스트)도 함께 자랍니다.

## 진짜로 가격을 못 속이는지

카탈로그·주문을 띄우고, 세 가지를 확인합니다. 먼저 **클라이언트가 가격을 조작해도 무시** 되는지.

```text
# 카탈로그: prod-A=1000, prod-B=3000
# 요청에 unit_price=1 을 넣어 조작을 시도한다
$ curl -X POST localhost:8080/orders -d '{"customer_id":"c1","items":[
    {"product_id":"prod-A","quantity":2,"unit_price":1},
    {"product_id":"prod-B","quantity":1,"unit_price":1}]}'

$ curl localhost:8080/orders/order_71060f2b…
"total": 5000     ← 1원이 아니라 카탈로그 기준 2×1000 + 1×3000 = 5,000원
```

다음, **가격 변경이 이벤트로 전파** 되는지. 카탈로그에서 prod-A 가격을 5,000원으로 바꾸면, 잠시 뒤 주문에 반영됩니다.

```text
$ curl -X PUT localhost:8084/products/prod-A/price -d '{"price":5000}'
# (catalog.product.price_changed 이벤트가 주문 프로젝션을 갱신)

$ curl -X POST localhost:8080/orders -d '{"customer_id":"c2","items":[{"product_id":"prod-A","quantity":1}]}'
$ curl localhost:8080/orders/…
"total": 5000     ← 바뀐 가격이 반영됨
```

마지막으로, **카탈로그에 없는 상품** 은 거부됩니다.

```text
$ curl -w '[%{http_code}]' -X POST localhost:8080/orders -d '{"customer_id":"c3","items":[{"product_id":"prod-ZZZ","quantity":1}]}'
{"error":"카탈로그에 없는 상품입니다"}[400]
```

가격의 주인이 카탈로그로 옮겨갔고, 클라이언트는 더 이상 가격에 손댈 수 없습니다.

## 정직하게 — 결과적 일관성의 그늘

프로젝션 방식엔 대가가 있습니다. 카탈로그가 가격을 바꾼 순간부터 주문 프로젝션이 그 이벤트를 받기까지 **아주 짧은 시차** 가 있고, 그 사이 주문은 **옛 가격** 으로 처리될 수 있습니다. 대부분의 쇼핑몰엔 허용 범위지만, "결제 순간의 정확한 가격"이 계약상 중요하다면 다른 선택이 필요합니다 — 주문 시 동기 조회, 혹은 가격에 버전을 붙여 주문에 스냅샷을 남기는 식으로요. 정답은 도메인이 요구하는 정확성 수준에 달려 있습니다.

그리고 눈치채셨을 수도 있는 또 다른 틈 — 카탈로그가 상품을 **저장하고** 나서 이벤트를 **발행** 하는데, 그 사이에 프로세스가 죽으면 저장은 됐지만 이벤트는 안 나가는 **불일치** 가 생깁니다(dual-write 문제). 이건 다음 4편의 주제입니다.

## 정리 — 데이터에는 주인이 있다

- 가격의 **소유권을 카탈로그로** 옮겨, 클라이언트가 가격을 정하던 구멍을 막았습니다.
- 주문은 동기 호출 대신 **로컬 가격 프로젝션(읽기 모델·CQRS)** 에서 가격을 조회해, 카탈로그 장애에 결합되지 않습니다.
- **부트스트랩(쿼리) + 이벤트(갱신)** 로, 콜드 스타트와 최신성을 함께 해결했습니다.
- `ProductPriceLookup` **포트** 덕에 유스케이스는 가격이 어디서 오는지 모른 채 그대로입니다.
- 이 큰 리팩터링을 **테스트가 안전하게** 이끌었습니다 — 깨진 테스트가 곧 바뀐 설계의 지도였습니다.

이제 상품과 가격이 제자리를 찾았습니다. 하지만 방금 흘린 두 가지 — 프로젝션의 **결과적 일관성** 과, 저장과 발행 사이의 **dual-write 불일치** — 는 EDD 시스템의 신뢰성에 관한 근본 물음입니다. 마지막 4편에서는 **트랜잭셔널 아웃박스(transactional outbox)** 로 "저장과 발행을 원자적으로" 만들고, **멱등 소비** 로 중복 이벤트를 견디게 하여, 이 이벤트 기반 쇼핑몰을 진짜 신뢰할 수 있게 다듬으며 시리즈를 마무리합니다.

> 이번 편 전체 코드는 리포의 `part-11` 태그에 있습니다.
