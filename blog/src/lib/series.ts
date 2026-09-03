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
    slug: "ai-math",
    title: "AI의 수학적 기초",
    description:
      "선형대수·확률·최적화 같은 밑바닥 수학에서 출발해, 선형·로지스틱 회귀와 신경망·역전파를 지나 트랜스포머까지, 'AI가 왜 도는지'를 수식으로 차근차근 쌓아 올리는 이론 시리즈입니다. 코드가 아니라 수학으로 증명하며 갑니다. 실전으로 만들어 본 '에이전트 직접 짜기'의 이론적 바닥에 해당합니다.",
    parts: [
      {
        order: 1,
        title: "세상을 벡터로 놓다 — AI가 데이터를 보는 첫 언어",
        slug: "ai-math-vectors",
      },
      { order: 2, title: "거리와 유사도 — 노름과 내적이 재는 것" },
      { order: 3, title: "확률과 불확실성 — 분포·기댓값·베이즈" },
      { order: 4, title: "미분과 경사하강 — 기계가 '배우는' 방식" },
      { order: 5, title: "가장 단순한 학습 — 선형회귀를 끝까지" },
      { order: 6, title: "비선형으로 — 신경망과 역전파" },
      { order: 7, title: "주목이라는 연산 — 트랜스포머로" },
    ],
  },
  {
    slug: "agent-from-scratch",
    title: "에이전트 직접 짜기",
    description:
      "LangChain 같은 프레임워크를 걷어내고, LLM 에이전트를 처음부터 직접 짜며 '에이전트가 실은 무엇인지'를 드러내는 시리즈입니다. Go + raw HTTP 로 Claude API 위에 도구 사용 루프를 손으로 짜고, mock 서버로 검증하며 갑니다. mini-Provider·직접 짠 BLoC 의 AI 버전입니다. 예제는 github.com/kahnco/agent-from-scratch 에 함께 올라갑니다.",
    parts: [
      {
        order: 1,
        title: "에이전트는 결국 while 루프다 — 프레임워크 없이 직접 짜기",
        slug: "agent-from-scratch-loop",
      },
      {
        order: 2,
        title: "도구를 여럿 쥐여주고, 루프가 폭주하지 않게 — 예산과 병렬",
        slug: "agent-from-scratch-tools-budget",
      },
      {
        order: 3,
        title: "대화가 눈덩이처럼 불어난다 — 컨텍스트를 요약해 접기",
        slug: "agent-from-scratch-context",
      },
      {
        order: 4,
        title: "요약이 지운 것을 붙잡다 — 에이전트에게 메모리를 주기",
        slug: "agent-from-scratch-memory",
      },
      {
        order: 5,
        title: "무엇을 직접 짜고 무엇을 맡길까 — 손으로 짠 골격을 공식과 나란히",
        slug: "agent-from-scratch-build-vs-buy",
      },
      {
        order: 6,
        title: "매번 다시 읽히지 않게 — 프롬프트 캐싱으로 재전송 비용 줄이기",
        slug: "agent-from-scratch-prompt-caching",
      },
    ],
  },
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
      {
        order: 3,
        title: "Provider를 40줄로 만들기 — watch와 read의 정체",
        slug: "flutter-mini-provider",
      },
      {
        order: 4,
        title: "레이아웃이 터지는 이유 — RenderObject와 제약",
        slug: "flutter-renderobject-layout",
      },
      {
        order: 5,
        title: "UI가 얼어붙는 이유 — 이벤트 루프와 아이솔레이트",
        slug: "flutter-async-isolate",
      },
      {
        order: 6,
        title: "setState부터 픽셀까지 — 한 프레임의 여정",
        slug: "flutter-render-pipeline",
      },
      {
        order: 7,
        title: "애니메이션이 도는 법 — Ticker와 AnimationController",
        slug: "flutter-animation-internals",
      },
      {
        order: 8,
        title: "끌면 탭이 취소되는 이유 — 제스처 아레나",
        slug: "flutter-gesture-arena",
      },
      {
        order: 9,
        title: "부모 밖 버튼이 안 눌리는 이유 — 히트 테스트",
        slug: "flutter-hit-testing",
      },
    ],
  },
  {
    slug: "flutter-app",
    title: "Flutter 실전 — 작은 앱 제대로 짓기",
    description:
      "지하 탐사에서 얻은 원리로, 작지만 완성된 할 일 앱을 아키텍처부터 테스트까지 제대로 짓는 실전 시리즈입니다. 클린 아키텍처 · BLoC · 의존성 주입을 실제 코드로 쌓아 올리며, 커져도 무너지지 않는 골격을 몸에 익히는 것을 목표로 합니다. 예제는 github.com/kahnco/flutter-study 에 함께 올라갑니다.",
    parts: [
      {
        order: 1,
        title: "UI를 한 줄도 안 짜고 앱을 시작하는 이유 — 뼈대부터 세우기",
        slug: "flutter-app-architecture",
      },
      {
        order: 2,
        title: "flutter_bloc을 지우고 BLoC을 60줄로 짠 이유",
        slug: "flutter-app-bloc-from-scratch",
      },
      {
        order: 3,
        title: "화면을 붙이다 — BlocProvider를 직접 짜서 트리에 얹기",
        slug: "flutter-app-wiring-ui",
      },
      {
        order: 4,
        title: "저장소를 sqflite로 갈아 끼우는데 도메인은 한 줄도 안 고쳤다",
        slug: "flutter-app-sqflite",
      },
      {
        order: 5,
        title: "조립된 앱이 진짜로 도는지 — 통합 테스트로 시리즈를 닫다",
        slug: "flutter-app-integration-finale",
      },
      {
        order: 6,
        title: "검색·필터를 SQL로 안 내리고 화면에 둔 이유",
        slug: "flutter-app-search-filter",
      },
      {
        order: 7,
        title: "미뤄 둔 것을 구현할 때 — SQL 검색과 디바운스",
        slug: "flutter-app-sql-search-debounce",
      },
      {
        order: 8,
        title: "전부 올리지 않는다 — 페이징과 무한 스크롤",
        slug: "flutter-app-pagination",
      },
      {
        order: 9,
        title: "offset은 왜 밀리나 — keyset 페이징으로 갈아타기",
        slug: "flutter-app-keyset-pagination",
      },
      {
        order: 10,
        title: "이미 깔린 DB에 인덱스 더하기 — 스키마 마이그레이션",
        slug: "flutter-app-migration-index",
      },
      {
        order: 11,
        title: "LIKE를 버리고 FTS5로 — 진짜 전문 검색",
        slug: "flutter-app-fts5-search",
      },
      {
        order: 12,
        title: "CRUD의 빈칸 채우기 — 수정도 값 객체로 재검증한다",
        slug: "flutter-app-edit-todo",
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
