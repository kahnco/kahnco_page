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
      { order: 3, title: "성장주는 다르게 봐야 한다 — 지표가 안 통할 때" },
      { order: 4, title: "분산과 포트폴리오 — 계란을 어떻게 나눌까" },
      { order: 5, title: "ETF·인덱스 투자 — 시장을 통째로" },
      { order: 6, title: "사고파는 규율 — 매매와 리스크 관리" },
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
