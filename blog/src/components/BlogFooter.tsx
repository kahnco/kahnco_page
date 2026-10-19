import { COMPANY } from "../../../shared/company";

// 홈 푸터(src/components/site/SiteFooter.tsx)와 같은 구조.
export default function BlogFooter() {
  return (
    <footer className="ft">
      <div className="ft-in">
        <nav className="ft-links" aria-label="사이트 링크">
          <a href="/services">서비스</a>
          <a href="/portfolio">포트폴리오</a>
          <a href="/blog">블로그</a>
          <a href="/#contact">문의</a>
          <a href="/privacy">개인정보처리방침</a>
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
