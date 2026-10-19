import { COMPANY } from "../../data/company";

// 남색 문의 띠 — 홈·포트폴리오 맨 아래. 이 화면의 유일한 채운 버튼.
export default function AskBand() {
  return (
    <section className="ask on-deep" id="contact">
      <h2 className="reveal">기획안 한 장이면 충분합니다</h2>
      <p className="reveal">앱·웹·서버·인프라를 한 사람에게 맡기고 싶으시면 메일 주세요.</p>
      <a className="btn" href={`mailto:${COMPANY.email}`}>
        메일 보내기
      </a>
      <p className="ask-mail tnum">{COMPANY.email}</p>
    </section>
  );
}
