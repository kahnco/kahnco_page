import { Link } from "react-router-dom";
import { COMPANY } from "../../data/company";

// 블로그 푸터(blog/src/components/BlogFooter.tsx)와 같은 구조를 유지할 것.
export default function SiteFooter() {
  return (
    <footer className="ft">
      <div className="ft-in">
        <nav className="ft-links" aria-label="사이트 링크">
          <Link to="/services">서비스</Link>
          <Link to="/portfolio">포트폴리오</Link>
          <a href="/blog">블로그</a>
          <a href="/#contact">문의</a>
          <Link to="/privacy">개인정보처리방침</Link>
        </nav>
        <div className="ft-biz">
          {`${COMPANY.nameKo} (${COMPANY.nameEn}) · 대표 ${COMPANY.ceo} · 사업자등록번호 ${COMPANY.bizNo}`}
          <br />
          {COMPANY.address} · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </div>
        <div className="ft-row">
          <span>Copyright © 2026 {COMPANY.nameEn}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
