---
title: 컨테이너에 담기 — 멀티스테이지로 작고 안전하게
date: 2026-07-14
description: 4편까지 만든 두 서비스는 아직 제 노트북에서 go run 으로만 돕니다. 5편에서는 멀티스테이지 Dockerfile로 두 서비스를 정적 바이너리 이미지로 만들고, distroless로 16MB짜리 비루트 이미지를 얻습니다. 레이어 캐시, BuildKit 캐시 마운트, 하나의 Dockerfile을 ARG로 재사용하기, 그리고 compose로 브로커까지 한 번에 띄워 컨테이너 안에서 이벤트 흐름을 확인합니다. 쿠버네티스로 가는 첫걸음, 이벤트 기반 쇼핑몰 시리즈 5편입니다.
tags: [Docker, Go, 컨테이너, distroless, DevOps]
category: [dev, handson]
draft: false
---

[4편](/go-events-across-contexts)에서 주문·재고 두 서비스가 이벤트로 협력하게 만들었습니다. 그런데 지금은 둘 다 제 노트북에서 `go run` 으로만 돕니다. 다른 사람 컴퓨터에서도, 서버에서도, 쿠버네티스에서도 **똑같이** 뜨게 하려면 어떻게 해야 할까요? 오늘은 이 서비스들을 컨테이너 이미지로 담습니다 — 그것도 되도록 **작고 안전하게**. 쿠버네티스로 가는 첫걸음입니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-5` 태그에 있습니다. `git checkout part-5 && docker compose up --build` 로 브로커까지 한 번에 띄워볼 수 있습니다.

## 왜 컨테이너인가

"제 컴퓨터에선 되는데요"는 배포의 오래된 농담입니다. 문제는 실행에 필요한 것들 — Go 버전, 라이브러리, 환경 변수 — 이 개발자 노트북에만 있고, 그걸 서버가 똑같이 갖추기 어렵다는 데 있습니다.

컨테이너는 이걸 뒤집습니다. 애플리케이션과 그것이 필요로 하는 모든 것을 **하나의 이미지로 통째로 묶어**, 어디서 실행하든 같은 환경을 재현합니다. 이미지는 **불변(immutable)** 이라, 빌드해서 테스트한 그 이미지가 운영에서도 한 비트도 다르지 않게 돕니다. 쿠버네티스가 다루는 배포 단위도 바로 이 이미지입니다.

Go는 컨테이너와 특히 궁합이 좋습니다. 정적 링크된 **단일 바이너리** 로 컴파일되니, 런타임에 인터프리터도 라이브러리도 필요 없습니다. 이 점을 최대한 활용해 아주 작은 이미지를 만들 수 있습니다.

## 순진한 첫 시도의 문제

가장 단순하게 쓰면 이렇게 됩니다.

```dockerfile
FROM golang:1.26
WORKDIR /src
COPY . .
RUN go build -o /app ./cmd/ordering
ENTRYPOINT ["/app"]
```

돌긴 합니다. 하지만 이 이미지는 **800MB가 넘습니다.** 안에 Go 컴파일러, 표준 라이브러리 소스, 빌드 도구가 전부 들어 있으니까요. 정작 운영에 필요한 건 **컴파일된 바이너리 하나** 뿐인데 말이죠. 게다가 셸·패키지 매니저가 다 들어 있어 **공격 표면** 도 넓습니다. 이 둘을 한 번에 해결하는 게 멀티스테이지 빌드입니다.

## 멀티스테이지 — 빌드용과 실행용을 나누기

핵심 아이디어는 간단합니다. **빌드하는 환경** 과 **실행하는 환경** 을 분리하는 것. 무거운 Go 툴체인은 빌드 단계에만 두고, 최종 이미지에는 결과 바이너리만 옮깁니다.

```dockerfile
# syntax=docker/dockerfile:1

# ── 1단계: 빌드 ──
ARG GO_VERSION=1.26
FROM golang:${GO_VERSION} AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .
ARG SERVICE
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/app ./cmd/${SERVICE}

# ── 2단계: 런타임 ──
FROM gcr.io/distroless/static:nonroot
COPY --from=build /out/app /app
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
```

이 한 파일에 이번 편의 거의 모든 개념이 들어 있습니다. 하나씩 뜯어봅니다.

### 레이어 캐시 — 의존성을 먼저 받는 이유

`COPY . .` 로 소스를 전부 복사하기 **전에**, `go.mod`·`go.sum` 만 먼저 복사해 `go mod download` 를 합니다. 도커는 각 명령을 레이어로 캐시하는데, **바뀌지 않은 레이어는 재사용** 합니다. 의존성 목록(go.mod)이 그대로면, 소스 코드만 고쳤을 때 무거운 의존성 다운로드 레이어를 통째로 건너뜁니다. 순서 하나로 재빌드가 몇 배 빨라집니다.

### 정적 링크 — 런타임에 아무것도 필요 없게

`CGO_ENABLED=0` 은 C 라이브러리 링크를 끕니다. 그러면 libc 조차 필요 없는 **완전 정적 바이너리** 가 나와서, 셸도 라이브러리도 없는 최소 이미지에서도 그냥 돕니다. `-ldflags="-s -w"` 는 디버그 심볼을 떼 바이너리를 더 줄이고, `-trimpath` 는 빌드 경로를 지워 재현성을 높입니다.

### distroless·비루트 — 공격 표면을 좁히기

최종 런타임은 `gcr.io/distroless/static` 입니다. 이름 그대로 **배포판(distro)이 없는** 이미지 — 셸도, 패키지 매니저도, 심지어 `ls` 도 없습니다. 공격자가 컨테이너에 들어와도 **쓸 도구가 하나도 없습니다.** `nonroot` 태그를 쓰고 `USER nonroot` 로 비루트 사용자로 실행하니, 혹시 뚫려도 권한이 제한됩니다. 컨테이너 보안의 기본기죠.

### 하나의 Dockerfile, 두 서비스 — ARG SERVICE

우리는 서비스가 둘(`cmd/ordering`, `cmd/inventory`)입니다. Dockerfile을 둘로 복붙하는 대신, `ARG SERVICE` 로 **어떤 바이너리를 빌드할지 인자로** 받습니다. `go build ./cmd/${SERVICE}` 한 줄이 두 서비스를 모두 커버합니다. 빌드할 때 인자만 바꾸면 됩니다.

```bash
docker build --build-arg SERVICE=ordering  -t shop/ordering  .
docker build --build-arg SERVICE=inventory -t shop/inventory .
```

빌드 컨텍스트에서 불필요한 것(`.git`, 문서 등)은 `.dockerignore` 로 빼서, 전송을 가볍게 하고 캐시를 안정적으로 유지합니다.

### 결과 — 800MB에서 16MB로

이렇게 만든 이미지 크기를 봅니다.

```text
$ docker image ls shop/ordering
shop/ordering   part-5   15.7MB
```

800MB가 넘던 순진한 이미지가 **16MB 아래** 로 줄었습니다. 대부분이 Go 바이너리 그 자체이고, 나머지 껍데기는 거의 없습니다. 이미지가 작으면 **당기고 배포하는 속도가 빠르고**, 담긴 게 적으니 **취약점도 적습니다.**

## compose — 스택을 통째로 띄우기

이미지는 만들었지만, 서비스 하나만 띄워선 이벤트 흐름을 볼 수 없습니다. 브로커(NATS)와 두 서비스가 함께 떠야 하죠. `docker compose` 로 이 스택 전체를 한 번에 정의합니다.

```yaml
name: go-ddd-shop
services:
  nats:
    image: nats:2
    ports: ["4222:4222", "8222:8222"]
    command: ["--http_port", "8222"]

  ordering:
    build:
      context: .
      args: { SERVICE: ordering }
    environment:
      NATS_URL: nats://nats:4222   # ← 서비스 이름이 곧 호스트명
    ports: ["8080:8080"]
    depends_on: [nats]

  inventory:
    build:
      context: .
      args: { SERVICE: inventory }
    environment:
      NATS_URL: nats://nats:4222
    depends_on: [nats]
```

주목할 점은 `NATS_URL: nats://nats:4222` 입니다. compose가 만든 네트워크 안에서는 **서비스 이름(`nats`)이 그대로 호스트명** 이 됩니다. 코드는 하나도 안 바꾸고, 4편에서 만든 `NATS_URL` 환경 변수만 컨테이너 이름을 가리키게 하면 끝입니다 — 12-factor 앱의 "설정은 환경에서" 원칙 그대로죠.

### 기동 순서 문제와 회복력

컨테이너 환경에선 **누가 먼저 뜰지 보장하기 어렵습니다.** 서비스가 브로커보다 먼저 떠서 연결에 실패하면, 4편의 코드는 그대로 크래시했습니다. `depends_on` 은 컨테이너 **시작** 순서만 정할 뿐, 브로커가 **연결을 받을 준비** 가 됐는지까지는 기다려주지 않습니다.

그래서 이벤트 버스 연결에 재접속 옵션을 더했습니다. 앱이 크래시하는 대신 브로커가 뜰 때까지 **배경에서 기다렸다가** 붙습니다.

```go
nc, err := nats.Connect(url,
	nats.RetryOnFailedConnect(true),
	nats.MaxReconnects(-1),
	nats.ReconnectWait(time.Second),
)
```

이건 쿠버네티스에서 더 중요해집니다. 파드는 언제든 재시작되고 순서도 뒤죽박죽이니, 의존 대상이 잠깐 없어도 **스스로 회복** 하는 게 정석입니다. 이 습관을 지금 들여둡니다.

## 컨테이너 안에서 정말 도는지

`docker compose up --build` 한 방으로 브로커와 두 서비스가 뜹니다.

```text
$ docker compose up -d --build
$ docker compose ps
go-ddd-shop-nats-1        Up
go-ddd-shop-ordering-1    Up
go-ddd-shop-inventory-1   Up
```

이제 호스트에서 컨테이너의 주문 서비스로 주문을 넣으면, 컨테이너의 재고 서비스가 이벤트를 받아 처리합니다.

```text
$ curl -X POST localhost:8080/orders \
    -d '{"customer_id":"c1","items":[{"product_id":"prod-A","quantity":2,"unit_price":1000},
                                     {"product_id":"prod-B","quantity":1,"unit_price":3000}]}'
{"order_id":"order_2e095adb…"}

# ordering 컨테이너 로그
ordering-1   | msg="이벤트 발행 = NATS" url=nats://nats:4222

# inventory 컨테이너 로그
inventory-1  | msg="order.placed 처리 완료" order=order_2e095adb… items=2
```

4편에서 `go run` 세 개로 돌리던 그 흐름이, 이제 **세 개의 컨테이너** 안에서 똑같이 흐릅니다. 코드는 한 줄도 안 바뀌었고, 바뀐 건 오직 **어떻게 패키징하고 실행하느냐** 입니다. 그리고 이 이미지는 제 노트북이든 남의 서버든 쿠버네티스든 어디서나 동일하게 뜹니다.

> 참고로 이번 편은 도메인 코드를 거의 건드리지 않았습니다. 그래서 안전망은 4편까지 쌓아둔 테스트 스위트(`go test ./...` 여전히 초록불)와, 방금처럼 실제로 컨테이너를 띄워 흐름을 확인하는 것입니다.

## 정리 — 패키징이 만든 것

- **멀티스테이지 빌드** 로 무거운 툴체인은 빌드 단계에만 두고, 런타임엔 정적 바이너리만 남겼습니다.
- `CGO_ENABLED=0` 정적 링크 + **distroless/static:nonroot** 로, 셸도 없는 비루트 16MB 이미지를 얻었습니다 — 빠르고, 공격 표면이 작습니다.
- `go.mod` 를 먼저 복사하는 **레이어 캐시** 와 **BuildKit 캐시 마운트** 로 재빌드를 빠르게 했습니다.
- `ARG SERVICE` 로 **하나의 Dockerfile** 이 두 서비스를 모두 빌드합니다.
- `compose` 로 브로커까지 스택을 통째로 띄우고, **환경 변수(NATS_URL)** 만으로 서비스를 발견하게 했습니다.
- 재접속 옵션으로 **기동 순서에 견고** 하게 만들어, 쿠버네티스로 갈 준비를 했습니다.

이제 어디서나 동일하게 뜨는 이미지가 생겼습니다. 하지만 `compose` 는 한 대의 머신 위에서 도는 것 — 진짜 운영은 여러 노드에 걸쳐 파드를 띄우고, 죽으면 되살리고, 트래픽을 나눠줘야 합니다. 다음 6편에서는 로컬 쿠버네티스(`kind`)에 이 이미지들을 올려, **Deployment·Service** 로 서비스를 굴리기 시작합니다.

> 이번 편 전체 코드는 리포의 `part-5` 태그에 있습니다.
