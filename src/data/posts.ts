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
    "slug": "ai-math-vectors",
    "date": "2026.04.18",
    "title": "세상을 벡터로 놓다 — AI가 데이터를 보는 첫 언어",
    "excerpt": "새 시리즈를 엽니다. '에이전트 직접 짜기'가 AI를 어떻게 만드는지의 실전이었다면, 이 시리즈는 AI가 왜 도는지를 수식으로 차근차근 쌓는 이론입니다. 코드가 아니라 수학으로 증명하며 가죠. 그 첫 질문은 이겁니다. AI는 세상을 대체 어떻게 표현…"
  },
  {
    "slug": "agent-from-scratch-prompt-caching",
    "date": "2026.04.14",
    "title": "매번 다시 읽히지 않게 — 프롬프트 캐싱으로 재전송 비용 줄이기",
    "excerpt": "3편에서 대화 크기는 요약으로 줄였지만, 매 스텝 다시 보내는 게 하나 더 있었습니다. 안 변하는 접두부 — 도구 선언과 시스템 프롬프트요. 이건 매 요청 재전송될 뿐 아니라 매번 다시 처리(입력 토큰 과금)됩니다. 도구 스키마 JSON은 꽤 크고,…"
  },
  {
    "slug": "agent-from-scratch-build-vs-buy",
    "date": "2026.04.10",
    "title": "무엇을 직접 짜고 무엇을 맡길까 — 손으로 짠 골격을 공식과 나란히",
    "excerpt": "1편부터 4편까지 에이전트의 뼈대를 프레임워크 없이 손으로 짰습니다. while 루프, 도구와 예산, 컨텍스트 요약, 메모리까지요. 이제 반대 방향으로 봅니다. 원리를 아는 지금, Anthropic이 공식으로 내놓은 것들(SDK의 Tool Runne…"
  },
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
  }
];

// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.
export const BLOG_POST_COUNT = 85;
