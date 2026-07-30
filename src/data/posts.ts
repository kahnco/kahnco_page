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
    slug: "flutter-app-wiring-ui",
    date: "2026.02.13",
    title: "화면을 붙이다 — BlocProvider를 직접 짜서 트리에 얹기",
  },
  {
    slug: "flutter-app-bloc-from-scratch",
    date: "2026.02.09",
    title: "flutter_bloc을 지우고 BLoC을 60줄로 짠 이유",
  },
  {
    slug: "flutter-app-architecture",
    date: "2026.02.05",
    title: "UI를 한 줄도 안 짜고 앱을 시작하는 이유 — 뼈대부터 세우기",
  },
];

// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.
export const BLOG_POST_COUNT = 69;
