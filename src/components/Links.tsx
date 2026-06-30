import { motion } from "framer-motion";

const links = [
  {
    name: "GitHub",
    url: "https://github.com/ggj0418",
    description: "코드와 프로젝트를 확인하세요",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  {
    name: "Blog",
    url: "https://blog.kahnco.me",
    description: "인프라 · DevOps · 개발 경험을 기록합니다",
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
];

export default function Links() {
  return (
    <section className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-20">
      <motion.h2
        className="text-3xl sm:text-4xl font-bold mb-12"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        Links
      </motion.h2>

      <div className="flex flex-col sm:flex-row gap-6">
        {links.map((link) => (
          <motion.a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group w-64 p-6 rounded-2xl border border-white/10 bg-white/5 transition-colors hover:bg-blue-500/10 hover:border-blue-500/30"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4 text-neutral-400 group-hover:text-blue-400 transition-colors">
              {link.icon}
            </div>
            <h3 className="text-lg font-semibold mb-1">{link.name}</h3>
            <p className="text-sm text-neutral-500">{link.description}</p>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
