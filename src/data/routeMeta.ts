// 라우트별 <title>/<meta description> 단일 소스.
// 클라이언트(useDocumentMeta)와 빌드타임 프리렌더(scripts/prerender.mjs)가 함께 쓴다.
// 프리렌더 대상 라우트 = 이 객체의 키.

export interface RouteMeta {
  title: string;
  description: string;
}

export const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "칸코테크 — 만들고, 직접 운영합니다",
    description:
      "칸코테크(Kahnco)는 웹·앱 서비스를 직접 만들고 운영하는 소프트웨어 스튜디오입니다. 사주쿠키·Atomic Demolition 등을 운영합니다.",
  },
  "/services": {
    title: "서비스 — 칸코테크",
    description:
      "칸코테크가 직접 만들고 운영 중인 서비스 목록. 각 서비스는 자체 서브도메인으로 운영됩니다.",
  },
  "/portfolio": {
    title: "포트폴리오 — 칸코테크",
    description:
      "칸코테크·이현준이 자사 앱, 프리랜스·의뢰, 재직으로 만든 앱·웹 제작 이력입니다.",
  },
  "/yourthoughts": {
    title: "너의생각 — 실시간 트렌드 모니터 | 칸코테크",
    description:
      "주요 커뮤니티와 뉴스의 실시간 트렌드 키워드를 매시간 분석해 보여 주는 앱, 너의생각(YourThoughts).",
  },
  "/yourthoughts/privacy": {
    title: "너의생각 개인정보처리방침 | 칸코테크",
    description: "너의생각(YourThoughts) 개인정보처리방침입니다.",
  },
  "/yourthoughts/terms": {
    title: "너의생각 이용약관 | 칸코테크",
    description: "너의생각(YourThoughts) 이용약관입니다.",
  },
  "/atomic-demolition": {
    title: "Atomic Demolition — 전략 퍼즐 게임 | 칸코테크",
    description:
      "타일을 분열시키고 소멸시키는 전략 퍼즐 게임. 5개 존, 30개 레벨의 Atomic Demolition.",
  },
  "/atomic-demolition/privacy": {
    title: "Atomic Demolition 개인정보처리방침 | 칸코테크",
    description: "Atomic Demolition 개인정보처리방침입니다.",
  },
  "/atomic-demolition/terms": {
    title: "Atomic Demolition 이용약관 | 칸코테크",
    description: "Atomic Demolition 이용약관입니다.",
  },
};
