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
    slug: "flutter-buildcontext-internals",
    date: "2026.07.30",
    title: "BuildContext 지하 탐사 — Element, 트리, 그리고 단일 스레드",
  },
  {
    slug: "go-secrets-management",
    date: "2025.12.23",
    title: "평문을 지우며 — 시크릿 관리, 그리고 시리즈를 닫으며",
  },
  {
    slug: "go-promotion-ops",
    date: "2025.12.18",
    title: "돌려놓고 보이게 — 이벤트 메트릭·k8s 배포·부하 게이트 CI",
  },
];

// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.
export const BLOG_POST_COUNT = 58;
