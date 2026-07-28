// 제작 이력(포트폴리오) 단일 소스 — 자사 앱 · 프리랜스/의뢰 · 재직 프로젝트.
// /portfolio 전체 페이지가 이 데이터를 그룹별로 렌더한다.
// (운영 중인 자사 서비스는 services.ts 로 분리 — 사주쿠키 · Atomic Demolition)

export interface PortfolioItem {
  title: string;
  period: string;
  description: string;
  tags: string[];
  href?: string; // 내부 랜딩(예: /yourthoughts)
  playStore?: string;
  appStore?: string;
}

export interface PortfolioGroup {
  key: string;
  label: string;
  items: PortfolioItem[];
}

export const PORTFOLIO: PortfolioGroup[] = [
  {
    key: "product",
    label: "자사 앱",
    items: [
      {
        title: "너의생각 (YourThoughts)",
        period: "앱 · 운영",
        description:
          "주요 커뮤니티와 뉴스의 실시간 트렌드 키워드를 매시간 모아 보여 주는 앱. 로그인 없이 바로 이용합니다.",
        tags: ["Flutter", "Firebase", "실시간 분석"],
        href: "/yourthoughts",
      },
    ],
  },
  {
    key: "freelance",
    label: "프리랜스 · 의뢰",
    items: [
      {
        title: "피어클럽 (PeerClub)",
        period: "2025.06 ~ 현재",
        description:
          "직장인·학생이 관심 클럽에 가입해 업계 소식과 경험을 공유하는 커리어 네트워킹 앱.",
        tags: ["Flutter", "Riverpod", "Firebase", "Hive CE"],
        appStore: "https://apps.apple.com/app/id6503896184",
      },
      {
        title: "축신",
        period: "2024.12 ~ 2026.03",
        description: "축구 코치와 선수를 매칭하는 레슨 플랫폼 앱.",
        tags: ["Flutter", "Riverpod", "Firebase", "In-App Purchase"],
        playStore: "https://play.google.com/store/apps/details?id=com.chukshin.chukshinapp",
        appStore: "https://apps.apple.com/app/id6757080886",
      },
      {
        title: "내인생시계 (LifeTimer)",
        period: "2025.05 ~ 2026.01",
        description:
          "남은 인생을 시각적으로 보여주며 버킷리스트·미래 편지·일정 관리로 의미 있는 삶을 돕는 라이프 매니지먼트 앱.",
        tags: ["Flutter", "Riverpod", "Firebase", "Clean Architecture"],
        playStore: "https://play.google.com/store/apps/details?id=com.mindtimer.timermobileapp",
        appStore: "https://apps.apple.com/app/id6756687886",
      },
    ],
  },
  {
    key: "company",
    label: "재직 프로젝트",
    items: [
      {
        title: "AI 여행 추천 서비스 — Daypli",
        period: "2024.09 ~ 2025.08",
        description: "Flutter 기반 풀스택 앱 설계 및 구현, Firebase 활용 Persistence Layer 구축.",
        tags: ["Flutter", "Firebase", "Dart"],
      },
      {
        title: "인플루언서 기반 여행 서비스",
        period: "2024.04 ~ 2024.09",
        description:
          "Amplify Gen2와 Next.js 결합 풀스택 애플리케이션 개발, AWS CDK 커스터마이징으로 안정화.",
        tags: ["Next.js", "AWS Amplify", "AWS CDK"],
      },
      {
        title: "SaaS 시스템 도입",
        period: "2023.04 ~ 2023.07",
        description:
          "테넌트별 리소스 관리 시스템 설계, IaC 기반 K8s 클러스터 자동화 및 온보딩/아웃보딩 구축.",
        tags: ["Kubernetes", "ArgoCD", "AWS CDK", "GitHub Actions"],
      },
      {
        title: "Python FaaS 서버 및 RPA 시스템",
        period: "2023.04 ~ 2023.12",
        description:
          "AWS Lambda 기반 FaaS 아키텍처로 서버 부하 50% 경감, 플랫폼 OTA 연동 RPA 구축.",
        tags: ["Python", "AWS Lambda", "Serverless"],
      },
      {
        title: "선박 안전 관리 시스템",
        period: "2023.05 ~ 2024.06",
        description:
          "YOLO 기반 탐지 모델 연동 영상 스트리밍 앱 구현, OnPremise 환경 Windows/AOS 앱 개발.",
        tags: ["Flutter", "YOLO", "OnPremise", "Windows"],
      },
      {
        title: "MSA 도입 및 EKS 구축",
        period: "2023.01 ~ 2023.02",
        description: "모놀리식 서버를 MSA로 분리, gRPC 기반 서비스 구현 및 CI/CD 파이프라인 구축.",
        tags: ["AWS EKS", "gRPC", "ArgoCD", "GitHub Actions"],
      },
      {
        title: "진단 서비스 Flutter 마이그레이션",
        period: "2022.08 ~ 2022.12",
        description: "Android Native 앱을 Flutter로 마이그레이션, AOS/iOS/Web 멀티 플랫폼 배포.",
        tags: ["Flutter", "Dart", "Android"],
      },
    ],
  },
];

// 홈 figure("제작 이력 N건")와 동기화되는 총 건수.
export const PORTFOLIO_COUNT = PORTFOLIO.reduce((n, g) => n + g.items.length, 0);
