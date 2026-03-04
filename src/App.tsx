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
      <footer className="py-8 text-center text-sm text-neutral-600">
        © 2026 이현준
      </footer>
    </div>
  );
}
