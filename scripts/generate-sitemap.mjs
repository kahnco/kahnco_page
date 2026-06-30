// 빌드 타임 sitemap.xml 생성기.
// src/posts/*.md 의 frontmatter(slug=파일명, date, draft)를 읽어
// 정적 라우트 + 블로그 글을 합쳐 public/sitemap.xml 로 출력한다.
//
// build 스크립트의 prebuild 단계에서 실행된다 (package.json 참고).

import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "src", "posts");
const PUBLIC_DIR = join(ROOT, "public");

const SITE_URL = "https://kahnco.me";

// 블로그 외 정적 라우트 (App.tsx 의 Routes 와 동기화)
const STATIC_ROUTES = [
  { path: "/", priority: "1.0" },
  { path: "/blog", priority: "0.9" },
  { path: "/yourthoughts", priority: "0.6" },
  { path: "/atomic-demolition", priority: "0.6" },
];

function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    data[key] = value;
  }
  return data;
}

function urlEntry(path, lastmod, priority) {
  return [
    "  <url>",
    `    <loc>${SITE_URL}${path}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const files = (await readdir(POSTS_DIR)).filter(
    (f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md" && !f.startsWith("_")
  );

  const postEntries = [];
  for (const file of files) {
    const raw = await readFile(join(POSTS_DIR, file), "utf8");
    const fm = parseFrontmatter(raw);
    if (fm.draft === "true") continue;
    const slug = file.replace(/\.md$/, "");
    postEntries.push(urlEntry(`/blog/${slug}`, fm.date, "0.8"));
  }

  const staticEntries = STATIC_ROUTES.map((r) => urlEntry(r.path, undefined, r.priority));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...postEntries,
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");

  const robots = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  await writeFile(join(PUBLIC_DIR, "robots.txt"), robots, "utf8");

  console.log(`sitemap.xml 생성: 정적 ${staticEntries.length} + 글 ${postEntries.length}개`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
