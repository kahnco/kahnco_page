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
    slug: "go-sse-realtime",
    date: "2025.11.23",
    title: "이벤트가 브라우저까지 — 폴링을 SSE로 바꾸다",
  },
  {
    slug: "go-admin-rbac",
    date: "2025.11.18",
    title: "역할이 필요해질 때 — 관리자 페이지와 RBAC",
  },
  {
    slug: "go-shop-ui-realtime",
    date: "2025.11.13",
    title: "프런트가 백엔드를 비춘다 — 실시간·검색·재고·세션",
  },
];

// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.
export const BLOG_POST_COUNT = 52;
