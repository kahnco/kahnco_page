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
    slug: "flutter-gesture-arena",
    date: "2026.01.28",
    title: "끌면 탭이 취소되는 이유 — 제스처 아레나",
  },
  {
    slug: "flutter-animation-internals",
    date: "2026.01.24",
    title: "애니메이션이 도는 법 — Ticker와 AnimationController",
  },
  {
    slug: "flutter-render-pipeline",
    date: "2026.01.20",
    title: "setState부터 픽셀까지 — 한 프레임의 여정",
  },
];

// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.
export const BLOG_POST_COUNT = 65;
