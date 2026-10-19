import { useEffect } from "react";

// .reveal 요소가 화면에 들어오면 한 번만 is-in 을 붙인다(페이드업).
// CSS 는 html.js(head 인라인 스크립트가 첫 페인트 전에 붙임)일 때 숨기므로, 훅이 돌기 전엔 숨겨져 있다.
// 훅이 끝내 돌지 않아도 CSS 의 reveal-fallback 애니메이션이 2.5초 뒤 보이게 한다.
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)"));
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
