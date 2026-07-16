import { motion } from "framer-motion";

interface Project {
  title: string;
  period: string;
  description: string;
  tags: string[];
  playStore?: string;
  appStore?: string;
}

const personalProjects: Project[] = [
  {
    title: "Atomic Demolition",
    period: "2026",
    description:
      "타일을 분열시키고 소멸시키는 전략 퍼즐 게임. 5개 존, 30개 레벨에 도전하는 캐주얼 게임을 기획부터 출시까지 직접 만들었습니다.",
    tags: ["Flutter", "Dart", "Firebase", "AdMob"],
    playStore: "https://play.google.com/store/apps/details?id=com.kahnco.atomic_demolition",
  },
];

const companyProjects: Project[] = [
  {
    title: "AI 여행 추천 서비스 - Daypli",
    period: "2024.09 ~ 2025.08",
    description: "Flutter 기반 풀스택 앱 설계 및 구현, Firebase 활용 Persistence Layer 구축",
    tags: ["Flutter", "Firebase", "Dart"],
  },
  {
    title: "인플루언서 기반 여행 서비스",
    period: "2024.04 ~ 2024.09",
    description: "Amplify Gen2와 Next.js 결합 풀스택 애플리케이션 개발, AWS CDK 커스터마이징으로 안정화",
    tags: ["Next.js", "AWS Amplify", "AWS CDK"],
  },
  {
    title: "SaaS 시스템 도입",
    period: "2023.04 ~ 2023.07",
    description: "테넌트별 리소스 관리 시스템 설계, IaC 기반 K8s 클러스터 자동화 및 온보딩/아웃보딩 구축",
    tags: ["Kubernetes", "ArgoCD", "AWS CDK", "GitHub Actions"],
  },
  {
    title: "Python FaaS 서버 및 RPA 시스템",
    period: "2023.04 ~ 2023.12",
    description: "AWS Lambda 기반 FaaS 아키텍처로 서버 부하 50% 경감, 플랫폼 OTA 연동 RPA 구축",
    tags: ["Python", "AWS Lambda", "Serverless"],
  },
  {
    title: "선박 안전 관리 시스템",
    period: "2023.05 ~ 2024.06",
    description: "Yolo 기반 탐지 모델 연동 영상 스트리밍 앱 구현, OnPremise 환경 Windows/AOS 앱 개발",
    tags: ["Flutter", "YOLO", "OnPremise", "Windows"],
  },
  {
    title: "MSA 도입 및 EKS 구축",
    period: "2023.01 ~ 2023.02",
    description: "모놀리식 서버를 MSA로 분리, gRPC 기반 서비스 구현 및 CI/CD 파이프라인 구축",
    tags: ["AWS EKS", "gRPC", "ArgoCD", "GitHub Actions"],
  },
  {
    title: "진단 서비스 Flutter 마이그레이션",
    period: "2022.08 ~ 2022.12",
    description: "Android Native 앱을 Flutter로 마이그레이션, AOS/iOS/Web 멀티 플랫폼 배포",
    tags: ["Flutter", "Dart", "Android"],
  },
];

const freelanceProjects: Project[] = [
  {
    title: "피어클럽 (PeerClub)",
    period: "2025.06 ~ 현재",
    description: "직장인·학생이 관심 클럽에 가입해 업계 소식과 경험을 공유하는 커리어 네트워킹 앱",
    tags: ["Flutter", "Riverpod", "Firebase", "Hive CE"],
    appStore: "https://apps.apple.com/app/id6503896184",
  },
  {
    title: "축신",
    period: "2024.12 ~ 2026.03",
    description: "축구 코치와 선수를 매칭하는 레슨 플랫폼 앱",
    tags: ["Flutter", "Riverpod", "Firebase", "In-App Purchase"],
    playStore: "https://play.google.com/store/apps/details?id=com.chukshin.chukshinapp",
    appStore: "https://apps.apple.com/app/id6757080886",
  },
  {
    title: "내인생시계 (LifeTimer)",
    period: "2025.05 ~ 2026.01",
    description: "남은 인생을 시각적으로 보여주며, 버킷리스트·미래 편지·일정 관리를 통해 의미 있는 삶을 돕는 라이프 매니지먼트 앱",
    tags: ["Flutter", "Riverpod", "Firebase", "Clean Architecture"],
    playStore: "https://play.google.com/store/apps/details?id=com.mindtimer.timermobileapp",
    appStore: "https://apps.apple.com/app/id6756687886",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4 }}
      className="group p-6 rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:bg-blue-500/[0.06] hover:border-blue-500/20"
    >
      <h3 className="text-lg font-semibold leading-snug mb-1">{project.title}</h3>
      <p className="text-xs text-neutral-500 mb-3">{project.period}</p>
      <p className="text-sm text-neutral-400 leading-relaxed mb-4">
        {project.description}
      </p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-neutral-400 border border-white/5"
          >
            {tag}
          </span>
        ))}
      </div>
      {(project.appStore || project.playStore) && (
        <div className="flex gap-3 pt-2 border-t border-white/5">
          {project.appStore && (
            <a
              href={project.appStore}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              App Store
            </a>
          )}
          {project.playStore && (
            <a
              href={project.playStore}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.3 2.3-8.636-8.632z" />
              </svg>
              Play Store
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ProjectGrid({ label, projects }: { label: string; projects: Project[] }) {
  return (
    <div className="max-w-4xl w-full mb-16">
      <motion.p
        className="text-sm uppercase tracking-widest text-neutral-500 mb-6"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {label}
      </motion.p>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
      >
        {projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </motion.div>
    </div>
  );
}

export default function Projects() {
  return (
    <section className="flex flex-col items-center px-6 py-20">
      <motion.h2
        className="text-3xl sm:text-4xl font-bold mb-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        Projects
      </motion.h2>

      <ProjectGrid label="Personal" projects={personalProjects} />
      <ProjectGrid label="Freelance" projects={freelanceProjects} />
      <ProjectGrid label="Company" projects={companyProjects} />
    </section>
  );
}
