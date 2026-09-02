// 쿠팡 파트너스 배너(캐러셀 위젯) 설정 + 필수 고지 문구.
// 파트너스 대시보드의 "배너 만들기"가 내주는 PartnersCoupang.G 위젯 파라미터를 담는다.
// 새 배너로 교체할 땐 아래 값만 갈아 끼우면 된다.

export interface CoupangWidget {
  id: number;
  template: string;
  trackingCode: string;
  width: number;
  height: number;
}

// 가전·디지털 카테고리 베스트 (캐러셀)
export const COUPANG_WIDGET: CoupangWidget = {
  id: 1025158,
  template: "carousel",
  trackingCode: "AF2005792",
  width: 680,
  height: 140,
};

// 공정거래위원회 표시·광고 지침상 반드시 눈에 띄게 노출해야 하는 문구.
export const COUPANG_DISCLOSURE =
  "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따라 일정액의 수수료를 제공받습니다.";
