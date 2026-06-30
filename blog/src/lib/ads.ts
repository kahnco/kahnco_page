// Google AdSense 설정.
//
// ⚠️ AdMob은 모바일 앱 전용입니다. 웹 블로그 광고는 AdSense를 사용합니다.
// AdSense 콘솔에서 "광고 단위(디스플레이 광고)"를 만들고 아래 값을 채워 넣으세요.
//
// - ADSENSE_CLIENT: 게시자 ID. AdSense 콘솔 좌측 하단 또는 계정 정보에 있음. 형식: "ca-pub-0000000000000000"
// - AD_SLOTS.*    : 각 광고 단위의 슬롯 ID(숫자 문자열). 광고 단위 생성 시 data-ad-slot 값.
//
// 값이 비어 있으면 광고가 렌더링되지 않으므로(레이아웃 영향 없음), 채우기 전까지 안전합니다.
// 같은 광고 단위 ID를 여러 자리에 재사용해도 됩니다(슬롯을 따로 안 만들고 싶다면 동일 값 입력).

export const ADSENSE_CLIENT = "ca-pub-6711409267761750";

export const AD_SLOTS = {
  inArticle: "", // 글 본문 중간 (인아티클)
  articleEnd: "", // 글 본문 끝
  listBottom: "", // 목록 페이지 하단
};

/** AdSense 게시자 ID가 정상 형식으로 채워졌는지 */
export function adsEnabled(): boolean {
  return /^ca-pub-\d{10,}$/.test(ADSENSE_CLIENT);
}
