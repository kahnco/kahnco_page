import SiteHeader from "../components/site/SiteHeader";
import SiteFooter from "../components/site/SiteFooter";
import AskBand from "../components/site/AskBand";
import Hello from "../components/home/Hello";
import Story from "../components/home/Story";
import Layers from "../components/home/Layers";
import Numbers from "../components/home/Numbers";
import WayOfWork from "../components/home/WayOfWork";
import ProductRail from "../components/home/ProductRail";
import LatestPosts from "../components/home/LatestPosts";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { useReveal } from "../lib/useReveal";
import { ROUTE_META } from "../data/routeMeta";

// 홈은 제품 진열장이 아니라 '이현준'의 이야기. 제품은 그 증거로 뒤에 나온다.
export default function HomePage() {
  useDocumentMeta(ROUTE_META["/"].title, ROUTE_META["/"].description);
  useReveal();

  return (
    <div className="site">
      <SiteHeader />
      <main>
        <Hello />
        <Story />
        <Layers />
        <Numbers />
        <WayOfWork />
        <ProductRail />
        <LatestPosts />
        <AskBand />
      </main>
      <SiteFooter />
    </div>
  );
}
