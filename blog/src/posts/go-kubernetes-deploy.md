---
title: 로컬 쿠버네티스에 배포 — Deployment·Service·Ingress
date: 2026-07-17
description: 5편에서 만든 컨테이너 이미지를 로컬 쿠버네티스(kind)에 올립니다. Pod·Deployment·Service·Ingress가 각각 무엇을 하는지, 이미지를 kind에 로드하는 법, 서비스가 DNS 이름으로 서로를 찾는 법을 실제로 배포하며 짚습니다. 그리고 replica를 2개로 늘리자 드러난 인메모리 상태의 한계 — 같은 주문을 GET하면 404가 섞이는 현상까지 정직하게 마주합니다. 이벤트 기반 쇼핑몰 시리즈 6편입니다.
tags: [Kubernetes, kind, Go, DevOps, 배포]
category: [dev, handson]
draft: false
---

[5편](/go-containerizing)에서 두 서비스를 컨테이너 이미지로 담았습니다. `docker compose` 로 잘 돌긴 했지만, 그건 **한 대의 머신** 위에서 도는 것입니다. 진짜 운영은 여러 노드에 파드를 나눠 띄우고, 죽으면 되살리고, 트래픽을 나눠줘야 합니다. 그 일을 하는 게 쿠버네티스죠. 오늘은 로컬 쿠버네티스(`kind`)에 이 이미지들을 올려 **Deployment·Service·Ingress** 로 굴립니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-6` 태그에 있습니다. 매니페스트는 `deploy/k8s/` 에 있고, `README` 에 배포 절차가 정리돼 있습니다.

## kind — 도커 안의 쿠버네티스

쿠버네티스를 로컬에서 배우려면 클러스터가 하나 필요합니다. **kind**(Kubernetes IN Docker)는 도커 컨테이너 하나하나를 쿠버네티스 노드로 삼아, 노트북 위에 진짜 클러스터를 띄웁니다. 가볍고, 만들고 부수기 쉬워서 학습·CI에 안성맞춤입니다.

Ingress를 로컬에서 쓰려고, 노드의 80/443 포트를 호스트로 노출하는 설정으로 클러스터를 만듭니다.

```yaml
# deploy/kind/cluster.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - { containerPort: 80, hostPort: 80, protocol: TCP }
      - { containerPort: 443, hostPort: 443, protocol: TCP }
```

```text
$ kind create cluster --name shop --config deploy/kind/cluster.yaml
 ✓ Preparing nodes 📦
 ✓ Starting control-plane 🕹️
 ✓ Installing CNI 🔌
Set kubectl context to "kind-shop"
```

## 이미지를 클러스터 안으로

여기서 초보자가 자주 막히는 지점이 있습니다. 방금 `docker build` 로 만든 이미지는 **내 도커 데몬** 에 있지, 클러스터 노드 안에는 없습니다. 쿠버네티스는 기본적으로 이미지를 **레지스트리에서 당겨오려** 하는데, 우리 이미지는 어느 레지스트리에도 올리지 않았죠. kind는 이걸 위해 로컬 이미지를 노드로 직접 **로드** 하는 명령을 줍니다.

```bash
docker build --build-arg SERVICE=ordering  -t go-ddd-shop/ordering:part-6  .
docker build --build-arg SERVICE=inventory -t go-ddd-shop/inventory:part-6 .
kind load docker-image go-ddd-shop/ordering:part-6 go-ddd-shop/inventory:part-6 --name shop
```

그리고 매니페스트에서 `imagePullPolicy: IfNotPresent` 로 두어, 노드에 이미 있는 이미지를 쓰고 레지스트리를 찾지 않게 합니다. 이걸 빠뜨리면 `ErrImagePull` 로 파드가 안 뜨는, 흔한 첫 실패를 만납니다.

## 네 가지 오브젝트 — Pod·Deployment·Service·Ingress

쿠버네티스는 "이런 상태였으면 좋겠다"를 **선언** 하면, 실제를 그 상태로 **맞춰주는** 시스템입니다. 우리가 쓰는 오브젝트는 넷입니다.

- **Pod** — 컨테이너를 감싸는 가장 작은 배포 단위. 보통 직접 만들지 않습니다.
- **Deployment** — "이 파드를 몇 개 유지해라". 파드가 죽으면 되살리고(self-healing), 개수를 선언대로 맞춥니다.
- **Service** — 여러 파드 앞에 **안정적인 이름과 가상 IP** 를 두고 트래픽을 분산합니다. 파드가 재생성돼 IP가 바뀌어도 이름은 그대로입니다.
- **Ingress** — 클러스터 **바깥의 HTTP 요청** 을 안쪽 Service로 라우팅합니다.

### 주문 서비스 — Deployment + Service

주문 서비스는 HTTP를 받으니 Deployment와 Service를 함께 둡니다. replica를 **2개** 로 선언해, 하나가 죽어도 트래픽이 끊기지 않게 합니다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: ordering, namespace: shop }
spec:
  replicas: 2                     # 파드 2개 유지
  selector: { matchLabels: { app: ordering } }
  template:
    metadata: { labels: { app: ordering } }
    spec:
      containers:
        - name: ordering
          image: go-ddd-shop/ordering:part-6
          imagePullPolicy: IfNotPresent   # kind 로드 이미지 사용
          ports: [{ containerPort: 8080 }]
          env:
            - { name: NATS_URL, value: "nats://nats:4222" }
          resources:
            requests: { cpu: "50m", memory: "32Mi" }
            limits:   { cpu: "250m", memory: "128Mi" }
---
apiVersion: v1
kind: Service
metadata: { name: ordering, namespace: shop }
spec:
  selector: { app: ordering }
  ports:
    - { port: 80, targetPort: 8080 }   # 서비스 80 → 파드 8080
```

`resources` 도 눈여겨보세요. `requests` 는 스케줄러가 자리를 잡을 때 쓰는 최소 보장치, `limits` 는 넘지 못하는 상한입니다. 이걸 적어두는 게 클러스터를 건강하게 유지하는 기본기입니다.

### 서비스 발견 — 이름이 곧 주소

`NATS_URL: nats://nats:4222` 를 다시 봅니다. 5편의 compose에서처럼, 여기서도 **서비스 이름이 곧 DNS 호스트명** 입니다. 같은 네임스페이스 안에서 `nats` 라는 이름은 NATS Service의 가상 IP로 해석됩니다. NATS 파드가 죽고 새 IP로 되살아나도, `nats` 라는 이름은 변하지 않으니 주문·재고 서비스는 코드 한 줄 안 바꾸고 계속 브로커를 찾습니다.

### 재고 서비스 — Service가 없다

재고 서비스는 이벤트 소비자라 **HTTP를 열지 않습니다.** 아무도 이 파드로 "요청"하지 않고, 스스로 브로커를 구독할 뿐이죠. 그래서 Deployment만 있고 **Service가 없습니다.** 매니페스트가 이 아키텍처의 성격을 그대로 드러냅니다 — EDD 소비자는 진입점이 필요 없습니다.

### Ingress — 바깥으로 난 문

마지막으로 Ingress가 `localhost` 로 들어온 요청을 `ordering` Service로 넘깁니다. Ingress 규칙만으로는 아무 일도 안 일어나고, 그 규칙을 읽어 실제 트래픽을 처리하는 **Ingress 컨트롤러**(여기선 ingress-nginx)가 있어야 합니다.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata: { name: ordering, namespace: shop }
spec:
  ingressClassName: nginx
  rules:
    - host: localhost
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: ordering, port: { number: 80 } }
```

## 배포하고 확인하기

ingress-nginx 컨트롤러를 설치하고, 매니페스트를 적용합니다.

```text
$ kubectl apply -f deploy/k8s/
namespace/shop created
deployment.apps/nats created        service/nats created
deployment.apps/ordering created    service/ordering created
deployment.apps/inventory created
ingress.networking.k8s.io/ordering created

$ kubectl get deploy,pods -n shop
deployment.apps/inventory   1/1
deployment.apps/nats        1/1
deployment.apps/ordering    2/2

pod/inventory-578f47d86c-xwl8g   Running
pod/nats-7475dc7446-92qsb        Running
pod/ordering-6c476977b-7wk2f     Running
pod/ordering-6c476977b-wz2bt     Running   ← ordering 파드 2개
```

이제 Ingress를 통해 클러스터 **바깥에서** 주문을 넣습니다.

```text
$ curl -X POST http://localhost/orders \
    -d '{"customer_id":"c1","items":[{"product_id":"prod-A","quantity":2,"unit_price":1000}]}'
{"order_id":"order_1db39c88…"}

$ kubectl logs -n shop deploy/inventory
msg="order.placed 처리 완료" order=order_1db39c88… items=2
```

주문이 Ingress → ordering Service → ordering 파드로 들어가 처리되고, 그 이벤트가 NATS를 건너 **다른 파드** 인 inventory까지 도달했습니다. 4편에서 만든 이벤트 흐름이 이제 쿠버네티스 클러스터 위에서 흐릅니다.

## 마주친 진실 — replica 2개 + 인메모리 = 404

그런데 배포하고 나니 이상한 일이 생겼습니다. 방금 만든 주문을 곧바로 조회하면, **어떤 때는 되고 어떤 때는 404** 가 납니다.

```text
$ for i in $(seq 8); do
    OID=$(curl -s -X POST http://localhost/orders -d '{...}' | jq -r .order_id)
    curl -s -o /dev/null -w '%{http_code}\n' http://localhost/orders/$OID
  done
GET 200(같은 파드): 2회  /  GET 404(다른 파드): 6회
```

원인은 이렇습니다. ordering 파드가 **2개** 인데, 저장소가 각 파드의 **메모리 안** 에 있습니다(3편의 인메모리 리포지토리, 기억하시죠). Service는 요청을 두 파드에 **번갈아 분산** 하니, POST를 받아 주문을 저장한 파드와 GET을 받은 파드가 **서로 다를 때** 조회가 404가 나는 겁니다. 각 파드는 자기 메모리에 담긴 주문만 압니다.

이건 버그가 아니라, **상태를 파드 안에 두면 안 된다** 는 쿠버네티스의 근본 교훈입니다. 파드는 언제든 죽고 새로 뜨는 **일회용(cattle)** 이라, 파드 메모리에 담긴 것은 재시작 한 번에 사라지고 replica 사이에서 공유되지도 않습니다. **애플리케이션은 무상태(stateless)로, 상태는 파드 밖(공유 데이터베이스)으로** 빼야 합니다.

흥미로운 대비가 하나 있습니다 — 위에서 주문 8건을 넣는 동안, **inventory는 8건을 모두 빠짐없이 소비** 했습니다.

```text
$ kubectl logs -n shop deploy/inventory | grep -c "처리 완료"
10
```

왜 이벤트 경로는 멀쩡할까요? NATS라는 **공유 브로커** 를 거치기 때문입니다. 상태(주문 조회)는 파드별로 갈렸지만, 이벤트는 파드 밖 공유 인프라를 지나니 클러스터 전체에서 일관되게 흐릅니다. "상태를 파드 밖으로 빼라"는 교훈을, 두 경로의 차이가 선명하게 보여줍니다.

> 이번 편도 도메인 코드는 건드리지 않았습니다. 안전망은 여전히 `go test ./...`(전부 초록불)과, 방금처럼 실제 클러스터에 배포해 흐름과 한계를 눈으로 확인하는 것입니다.

## 정리 — 클러스터가 만든 것

- **kind** 로 노트북 위에 진짜 클러스터를 띄우고, 로컬 이미지를 `kind load` 로 노드에 넣었습니다.
- **Deployment** 로 파드 개수를 선언하고(self-healing·replica), **Service** 로 파드 앞에 안정적인 이름과 로드밸런싱을 뒀습니다.
- **Ingress** 로 클러스터 바깥의 요청을 안쪽 Service까지 라우팅했습니다.
- 서비스는 **DNS 이름(nats)** 으로 서로를 찾고, 재고 소비자는 진입점이 없어 **Service조차 없습니다.**
- replica를 2개로 늘리자, **인메모리 상태의 한계** 가 404로 드러났습니다 — 반면 NATS를 공유하는 이벤트 경로는 클러스터 전체에서 견고했습니다.

무상태 서비스를 여러 파드로 굴리는 데는 성공했지만, "상태를 파드 밖으로"라는 숙제가 남았습니다. 다음 7편에서는 이 숙제를 정면으로 풉니다 — 주문 저장소를 **PostgreSQL**(StatefulSet·PVC)로 옮겨 replica가 상태를 공유하게 하고, **ConfigMap·Secret** 으로 설정을 분리하고, **probe** 로 건강을 확인하고, **HPA** 로 부하에 따라 자동으로 파드를 늘립니다.

> 이번 편 전체 코드는 리포의 `part-6` 태그에 있습니다.
