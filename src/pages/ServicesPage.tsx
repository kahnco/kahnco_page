import SiteHeader from "../components/site/SiteHeader";
import SiteFooter from "../components/site/SiteFooter";
import ServiceTile from "../components/site/ServiceTile";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { ROUTE_META } from "../data/routeMeta";
import { LIVE_SERVICES, UPCOMING_SERVICES } from "../data/services";

export default function ServicesPage() {
  useDocumentMeta(ROUTE_META["/services"].title, ROUTE_META["/services"].description);

  return (
    <div className="site">
      <SiteHeader />
      <main>
        <header className="phead">
          <h1>서비스</h1>
          <p>제가 직접 만들고 운영하는 서비스입니다.</p>
        </header>
        <div className="tiles">
          {LIVE_SERVICES.map((s) => (
            <ServiceTile key={s.id} service={s} full />
          ))}
        </div>
        <header className="phead">
          <h2>곧 만나요</h2>
          <p>지금 만들고 있는 서비스입니다.</p>
        </header>
        <div className="duo">
          {UPCOMING_SERVICES.map((s) => (
            <ServiceTile key={s.id} service={s} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
