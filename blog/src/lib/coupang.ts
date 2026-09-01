// 쿠팡 파트너스 배너 데이터 + 필수 고지 문구.
// 파트너스 대시보드에서 만든 배너(링크 + 이미지)를 여기 등록해 재사용한다.
// 새 배너로 교체할 땐 아래 href/src 만 갈아 끼우면 된다.

export interface CoupangBanner {
  href: string;
  src: string;
  width: number;
  height: number;
}

export const COUPANG_BANNERS: Record<string, CoupangBanner> = {
  // 가전·디지털
  digital: {
    href: "https://link.coupang.com/a/gHIm031XCS",
    src: "https://ads-partners.coupang.com/banners/1024946?trackingCode=AF2005792&subId=&traceId=V0-301-5f9bd61900e673c0-I1024946&w=728&h=90",
    width: 728,
    height: 90,
  },
  // 완구·취미
  hobby: {
    href: "https://link.coupang.com/a/gHIo3DqnCu",
    src: "https://ads-partners.coupang.com/banners/1024947?trackingCode=AF2005792&subId=&traceId=V0-301-8be2627c04ed5569-I1024947&w=728&h=90",
    width: 728,
    height: 90,
  },
};

// 공정거래위원회 표시·광고 지침상 반드시 눈에 띄게 노출해야 하는 문구.
export const COUPANG_DISCLOSURE =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따라 일정액의 수수료를 제공받습니다.";
