import { Link } from "react-router-dom";
import Masthead from "../components/site/Masthead";
import SiteFooter from "../components/site/SiteFooter";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { PORTFOLIO, PORTFOLIO_COUNT, type PortfolioItem } from "../data/portfolio";
import { ROUTE_META } from "../data/routeMeta";

function ItemBody({ item }: { item: PortfolioItem }) {
  return (
    <>
      <div className="per">{item.period}</div>
      <div>
        <div className="nm">{item.title}</div>
        <div className="desc">{item.description}</div>
        <div className="tags">
          {item.tags.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="links">
        {item.href && <span>자세히 →</span>}
        {item.appStore && (
          <a href={item.appStore} target="_blank" rel="noopener noreferrer">
            App Store
          </a>
        )}
        {item.playStore && (
          <a href={item.playStore} target="_blank" rel="noopener noreferrer">
            Play Store
          </a>
        )}
      </div>
    </>
  );
}

function PItem({ item }: { item: PortfolioItem }) {
  if (item.href) {
    return (
      <Link className="pitem" to={item.href}>
        <ItemBody item={item} />
      </Link>
    );
  }
  return (
    <div className="pitem">
      <ItemBody item={item} />
    </div>
  );
}

export default function PortfolioPage() {
  useDocumentMeta(ROUTE_META["/portfolio"].title, ROUTE_META["/portfolio"].description);

  return (
    <div className="site">
      <Masthead />

      <main>
        <section className="phead">
          <div className="wrap">
            <div className="crumb">Kahnco · 포트폴리오</div>
            <h1>제작 이력</h1>
            <p>
              자사 앱부터 프리랜스·의뢰, 재직 프로젝트까지 그동안 만든 앱·웹 작업 {PORTFOLIO_COUNT}
              건입니다. 운영 중인 자사 서비스는 <Link to="/services">서비스</Link>에서 따로 볼 수
              있습니다.
            </p>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            {PORTFOLIO.map((group) => (
              <div className="pgroup" key={group.key}>
                <div className="ghead">
                  <span className="gt">{group.label}</span>
                  <span className="gc tnum">{group.items.length}</span>
                </div>
                {group.items.map((item) => (
                  <PItem key={item.title} item={item} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
