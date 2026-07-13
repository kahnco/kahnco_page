---
title: 인증과 인가 — 로그인, JWT, 그리고 "본인 것만"
date: 2025-10-05
description: 지금까지 이 쇼핑몰은 누구나 남의 이름으로 주문하고 남의 주문을 들여다볼 수 있었습니다. customer_id 를 클라이언트가 그냥 적어 보냈으니까요. 13편에서는 이 구멍을 막습니다 — 비밀번호는 bcrypt 로, 로그인은 표준 라이브러리만으로 만든 HS256 JWT 로, 그리고 신원은 오직 토큰에서만. 주문·장바구니를 미들웨어로 감싸 "본인 것만" 만지게 하고, 장바구니→주문 호출에는 토큰을 그대로 이어 흘려 신원을 전파합니다. 이벤트 기반 쇼핑몰 고도화 시리즈 13편입니다.
tags: [인증, 보안, JWT, Go, DDD]
category: [dev, backend]
draft: false
---

주문 여정도, 신뢰성도, 동시성까지도 손봤습니다. 그런데 정작 가장 기본적인 걸 빼먹고 있었습니다. 지금 이 쇼핑몰은 **아무나 남이 될 수 있습니다.**

```bash
# 나는 그냥 "customer_id" 를 적어 보낸다. 서버는 곧이곧대로 믿는다.
curl -X POST /orders -d '{"customer_id":"남의계정","items":[...]}'
# 남의 주문도 번호만 알면 다 보인다.
curl /orders/order_1234
```

신원을 **클라이언트가 자기 입으로 말하게** 두고 있었던 겁니다. 이번 편은 이 구멍을 막습니다.

> 💻 이 편의 코드는 [github.com/kahnco/go-ddd-shop](https://github.com/kahnco/go-ddd-shop) 의 `part-21` 태그에 있습니다.

## 두 단어를 구분하기 — 인증과 인가

- **인증(authentication)**: "당신 누구세요?" — 로그인. 이 사람이 정말 그 사람인지.
- **인가(authorization)**: "그걸 할 권한이 있나요?" — 이 주문이 **본인 것**인지.

둘은 다릅니다. 로그인만 시키고 인가를 빼먹으면, 로그인한 아무나 **남의** 주문을 봅니다. 그래서 이번 편은 두 개를 다 넣습니다.

## 비밀번호는 절대 평문으로 두지 않습니다 — bcrypt

먼저 로그인의 재료인 비밀번호입니다. 평문 저장은 사고입니다. 단순 해시(SHA-256)도 부족합니다 — 레인보우 테이블에 털립니다. **bcrypt** 를 씁니다. 솔트를 내장하고, 비용(cost)을 올려 무차별 대입을 느리게 만듭니다.

```go
type BcryptHasher struct{ cost int }

func (h BcryptHasher) Hash(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), h.cost)
	return string(b), err
}
func (h BcryptHasher) Compare(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
```

도메인의 `Customer` 는 **해시 문자열만** 들고 있습니다. bcrypt 인지 argon2 인지는 인프라의 사정이고, 도메인은 몰라도 됩니다 — 포트와 어댑터의 경계가 여기서도 지켜집니다.

## JWT 를 직접 만들어 봅니다

로그인에 성공하면 뭘 줘야 할까요. 매 요청마다 비밀번호를 다시 보낼 순 없으니, **접근 토큰** 을 줍니다. 저는 외부 라이브러리 대신 **표준 라이브러리만으로** JWT 를 만들었습니다. 실은 JWT 가 별게 아니라서요 — 점(`.`)으로 이어 붙인 **base64url 세 조각**입니다.

```text
eyJhbGc...    .    eyJzdWI...    .    r8k3Jd...
  헤더(alg)          페이로드(claims)        서명(HMAC-SHA256)
```

서명은 `HMAC-SHA256(헤더 + "." + 페이로드, 비밀키)`. 발급은 이게 전부입니다.

```go
func Issue(secret, subject string, ttl time.Duration, now time.Time) (string, error) {
	claims := Claims{Subject: subject, IssuedAt: now.Unix(), ExpiresAt: now.Add(ttl).Unix()}
	payload, _ := json.Marshal(claims)
	signingInput := encodedHeader + "." + b64.EncodeToString(payload)
	return signingInput + "." + sign(secret, signingInput), nil // 서명을 붙인다
}
```

검증은 반대로, **같은 비밀키로 서명을 다시 계산해** 토큰에 붙은 서명과 비교하고, 만료를 확인합니다. 한 가지 조심할 점 — 서명 비교는 **상수 시간** 으로 해야 합니다. 평범한 `==` 는 다른 첫 바이트에서 바로 멈춰서, 응답 시간 차이로 서명을 한 글자씩 맞춰가는 타이밍 공격에 노출됩니다.

```go
if subtle.ConstantTimeCompare([]byte(sign(secret, signingInput)), []byte(parts[2])) != 1 {
	return Claims{}, ErrBadSignature
}
if now.Unix() >= claims.ExpiresAt {
	return Claims{}, ErrExpiredToken
}
```

> 직접 만든 건 "JWT 가 마법이 아니다"를 보여주려는 목적이 큽니다. 실서비스라면 검증된 라이브러리(golang-jwt 등)를 쓰는 게 맞습니다 — `alg:none` 우회, 키 혼동(RS/HS confusion) 같은 함정을 이미 막아두었으니까요. 우리는 HS256 하나만 발급·검증하므로 표면이 좁습니다.

## 미들웨어 — 문 앞에서 한 번만 검사

토큰 검증을 핸들러마다 복붙하면 언젠가 한 곳을 빠뜨립니다. **미들웨어** 로 문 앞에 세웁니다. `Authorization: Bearer <토큰>` 을 검증하고, 통과하면 신원(회원 ID)과 원본 토큰을 컨텍스트에 실어 넘깁니다.

```go
func Middleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := Verify(secret, bearerToken(r), time.Now())
			if err != nil {
				unauthorized(w, err.Error()) // 401
				return
			}
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
```

여기서 의식적으로 고른 지점이 하나 있습니다. mux **전체** 를 감싸지 않고, **보호할 라우트에만** 개별로 두릅니다. `/healthz`·`/readyz`·`/metrics` 는 토큰 없이 열려 있어야 쿠버네티스 probe 와 프로메테우스가 접근하니까요.

```go
mux.Handle("POST /orders", authMW(http.HandlerFunc(h.placeOrder)))
mux.Handle("GET /orders/{id}", authMW(http.HandlerFunc(h.getOrder)))
// /healthz, /metrics 는 감싸지 않는다
```

## 신원은 토큰에서만 — 바디의 customer_id 를 버립니다

이제 핵심입니다. 주문 생성에서 **클라이언트가 보낸 customer_id 를 아예 안 읽습니다.** 신원은 오직 검증된 토큰에서 나옵니다.

```go
// 예전: cmd := app.PlaceOrderCommand{CustomerID: req.CustomerID}  ← 위조 가능
cmd := app.PlaceOrderCommand{CustomerID: auth.Subject(r.Context())} // 토큰의 sub
```

이 한 줄로 "남의 이름으로 주문" 이 불가능해집니다. 클라이언트가 몸통에 뭐라고 적든, 서버는 토큰이 말하는 사람으로만 주문을 만듭니다.

## 인가 — "본인 것만"

로그인했다고 남의 주문까지 보면 안 됩니다. 조회·반품에서 **주문의 주인** 과 **토큰의 신원** 을 맞춰봅니다.

```go
order, err := h.svc.GetOrder(r.Context(), id)
if err != nil { writeError(w, err); return }      // 없으면 404
if string(order.CustomerID()) != auth.Subject(r.Context()) {
	writeForbidden(w) // 남의 주문이면 403
	return
}
```

장바구니도 같은 원리입니다. 경로의 `/carts/{customerId}` 가 토큰 신원과 **다르면 403**. URL 을 손으로 바꿔 남의 장바구니를 들여다볼 수 없습니다.

## 신원도 서비스를 따라 흐릅니다 — 토큰 전파

여기서 재미있는 문제가 하나 생깁니다. 장바구니 **결제** 는 장바구니 서비스가 **주문 서비스를 호출** 해 주문을 만듭니다(동기 호출). 그런데 주문 서비스는 이제 토큰에서 신원을 읽습니다. 장바구니가 주문 서비스를 부를 때 **토큰을 안 넘기면**, 주문 서비스는 "넌 누구냐"며 401 을 던집니다.

해법은 8편에서 이미 본 적 있는 결입니다. 그때 `traceparent`(추적 문맥)를 서비스 홉을 따라 흘려보냈죠. **신원도 똑같이 흘려보냅니다** — 들어온 토큰을 그대로 다음 호출에 얹습니다.

```go
// 장바구니 → 주문 호출. 사용자의 토큰을 그대로 이어 전달한다.
if token := auth.Token(ctx); token != "" {
	req.Header.Set("Authorization", "Bearer "+token)
}
```

그러면 사용자 → 장바구니 → 주문 → (이후 사가) 로 이어지는 흐름에서 **신원 하나가 끝까지 따라갑니다.** 사용자가 자기 토큰으로 결제를 눌렀고, 그 토큰이 만든 주문이니, 주인도 그 사용자입니다. 앞뒤가 맞습니다.

## 정직하게 — 여기서 멈춘 것들

인증은 "다 됐다"가 없는 주제라, 이번 편이 **어디까지** 인지 분명히 해 둡니다.

- **로그인 실패는 존재를 숨깁니다.** 이메일이 없든 비밀번호가 틀리든 **같은 오류**(`이메일 또는 비밀번호가 올바르지 않습니다`)를 돌려줍니다. "그 이메일은 없습니다"라고 친절하면 계정 목록이 새어 나갑니다.
- **대칭 키(HS256)** 를 골랐습니다. 모든 서비스가 같은 비밀키(`JWT_SECRET`)를 공유해 검증합니다. 서비스가 많아져 "발급자만 키를 갖고, 검증자는 공개키로" 가 필요해지면 **RS256(비대칭)** 으로 넘어가면 됩니다.
- **폐기(revocation)** 는 아직 없습니다. JWT 는 무상태라 확장은 쉽지만, 한번 발급하면 만료 전엔 못 막습니다. 그래서 만료를 짧게(여기선 24시간) 두고, 진짜 로그아웃이 필요하면 짧은 액세스 토큰 + 리프레시 토큰 + 폐기 목록을 얹는 게 다음 수순입니다.
- **내부 신뢰 경계.** 장바구니가 회원을 확인하는 `GET /customers/{id}` 같은 **서비스 간** 호출은 아직 열어 뒀습니다. 지금은 클러스터 내부를 신뢰하는 단순화이고, 제대로 하려면 **mTLS 나 서비스 토큰** 으로 서비스끼리도 인증해야 합니다.

이런 걸 숨기지 않고 적어두는 이유는, "인증 붙였음 = 안전함" 이 아니기 때문입니다. 경계를 명시해야 다음에 어디를 막을지 보입니다.

## 정리 — 신원을 서버가 정한다

- 비밀번호는 **bcrypt** 로 해시하고, 로그인 성공 시 표준 라이브러리로 만든 **HS256 JWT** 를 발급합니다.
- **미들웨어** 가 문 앞에서 토큰을 검증하고(헬스·메트릭은 열어 둔 채) 신원을 컨텍스트에 싣습니다.
- 주문의 신원은 **오직 토큰에서** 나옵니다 — 바디의 customer_id 를 버려 위조를 막았습니다.
- 조회·반품·장바구니는 **본인 것만**(소유 검증, 403).
- 장바구니→주문 호출에는 **토큰을 이어 전파** 해, 신원이 서비스 홉을 따라 흐릅니다.

핵심 한 줄은 이겁니다 — **신원은 클라이언트가 말하는 게 아니라, 서버가 토큰으로 정한다.** 그 원칙 하나가 "아무나 남이 되는" 구멍을 닫습니다.

> 이번 편 전체 코드는 리포의 `part-21` 태그에 있습니다.
