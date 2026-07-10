---
title: 상태·설정·스케일링 — 404를 없애고 자동으로 늘리기
date: 2025-07-30
description: 6편에서 replica를 2개로 늘리자 인메모리 저장소 탓에 GET이 404를 뱉던 문제를, 7편에서 정면으로 풉니다. 주문 저장소를 PostgreSQL로 옮겨(StatefulSet·PVC) replica가 상태를 공유하게 하고, ConfigMap·Secret으로 설정을 분리하고, liveness·readiness probe로 건강을 확인하고, HPA로 부하에 따라 파드를 자동으로 늘립니다. testcontainers로 진짜 Postgres에 대해 저장소를 TDD하는 법까지. 이벤트 기반 쇼핑몰 시리즈 7편입니다.
tags: [Kubernetes, PostgreSQL, Go, HPA, DDD]
category: [dev, handson]
draft: false
---

[6편](/go-kubernetes-deploy)에서 주문 서비스를 쿠버네티스에 올리고 replica를 2개로 늘렸더니, 이상한 일이 생겼습니다. 방금 만든 주문을 조회하면 **어떤 때는 되고 어떤 때는 404** 가 났죠. 원인은 분명했습니다 — 저장소가 각 파드의 **메모리 안** 에 있어서, POST를 받은 파드와 GET을 받은 파드가 다르면 서로의 주문을 몰랐던 겁니다. 오늘은 이 숙제를 정면으로 풉니다. 상태를 파드 밖으로 빼고(PostgreSQL), 설정을 분리하고(ConfigMap·Secret), 건강을 확인하고(probe), 부하에 따라 자동으로 늘립니다(HPA).

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-7` 태그에 있습니다. 매니페스트는 `deploy/k8s/`, 배포 절차는 `README` 에 있습니다.

## 무상태 앱, 파드 밖의 상태

쿠버네티스의 파드는 **일회용(cattle)** 입니다. 언제든 죽고, 다른 노드에서 새로 뜨고, 스케일링으로 늘었다 줄죠. 그러니 파드 메모리에 담아둔 것은 재시작 한 번에 사라지고, replica 사이에서 공유되지도 않습니다. **애플리케이션은 무상태(stateless)로 두고, 상태는 파드 밖의 공유 저장소** 로 빼는 게 원칙입니다.

주문 서비스에게 그 저장소는 데이터베이스입니다. 3편에서 저장소를 **포트(인터페이스)** 로 두고 인메모리로 구현해 둔 게 여기서 빛을 봅니다 — 같은 포트를 PostgreSQL로 구현한 어댑터로 갈아끼우기만 하면 됩니다.

```go
type OrderRepository interface {
	Save(ctx context.Context, order *Order) error
	FindByID(ctx context.Context, id OrderID) (*Order, error)
}
```

## 애그리거트를 되살리기 — reconstitution

Postgres 어댑터를 쓰다 보면 DDD의 중요한 개념 하나를 만납니다. 저장은 직관적입니다 — 주문과 항목을 테이블에 넣으면 되죠. 그런데 **다시 읽을 때** 가 미묘합니다. DB에서 읽은 데이터로 `Order` 애그리거트를 어떻게 만들까요?

3편의 `PlaceOrder` 팩토리를 그대로 쓰면 **안 됩니다.** 그건 새 주문을 만드는 함수라 `OrderPlaced` **이벤트를 발생시키니까요.** 저장된 주문을 읽을 때마다 이벤트가 또 나가면, 재고가 다시 예약되는 끔찍한 중복이 생깁니다. 그래서 "이미 존재하는 주문을 복원"하는 별도의 생성자, **reconstitution** 을 둡니다.

```go
// PlaceOrder(팩토리)와 결정적으로 다른 점: 이벤트를 하나도 발생시키지 않는다.
// 지금 새로 일어나는 일이 아니라, 과거에 저장된 사실을 복원하는 것이기 때문이다.
func ReconstituteOrder(id OrderID, customerID CustomerID, lines []OrderLine, status OrderStatus) *Order {
	return &Order{id: id, customerID: customerID, lines: lines, status: status}
}
```

"새로 일어난 일"과 "과거 사실의 복원"을 코드로 구분하는 것 — 이게 도메인 이벤트를 다루는 시스템의 핵심 규율입니다.

## Postgres 어댑터를 TDD하기 — testcontainers

저장소는 SQL과 매핑이 얽혀서, 목(mock)으로 테스트하면 정작 중요한 걸 놓칩니다. 4편에서 임베디드 NATS로 진짜 브로커에 붙였듯, 여기서도 **진짜 PostgreSQL** 에 붙여 테스트합니다. `testcontainers-go` 가 테스트 중에 Postgres 컨테이너를 띄워줍니다.

```go
func TestPostgresRepo_저장하고_다시_읽으면_같은_주문(t *testing.T) {
	repo, _ := infra.NewPostgresOrderRepository(ctx, startPostgres(t)) // 진짜 PG 컨테이너
	defer repo.Close()

	repo.Save(ctx, sampleOrder(t)) // A×2@1000 + B×1@3000

	got, _ := repo.FindByID(ctx, "order-1")
	if got.Total().Amount() != 5000 { // 항목에서 재계산된 총액
		t.Fatalf("총액 = 5000 여야 하는데 %d", got.Total().Amount())
	}
	// 재구성된 주문은 이벤트를 다시 내지 않아야 한다(과거 사실의 복원이므로)
	if evs := got.PullEvents(); len(evs) != 0 {
		t.Fatalf("재구성 시 이벤트가 없어야 하는데 %d개", len(evs))
	}
}
```

저장은 트랜잭션으로 묶어, 주문과 항목이 **원자적으로** 저장되게 합니다. 그리고 총액은 **저장하지 않습니다** — 도메인이 늘 항목에서 계산하니, DB에도 파생값을 중복 저장하지 않아 "총액 = 소계 합" 불변식이 저장소에서도 깨질 여지가 없습니다.

```go
func (r *PostgresOrderRepository) Save(ctx context.Context, order *domain.Order) error {
	tx, _ := r.pool.Begin(ctx)
	defer tx.Rollback(ctx)

	tx.Exec(ctx, `INSERT INTO orders (id, customer_id, status) VALUES ($1,$2,$3)
	              ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`, ...)
	tx.Exec(ctx, `DELETE FROM order_lines WHERE order_id = $1`, ...)
	for _, l := range order.Lines() {
		tx.Exec(ctx, `INSERT INTO order_lines (...) VALUES ($1,$2,$3,$4)`, ...)
	}
	return tx.Commit(ctx)
}
```

이 테스트는 진짜 컨테이너를 띄우느라 몇 초 걸리지만(도커 필요), SQL·트랜잭션·재구성까지 실제로 검증합니다. `testing.Short()` 로 감싸 도커 없는 환경에서는 건너뛰게 했습니다.

## StatefulSet — DB에 어울리는 몸

이제 클러스터에 Postgres를 올립니다. 그런데 6편처럼 `Deployment` 로 올리면 안 됩니다. DB는 **정체성과 저장소** 가 중요한 워크로드라, 그에 맞는 `StatefulSet` 을 씁니다. StatefulSet은 파드에 **안정적인 이름·순서** 를 주고, 무엇보다 파드마다 **영속 볼륨(PVC)** 을 붙여줍니다.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: postgres, namespace: shop }
spec:
  serviceName: postgres
  replicas: 1
  template:
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          envFrom: [{ secretRef: { name: db-credentials } }]
          volumeMounts: [{ name: data, mountPath: /var/lib/postgresql/data }]
          readinessProbe:
            exec: { command: ["pg_isready", "-U", "shop"] }
  volumeClaimTemplates:            # 파드마다 1Gi PVC 자동 생성
    - metadata: { name: data }
      spec:
        accessModes: ["ReadWriteOnce"]
        resources: { requests: { storage: 1Gi } }
```

`volumeClaimTemplates` 가 파드마다 PVC(PersistentVolumeClaim)를 만들어 붙입니다. 파드가 죽어도 이 볼륨은 남아, 되살아난 파드가 같은 데이터를 다시 씁니다. 상태가 진짜로 **파드 밖** 에 있게 되는 거죠.

## 설정과 비밀 — ConfigMap과 Secret

DB 접속 정보를 코드나 이미지에 박아 넣으면 안 됩니다(12-factor의 "설정은 환경에서"). 쿠버네티스는 이걸 두 종류로 나눕니다.

- **ConfigMap** — 비밀이 아닌 설정. 여기선 `NATS_URL`.
- **Secret** — 비밀번호·접속 문자열처럼 민감한 값. 여기선 `DATABASE_URL`.

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: shop-config, namespace: shop }
data:
  NATS_URL: "nats://nats:4222"
---
apiVersion: v1
kind: Secret
metadata: { name: ordering-secret, namespace: shop }
stringData:
  DATABASE_URL: "postgres://shop:secret@postgres:5432/shop?sslmode=disable"
```

그리고 주문 파드는 이 둘을 환경 변수로 주입받습니다. 코드는 4편에서 만든 `NATS_URL`, 이번에 더한 `DATABASE_URL` 을 그냥 `os.Getenv` 로 읽을 뿐입니다.

```yaml
      envFrom:
        - configMapRef: { name: shop-config }    # NATS_URL
        - secretRef:    { name: ordering-secret } # DATABASE_URL
```

> ⚠️ 데모라서 Secret을 평문으로 뒀지만, 실서비스에서는 이걸 git에 커밋하면 안 됩니다. Sealed Secrets·SOPS·External Secrets 같은 걸로 암호화하거나 외부 볼트에서 주입합니다.

조립 루트(`main`)는 여전히 **어댑터만 고릅니다.** `DATABASE_URL` 이 있으면 Postgres, 없으면 인메모리 — 유스케이스·도메인은 무엇이 끼워지는지 모릅니다.

```go
var repo domain.OrderRepository = infra.NewMemoryOrderRepository()
ready := func(context.Context) error { return nil }
if dsn := os.Getenv("DATABASE_URL"); dsn != "" {
	pg, _ := infra.NewPostgresOrderRepository(ctx, dsn)
	repo = pg
	ready = pg.Ping   // readiness = DB가 응답하는가
}
```

## probe — 살아 있는가, 준비됐는가

쿠버네티스가 파드를 제대로 돌보려면 두 가지를 물어야 합니다. **살아 있는가**(liveness), 그리고 **트래픽을 받을 준비가 됐는가**(readiness). 이 둘은 다릅니다.

```go
mux.HandleFunc("GET /healthz", ...)   // liveness: 프로세스가 살아만 있으면 200
mux.HandleFunc("GET /readyz", ...)    // readiness: DB까지 확인(ready = pg.Ping)
```

```yaml
      readinessProbe:
        httpGet: { path: /readyz, port: 8080 }
      livenessProbe:
        httpGet: { path: /healthz, port: 8080 }
```

구분이 왜 중요할까요? **liveness가 실패하면 쿠버네티스는 파드를 재시작** 하고, **readiness가 실패하면 Service의 로드밸런싱에서만 잠시 빼냅니다**(재시작은 안 함). DB가 잠깐 끊겼을 때 파드를 재시작하는 건 오히려 문제를 키웁니다 — 재시작해도 DB는 여전히 없으니까요. 그럴 땐 트래픽만 잠시 안 주는 게(readiness 실패) 옳습니다. 그래서 `/readyz` 만 DB를 확인하고, `/healthz` 는 프로세스 생존만 봅니다.

이 습관은 배포할 때도 값집니다. 새 파드가 떠도 **DB에 연결돼 `/readyz` 가 200이 되기 전까지는 트래픽을 받지 않으니**, 준비 안 된 파드로 요청이 새는 일이 없습니다.

## 404여, 안녕

이제 배포하고, 6편에서 404를 뱉던 바로 그 시나리오를 다시 해봅니다 — 주문을 만들고, 같은 주문을 열 번 조회.

```text
$ OID=$(curl -s -X POST http://localhost/orders -d '{...}' | jq -r .order_id)
$ for i in $(seq 10); do curl -s -o /dev/null -w '%{http_code} ' localhost/orders/$OID; done

GET 200: 10회  /  GET 404: 0회      (6편에서는 8번 중 6번이 404였다)
```

**열 번 모두 200.** replica 2개가 이제 같은 Postgres를 바라보니, 어느 파드로 라우팅되든 같은 주문을 봅니다. 한 걸음 더 — 파드를 하나 **죽여도** 데이터가 남는지 확인합니다.

```text
$ kubectl delete pod -n shop -l app=ordering   # 파드를 지운다
$ curl -s -o /dev/null -w '%{http_code}\n' localhost/orders/$OID
200                                            # 되살아난 파드도 같은 주문을 안다
```

상태가 파드 밖 PostgreSQL에 있으니, 파드는 정말로 일회용이 됐습니다. 6편의 숙제가 풀렸습니다.

## HPA — 부하 따라 자동으로 늘리기

마지막 조각은 **자동 스케일링** 입니다. `HorizontalPodAutoscaler`(HPA)는 CPU 사용률을 보고 파드 수를 알아서 조절합니다. 동작하려면 클러스터에 사용량을 재는 **metrics-server** 가 있어야 합니다.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: ordering, namespace: shop }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: ordering }
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

처음엔 한가하니 최소치(2개)를 유지합니다. 이제 주문 서비스에 부하를 퍼부어 봅니다.

```text
$ kubectl get hpa ordering -n shop -w
NAME       TARGETS        REPLICAS
ordering   cpu: 2%/70%    2
ordering   cpu: 2%/70%    2
ordering   cpu: 143%/70%  2      ← 부하가 몰려 CPU 폭증
ordering   cpu: 143%/70%  4      ← 자동으로 4개로 늘어남
...
ordering                  5      ← 결국 상한(5개)까지
```

CPU가 70%를 훌쩍 넘자 HPA가 파드를 2 → 4 → 5로 **자동으로 늘렸습니다.** 부하가 빠지면 다시 최소치로 되돌아갑니다. 트래픽에 따라 스스로 몸집을 바꾸는, 살아 있는 시스템이 된 거죠. (이게 가능한 이유 중 하나가, 앞에서 상태를 파드 밖으로 뺐기 때문입니다 — 무상태라야 이렇게 마음껏 늘렸다 줄일 수 있습니다.)

## 정리 — 진짜 운영에 가까워지다

- **무상태 앱 + 파드 밖 상태**: 저장소 포트를 PostgreSQL 어댑터로 갈아끼워, replica가 상태를 공유하게 하고 6편의 404를 없앴습니다.
- **reconstitution**: 저장된 주문을 되살릴 때는 이벤트를 내지 않는 별도 생성자를 써, "과거 사실 복원"과 "새 사건"을 구분했습니다.
- **testcontainers**: 진짜 Postgres에 붙여 SQL·트랜잭션·매핑까지 TDD했습니다.
- **StatefulSet·PVC** 로 DB에 영속 볼륨을 주고, **ConfigMap·Secret** 으로 설정과 비밀을 분리했습니다.
- **liveness·readiness** 를 구분해, 재시작할 상황과 트래픽만 뺄 상황을 다르게 다뤘습니다.
- **HPA** 로 부하에 따라 파드가 2에서 5까지 자동으로 늘고 줄게 했습니다.

이제 시스템은 상태를 안전하게 보관하고, 건강을 스스로 알리고, 부하에 맞춰 몸집을 바꿉니다. 하지만 배포는 여전히 제 손으로 `docker build` 하고 `kubectl apply` 하는 수작업이고, 무언가 잘못됐을 때 **무슨 일이 일어나는지 들여다볼 눈** 이 없습니다. 마지막 8편에서는 **CI/CD**(GitHub Actions로 빌드·테스트·배포 자동화)와 **관찰성**(로그·메트릭·추적으로 이벤트 흐름을 꿰뚫어 보기)으로 이 시리즈를 마무리합니다.

> 이번 편 전체 코드는 리포의 `part-7` 태그에 있습니다.
