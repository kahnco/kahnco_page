// 커리큘럼(순서 있는 시리즈) 정의.
// 순서대로 읽으면 한 주제를 이해할 수 있도록 묶은 글 묶음이다.
// 각 편은 slug 가 있으면 작성된 글(링크됨), 없으면 "예정"으로 표시된다.
// 어떤 글이 어느 시리즈에 속하는지는 여기 slug 목록으로 결정된다(별도 frontmatter 불필요).

export interface SeriesPart {
  order: number;
  title: string;
  slug?: string; // 없으면 아직 작성 전(예정)
}

export interface Series {
  slug: string;
  title: string;
  description: string;
  parts: SeriesPart[];
}

export const SERIES: Series[] = [
  {
    slug: "stocks-basics",
    title: "주식 투자 기초",
    description: "순서대로 읽으면 주식 투자의 기본기를 잡을 수 있도록 순서를 잡은 글들입니다.",
    parts: [
      { order: 1, title: "시작하기 전에 — 마인드셋과 가격의 원리", slug: "stocks-before-you-start" },
      { order: 2, title: "기업 가치 읽기 — PER·PBR·ROE", slug: "reading-valuation-metrics" },
      { order: 3, title: "성장주는 다르게 봐야 한다 — 지표가 안 통할 때", slug: "valuing-growth-stocks" },
      { order: 4, title: "분산과 포트폴리오 — 계란을 어떻게 나눌까", slug: "diversification-and-portfolio" },
      { order: 5, title: "ETF·인덱스 투자 — 시장을 통째로", slug: "etf-and-index-investing" },
      { order: 6, title: "사고파는 규율 — 매매와 리스크 관리", slug: "trading-discipline" },
    ],
  },
  {
    slug: "ddd-shop",
    title: "Go 이벤트 기반 쇼핑몰 만들기",
    description: "DDD 설계부터 쿠버네티스 배포까지, 이벤트 기반 쇼핑몰을 Go로 직접 만들어보는 실전 시리즈입니다. 코드는 github.com/kahnco/go-ddd-shop 에 편별 태그로 함께 올라갑니다.",
    parts: [
      { order: 1, title: "DDD로 쇼핑몰 도메인 설계하기", slug: "ddd-shop-domain-design" },
      { order: 2, title: "TDD로 Go 도메인 모델링하기", slug: "go-domain-modeling" },
      { order: 3, title: "유스케이스와 API — 도는 서비스 완성", slug: "go-usecases-and-api" },
      { order: 4, title: "이벤트로 컨텍스트 잇기 (EDD)", slug: "go-events-across-contexts" },
      { order: 5, title: "컨테이너에 담기", slug: "go-containerizing" },
      { order: 6, title: "로컬 쿠버네티스에 배포", slug: "go-kubernetes-deploy" },
      { order: 7, title: "상태·설정·스케일링", slug: "go-state-config-scaling" },
      { order: 8, title: "CI/CD와 관찰성", slug: "go-cicd-observability" },
    ],
  },
  {
    slug: "ddd-shop-advanced",
    title: "Go 쇼핑몰 고도화하기",
    description:
      "8편 시리즈로 만든 이벤트 기반 쇼핑몰을, 주문 여정이 끝까지 실제로 흐르도록 완성하고 리팩터링으로 다듬는 심화 시리즈입니다. 결제·배송·카탈로그를 붙여 사가를 닫고, 아웃박스·멱등성으로 신뢰성을 끌어올립니다. 코드는 github.com/kahnco/go-ddd-shop 에 이어서 태그로 올라갑니다.",
    parts: [
      { order: 1, title: "사가를 닫다 — 결제 서비스와 자동 취소", slug: "go-saga-payment" },
      { order: 2, title: "배송과 완전한 보상", slug: "go-shipping-compensation" },
      { order: 3, title: "상품 카탈로그 — 진짜 상품과 가격", slug: "go-product-catalog" },
      { order: 4, title: "신뢰할 수 있는 이벤트 — 아웃박스와 멱등성", slug: "go-outbox-idempotency" },
      { order: 5, title: "영속 스트림 — JetStream과 내구 소비자", slug: "go-jetstream" },
      { order: 6, title: "회원과 장바구니 — 사용자 흐름 얹기", slug: "go-customer-cart" },
      { order: 7, title: "읽기 모델 강화 — CQRS로 내 주문 목록", slug: "go-readmodel-cqrs" },
      { order: 8, title: "분산추적 — OpenTelemetry로 흐름을 보다", slug: "go-opentelemetry" },
      { order: 9, title: "아웃박스 신뢰성 — 다중 replica에서 중복 없이", slug: "go-outbox-reliability" },
      { order: 10, title: "검색과 집계 — 하나의 스트림, 여러 읽기 모델", slug: "go-readmodel-search" },
      { order: 11, title: "환불과 반품 — 배송 뒤에 시작되는 사가", slug: "go-refund-return" },
      { order: 12, title: "동시성 — 재고에 몰린 요청의 레이스 컨디션", slug: "go-concurrency-stock" },
      { order: 13, title: "인증과 인가 — 로그인·JWT·본인 것만", slug: "go-auth-jwt" },
      { order: 14, title: "죽은 편지함 — 실패한 이벤트는 어디로 가나", slug: "go-dlq-retry" },
      { order: 15, title: "이벤트 스키마 진화 — 옛 이벤트를 어떻게 읽을까", slug: "go-schema-evolution" },
      { order: 16, title: "메트릭과 SLO — 무엇을 재고, 어디까지 괜찮은가", slug: "go-metrics-slo" },
      { order: 17, title: "프런트를 붙이니 보이는 것들 — BFF로 CORS 지우기", slug: "go-web-bff" },
      { order: 18, title: "docker compose up 하나로 — Next.js를 풀스택 컴포즈에", slug: "go-compose-nextjs" },
      { order: 19, title: "테스트가 아키텍처를 드러낸다 — Next.js 전 계층 테스트", slug: "go-frontend-testing" },
      { order: 20, title: "테스트는 하나의 렌즈가 아니다 — 접근성·시각·부하", slug: "go-testing-lenses" },
      { order: 21, title: "프런트가 백엔드를 비춘다 — 실시간·검색·재고·세션", slug: "go-shop-ui-realtime" },
      { order: 22, title: "역할이 필요해질 때 — 관리자 페이지와 RBAC", slug: "go-admin-rbac" },
      { order: 23, title: "이벤트가 브라우저까지 — 폴링을 SSE로", slug: "go-sse-realtime" },
      { order: 24, title: "정확히 1000번째 — 이벤트 당첨자를 어떻게 정할까", slug: "go-exact-nth-winner" },
      { order: 25, title: "당첨자를 놓치지 않으려면 — 아웃박스·큐 완충·어뷰징 방어", slug: "go-promotion-hardening" },
      { order: 26, title: "여러 대로 나눠도 — 분산 레이트리밋·SSE 통지·부하로 재본 큐 완충", slug: "go-promotion-scale" },
      { order: 27, title: "정말 여러 대로 — 내구 접수·SSE 팬아웃·분산락 종료 배치", slug: "go-promotion-multiinstance" },
      { order: 28, title: "돌려놓고 보이게 — 이벤트 메트릭·k8s 배포·부하 게이트 CI", slug: "go-promotion-ops" },
      { order: 29, title: "평문을 지우며 — 시크릿 관리, 그리고 시리즈를 닫으며", slug: "go-secrets-management" },
    ],
  },
  {
    slug: "flutter-underground",
    title: "Flutter 지하 탐사",
    description:
      "표면 API를 넘어, Flutter가 '왜 이렇게 도는지'를 내부 구조까지 파고드는 심화 시리즈입니다. 다른 언어·플랫폼에 익숙한 개발자가 Flutter를 지하까지 이해하고 쓰는 것을 목표로, 말이 아니라 돌아가는 코드로 증명하며 갑니다. 예제는 github.com/kahnco/flutter-study 에 함께 올라갑니다.",
    parts: [
      {
        order: 1,
        title: "BuildContext 지하 탐사 — Element, 트리, 그리고 단일 스레드",
        slug: "flutter-buildcontext-internals",
      },
      {
        order: 2,
        title: "State가 엉뚱한 행에 남는 이유 — 재조정과 Key",
        slug: "flutter-reconciliation-key",
      },
    ],
  },
];

/** 주어진 글 slug 이 속한 시리즈와 그 안에서의 위치(1-based)를 찾는다. */
export function seriesForPost(
  postSlug: string,
): { series: Series; part: SeriesPart; position: number; total: number } | undefined {
  for (const series of SERIES) {
    const idx = series.parts.findIndex((p) => p.slug === postSlug);
    if (idx !== -1) {
      return {
        series,
        part: series.parts[idx],
        position: idx + 1,
        total: series.parts.length,
      };
    }
  }
  return undefined;
}
