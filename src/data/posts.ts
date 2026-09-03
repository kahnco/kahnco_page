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
    "slug": "agent-from-scratch-memory",
    "date": "2026.04.06",
    "title": "요약이 지운 것을 붙잡다 — 에이전트에게 메모리를 주기",
    "excerpt": "3편에서 대화를 요약해 접었지만, 요약은 손실 압축이라 정말 잃으면 안 되는 사실(파일 경로, 확정된 결정)이 함께 날아갈 수 있었습니다. 이번 편에 그걸 붙잡습니다. 에이전트에게 대화 밖에 사는 key-value 메모리를 주고, memory_wri…"
  },
  {
    "slug": "agent-from-scratch-context",
    "date": "2026.04.02",
    "title": "대화가 눈덩이처럼 불어난다 — 컨텍스트를 요약해 접기",
    "excerpt": "에이전트 루프는 한 바퀴 돌 때마다 대화(messages)에 모델의 말과 도구 결과를 이어 붙입니다. 그런데 매 스텝 그 전체를 다시 API로 보내죠. 그래서 대화는 눈덩이처럼 불어나 토큰이 O(n²)으로 커지고, 비싸지고 느려지다 결국 컨텍스트 윈…"
  },
  {
    "slug": "agent-from-scratch-tools-budget",
    "date": "2026.03.29",
    "title": "도구를 여럿 쥐여주고, 루프가 폭주하지 않게 — 예산과 병렬",
    "excerpt": "1편에서 에이전트가 while 루프 하나임을 봤지만, 그 루프엔 구멍이 둘 있었습니다. 도구가 하나뿐이었고, 종료 조건이 \"모델이 멈출 때\"뿐이라 모델이 도구를 끝없이 부르면 루프가 안 끝나 비용 폭탄이 되죠. 이번 편에 둘을 메웁니다. 도구를 레지…"
  },
  {
    "slug": "agent-from-scratch-loop",
    "date": "2026.03.25",
    "title": "에이전트는 결국 while 루프다 — 프레임워크 없이 직접 짜기",
    "excerpt": "AI 에이전트가 요즘 화두지만, LangChain 같은 프레임워크가 그 실체를 두껍게 감싸고 있습니다. Flutter 시리즈에서 provider를 40줄로, flutter_bloc을 60줄로 직접 짜 봤듯, 에이전트도 프레임워크를 걷어내고 직접 짜…"
  },
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
  }
];

// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.
export const BLOG_POST_COUNT = 82;
