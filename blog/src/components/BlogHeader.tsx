import ThemeToggle from "./ThemeToggle";

// 홈 헤더(src/components/site/SiteHeader.tsx)와 같은 클래스·같은 구조.
// 블로그는 /blog 아래 별도 앱이라 홈 링크는 일반 <a> 로 간다.
export default function BlogHeader() {
  return (
    <header className="gn">
      <div className="gn-in">
        <a className="gn-brand" href="/">
          Kahnco
        </a>
        <nav className="gn-nav" aria-label="주요 메뉴">
          <a href="/services">서비스</a>
          <a href="/portfolio">포트폴리오</a>
          <a href="/blog" aria-current="page">
            블로그
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
