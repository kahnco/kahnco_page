---
title: 읽기 모델 강화 — CQRS로 "내 주문 목록"을 싸게
date: 2025-09-09
description: 회원과 장바구니까지 붙였지만, 정작 "내 주문 목록"을 보여줄 방법이 없습니다. 주문 서비스는 주문 ID로만 저장하니 회원별 조회가 비싸죠. 7편에서는 CQRS의 읽기 쪽을 본격적으로 세웁니다 — 주문 이벤트를 모아 조회에 최적화된 비정규화 뷰를 만드는 읽기 모델 서비스를 두어, 쓰기와 읽기를 분리합니다. 이벤트 기반 쇼핑몰 고도화 시리즈 7편입니다.
tags: [CQRS, EDD, Go, 읽기모델, DDD]
category: [dev, handson]
draft: false
---

[고도화 6편](/go-customer-cart)에서 회원과 장바구니를 붙여, 손님이 가입하고 담고 결제하게 됐습니다. 그런데 손님이 마이페이지에서 **"내 주문 목록"** 을 보려면 어떻게 할까요? 지금 주문 서비스가 줄 수 있는 건 `GET /orders/{id}` — **주문 하나** 뿐입니다. 회원의 주문을 다 보려면 모든 주문을 훑어야 하죠. 주문 서비스의 저장소는 **주문 ID로만** 정리돼 있어서, "이 회원의 주문들"이라는 질의는 애초에 싸게 답할 수 없습니다.

이건 우연이 아니라 구조의 문제입니다. 그리고 그 해법이 이 편의 주제 — **CQRS(Command Query Responsibility Segregation)** 의 읽기 쪽을 제대로 세우는 것입니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-15` 태그에 있습니다.

## 쓰기와 읽기는 요구가 다르다

주문 서비스는 **쓰기(command)** 에 최적화돼 있습니다 — 주문을 만들고, 상태를 안전하게 전이하고, 불변식을 지킵니다. 그러려면 애그리거트를 주문 단위로 다뤄야 하죠. 하지만 **읽기(query)** 는 요구가 다릅니다 — "이 회원의 주문을 최신순으로", "배송중인 주문만", "이번 달 매출" 같은 질의는 **비정규화되고 인덱싱된** 데이터를 원합니다.

이 둘을 하나의 모델로 억지로 맞추면 양쪽 다 어정쩡해집니다. **CQRS** 는 아예 둘을 분리합니다.

- **쓰기 모델(command)** — 주문 서비스. 규칙과 일관성이 왕이다.
- **읽기 모델(query)** — 조회 전용. 이벤트로부터 만든 **비정규화 뷰**. 빠른 조회가 왕이다.

읽기 모델은 쓰기 모델이 내는 **이벤트를 먹고 자랍니다.** 우리는 이미 그 이벤트를 다 갖고 있습니다 — `order.placed`·`order.paid`·`order.confirmed`·`order.shipped`·`order.cancelled`. 새 읽기 모델 서비스가 이 이벤트들을 구독해, 조회하기 좋은 모양으로 쌓아 둡니다.

## 프로젝터 — 이벤트를 뷰로

읽기 모델의 심장은 **프로젝터(projector)** 입니다. 주문 이벤트를 받아 뷰를 갱신하죠. `order.placed` 로 뷰를 만들고, 이후 상태 이벤트로 상태만 바꿉니다.

```go
func (p *Projector) Handle(env eventbus.Envelope) error {
	switch env.Name {
	case "order.placed":
		var e struct {
			OrderID    string `json:"order_id"`
			CustomerID string `json:"customer_id"`
			Total      int64  `json:"total"`
			Items      []Item `json:"items"`
		}
		env.Into(&e)
		p.store.Upsert(OrderView{OrderID: e.OrderID, CustomerID: e.CustomerID,
			Status: "PLACED", Total: e.Total, Items: e.Items})
	case "order.paid":
		p.setStatus(env, "PAID")
	case "order.confirmed":
		p.setStatus(env, "CONFIRMED")
	case "order.shipped":
		p.setStatus(env, "SHIPPED")
	case "order.cancelled":
		p.setStatus(env, "CANCELLED")
	}
	return nil
}
```

여기 좋은 성질이 하나 있습니다 — 이 프로젝터는 **본질적으로 멱등** 합니다. 같은 이벤트를 두 번 처리해도 `upsert`·`set-status` 는 같은 결과로 **수렴** 하니까요. 4편에서 애써 만든 멱등 가드가, 읽기 모델에선 데이터 성질만으로 공짜로 따라옵니다. (`order.placed` 재전송이 이미 배송된 주문을 PLACED로 되돌리지 않도록, 이미 진행된 상태는 지키는 작은 방어만 둡니다.)

## 조회 API — 읽기 모델의 존재 이유

이제 그토록 원하던 질의를 **싸게** 답합니다. 회원별로 미리 모아 뒀으니까요.

```go
func (h *QueryHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /orders/{id}", h.getOrder)
	mux.HandleFunc("GET /customers/{customerId}/orders", h.listByCustomer) // ← 내 주문 목록
}
```

```go
// 읽기 모델은 회원별로 이미 모아 뒀으니, 훑지 않고 바로 답한다.
func (s *MemoryStore) ByCustomer(customerID string) []OrderView {
	var out []OrderView
	for _, v := range s.orders {
		if v.CustomerID == customerID {
			out = append(out, v)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].OrderID < out[j].OrderID })
	return out
}
```

(데모라 인메모리 맵을 훑지만, 요점은 **회원이 조회 키** 라는 겁니다. 실서비스라면 이 뷰를 회원별 인덱스가 있는 저장소 — PostgreSQL 인덱스, Elasticsearch, Redis — 에 두어, 데이터가 아무리 커도 이 질의가 싸게 유지되게 합니다.)

## 진짜로 싸게 답하는지

주문 두 건을 넣고(사가로 흘러 배송까지 간 뒤), 읽기 모델에 "내 주문 목록"을 물어봅니다.

```text
# cust-1 이름으로 주문 2건 생성 → 사가가 돌아 SHIPPED 까지

$ curl localhost:8087/customers/cust-1/orders
[
  { "order_id":"order_207fe464…", "customer_id":"cust-1", "status":"SHIPPED", "total":1000,
    "items":[{"product_id":"prod-A","quantity":1}] },
  { "order_id":"order_74750736…", "customer_id":"cust-1", "status":"SHIPPED", "total":2000,
    "items":[{"product_id":"prod-A","quantity":2}] }
]

$ curl localhost:8087/customers/cust-2/orders     # 다른 회원은 자기 것만
[ { "order_id":"order_f8239997…", "status":"SHIPPED", ... } ]
```

**한 번의 질의** 로 회원의 주문이 상태·총액·항목까지 담겨 돌아옵니다. 주문 서비스를 주문마다 두드릴 필요가 없습니다. 그 데이터는 주문 이벤트가 흐를 때마다 읽기 모델이 미리 쌓아 둔 것이니까요.

## 파생 데이터의 자유 — 다시 만들 수 있다

읽기 모델의 또 다른 미덕은, 그것이 **파생 데이터** 라는 점입니다. 원본(진실의 원천)은 주문 서비스와 이벤트 스트림이고, 읽기 모델은 거기서 언제든 **다시 만들 수 있습니다.** 5편에서 JetStream으로 이벤트를 영속화해 뒀으니, 읽기 모델을 새 소비자로 붙여 스트림을 처음부터 재생하면 뷰가 통째로 재구축됩니다.

이건 실무에서 강력합니다 — 뷰의 모양을 바꾸고 싶으면(새 필드 추가, 다른 인덱스), 새 읽기 모델을 만들어 스트림을 재생해 채운 뒤 갈아끼우면 됩니다. 쓰기 모델은 건드리지 않고요. 읽기 모델을 여러 개 두어 각기 다른 질의(검색·집계·리포트)에 특화할 수도 있습니다. **하나의 이벤트 흐름, 여러 개의 읽기 모델** — 이게 CQRS가 여는 문입니다.

## 정직하게 — 결과적 일관성

공짜는 없습니다. 읽기 모델은 이벤트를 받아 갱신되므로, 쓰기 모델보다 **아주 조금 뒤처집니다.** 주문을 막 결제한 직후, 읽기 모델의 "내 주문 목록"에 그 주문이 나타나기까지 짧은 지연이 있을 수 있습니다(결과적 일관성). 대부분의 조회 화면엔 허용되는 지연이지만, "방금 만든 걸 즉시 정확히 보여줘야 하는" 화면이라면 그 자리에선 쓰기 모델을 직접 읽는 식으로 섞기도 합니다. 무엇이 옳은지는 늘 그렇듯 화면이 요구하는 신선도에 달려 있습니다.

## 정리 — 읽기와 쓰기를 갈라서

- **CQRS** 로 쓰기(주문 서비스)와 읽기(읽기 모델)를 분리해, 각자의 요구에 최적화했습니다.
- 읽기 모델은 주문 이벤트를 **프로젝션** 해, 회원별 인덱싱된 뷰로 **"내 주문 목록"** 을 싸게 답합니다.
- 프로젝터는 **본질적으로 멱등** 하고, 뷰는 **파생 데이터** 라 스트림 재생으로 언제든 재구축됩니다.
- 대가는 **결과적 일관성** — 읽기 모델은 쓰기보다 살짝 뒤처집니다.
- 주문·재고·결제 등 쓰기 쪽은 **한 줄도 안 바뀌었습니다** — 읽기 모델은 이벤트만 먹고 옆에서 자랐습니다.

이걸로 계획했던 고도화가 마무리됐습니다. 빈 폴더에서 시작한 쇼핑몰은 이제 — DDD로 설계되고, 이벤트로 협력하고, 사가로 완주하고, 아웃박스·JetStream·멱등성으로 신뢰할 수 있고, 회원·장바구니로 손님을 맞고, CQRS로 조회까지 갖춘 — 제법 어른스러운 시스템이 됐습니다. 그리고 그 모든 진화 동안, 도메인은 포트와 어댑터 뒤에서 놀랍도록 그대로였습니다.

> 이번 편 전체 코드는 리포의 `part-15` 태그에 있습니다.
