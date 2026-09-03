// 자동 생성 파일 — scripts/generate-home-posts.mjs 가 blog/src/posts 에서 뽑아 만든다.
// 직접 수정하지 말 것. 새 글을 올리면 build 시 자동으로 갱신된다.

export interface PostMeta {
  slug: string;
  date: string; // YYYY.MM.DD 표기
  title: string;
  excerpt: string;
}

export const LATEST_POSTS: PostMeta[] = [
  {
    "slug": "flutter-app-edit-todo",
    "date": "2026.03.21",
    "title": "CRUD의 빈칸 채우기 — 수정도 값 객체로 재검증한다",
    "excerpt": "지금까지 앱은 추가·토글·삭제는 했지만 제목 수정이 없었습니다. CRUD의 U(Update)가 비어 있었죠. 이번 편에 그 빈칸을 채웁니다. 핵심은 수정도 추가와 똑같이 도메인 값 객체(TodoTitle)로 재검증한다는 것 — 빈 제목·과길이는 편집…"
  },
  {
    "slug": "flutter-app-fts5-search",
    "date": "2026.03.17",
    "title": "LIKE를 버리고 FTS5로 — 진짜 전문 검색",
    "excerpt": "7편부터 계속 미뤄온 숙제입니다. 제목 검색을 LIKE '%…%'로 짜면서 매 편 \"정직하게\" 절에 \"이건 인덱스를 못 타니 진짜 검색은 FTS의 몫\"이라고 적어 왔죠. 이번 편에 그걸 갚습니다. SQLite의 FTS5 가상 테이블로 제목을 역색인하…"
  },
  {
    "slug": "flutter-app-migration-index",
    "date": "2026.03.13",
    "title": "이미 깔린 DB에 인덱스 더하기 — 스키마 마이그레이션",
    "excerpt": "9편에서 keyset 페이징을 짜며 \"인덱스가 있으면 O(log n), 근데 인덱스를 더하려면 스키마 버전을 올려야 하고 그건 다음 숙제\"라고 미뤘습니다. 이번 편에 그걸 갚습니다. keyset 정렬 키에 복합 인덱스를 거는 것 자체는 CREATE…"
  },
  {
    "slug": "flutter-app-keyset-pagination",
    "date": "2026.03.09",
    "title": "offset은 왜 밀리나 — keyset 페이징으로 갈아타기",
    "excerpt": "8편에서 페이징을 offset(LIMIT/OFFSET)으로 짰고, \"정직하게\" 절에 이렇게 적었습니다 — offset은 페이지 사이에 목록이 바뀌면 항목을 건너뛰거나 중복하고, 그럴 땐 keyset이 답이라고요. 이번 편에서 그 keyset(curs…"
  },
  {
    "slug": "flutter-app-pagination",
    "date": "2026.03.05",
    "title": "전부 올리지 않는다 — 페이징과 무한 스크롤",
    "excerpt": "7편의 마지막 숙제였던 페이징을 구현합니다. 목록이 수천 건이면 한 번에 다 올릴 수 없으니, LIMIT/OFFSET으로 한 페이지씩 끊어 오고 바닥에 닿으면 이어 붙이죠. \"다음 페이지가 있는지\"를 별도 카운트 없이 N+1로 아는 기법, Scrol…"
  },
  {
    "slug": "flutter-app-sql-search-debounce",
    "date": "2026.03.01",
    "title": "미뤄 둔 것을 구현할 때 — SQL 검색과 디바운스",
    "excerpt": "6편에서 \"목록이 커지면 검색을 SQL로 내리고 디바운스가 필요하다\"고 미뤄 뒀습니다. 이번 편에서 그걸 실제로 구현합니다. 조회 조건을 도메인 값(TodoQuery)으로 만들어 계약을 따라 내려보내고, sqflite가 WHERE/LIKE로 걸러 오…"
  },
  {
    "slug": "flutter-app-search-filter",
    "date": "2026.02.25",
    "title": "검색·필터를 SQL로 안 내리고 화면에 둔 이유",
    "excerpt": "시리즈를 닫았다고 했는데, 앱을 쓰다 보니 검색과 필터가 필요해졌습니다. 지금까지의 반사신경은 \"규칙은 도메인에, 저장은 SQL에\"였죠(1·4편). 그런데 이번엔 반대로, 검색·필터를 아래 계층으로 내리지 않고 화면(bloc)에 뒀습니다. 목록이 이…"
  },
  {
    "slug": "flutter-app-integration-finale",
    "date": "2026.02.21",
    "title": "조립된 앱이 진짜로 도는지 — 통합 테스트로 시리즈를 닫다",
    "excerpt": "계층마다 테스트는 다 초록이었습니다. 그런데 실제 컨테이너로 조립하고 실제 SQLite에 붙였을 때 전부 맞물려 도는지는, 따로 증명해야 합니다. 실제 조립 루트로 앱을 부팅해 bloc→유스케이스→repository→sqflite까지 관통하고, 파일…"
  },
  {
    "slug": "flutter-app-sqflite",
    "date": "2026.02.17",
    "title": "저장소를 sqflite로 갈아 끼우는데 도메인은 한 줄도 안 고쳤다",
    "excerpt": "앱을 끄면 할 일이 사라졌습니다. 인메모리였으니까요. 이제 진짜 SQLite(sqflite)를 붙입니다. 그런데 저장소를 통째로 바꾸는데 도메인도, 유스케이스도, bloc도, 화면도 한 줄을 안 고쳤습니다 — 1편에서 prod/fake로 갈라 둔 그…"
  }
];

// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.
export const BLOG_POST_COUNT = 78;
