// 빌드 타임 sitemap.xml + robots.txt 생성기 (블로그 전용).
// src/posts/*.md 의 frontmatter(slug=파일명, date, draft)를 읽어
// 블로그 홈(/) + 각 글(/<slug>)을 sitemap 으로 출력한다.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "src", "posts");
const PUBLIC_DIR = join(ROOT, "public");

const SITE_URL = "https://kahnco.me/blog";

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

// 날짜 문자열(YYYY-MM-DD) 최신값 유지. b 가 더 최신이면 b, 아니면 a.
function laterDate(a, b) {
  if (!b) return a;
  if (!a) return b;
  return b > a ? b : a;
}

async function main() {
  const files = (await readdir(POSTS_DIR)).filter(
    (f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md" && !f.startsWith("_")
  );

  const postEntries = [];
  const categoryLastmod = new Map(); // 카테고리 경로 -> 소속 글의 최신 날짜
  let latestOverall; // 홈 lastmod = 전체 글 최신 날짜
  for (const file of files) {
    const raw = await readFile(join(POSTS_DIR, file), "utf8");
    const fm = parseFrontmatter(raw);
    if (fm.draft === "true") continue;
    const slug = file.replace(/\.md$/, "");
    const date = typeof fm.date === "string" ? fm.date : undefined;
    postEntries.push(urlEntry(`/${slug}`, date, "0.8"));
    latestOverall = laterDate(latestOverall, date);

    // category: [primary, secondary] 에서 카테고리 페이지 경로 수집 + 최신 날짜 갱신
    const cat = String(fm.category ?? "").replace(/^\[|\]$/g, "");
    const [p, s] = cat.split(",").map((t) => t.trim()).filter(Boolean);
    if (p) {
      const path = `/category/${p}`;
      categoryLastmod.set(path, laterDate(categoryLastmod.get(path), date));
    }
    if (p && s) {
      const path = `/category/${p}/${s}`;
      categoryLastmod.set(path, laterDate(categoryLastmod.get(path), date));
    }
  }

  const home = urlEntry("/", latestOverall, "1.0");
  const categoryEntries = [...categoryLastmod.keys()]
    .sort()
    .map((p) => urlEntry(p, categoryLastmod.get(p), "0.6"));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    home,
    ...categoryEntries,
    ...postEntries,
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(join(PUBLIC_DIR, "sitemap.xml"), xml, "utf8");

  const robots = ["User-agent: *", "Allow: /", "", `Sitemap: ${SITE_URL}/sitemap.xml`, ""].join("\n");
  await writeFile(join(PUBLIC_DIR, "robots.txt"), robots, "utf8");

  console.log(`[blog] sitemap.xml 생성: 홈 + 글 ${postEntries.length}개`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
