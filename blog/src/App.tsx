import { BrowserRouter, Routes, Route } from "react-router-dom";
import Browse from "./pages/Browse";
import BlogPost from "./pages/BlogPost";

// AdSense 로더 스크립트는 index.html <head> 에 정적으로 포함되어 있다.
// 실제 광고는 BlogPost 안의 쿠팡 배너(CoupangBanner)이고, AdSense 로더는 심사용으로 index.html 에 남겨 둔다.

export default function App() {
  return (
    <BrowserRouter basename="/blog">
      <Routes>
        <Route path="/" element={<Browse />} />
        <Route path="/category/:primary" element={<Browse />} />
        <Route path="/category/:primary/:secondary" element={<Browse />} />
        <Route path="/:slug" element={<BlogPost />} />
      </Routes>
    </BrowserRouter>
  );
}
