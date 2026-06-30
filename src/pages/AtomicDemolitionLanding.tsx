import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "분열 (Split)",
    description:
      "타일을 빈 칸으로 드래그하면 원래 값이 절반으로 분열됩니다. 전략적으로 타일을 쪼개 제거 가능한 상태로 만드세요.",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="14" width="8" height="8" rx="1" /><path d="M12 2v8" /><path d="M2 12h8" />
      </svg>
    ),
  },
  {
    title: "소멸 (Pop)",
    description:
      "값이 2인 타일 두 개를 합치면 완전히 소멸됩니다. 모든 타일을 소멸시키면 클리어!",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
      </svg>
    ),
  },
  {
    title: "코어 존 & 장애물",
    description:
      "특정 레벨에서는 코어 존에서만 타일을 제거할 수 있습니다. 납 타일은 이동도 제거도 불가한 영구 장애물입니다.",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: "랭킹 시스템",
    description:
      "레벨별 클리어 시간과 이동 횟수로 다른 플레이어와 순위를 경쟁하세요. Google 계정으로 기록이 자동 동기화됩니다.",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 6 9 6 9z" /><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 18 9 18 9z" /><path d="M4 22h16" /><path d="M10 22V2h4v20" />
      </svg>
    ),
  },
];

const ZONES = [
  { name: "기초 (Basics)", levels: "1-5", color: "text-green-400" },
  { name: "코어 (Core)", levels: "6-12", color: "text-blue-400" },
  { name: "장애물 (Obstacles)", levels: "13-18", color: "text-yellow-400" },
  { name: "확장 (Expansion)", levels: "19-24", color: "text-orange-400" },
  { name: "극한 (Extreme)", levels: "25-30", color: "text-red-400" },
];

export default function AtomicDemolitionLanding() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-[family-name:var(--font-geist-sans)]">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-md">
        <a href="/">
          <img src="/logo.jpg" alt="Kahnco" className="w-8 h-8 rounded" />
        </a>
      </header>

      {/* Hero */}
      <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
        <motion.p
          className="text-sm uppercase tracking-widest text-orange-400 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Strategic Reverse Puzzle
        </motion.p>
        <motion.h1
          className="text-5xl sm:text-7xl font-bold tracking-tight mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Atomic Demolition
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl text-neutral-400 max-w-xl mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          타일을 분열시키고, 소멸시켜라.
          <br />
          5개 존, 30개 레벨의 전략 퍼즐에 도전하세요.
        </motion.p>
        <motion.div
          className="flex gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <a
            href="/atomic-demolition/privacy"
            className="text-sm px-5 py-2.5 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-white/30 transition-colors"
          >
            개인정보처리방침
          </a>
          <a
            href="/atomic-demolition/terms"
            className="text-sm px-5 py-2.5 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-white/30 transition-colors"
          >
            이용약관
          </a>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <motion.h2
          className="text-3xl font-bold text-center mb-16"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          게임 메카닉
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="mb-4 text-orange-400">{feature.icon}</div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Zones */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <motion.h2
          className="text-3xl font-bold text-center mb-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          5개 존
        </motion.h2>
        <motion.p
          className="text-neutral-400 text-center mb-12 text-sm"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          난이도가 점점 올라가는 30개 레벨에 도전하세요.
        </motion.p>
        <div className="space-y-3 max-w-md mx-auto">
          {ZONES.map((zone, i) => (
            <motion.div
              key={zone.name}
              className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.03]"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <span className={`font-semibold ${zone.color}`}>{zone.name}</span>
              <span className="text-sm text-neutral-500">
                Level {zone.levels}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { value: "30", label: "레벨" },
            { value: "5", label: "존" },
            { value: "0.01초", label: "타임어택 정밀도" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <p className="text-2xl font-bold text-orange-400 mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-neutral-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="py-12 px-6 text-center text-xs text-neutral-600 space-y-1">
        <p className="font-medium text-neutral-500">칸코테크 (Kahnco)</p>
        <p>
          <a href="mailto:kahnco@kahnco.me" className="hover:text-blue-400 transition-colors">
            kahnco@kahnco.me
          </a>
        </p>
        <p className="pt-2">© 2026 Kahnco. All rights reserved.</p>
      </footer>
    </div>
  );
}
