import { BrowserRouter, Routes, Route } from "react-router-dom";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";

// AdSense 로더 스크립트는 index.html <head> 에 정적으로 포함되어 있다.
// 각 광고 칸은 AdSlot 컴포넌트가 adsbygoogle.push() 로 채운다.

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BlogList />} />
        <Route path="/:slug" element={<BlogPost />} />
      </Routes>
    </BrowserRouter>
  );
}
