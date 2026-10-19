// 칸코테크가 직접 만들고 운영하는(또는 만들고 있는) 서비스 단일 소스.
// 홈의 '만든 것' 레일과 /services 타일이 이 배열을 공유한다. 순서 = 노출 순서.

export type ServiceStatus = "live" | "beta" | "building";

export interface ServiceShot {
  src: string; // public/ 기준 경로
  frame: "browser" | "phone";
  url?: string; // 브라우저 틀 주소창 표기
  alt: string;
}

export interface Service {
  id: string;
  name: string;
  kind: string; // "AI 토론 · 웹"
  tagline: string; // 타일 한 줄 (사실만)
  status: ServiceStatus;
  statusLabel: string;
  href?: string;
  external?: boolean; // 외부 링크 → 새 탭
  cta?: string; // 링크 문구 (기본 "사용해 보기")
  shot?: ServiceShot;
}

export const SERVICES: Service[] = [
  {
    id: "sowhat",
    name: "그래서요",
    kind: "AI 토론 · 웹",
    tagline: "AI가 항상 당신의 반대편에 섭니다.",
    status: "live",
    statusLabel: "운영 중",
    href: "https://sowhat.run",
    external: true,
    shot: { src: "/shots/sowhat.png", frame: "browser", url: "sowhat.run", alt: "그래서요 첫 화면" },
  },
  {
    id: "sajucookie",
    name: "사주쿠키",
    kind: "운세 · 웹",
    tagline: "생년월일로 사주와 오늘의 운세를 봅니다.",
    status: "live",
    statusLabel: "운영 중",
    href: "https://sajucookie.kahnco.me",
    external: true,
    shot: { src: "/shots/sajucookie.png", frame: "phone", alt: "사주쿠키 모바일 화면" },
  },
  {
    id: "atomic-demolition",
    name: "Atomic Demolition",
    kind: "퍼즐 · Android",
    tagline: "타일을 분열시키고 소멸시키는 전략 퍼즐. 5개 존, 30개 레벨.",
    status: "live",
    statusLabel: "운영 중",
    href: "/atomic-demolition",
    cta: "자세히 보기",
    shot: { src: "/shots/atomic.png", frame: "phone", alt: "Atomic Demolition 레벨 선택 화면" },
  },
  {
    id: "verafable",
    name: "베라페이블",
    kind: "AI 캐릭터 · 앱/웹",
    tagline: "얼굴을 드러내지 않는 AI 캐릭터 스튜디오.",
    status: "beta",
    statusLabel: "비공개 베타 모집 중",
    href: "https://verafable.com",
    external: true,
    cta: "둘러보기",
    shot: { src: "/shots/verafable.jpg", frame: "browser", url: "verafable.com", alt: "베라페이블 첫 화면" },
  },
  {
    id: "dugout",
    name: "더그아웃",
    kind: "야구 시뮬레이션 · 웹",
    tagline: "야구 시뮬레이션 웹 게임을 만들고 있습니다.",
    status: "building",
    statusLabel: "개발 중",
  },
];

export const LIVE_SERVICES = SERVICES.filter((s) => s.status === "live");
export const UPCOMING_SERVICES = SERVICES.filter((s) => s.status !== "live");
export const LIVE_COUNT = LIVE_SERVICES.length;
