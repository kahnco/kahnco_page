---
title: 이벤트가 브라우저까지 — 폴링을 SSE로 바꾸다
date: 2025-11-23
description: 21편에서 폴링으로 실시간을 흉내 냈습니다. 2초마다 당기는 방식은 지연도 있고 낭비도 있죠. 이번엔 진짜 push로 바꿉니다 — 사가의 이벤트를 브라우저까지 밀어냅니다. NATS→readmodel 프로젝터→SSE 허브→BFF 프록시→브라우저 EventSource. 그리고 그 과정에서 관찰성 미들웨어가 Flusher를 안 물려줘 스트리밍이 죽던 버그를, SSE 샌티 체크가 잡아냈습니다. 이벤트 기반 쇼핑몰 고도화 시리즈 23편입니다.
tags: [SSE, 실시간, 이벤트, Next.js, Go]
category: [dev, backend]
draft: false
---

[21편](/blog/go-shop-ui-realtime)에서 주문 상태를 실시간으로 보여줬는데, 방식은 **폴링** 이었습니다 — 브라우저가 2초마다 `/api/orders` 를 당겼죠. 견고하지만 아쉬웠습니다. **2초의 지연**, 아무 일 없어도 도는 **낭비**, 사용자가 N명이면 N배의 요청. 우리 백엔드는 이미 이벤트로 흐르는데, 정작 브라우저는 **당기고** 있었던 겁니다.

이번엔 뒤집었습니다 — **서버가 민다.** 사가의 이벤트를 브라우저까지 밀어내는 SSE 로 바꿨습니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-30` 태그에 있습니다.

## SSE — 서버가 여는 단방향 스트림

**SSE(Server-Sent Events)** 는 서버가 **열린 HTTP 연결** 로 `data: …\n\n` 프레임을 계속 흘려보내는 방식입니다. WebSocket 보다 단순하고(단방향, 서버→클라), 브라우저의 `EventSource` 가 재연결까지 알아서 해 줍니다. 우리처럼 "서버 상태를 클라에 밀어내기만" 하면 되는 경우에 딱 맞습니다.

세 층으로 얹었습니다.

### 1) readmodel — 이벤트가 오면 push

읽기 모델은 이미 주문 이벤트(`ordering.order.>`)를 구독하고 있습니다([7편](/blog/go-readmodel-cqrs)). 여기에 **허브(Hub)** 를 붙여, 프로젝터가 이벤트를 반영할 때마다 **그 회원의 구독자에게** 최신 주문 목록을 밀어 줍니다.

```go
// 프로젝터가 갱신 후 호출 — 갱신된 주문의 주인에게 push
func (p *Projector) notify(orderID, customerID string) {
	if p.hub == nil || orderID == "" { return }
	if customerID == "" {
		if v, ok := p.store.Get(orderID); ok { customerID = v.CustomerID }
	}
	if customerID != "" {
		p.hub.Publish(customerID, ordersJSON(p.store, customerID))
	}
}
```

허브의 `Publish` 는 **논블로킹** 입니다 — 느린 구독자가 프로젝터를 막지 않게, 버퍼가 차면 그 갱신은 건너뜁니다(다음 갱신이 최신을 담으니까요). `GET /orders/stream?customer=X` 핸들러는 연결 직후 스냅샷을 보내고, 이후 허브 채널에서 오는 갱신을 흘려보냅니다.

### 2) BFF — EventSource 를 대신 인증

여기서 걸림돌이 하나. **`EventSource` 는 커스텀 헤더를 못 붙입니다** — 그래서 우리의 httpOnly 세션 쿠키로 인증하는 방식과 안 맞습니다. 해법은 [BFF](/blog/go-web-bff) 로 한 번 감싸는 것입니다. 브라우저는 `/api/orders/stream` 을 열고, **BFF 가 세션을 확인한 뒤** readmodel 의 SSE 를 그대로 파이프합니다.

```ts
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("unauthorized", { status: 401 });
  const upstream = await fetch(
    `${services.readmodel}/orders/stream?customer=${session.customerId}`,
    { headers: { Accept: "text/event-stream" }, signal: req.signal }, // 브라우저 끊기면 상류도 중단
  );
  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
  });
}
```

`req.signal` 이 핵심입니다 — 브라우저가 페이지를 떠나면 그 신호로 **상류 SSE 도 끊어**, 연결이 새지 않게 합니다.

### 3) 클라이언트 — 폴링을 EventSource 로

폴링 루프를 통째로 지우고, `EventSource` 하나로 바꿉니다.

```tsx
useEffect(() => {
  const es = new EventSource("/api/orders/stream");
  es.onopen = () => setLive(true);
  es.onmessage = (e) => setOrders(JSON.parse(e.data));
  es.onerror = () => setLive(false); // 끊기면 EventSource 가 자동 재연결
  return () => es.close();
}, []);
```

이제 결제를 누르면, 스트림으로 **`PLACED → CONFIRMED → SHIPPED`** 가 실시간으로 밀려옵니다.

## 데인 곳 — 래퍼가 Flusher 를 삼키다

바꾸고 나서 SSE 가 조용히 죽었습니다. 스트림을 열면 **"스트리밍 미지원"** 500 만 돌아왔죠. 원인은 관찰성 미들웨어였습니다.

우리 HTTP 는 미들웨어(접근 로그·메트릭)가 `ResponseWriter` 를 **`statusRecorder` 로 감쌉니다.** 그런데 이 래퍼가 **`http.Flusher` 를 구현하지 않아서**, SSE 핸들러의 `w.(http.Flusher)` 단언이 실패한 겁니다. 스트리밍은 버퍼를 즉시 비우는 `Flush` 가 생명인데, 래퍼가 그걸 안 물려주면 죽습니다.

```go
// statusRecorder 에 Flush 를 위임 — 이게 없으면 SSE 가 500.
func (r *statusRecorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}
```

> **이걸 E2E 는 못 잡았습니다.** 사가가 워낙 빨라, 주문 페이지가 렌더될 때쯤엔 이미 `SHIPPED` 였거든요 — SSR 초기 렌더만으로 "배송 중" 이 보여 **E2E 가 통과** 해 버렸습니다. 대신 **`curl` 로 SSE 를 직접 열어 본 샌티 체크** 가 잡았습니다("data: []" 대신 500). [20편](/blog/go-testing-lenses)의 교훈 그대로 — 렌즈를 바꿔야 다른 버그가 보입니다. 그리고 고친 뒤엔 스트림으로 상태 전이가 실제로 밀려오는지를 **직접 확인** 했습니다.

## 정직하게 — SSE 의 그림자

- **SSE 는 단방향** 입니다(서버→클라). 채팅처럼 양방향이 필요하면 WebSocket 으로 갑니다.
- **연결당 자원** 이 듭니다 — 허브 채널 + 고루틴. 많아지면 부담이라, 대규모에선 Redis pub/sub 같은 걸로 **여러 인스턴스에 fanout** 하고 연결을 나눠 받습니다. 우리 허브의 논블로킹 드롭은 그 전 단계의 안전장치입니다.
- **프록시가 SSE 를 방해** 할 수 있습니다 — 버퍼링하거나 유휴 연결을 끊거나. 그래서 `no-transform` 과 **주기적 ping(주석 라인)** 으로 연결을 살려 둡니다.
- **EventSource 는 쿠키 인증만** 됩니다(헤더 못 붙임). BFF 프록시가 필요한 이유죠.

## 정리 — 당기기에서 밀기로

- **폴링**(클라가 당김)을 **SSE**(서버가 밈)로 바꿨습니다 — readmodel 허브가 주문 이벤트를 회원별로 push, BFF 가 세션 인증 후 파이프, 클라는 `EventSource`.
- 관찰성 래퍼가 **Flusher 를 안 물려주던 버그** 를 SSE 샌티가 잡았고, `Flush` 위임으로 고쳤습니다.
- 이제 사가의 상태 전이가 브라우저까지 **실시간으로 흐릅니다.**

핵심 한 줄 — **이벤트 기반 백엔드의 자연스러운 귀결은, 그 이벤트를 브라우저까지 미는 것** 이었습니다. 안에서 이벤트로 흐르는데 밖에서 당기고 있었다면, 그건 아직 반쪽입니다. SSE 로 마지막 한 홉을 이으니, 사가가 정말로 눈앞에서 흐릅니다.

> 이번 편 전체 코드·테스트는 리포의 `part-30` 태그에 있습니다.
