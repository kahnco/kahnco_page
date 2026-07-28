import { Link, NavLink } from "react-router-dom";
import { COMPANY } from "../../data/company";

// 회사 홈 공통 마스트헤드. 서비스·포트폴리오는 내부 라우트,
// 블로그는 별도 빌드(/blog), 문의는 홈의 #contact 로 이동한다.
export default function Masthead() {
  return (
    <header>
      <div className="wrap mast">
        <Link className="word" to="/">
          <span className="ko">{COMPANY.nameKo}</span>
          <span className="la">{COMPANY.nameEn}</span>
        </Link>
        <nav className="mnav">
          <NavLink to="/services">서비스</NavLink>
          <NavLink to="/portfolio">포트폴리오</NavLink>
          <a href="/blog">블로그</a>
          <a className="hide-sm" href="/#contact">문의</a>
        </nav>
      </div>
    </header>
  );
}
