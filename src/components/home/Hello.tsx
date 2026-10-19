import { COMPANY } from "../../data/company";

export default function Hello() {
  return (
    <section className="me">
      <div className="wrap">
        <h1>
          안녕하세요,
          <br />
          {COMPANY.ceo}입니다.
        </h1>
        <p className="say">
          앱부터 웹, 서버, 인프라까지 <b>혼자서 끝까지</b> 만드는 개발자입니다. {COMPANY.nameKo}는 제가 제
          이름을 걸고 일하는 1인 회사입니다.
        </p>
        <a className="down" href="#story" aria-label="이야기로 내려가기">
          ↓
        </a>
      </div>
    </section>
  );
}
