// 칸코테크가 직접 만들고 운영 중인 자사 제품(서비스) 단일 소스.
// 홈의 서비스 색인과 /services 전체 페이지가 이 배열을 공유한다.
// 새 서비스를 서브도메인으로 붙일 때 여기 한 항목만 추가하면 된다.

export interface ServiceLink {
  label: string;
  href: string;
  external?: boolean; // 외부 링크 → 새 탭
}

export interface Service {
  id: string;
  name: string;
  en: string; // 로마자/부제 (색인 우측 표기)
  category: string; // 분류 (예: "운세 · 웹")
  description: string; // 색인용 한 줄
  status: "live" | "soon"; // live = 운영 중
  statusLabel: string; // "운영 중" 등
  year?: string; // 시작 연도
  href?: string; // 색인 행 이동 링크 (서브도메인 또는 내부 랜딩)
  external?: boolean; // 외부(서브도메인) 여부 → 새 탭
  // /services 상세용 (선택)
  platform?: string; // 플랫폼 (예: "웹", "Android")
  intro?: string; // 소개 문단 (사실 기반)
  highlights?: string[]; // 핵심 포인트
  links?: ServiceLink[]; // 바로가기/스토어 등
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
    platform: "웹",
    intro:
      "생년월일을 넣으면 사주를 풀어 오늘의 운세를 보여 주는 웹 서비스입니다. 앱을 설치할 필요 없이 브라우저에서 바로 확인할 수 있고, 자체 서브도메인(sajucookie.kahnco.me)에서 운영합니다.",
    highlights: [
      "생년월일 기반 사주 풀이",
      "오늘의 운세 제공",
      "설치 없이 웹에서 바로 이용",
    ],
    links: [{ label: "사주쿠키 열기 ↗", href: "https://sajucookie.kahnco.me", external: true }],
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
    platform: "Android",
    intro:
      "타일을 빈 칸으로 드래그하면 값이 절반으로 분열되고, 값이 2인 타일 두 개를 합치면 소멸합니다. 판 위의 모든 타일을 소멸시키면 클리어. 기획부터 출시까지 직접 만든 전략 퍼즐 게임으로, 5개 존 30개 레벨을 난이도 순으로 풀어 갑니다.",
    highlights: [
      "분열(Split)·소멸(Pop) 규칙의 역발상 퍼즐",
      "5개 존 · 30개 레벨, 코어 존·장애물 등 변주",
      "레벨별 클리어 타임·이동 수 랭킹 (Google 계정 동기화)",
    ],
    links: [
      {
        label: "Play Store ↗",
        href: "https://play.google.com/store/apps/details?id=com.kahnco.atomic_demolition",
        external: true,
      },
      { label: "소개 페이지", href: "/atomic-demolition" },
    ],
  },
];

// 서브도메인으로 계속 붙일 예정임을 홈/서비스 색인 끝에 남기는 placeholder.
export const NEXT_SERVICE = {
  name: "다음 서비스",
  description: "각자의 서브도메인으로 이 목록에 더해집니다.",
  statusLabel: "대기",
} as const;
