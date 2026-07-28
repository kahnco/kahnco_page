// 빌드타임 프리렌더용 서버 엔트리.
// vite build --ssr 로 번들되어 scripts/prerender.mjs 에서 import 된다.
// render(url) 은 해당 라우트를 정적 HTML 문자열로 렌더한다(크롤러가 읽을 본문).
// 런타임에는 main.tsx 의 createRoot().render() 가 #root 를 교체하므로 중복 렌더는 없다.

import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { AppRoutes } from "./App";

export { ROUTE_META } from "./data/routeMeta";

export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  );
}
