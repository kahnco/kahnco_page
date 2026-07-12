---
title: 동시성 — 재고에 몰린 요청의 레이스 컨디션
date: 2025-09-30
description: 다 만들어 놓고 문득 스스로에게 물었습니다 — "취소와 새 주문 여러 개가 같은 재고에 동시에 몰리면 어떻게 되지?" 확인해 보니 진짜 레이스가 있었습니다. 1000건 동시 예약에 예약 86건이 유실됐죠. 12편에서는 이 레이스를 레이스 감지기로 재현하고, 원자적 Update(인메모리 뮤텍스, Postgres 행 잠금)로 뿌리부터 고칩니다. 동시성은 터지기 전엔 안 보입니다. 이벤트 기반 쇼핑몰 고도화 시리즈 12편입니다.
tags: [동시성, Go, PostgreSQL, EDD, 레이스컨디션]
category: [dev, handson]
draft: false
---

지금까지 참 많이 쌓았습니다. 그런데 이걸 다 만들어 놓고, 문득 **마음에 걸리는 질문** 이 하나 생겼습니다.

> 취소와 동시에 새 주문이 여러 개 같은 재고에 몰리면, 레이스 컨디션은 어떻게 되지?

이런 질문은 코드를 다시 보게 만듭니다. 직접 확인해 봤더니 — **진짜 레이스가 있었습니다.** 이 편은 그걸 재현하고 고치는 이야기입니다. 동시성 버그는 터지기 전까진 보이지 않으니까요.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-20` 태그에 있습니다.

## 레이스를 눈으로 — 감지기로 재현

말로만 "레이스가 있을 수 있다"고 하면 미덥지 않습니다. **레이스 감지기(-race)** 로 못 박습니다. 같은 상품에 1000개 예약을 동시에 던집니다.

```go
stock.Seed("prod-A", 1000)
var wg sync.WaitGroup
for i := 0; i < 1000; i++ {
	wg.Add(1)
	go func(n int) {
		defer wg.Done()
		svc.OnOrderPlaced(ctx, ReserveForOrderCommand{ /* prod-A ×1 */ })
	}(i)
}
wg.Wait()
// 1000개를 정확히 예약했다면 재고는 0이어야 한다.
```

```text
$ go test -race
WARNING: DATA RACE
  Read at 0x... by goroutine 15:  domain.(*StockItem).Reserve()
  Previous write at 0x... by goroutine 16: domain.(*StockItem).Reserve()
...
남은 재고 = 86 (0이어야)          ← 예약 86건이 유실됨
```

**데이터 레이스** 가 잡혔고, 재고는 0이 아니라 **86** 이 남았습니다. 예약 86건이 허공으로 사라진 겁니다 — 실서비스라면 **86개를 초과 판매(oversell)** 하게 됩니다.

## 왜 새는가 — 원자적이지 않은 read-modify-write

문제의 코드는 이랬습니다.

```go
stock, _ := repo.FindByProduct(id) // 1) 읽고
stock.Reserve(qty)                 // 2) 고치고 (available -= qty)
repo.Save(stock)                   // 3) 저장
```

세 걸음이 **따로** 입니다. 저장소는 map 접근에만 락을 걸 뿐, "읽고→고치고→저장"을 하나로 묶지 않았습니다. 그리고 `StockItem.available` 은 동기화 없는 평범한 정수라, 두 요청이 겹치면 이렇게 됩니다.

```text
재고 10.  A: 읽음(10) …          B: 읽음(10) …
          A: 7 로 계산·저장       B: 8 로 계산·저장(A 를 덮어씀)
결과: 9여야 하는데 8 (또는 7).  → lost update
```

**언제 겹치나?** 처음의 그 걱정이 정확히 맞는 지점입니다. NATS/JetStream은 **한 구독** 안에서는 메시지를 **직렬로**(구독당 goroutine 하나) 처리합니다. 그래서 `order.placed` 끼리는 한 인스턴스 안에선 안 겹칩니다. **그런데** 예약(`order.placed`)·취소(`order.cancelled`)·반품(`order.return_requested`)은 **서로 다른 구독** — 각기 다른 goroutine입니다. 그래서 **취소(재고 복원)와 새 주문(재고 차감)이 같은 상품에 동시에** 오면 바로 겹칩니다. 처음에 마음에 걸렸던 바로 그 시나리오죠.

## 고치기 1 — 원자적 Update (인메모리)

해법의 핵심은 **"읽고→고치고→저장"을 한 락 안에서** 하는 것입니다. 저장소 포트를 바꿔, 수정은 오직 `Update` 로만 하게 합니다.

```go
type StockRepository interface {
	FindByProduct(ctx, id) (*StockItem, error)         // 조회(스냅샷)
	Update(ctx, id, mutate func(*StockItem) error) error // 원자적 read-modify-write
}
```

인메모리 구현은 뮤텍스를 잡은 채 로드·수정을 처리합니다.

```go
func (r *MemoryStockRepository) Update(_ ctx, id, mutate func(*StockItem) error) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	item, ok := r.store[id]
	if !ok { return ErrStockItemNotFound }
	return mutate(item) // 락 안에서 read-modify-write → 원자적
}
```

예약·취소·반품이 모두 이 `Update` 를 통하니, 같은 상품에 대한 수정은 **직렬화** 됩니다.

```go
err := s.stock.Update(ctx, productID, func(si *StockItem) error {
	return si.Reserve(qty) // 락 안에서만 available 을 건드린다
})
```

이제 아까 그 테스트를 `-race` 로 다시 돌리면 — **데이터 레이스 없음, 재고 정확히 0.** 예약과 반품을 동시에 500건씩 던져도 상쇄돼 재고가 어긋나지 않습니다.

## 고치기 2 — 행 잠금 (여러 replica)

인메모리 뮤텍스는 **한 프로세스 안에서만** 유효합니다. inventory를 replica 2개로 늘리면? 각 replica가 **자기만의 인메모리 재고** 를 들고 있어 아예 갈라집니다(6편의 404 문제와 같은 병). 그래서 지금껏 inventory는 `replicas: 1` 이었죠 — 사실상 수평 확장이 안 됐습니다.

제대로 확장하려면 재고를 **공유 저장소(Postgres)** 로 옮기고, 거기서 원자성을 얻어야 합니다. `Update` 를 **행 잠금(SELECT … FOR UPDATE)** 으로 구현합니다.

```go
func (s *PostgresStore) Update(ctx, id, mutate func(*StockItem) error) error {
	tx, _ := s.pool.Begin(ctx)
	defer tx.Rollback(ctx)

	var available int
	// 이 행을 잠근다 — 다른 트랜잭션은 커밋될 때까지 기다린다
	tx.QueryRow(ctx, `SELECT available FROM stock WHERE product_id=$1 FOR UPDATE`, id).Scan(&available)

	item := domain.NewStockItem(id, available)
	if err := mutate(item); err != nil { return err } // 재고 부족 등 → 롤백
	tx.Exec(ctx, `UPDATE stock SET available=$1 WHERE product_id=$2`, item.Available(), id)
	return tx.Commit(ctx)
}
```

`FOR UPDATE` 가 그 상품 행을 잠그니, 여러 replica가 같은 상품을 동시에 건드려도 **행 위에서 한 줄로** 처리됩니다. 실제 PostgreSQL로 1000건 동시 차감을 돌려도(testcontainers) 재고는 정확히 0이 됩니다. 그리고 **포트 모양은 그대로** — 인메모리든 Postgres든 똑같은 `Update` 를 구현하니, 도메인·유스케이스는 한 줄도 안 바뀌었습니다. 이제 inventory를 `replicas: 2` 로 올려도 재고가 안전합니다.

> 더 가벼운 대안도 있습니다 — 읽지 않고 조건부로 한 방에 차감하는 SQL:
> ```sql
> UPDATE stock SET available = available - $q WHERE product_id = $id AND available >= $q
> ```
> 영향받은 행이 0이면 재고 부족. read-modify-write 자체가 없어 더 빠르지만, "재고는 음수가 될 수 없다"는 도메인 규칙이 SQL로 새어 나가는 트레이드오프가 있습니다. 우리는 도메인 로직(StockItem)을 지키려 `FOR UPDATE` 를 택했습니다.

## 정직하게 — 동시성엔 공짜가 없다

- **행 잠금은 경합** 을 부릅니다. 인기 상품 하나에 요청이 몰리면 그 행에서 줄을 섭니다. 처리를 짧게(트랜잭션 안에서 외부 호출 금지) 유지해야 합니다.
- **낙관적 잠금** 도 대안입니다 — 버전 컬럼을 두고 "내가 읽은 버전 그대로면 갱신"하고, 충돌 시 재시도. 경합이 낮을 땐 잠금보다 빠릅니다.
- **예약 기록도 공유** 로 옮겼습니다. 취소 시 예약을 되돌리려면 어느 replica가 예약했든 그 기록을 찾아야 하니, 예약도 Postgres에 둡니다.
- **테스트는 반드시 `-race` 로.** 동시성 버그는 평소엔 조용하다가 부하가 몰릴 때 터집니다. 레이스 감지기와 동시성 테스트가 유일하게 믿을 만한 그물입니다.

## 정리 — 스스로 던진 질문이 버그를 잡는다

- 같은 재고에 몰린 동시 요청의 **read-modify-write 레이스** 를, 레이스 감지기로 재현했습니다(예약 유실·오버셀링).
- **원자적 Update** 로 뿌리를 잡았습니다 — 인메모리는 뮤텍스, Postgres는 `FOR UPDATE` 행 잠금.
- 재고를 공유 저장소로 옮겨 **inventory를 여러 replica로** 안전하게 확장했습니다.
- 포트는 그대로라 도메인·유스케이스는 안 바뀌었고, `-race`·testcontainers 테스트로 회귀를 막았습니다.

이 버그는 **좋은 질문 하나** 에서 시작됐습니다. 동시성은 코드를 읽는 것만으론 잘 안 보이고, "동시에 여럿이 오면?"이라고 물어봐야 드러납니다. 분산 시스템을 만들 때 가장 값진 습관은, 늘 그 질문을 스스로에게 던지는 것입니다.

> 이번 편 전체 코드는 리포의 `part-20` 태그에 있습니다.
