import { Link } from "react-router-dom";

/** 블로그 공통 상단 바 — 로고·타이틀(블로그 홈) + 메인 사이트(kahnco.me) 링크. */
export default function BlogHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
      <Link to="/" className="flex items-center gap-2">
        <img src="/logo.jpg" alt="Kahnco Blog" className="w-8 h-8 rounded" />
        <span className="text-sm font-semibold text-white">Kahnco Blog</span>
      </Link>
      <a
        href="https://kahnco.me"
        className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
      >
        kahnco.me ↗
      </a>
    </header>
  );
}
