import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ServicesPage from "./pages/ServicesPage";
import PortfolioPage from "./pages/PortfolioPage";
import YourThoughtsPrivacy from "./pages/YourThoughtsPrivacy";
import YourThoughtsTerms from "./pages/YourThoughtsTerms";
import YourThoughtsLanding from "./pages/YourThoughtsLanding";
import AtomicDemolitionPrivacy from "./pages/AtomicDemolitionPrivacy";
import AtomicDemolitionTerms from "./pages/AtomicDemolitionTerms";
import AtomicDemolitionLanding from "./pages/AtomicDemolitionLanding";

// 라우트 전환 시 상단으로. 단, 해시(#contact 등)가 있으면 해당 요소로 스크롤.
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

// 라우트 정의(라우터 비포함) — 클라이언트는 BrowserRouter, 프리렌더는 StaticRouter 로 감싼다.
export function AppRoutes() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/yourthoughts" element={<YourThoughtsLanding />} />
        <Route path="/yourthoughts/privacy" element={<YourThoughtsPrivacy />} />
        <Route path="/yourthoughts/terms" element={<YourThoughtsTerms />} />
        <Route path="/atomic-demolition" element={<AtomicDemolitionLanding />} />
        <Route path="/atomic-demolition/privacy" element={<AtomicDemolitionPrivacy />} />
        <Route path="/atomic-demolition/terms" element={<AtomicDemolitionTerms />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
