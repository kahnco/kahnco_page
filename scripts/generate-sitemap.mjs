// 빌드 타임 sitemap.xml + robots.txt 생성기 (포트폴리오 메인 사이트).
// 정적 라우트를 public/sitemap.xml 로 출력한다.
// 블로그는 별도 프로젝트(blog/)로 분리되어 자체 sitemap 을 가진다.
//
// build 스크립트의 prebuild 단계에서 실행된다 (package.json 참고).

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");

const SITE_URL = "https://kahnco.me";

// 빌드 시각 기준 lastmod (YYYY-MM-DD). 재빌드/재배포마다 갱신되어 재색인 신호가 된다.
const LASTMOD = new Date().toISOString().slice(0, 10);

// 정적 라우트 (App.tsx 의 Routes 와 동기화)
const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/services", priority: "0.8", changefreq: "weekly" },
  { path: "/portfolio", priority: "0.8", changefreq: "monthly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/yourthoughts", priority: "0.6", changefreq: "monthly" },
  { path: "/atomic-demolition", priority: "0.6", changefreq: "monthly" },
];

function urlEntry({ path, priority, changefreq }) {
  return [
    "  <url>",
    `    <loc>${SITE_URL}${path}</loc>`,
    `    <lastmod>${LASTMOD}</lastmod>`,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const entries = STATIC_ROUTES.map((r) => urlEntry(r));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");

  // 블로그는 같은 도메인 /blog 경로에서 서빙되며 자체 sitemap(/blog/sitemap.xml)을 가진다.
  // robots.txt 는 도메인 루트(kahnco.me/robots.txt)에서만 유효하므로 여기서 둘 다 알린다.
  const robots = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Sitemap: ${SITE_URL}/blog/sitemap.xml`,
    "",
  ].join("\n");
  await writeFile(join(PUBLIC_DIR, "robots.txt"), robots, "utf8");

  console.log(`[main] sitemap.xml 생성: 정적 ${entries.length}개`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
