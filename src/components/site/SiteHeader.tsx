import { Link, NavLink } from "react-router-dom";
import { COMPANY } from "../../data/company";
import ThemeToggle from "./ThemeToggle";

// 회사 홈 공통 헤더. 블로그(/blog)는 별도 빌드라 일반 링크로 이동한다.
// 블로그 쪽 헤더(blog/src/components/BlogHeader.tsx)와 같은 클래스·같은 구조를 유지할 것.
export default function SiteHeader() {
  return (
    <header className="gn">
      <div className="gn-in">
        <Link className="gn-brand" to="/">
          {COMPANY.nameEn}
        </Link>
        <nav className="gn-nav" aria-label="주요 메뉴">
          <NavLink to="/services">서비스</NavLink>
          <NavLink to="/portfolio">포트폴리오</NavLink>
          <a href="/blog">블로그</a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
