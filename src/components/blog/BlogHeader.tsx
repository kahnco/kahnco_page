import { Link } from "react-router-dom";

/** 블로그 페이지 공통 상단 바 — 로고(홈) + 블로그 인덱스 링크. */
export default function BlogHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
      <Link to="/" className="flex items-center gap-2">
        <img src="/logo.jpg" alt="Kahnco" className="w-8 h-8 rounded" />
      </Link>
      <Link
        to="/blog"
        className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
      >
        Blog
      </Link>
    </header>
  );
}
