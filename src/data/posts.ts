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
    slug: "flutter-app-pagination",
    date: "2026.03.05",
    title: "전부 올리지 않는다 — 페이징과 무한 스크롤",
  },
  {
    slug: "flutter-app-sql-search-debounce",
    date: "2026.03.01",
    title: "미뤄 둔 것을 구현할 때 — SQL 검색과 디바운스",
  },
  {
    slug: "flutter-app-search-filter",
    date: "2026.02.25",
    title: "검색·필터를 SQL로 안 내리고 화면에 둔 이유",
  },
];

// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.
export const BLOG_POST_COUNT = 74;
