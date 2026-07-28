// 칸코테크가 직접 만들고 운영 중인 자사 제품(서비스) 단일 소스.
// 홈의 서비스 색인과 /services 전체 페이지가 이 배열을 공유한다.
// 새 서비스를 서브도메인으로 붙일 때 여기 한 항목만 추가하면 된다.

export interface Service {
  id: string;
  name: string;
  en: string; // 로마자/부제 (색인 우측 표기)
  category: string; // 분류 (예: "운세 · 웹")
  description: string;
  status: "live" | "soon"; // live = 운영 중
  statusLabel: string; // "운영 중" 등
  year?: string; // 시작 연도
  href?: string; // 상세/이동 링크 (서브도메인 또는 내부 랜딩)
  external?: boolean; // 외부(서브도메인) 여부 → 새 탭
}

export const SERVICES: Service[] = [
  {
    id: "sajucookie",
    name: "사주쿠키",
    en: "SajuCookie",
    category: "운세 · 웹",
    description: "생년월일로 사주와 오늘의 운세를 봅니다.",
    status: "live",
    statusLabel: "운영 중",
    year: "2026",
    href: "https://sajucookie.kahnco.me",
    external: true,
  },
  {
    id: "atomic-demolition",
    name: "Atomic Demolition",
    en: "게임",
    category: "퍼즐 · 게임",
    description: "타일을 분열시키고 소멸시키는 전략 퍼즐. 5개 존, 30개 레벨.",
    status: "live",
    statusLabel: "운영 중",
    year: "2026",
    href: "/atomic-demolition",
  },
];

// 서브도메인으로 계속 붙일 예정임을 홈/서비스 색인 끝에 남기는 placeholder.
export const NEXT_SERVICE = {
  name: "다음 서비스",
  description: "각자의 서브도메인으로 이 목록에 더해집니다.",
  statusLabel: "대기",
} as const;
