import { useEffect } from "react";
import { ADSENSE_CLIENT, adsEnabled } from "../lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * AdSense 디스플레이 광고 한 칸.
 * - slot 이 비었거나 게시자 ID 미설정이면 아무것도 렌더링하지 않는다(레이아웃 영향 없음).
 * - 반응형(full-width-responsive)으로 동작.
 */
export default function AdSlot({
  slot,
  className = "",
}: {
  slot: string;
  className?: string;
}) {
  useEffect(() => {
    if (!adsEnabled() || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense 스크립트 로드 전이면 큐에 쌓였다가 처리됨
    }
  }, [slot]);

  if (!adsEnabled() || !slot) return null;

  return (
    <div className={`my-8 overflow-hidden text-center ${className}`} aria-label="광고">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
