import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import { ADSENSE_CLIENT, adsEnabled } from "./lib/ads";

/** AdSense 로더 스크립트를 1회 주입 (게시자 ID가 설정된 경우에만). */
function useAdSenseLoader() {
  useEffect(() => {
    if (!adsEnabled()) return;
    const id = "adsbygoogle-js";
    if (document.getElementById(id)) return;
    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(script);
  }, []);
}

export default function App() {
  useAdSenseLoader();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BlogList />} />
        <Route path="/:slug" element={<BlogPost />} />
      </Routes>
    </BrowserRouter>
  );
}
