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
    slug: "flutter-async-isolate",
    date: "2026.01.16",
    title: "UI가 얼어붙는 이유 — 이벤트 루프와 아이솔레이트",
  },
  {
    slug: "flutter-renderobject-layout",
    date: "2026.01.12",
    title: "레이아웃이 터지는 이유 — RenderObject와 제약",
  },
  {
    slug: "flutter-mini-provider",
    date: "2026.01.08",
    title: "Provider를 40줄로 만들기 — watch와 read의 정체",
  },
];

// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.
export const BLOG_POST_COUNT = 62;
