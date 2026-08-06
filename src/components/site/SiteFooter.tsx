import { Link } from "react-router-dom";
import { COMPANY } from "../../data/company";

export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap foot">
        <div className="biz">
          <b>
            {COMPANY.nameKo} ({COMPANY.nameEn})
          </b>
          <br />
          대표 {COMPANY.ceo} · 사업자등록번호 {COMPANY.bizNo}
          <br />
          {COMPANY.address} · {COMPANY.email}
        </div>
        <div className="fl">
          <Link to="/services">서비스</Link>
          <Link to="/portfolio">포트폴리오</Link>
          <a href="/blog">블로그</a>
          <a href="/#contact">문의</a>
          <Link to="/privacy">개인정보처리방침</Link>
          <span className="c">© 2026 {COMPANY.nameEn}</span>
        </div>
      </div>
    </footer>
  );
}
