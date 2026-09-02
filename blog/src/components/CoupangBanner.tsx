import { useEffect, useRef, useState } from "react";
import { COUPANG_DISCLOSURE, COUPANG_WIDGET } from "../lib/coupang";

const W = COUPANG_WIDGET.width;
const H = COUPANG_WIDGET.height;

// 쿠팡 캐러셀 위젯은 인라인 <script> 로만 렌더된다(document.currentScript 위치에 삽입).
// 리액트에선 iframe srcdoc 으로 "원래 HTML 컨텍스트"를 그대로 재현해 정상 실행시킨다.
const SRC_DOC =
  `<!DOCTYPE html><html><head><meta charset="utf-8">` +
  `<style>html,body{margin:0;padding:0;overflow:hidden}</style></head><body>` +
  `<script src="https://ads-partners.coupang.com/g.js"><\/script>` +
  `<script>new PartnersCoupang.G(${JSON.stringify({
    id: COUPANG_WIDGET.id,
    template: COUPANG_WIDGET.template,
    trackingCode: COUPANG_WIDGET.trackingCode,
    width: String(W),
    height: String(H),
    tsource: "",
  })});<\/script></body></html>`;

/**
 * 쿠팡 파트너스 캐러셀 배너 한 칸.
 * - iframe srcdoc 으로 위젯 스크립트를 격리 실행(SPA 에서 안전).
 * - 고정 크기(680×140) 위젯이라, 컨테이너가 좁으면 transform:scale 로 비례 축소(모바일 대응).
 * - 공정위 고지 문구를 배너 아래 노출(필수).
 */
export default function CoupangBanner() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <aside className="my-8" aria-label="쿠팡 파트너스 광고">
      <div
        ref={wrapRef}
        style={{
          width: "100%",
          maxWidth: W,
          height: H * scale,
          margin: "0 auto",
          overflow: "hidden",
        }}
      >
        <iframe
          title="쿠팡 추천 상품"
          srcDoc={SRC_DOC}
          width={W}
          height={H}
          scrolling="no"
          style={{
            border: 0,
            display: "block",
            transformOrigin: "top left",
            transform: `scale(${scale})`,
          }}
        />
      </div>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-neutral-500">
        {COUPANG_DISCLOSURE}
      </p>
    </aside>
  );
}
