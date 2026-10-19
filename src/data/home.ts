// 홈(사람 이야기) 문구 단일 소스. 사실만 쓴다 — 지어낸 인용·추천사 금지.

export const CAREER_START = { year: 2021, month: 8 }; // 첫 취업

/** 첫 취업월부터 now 까지 만 연차. */
export function careerYears(now: Date): number {
  const months = (now.getFullYear() - CAREER_START.year) * 12 + (now.getMonth() + 1 - CAREER_START.month);
  return Math.floor(months / 12);
}

export const STORY = [
  {
    year: "2021",
    title: "회사에서 전 과정을 배웠습니다",
    body: "Android 앱을 Flutter로 옮기는 일로 시작해, 모놀리식 서버를 MSA로 쪼개고 EKS에 올렸습니다. SaaS 인프라 자동화, 서버리스, 선박 안전 관리 시스템, AI 여행 추천 앱까지 — 앱과 인프라 사이를 다 걸어 봤습니다.",
  },
  {
    year: "2024",
    title: "남의 서비스를 끝까지 만들어 드렸습니다",
    body: "축구 레슨 플랫폼 축신, 커리어 네트워킹 앱 피어클럽, 라이프 매니지먼트 앱 내인생시계, 매장 리워드 서비스 쿠펀. 기획안을 받아 스토어 출시와 인수인계까지 맡았습니다.",
  },
  {
    year: "2026",
    title: "지금은 제 서비스를 만들고 운영합니다",
    body: "그래서요, 사주쿠키, Atomic Demolition을 운영하고, 베라페이블과 더그아웃을 만들고 있습니다.",
    now: true,
  },
];

export const LAYERS = [
  { name: "앱", stack: "Flutter로 Android·iOS 동시에 · Riverpod · 클린 아키텍처 · 인앱결제 · 푸시" },
  { name: "웹", stack: "React · Next.js · TypeScript · 랜딩부터 관리자 화면까지" },
  { name: "서버", stack: "Firebase · Node.js · Python · gRPC · Spring/Kotlin · 소셜 로그인" },
  { name: "인프라", stack: "AWS(CDK·Lambda·EKS·Amplify) · Kubernetes · ArgoCD · GitHub Actions" },
];

export const WAYS = [
  { title: "기획안 한 장이면 시작할 수 있습니다", body: "어디서부터 시작할지 막막해도 괜찮습니다. 설계·개발·배포·운영까지 제가 순서를 잡습니다." },
  { title: "범위와 일정은 계약서로 먼저 정합니다", body: "무엇을 언제까지 만드는지 시작 전에 글로 맞춥니다." },
  { title: "진행 상황은 수시로 보여 드립니다", body: "중간 결과물을 자주 공유하고, 연락에는 빨리 답합니다." },
  { title: "출시 뒤에도 책임집니다", body: "검수 후 하자보수를 드리고, 원하시면 운영과 자동화까지 맡습니다." },
];
