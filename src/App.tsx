import Hero from "./components/Hero";
import About from "./components/About";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Links from "./components/Links";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-[family-name:var(--font-geist-sans)]">
      <Hero />
      <About />
      <Skills />
      <Projects />
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
