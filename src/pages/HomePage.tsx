import { Link } from "react-router-dom";
import Masthead from "../components/site/Masthead";
import SiteFooter from "../components/site/SiteFooter";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { COMPANY } from "../data/company";
import { SERVICES, NEXT_SERVICE, type Service } from "../data/services";
import { PORTFOLIO_COUNT } from "../data/portfolio";
import { LATEST_POSTS, BLOG_POST_COUNT } from "../data/posts";
import { ROUTE_META } from "../data/routeMeta";

const no = (n: number) => String(n).padStart(2, "0");

function ServiceRow({ svc, idx }: { svc: Service; idx: number }) {
  const inner = (
    <>
      <div className="idx">{no(idx)}</div>
      <div>
        <div className="nm">
          {svc.name} <em>{svc.en}</em>
        </div>
        <div className="desc">{svc.description}</div>
      </div>
      <div className="cat">{svc.category}</div>
      <div className="st">
        <span className={`mk${svc.status === "live" ? " on" : ""}`} />
        {svc.statusLabel}
      </div>
      <div className="yr tnum">{svc.year ?? "—"}</div>
      <div className="go">↗</div>
    </>
  );

  if (svc.external) {
    return (
      <a className="row" href={svc.href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return (
    <Link className="row" to={svc.href ?? "#"}>
      {inner}
    </Link>
  );
}

export default function HomePage() {
  useDocumentMeta(ROUTE_META["/"].title, ROUTE_META["/"].description);

  const liveCount = SERVICES.filter((s) => s.status === "live").length;

  return (
    <div className="site">
      <Masthead />

      <main id="top">
        <section className="hero">
          <div className="wrap">
            <h1 className="reveal">
              만들고, 직접
              <br />
              <span className="q">운영합니다.</span>
            </h1>
            <div className="sub">
              <p className="reveal d1">
                웹과 앱 서비스를 만들고, 사용자가 쓰는 동안 직접 운영합니다. 아래는 지금 돌아가고
                있는 것들입니다.
              </p>
              <div className="meta reveal d2">
                {COMPANY.nameKo} · {COMPANY.tagline}
                <br />
                대표 {COMPANY.ceo} · <b>{COMPANY.region}</b>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="band alt">
          <div className="wrap">
            <div className="idx-head">
              <div className="lead">
                <span className="no">01</span>
                <span className="lab">
                  서비스 <span>지금 운영 중인 것들</span>
                </span>
              </div>
              <Link className="more" to="/services">
                서비스 전체 →
              </Link>
            </div>

            <div className="cols">
              <div>№</div>
              <div>이름</div>
              <div>분류</div>
              <div>상태</div>
              <div className="r">시작</div>
              <div />
            </div>

            {SERVICES.map((svc, i) => (
              <ServiceRow key={svc.id} svc={svc} idx={i + 1} />
            ))}

            <div className="row soon">
              <div className="idx">{no(SERVICES.length + 1)}</div>
              <div>
                <div className="nm">{NEXT_SERVICE.name}</div>
                <div className="desc">{NEXT_SERVICE.description}</div>
              </div>
              <div className="cat">준비 중</div>
              <div className="st">
                <span className="mk" />
                {NEXT_SERVICE.statusLabel}
              </div>
              <div className="yr">—</div>
              <div className="go" />
            </div>

            <Link className="pf" to="/portfolio">
              <div className="l">
                <div className="t">포트폴리오</div>
                <div className="s">너의생각을 비롯해 프리랜스·의뢰·재직으로 만든 앱·웹 작업들.</div>
              </div>
              <div className="go">
                제작 이력 전체 <span className="a">→</span>
              </div>
            </Link>
          </div>
        </section>

        <section className="note band" id="about">
          <div className="wrap">
            <div className="idx-head">
              <div className="lead">
                <span className="no">02</span>
                <span className="lab">
                  운영 <span>만들고 끝이 아니라</span>
                </span>
              </div>
            </div>
            <div className="grid">
              <h2>
                만든 뒤에도 직접 운영합니다.{" "}
                <span className="q">
                  고치고, 업데이트하며 굴러가게 두는 것까지가 서비스라고 봅니다.
                </span>
              </h2>
              <div className="figs">
                <div className="fig">
                  <span className="k">운영 중인 서비스</span>
                  <span className="v tnum">{liveCount}</span>
                </div>
                <div className="fig">
                  <span className="k">제작 이력</span>
                  <span className="v tnum">{PORTFOLIO_COUNT}건</span>
                </div>
                <div className="fig">
                  <span className="k">플랫폼</span>
                  <span className="v">Web · iOS · Android</span>
                </div>
                <div className="fig">
                  <span className="k">기술 블로그</span>
                  <span className="v tnum">{BLOG_POST_COUNT}편</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="writing band alt" id="writing">
          <div className="wrap">
            <div className="idx-head">
              <div className="lead">
                <span className="no">03</span>
                <span className="lab">
                  블로그 <span>만들며 쓴 글</span>
                </span>
              </div>
              <a className="more" href="/blog">
                전체 글 →
              </a>
            </div>
            {LATEST_POSTS.map((post) => (
              <a className="wr" key={post.slug} href={`/blog/${post.slug}`}>
                <span className="d tnum">{post.date}</span>
                <span className="h">{post.title}</span>
                <span className="g">→</span>
              </a>
            ))}
          </div>
        </section>

        <section className="contact band" id="contact">
          <div className="wrap">
            <div className="idx-head">
              <div className="lead">
                <span className="no">04</span>
                <span className="lab">문의</span>
              </div>
            </div>
            <h2>협업·제휴, 그 밖의 문의는 메일로 주세요.</h2>
            <a className="mail" href={`mailto:${COMPANY.email}`}>
              {COMPANY.email}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
