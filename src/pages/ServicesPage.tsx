import { Link } from "react-router-dom";
import Masthead from "../components/site/Masthead";
import SiteFooter from "../components/site/SiteFooter";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { SERVICES, NEXT_SERVICE, type Service } from "../data/services";
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

export default function ServicesPage() {
  useDocumentMeta(ROUTE_META["/services"].title, ROUTE_META["/services"].description);

  return (
    <div className="site">
      <Masthead />

      <main>
        <section className="phead">
          <div className="wrap">
            <div className="crumb">Kahnco · 서비스</div>
            <h1>운영 중인 서비스</h1>
            <p>
              칸코테크가 직접 만들고 운영하는 자사 제품입니다. 새 서비스는 각자의 서브도메인으로
              이 목록에 더해집니다.
            </p>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
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
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
