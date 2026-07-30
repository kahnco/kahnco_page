// 홈에 노출하는 최신 블로그 글(3편) — 실제 발행 데이터.
// 블로그는 별도 프로젝트(blog/)이므로 최신 글 메타만 여기서 정적으로 동기화한다.
// 새 글을 올리면 이 배열의 맨 위 3개만 최신으로 유지하면 된다.

export interface PostMeta {
  slug: string;
  date: string; // YYYY.MM.DD 표기
  title: string;
}

export const LATEST_POSTS: PostMeta[] = [
  {
    slug: "flutter-mini-provider",
    date: "2026.01.08",
    title: "Provider를 40줄로 만들기 — watch와 read의 정체",
  },
  {
    slug: "flutter-reconciliation-key",
    date: "2026.01.04",
    title: "State가 엉뚱한 행에 남는 이유 — 재조정과 Key",
  },
  {
    slug: "flutter-buildcontext-internals",
    date: "2025.12.28",
    title: "BuildContext 지하 탐사 — Element, 트리, 그리고 단일 스레드",
  },
];

// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.
export const BLOG_POST_COUNT = 60;
