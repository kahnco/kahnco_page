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
      { order: 4, title: "신뢰할 수 있는 이벤트 — 아웃박스와 멱등성" },
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
