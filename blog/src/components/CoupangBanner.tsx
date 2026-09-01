import { COUPANG_DISCLOSURE, type CoupangBanner as Banner } from "../lib/coupang";

/**
 * 쿠팡 파트너스 이미지 배너 한 칸.
 * - 이미지는 반응형(컨테이너 폭까지, 최대 728px)으로 축소되어 모바일에서 넘치지 않는다.
 * - referrerPolicy="unsafe-url" 로 파트너스 추적이 정상 동작하게 한다.
 * - 공정위 고지 문구를 배너 바로 아래 노출한다(필수).
 */
export default function CoupangBanner({ banner }: { banner: Banner }) {
  return (
    <aside className="my-8 text-center" aria-label="쿠팡 파트너스 광고">
      <a
        href={banner.href}
        target="_blank"
        rel="noopener"
        referrerPolicy="unsafe-url"
        className="inline-block max-w-full"
      >
        <img
          src={banner.src}
          alt="쿠팡 추천 상품 배너"
          width={banner.width}
          height={banner.height}
          loading="lazy"
          className="mx-auto h-auto w-full max-w-[728px]"
        />
      </a>
      <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
        {COUPANG_DISCLOSURE}
      </p>
    </aside>
  );
}
