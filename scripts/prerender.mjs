// 빌드타임 정적 프리렌더(SSG) — 회사 홈/서비스/포트폴리오/랜딩 라우트를 크롤러가
// JS 실행 없이 읽도록, 각 라우트를 react-dom/server 로 렌더해 dist/<path>.html 에 심는다.
// <head> 에는 라우트별 title·description·canonical·OG·Twitter 를 정적으로 박는다.
// 런타임에는 main.tsx 의 createRoot().render() 가 #root 를 교체하므로 중복 렌더는 없다.
//
// 실행: vite build(클라) → vite build --ssr(서버 번들 .ssr/) → 이 스크립트.
// Firebase hosting 의 cleanUrls:true 와 함께 동작한다(/services -> /services.html).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST_DIR = join(ROOT, "dist");
const SSR_ENTRY = join(ROOT, ".ssr", "entry-server.js");

const SITE_URL = "https://kahnco.me";
const SITE_NAME = "칸코테크";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHeadTags({ title, description, path }) {
  const url = `${SITE_URL}${path === "/" ? "/" : path}`;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
  ].join("\n    ");
}

function renderHtml(template, { meta, appHtml }) {
  return template
    .replace(/\s*<title>[\s\S]*?<\/title>/, "")
    .replace(/\s*<meta\s+name="description"[^>]*\/?>/, "")
    .replace("</head>", `    ${buildHeadTags(meta)}\n  </head>`)
    .replace(/<div id="root">\s*<\/div>/, `<div id="root">${appHtml}</div>`);
}

// "/services" -> dist/services.html, "/a/b" -> dist/a/b.html, "/" -> dist/index.html
async function outPathFor(route) {
  if (route === "/") return join(DIST_DIR, "index.html");
  const parts = route.replace(/^\//, "").split("/");
  const dir = join(DIST_DIR, ...parts.slice(0, -1));
  await mkdir(dir, { recursive: true });
  return join(DIST_DIR, `${parts.join("/")}.html`);
}

async function main() {
  const template = await readFile(join(DIST_DIR, "index.html"), "utf8");
  const { render, ROUTE_META } = await import(pathToFileURL(SSR_ENTRY).href);

  let count = 0;
  for (const [route, meta] of Object.entries(ROUTE_META)) {
    const appHtml = render(route);
    const html = renderHtml(template, { meta: { ...meta, path: route }, appHtml });
    await writeFile(await outPathFor(route), html, "utf8");
    count++;
  }

  console.log(`[main] prerender: ${count}개 라우트 정적 HTML 생성`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
