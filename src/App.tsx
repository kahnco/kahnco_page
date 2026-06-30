import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Hero from "./components/Hero";
import About from "./components/About";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Links from "./components/Links";
import Apps from "./components/Apps";
import YourThoughtsPrivacy from "./pages/YourThoughtsPrivacy";
import YourThoughtsTerms from "./pages/YourThoughtsTerms";
import YourThoughtsLanding from "./pages/YourThoughtsLanding";
import AtomicDemolitionPrivacy from "./pages/AtomicDemolitionPrivacy";
import AtomicDemolitionTerms from "./pages/AtomicDemolitionTerms";
import AtomicDemolitionLanding from "./pages/AtomicDemolitionLanding";

// 블로그 페이지는 react-markdown·highlight.js 등 무거운 의존성을 포함하므로
// 코드 스플리팅하여 메인 포트폴리오 번들을 가볍게 유지한다.
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));

function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-[family-name:var(--font-geist-sans)]">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 py-4 bg-[#0a0a0a]/80 backdrop-blur-md">
        <img src="/logo.jpg" alt="Kahnco" className="w-8 h-8 rounded" />
      </header>
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Apps />
      <Links />
      <footer className="py-12 px-6 text-center text-xs text-neutral-600 space-y-1">
        <p className="font-medium text-neutral-500">칸코테크 (Kahnco)</p>
        <p>대표 이현준 · 사업자번호 465-37-01575</p>
        <p>경기도 화성시 동탄구 동탄중심상가1길 36, 8층 801-84A호</p>
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/yourthoughts" element={<YourThoughtsLanding />} />
        <Route path="/yourthoughts/privacy" element={<YourThoughtsPrivacy />} />
        <Route path="/yourthoughts/terms" element={<YourThoughtsTerms />} />
        <Route path="/atomic-demolition" element={<AtomicDemolitionLanding />} />
        <Route path="/atomic-demolition/privacy" element={<AtomicDemolitionPrivacy />} />
        <Route path="/atomic-demolition/terms" element={<AtomicDemolitionTerms />} />
        <Route
          path="/blog"
          element={
            <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
              <BlogList />
            </Suspense>
          }
        />
        <Route
          path="/blog/:slug"
          element={
            <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
              <BlogPost />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
