import { motion } from "framer-motion";

const apps = [
  {
    name: "너의생각",
    subtitle: "YourThoughts",
    description: "주요 커뮤니티와 뉴스의 실시간 트렌드 키워드를 매시간 분석하는 앱",
    href: "/yourthoughts",
    color: "emerald",
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    name: "Atomic Demolition",
    subtitle: "아토믹 데몰리션",
    description: "타일을 분열시키고 소멸시키는 전략 퍼즐 게임. 5개 존, 30개 레벨에 도전하세요",
    href: "/atomic-demolition",
    color: "orange",
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20" /><path d="M2 12h20" />
      </svg>
    ),
  },
];

const colorMap: Record<string, { icon: string; hover: string; border: string }> = {
  emerald: {
    icon: "text-emerald-400",
    hover: "hover:bg-emerald-500/[0.06] hover:border-emerald-500/20",
    border: "group-hover:text-emerald-400",
  },
  orange: {
    icon: "text-orange-400",
    hover: "hover:bg-orange-500/[0.06] hover:border-orange-500/20",
    border: "group-hover:text-orange-400",
  },
};

export default function Apps() {
  return (
    <section className="flex flex-col items-center px-6 py-20">
      <motion.h2
        className="text-3xl sm:text-4xl font-bold mb-12"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        Apps
      </motion.h2>

      <div className="flex flex-col sm:flex-row gap-6">
        {apps.map((app, i) => {
          const colors = colorMap[app.color];
          return (
            <motion.a
              key={app.name}
              href={app.href}
              className={`group w-72 p-6 rounded-2xl border border-white/10 bg-white/[0.03] transition-colors ${colors.hover}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            >
              <div className={`mb-4 text-neutral-400 transition-colors ${colors.border}`}>
                {app.icon}
              </div>
              <h3 className="text-lg font-semibold mb-0.5">{app.name}</h3>
              <p className="text-xs text-neutral-500 mb-3">{app.subtitle}</p>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {app.description}
              </p>
            </motion.a>
          );
        })}
      </div>
    </section>
  );
}
