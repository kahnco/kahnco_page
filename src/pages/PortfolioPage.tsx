import { Link } from "react-router-dom";
import SiteHeader from "../components/site/SiteHeader";
import SiteFooter from "../components/site/SiteFooter";
import AskBand from "../components/site/AskBand";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { useReveal } from "../lib/useReveal";
import { PORTFOLIO, PORTFOLIO_COUNT, type PortfolioItem } from "../data/portfolio";
import { ROUTE_META } from "../data/routeMeta";

function Links({ item }: { item: PortfolioItem }) {
  if (!item.href && !item.appStore && !item.playStore) return null;
  return (
    <p className="tl-links">
      {item.href && (
        <Link className="lk" to={item.href}>
          소개 페이지
        </Link>
      )}
      {item.appStore && (
        <a className="lk" href={item.appStore} target="_blank" rel="noopener noreferrer">
          App Store
        </a>
      )}
      {item.playStore && (
        <a className="lk" href={item.playStore} target="_blank" rel="noopener noreferrer">
          Google Play
        </a>
      )}
    </p>
  );
}

export default function PortfolioPage() {
  useDocumentMeta(ROUTE_META["/portfolio"].title, ROUTE_META["/portfolio"].description);
  useReveal();

  return (
    <div className="site">
      <SiteHeader />
      <main>
        <header className="phead">
          <h1>만든 것들</h1>
          <p>
            자사 앱, 의뢰·프리랜스, 재직 프로젝트로 만든 {PORTFOLIO_COUNT}건입니다. 지금 운영하는 서비스는{" "}
            <Link className="lk" to="/services">
              서비스
            </Link>
            에 따로 모았습니다.
          </p>
        </header>
        {PORTFOLIO.map((group) => (
          <section className="pf-group" key={group.key}>
            <h2>
              {group.label}
              <span className="n tnum">{group.items.length}</span>
            </h2>
            <ol className="tl">
              {group.items.map((item) => (
                <li className="tl-item" key={item.title}>
                  <div className="tl-when tnum">{item.period}</div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <p className="tech">{item.tags.join(" · ")}</p>
                    <Links item={item} />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
        <AskBand />
      </main>
      <SiteFooter />
    </div>
  );
}
