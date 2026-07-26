---
title: docker compose up 하나로 — Next.js를 풀스택 컴포즈에 넣기
date: 2025-10-29
description: 프런트를 붙였으니(17편) 이제 팀 누구든 git clone 하고 docker compose up 하나로 전체를 띄우게 하고 싶었습니다. Go 8서비스 + NATS + Jaeger 에 Next.js 를 한 식구로 넣는 이야기입니다. output standalone 으로 Next 이미지를 작게 뽑고, 멀티스테이지 Dockerfile 로 굽고, 같은 코드가 컨테이너에선 내부 DNS 로, 로컬 개발에선 호스트 포트로 붙게 만드는 한 줄 트릭까지. 그리고 standalone 이 static 을 안 챙겨 화면이 벗겨지는 함정 같은, 직접 데어본 것들도 적었습니다. 이벤트 기반 쇼핑몰 고도화 시리즈 18편입니다.
tags: [Docker, docker-compose, Next.js, 인프라, Go]
category: [dev, infra]
draft: false
---

[17편](/blog/go-web-bff)에서 Next.js 프런트를 붙였습니다. 그러고 나니 욕심이 생겼습니다. 팀 누구든 `git clone` 하고 **`docker compose up` 한 줄** 이면 상품부터 주문·배송까지 도는 쇼핑몰 전체가 뜨게 하고 싶었습니다. Go 서비스 여덟에 NATS·Jaeger 가 이미 컴포즈로 떠 있었으니, 남은 건 **Next 를 그 식구에 끼워 넣는 것** 이었습니다.

간단해 보였는데, 몇 군데서 데었습니다. 그 과정을 적습니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-25` 태그(`web/`·`compose.yaml`)에 있습니다.

## Next 를 컨테이너에 — 순진한 방법의 문제

Next 앱을 컨테이너에 넣는 순진한 방법은 이렇습니다. 소스 통째로 복사하고, `npm install` 하고, `npm start`. 문제는 최종 이미지에 **개발 의존성까지 포함한 `node_modules` 전체** 가 들어가 이미지가 수백 MB 로 붓는다는 겁니다. 런타임엔 필요도 없는 것들인데요.

Next 는 이걸 위한 스위치가 있습니다 — **`output: "standalone"`**.

```js
// next.config.mjs
const nextConfig = { output: "standalone" };
export default nextConfig;
```

이걸 켜면 빌드가 **실제로 쓰이는 파일만 추적(trace)** 해서, `.next/standalone/` 아래에 **자체완결 서버**(`server.js` + 딱 필요한 `node_modules` 조각)를 만듭니다. 무거운 전체 `node_modules` 없이 `node server.js` 한 줄로 뜨는 최소 번들입니다.

## 멀티스테이지 Dockerfile

그 standalone 출력을 살려, Dockerfile 을 세 단계로 나눕니다. 백엔드 Go Dockerfile 이 빌드/런타임을 나눈 것과 같은 결입니다.

```dockerfile
# 1) 의존성 — package.json 만 먼저 복사해 레이어 캐시를 살린다
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

# 2) 빌드 — standalone 산출
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) 런타임 — standalone + 정적 자산만 복사(무거운 node_modules 통째로 안 넣는다)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

## 데인 곳 ① — standalone 은 static 을 안 챙깁니다

처음엔 3단계에서 `COPY .next/standalone` 만 했습니다. 컨테이너는 떴는데, **화면이 벗겨져** 나왔습니다 — HTML 은 오는데 CSS·JS 청크가 전부 404. 한참 헤맸습니다.

원인은 이겁니다. **`.next/standalone` 에는 `.next/static`(빌드된 CSS/JS 청크)과 `public/` 이 들어있지 않습니다.** 이 둘은 따로 복사해 줘야 합니다. 그래서 위 Dockerfile 에 이 두 줄이 반드시 있어야 합니다.

```dockerfile
COPY --from=build /app/public ./public
COPY --from=build /app/.next/static ./.next/static
```

문서에도 나와 있지만, 안 읽고 짜면 꼭 한 번 데는 곳입니다. "HTML 은 오는데 스타일이 없다" 면 십중팔구 이겁니다.

## 컴포즈에 한 식구로

이제 Next 는 그냥 또 하나의 서비스입니다. `compose.yaml` 에 `web` 을 더합니다.

```yaml
web:
  build: { context: ./web }
  environment:
    CATALOG_URL: http://catalog:8080     # compose 내부 DNS
    CUSTOMER_URL: http://customer:8080
    CART_URL: http://cart:8080
    ORDERING_URL: http://ordering:8080
    READMODEL_URL: http://readmodel:8080
  ports: ["3000:3000"]                   # 브라우저는 이 포트 하나만 본다
  depends_on: [catalog, customer, cart, ordering, readmodel]
```

여기서 compose 의 진짜 편의가 나옵니다 — **서비스 이름이 곧 호스트명** 입니다. `http://catalog:8080` 이 내부 DNS 로 카탈로그 컨테이너를 가리킵니다. [17편](/blog/go-web-bff)에서 봤듯 Next 서버가 이 주소로 **서버-투-서버** 호출을 하니, 브라우저는 내부 주소를 볼 일이 없습니다.

## 한 줄 트릭 — 컨테이너와 로컬 개발을 같은 코드로

그런데 프런트를 고칠 때마다 이미지를 다시 굽는 건 너무 느립니다. 프런트는 `npm run dev` 로 빠르게 고치고 싶죠. 문제는 그때는 **호스트에서** 도니 `http://catalog:8080`(내부 DNS)이 안 통한다는 겁니다.

해법은 **환경변수 기본값** 한 줄입니다.

```ts
// lib/api.ts — 컨테이너에선 env 로 내부 DNS, 없으면 로컬 개발용 호스트 포트로.
export const services = {
  catalog: process.env.CATALOG_URL ?? "http://localhost:8084",
  customer: process.env.CUSTOMER_URL ?? "http://localhost:8085",
  cart: process.env.CART_URL ?? "http://localhost:8086",
  ordering: process.env.ORDERING_URL ?? "http://localhost:8080",
  readmodel: process.env.READMODEL_URL ?? "http://localhost:8087",
};
```

- **컨테이너 안**: compose 가 `CATALOG_URL=http://catalog:8080` 을 주입 → 내부 DNS.
- **로컬 `npm run dev`**: env 없음 → 기본값 `http://localhost:8084`(compose 가 호스트로 열어 둔 포트).

**코드는 하나, 런타임은 둘.** 백엔드는 `docker compose up` 으로 통째로 띄워 두고, 프런트만 `npm run dev` 로 붙여 빠르게 반복합니다. 데모·전체 검증이 필요할 땐 `web` 까지 컴포즈로 올리고요.

## 데인 곳 ② — depends_on 은 "떴다" 지 "준비됐다" 가 아닙니다

`depends_on` 을 걸면 순서대로 뜨긴 하는데, **컨테이너가 시작(started)됐다** 는 뜻이지 **앱이 요청 받을 준비(ready)가 됐다** 는 뜻이 아닙니다. NATS 가 아직 스트림을 못 열었는데 소비자가 붙으려 하면 어떡할까요.

우리는 이걸 **오케스트레이션이 아니라 앱 설계로** 풉니다.

- 이벤트 버스는 **연결 실패 시 재시도**(`RetryOnFailedConnect`)합니다 — NATS 가 늦게 떠도 조용히 기다렸다 붙습니다.
- 주문 서비스는 기동 시 카탈로그에서 가격을 부트스트랩하려 하지만, **카탈로그가 아직 비었으면 기본값** 으로 시작하고, 이후 `catalog.product.added` **이벤트로 따라잡습니다**([15편](/blog/go-schema-evolution)의 이벤트 기반 최종 일관성).

그래서 기동 순서에 예민하지 않습니다. 정말 엄격한 준비성이 필요하면(예: Postgres 를 붙이는 쿠버네티스 구성) **헬스체크 + `condition: service_healthy`** 로 게이트를 걸지만, 이 컴포즈는 인메모리라 앱의 재시도·이벤트 따라잡기로 충분합니다. **"기동 순서에 기대지 말고, 늦게 떠도 스스로 회복하게 설계한다"** — 이게 더 튼튼합니다.

## 데인 곳 ③ — 카탈로그는 비어서 뜹니다

카탈로그는 인메모리라 **뜰 때마다 상품이 없습니다.** 프런트를 열면 "상품이 없습니다" 만 나오죠. 그래서 시드 스크립트를 하나 뒀습니다.

```sh
# deploy/seed-products.sh — compose up 뒤 한 번
curl -X POST localhost:8084/products -d '{"product_id":"prod-A","name":"무선 이어폰","price":39000}'
# …
```

상품 등록은 `catalog.product.added` 이벤트를 내고, 그게 주문 서비스의 가격 프로젝션까지 갱신하니, 시드 한 번이면 프런트·주문 양쪽이 같은 가격을 봅니다.

## 정직하게 — 이건 개발·데모 환경입니다

- **이건 로컬 풀스택 개발/데모용** 이지 운영 배포가 아닙니다. 복제본·오토스케일·영속 스토리지 같은 건 [6~7편](/blog/go-kubernetes-deploy)의 **쿠버네티스(kind)** 이야기고, 컴포즈는 "한 명령으로 전체를 손에 쥐는" 용도입니다. 둘은 경쟁이 아니라 역할이 다릅니다.
- **standalone 의 파일 추적은 완벽하지 않습니다.** 동적 `require` 나 네이티브 의존성은 추적에서 빠질 수 있어, 그럴 땐 `outputFileTracingIncludes` 로 수동으로 챙겨야 합니다.
- **이미지 재빌드는 느립니다.** 그래서 위의 "로컬 dev + 컴포즈 백엔드" 조합이 반복 속도의 핵심입니다. 굳이 컨테이너 안에서 핫리로드가 필요하면 소스를 바인드 마운트하고 `next dev` 를 돌리는 방법도 있지만, 대개는 그럴 것 없이 호스트에서 도는 게 빠릅니다.

## 정리 — 한 명령으로 손에 쥐는 시스템

- **`output: "standalone"`** + 멀티스테이지 Dockerfile 로 Next 이미지를 작게 뽑았습니다 — 단, **`.next/static` 과 `public` 은 따로 복사**(안 하면 스타일이 벗겨집니다).
- 컴포즈에 `web` 을 한 식구로 넣고, **서비스 이름=내부 DNS** 로 서버-투-서버 호출을 배선했습니다.
- **환경변수 기본값 한 줄** 로 같은 코드가 컨테이너(내부 DNS)·로컬 dev(호스트 포트) 양쪽에서 붙습니다.
- `depends_on` 은 준비성을 보장하지 않으니, **재시도·이벤트 따라잡기** 로 기동 순서에 기대지 않게 설계했습니다.

핵심 한 줄 — **좋은 로컬 환경은 "한 명령으로 전체를 손에 쥐는" 것** 입니다. `docker compose up` 하나로 여덟 서비스와 브로커와 프런트가 함께 뜨고, 새 팀원이 5분 만에 주문을 눌러볼 수 있다면, 그 자체가 시스템을 이해하는 가장 빠른 문서입니다.

> 이번 편 전체 코드는 리포의 `part-25` 태그(`web/`·`compose.yaml`·`deploy/seed-products.sh`)에 있습니다.
