import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "커뮤니티 키워드 · 언급 빈도 TOP 20",
    description:
      "국내 주요 온라인 커뮤니티에서 가장 많이 언급된 키워드를 실시간으로 확인하세요.",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    title: "커뮤니티 키워드 · 인기도 TOP 20",
    description:
      "추천수와 조회수 기반으로 실제 관심도가 높은 키워드를 순위로 보여드립니다.",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
      </svg>
    ),
  },
  {
    title: "작성자 가입일 분포",
    description:
      "키워드를 탭하면 해당 키워드를 언급한 사용자들의 가입일 분포를 히스토그램으로 확인할 수 있습니다.",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    title: "뉴스 트렌드 키워드 TOP 10",
    description:
      "네이버 뉴스와 구글 뉴스의 실시간 트렌드 키워드를 한눈에 확인하세요.",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8z" />
      </svg>
    ),
  },
];


export default function YourThoughtsLanding() {
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
          className="text-sm uppercase tracking-widest text-emerald-400 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Real-time Trend Monitor
        </motion.p>
        <motion.h1
          className="text-5xl sm:text-7xl font-bold tracking-tight mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          너의생각
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl text-neutral-400 max-w-xl mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          사람들이 지금 무슨 이야기를 하고 있는지,
          <br />
          주요 커뮤니티와 뉴스를 매시간 분석합니다.
        </motion.p>
        <motion.div
          className="flex gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <a
            href="/yourthoughts/privacy"
            className="text-sm px-5 py-2.5 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-white/30 transition-colors"
          >
            개인정보처리방침
          </a>
          <a
            href="/yourthoughts/terms"
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
          주요 기능
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
              <div className="mb-4 text-emerald-400">{feature.icon}</div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Info */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { value: "매시간", label: "데이터 갱신" },
            { value: "다수", label: "커뮤니티 분석" },
            { value: "로그인 불필요", label: "누구나 바로 이용" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="p-6 rounded-2xl border border-white/10 bg-white/[0.03]"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <p className="text-2xl font-bold text-emerald-400 mb-1">
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
