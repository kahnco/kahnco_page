import { Link } from "react-router-dom";

/** 블로그 공통 상단 바 — 로고(메인 포트폴리오 외부 링크) + 블로그 홈 링크. */
export default function BlogHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
      <a href="https://kahnco.me" className="flex items-center gap-2">
        <img src="/logo.jpg" alt="Kahnco" className="w-8 h-8 rounded" />
      </a>
      <Link
        to="/"
        className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
      >
        Blog
      </Link>
    </header>
  );
}
