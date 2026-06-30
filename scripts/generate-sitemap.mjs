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

// 정적 라우트 (App.tsx 의 Routes 와 동기화)
const STATIC_ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/yourthoughts", priority: "0.6" },
  { path: "/atomic-demolition", priority: "0.6" },
];

function urlEntry(path, priority) {
  return [
    "  <url>",
    `    <loc>${SITE_URL}${path}</loc>`,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const entries = STATIC_ROUTES.map((r) => urlEntry(r.path, r.priority));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");

  const robots = ["User-agent: *", "Allow: /", "", `Sitemap: ${SITE_URL}/sitemap.xml`, ""].join("\n");
  await writeFile(join(PUBLIC_DIR, "robots.txt"), robots, "utf8");

  console.log(`[main] sitemap.xml 생성: 정적 ${entries.length}개`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
