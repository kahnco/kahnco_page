// 빌드 타임 메타 프리렌더.
// vite build 이후 실행되어, 글·카테고리 라우트마다 dist/<path>.html 을 생성하고
// <head> 에 그 페이지의 title·description·canonical·OG·Twitter·JSON-LD 를 정적으로 박는다.
// 본문은 기존처럼 React 가 클라이언트에서 렌더한다(soc 크롤러는 head 만 읽으므로 이걸로 충분).
//
// Firebase hosting 의 cleanUrls:true 와 함께 동작한다(/slug -> /slug.html).

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "src", "posts");
const DIST_DIR = join(ROOT, "dist");

const SITE_URL = "https://blog.kahnco.me";
const SITE_NAME = "Kahnco Blog";
const MAIN_URL = "https://kahnco.me";
const DEFAULT_DESC = "칸코테크 개발 블로그 — 인프라, DevOps, 풀스택 개발 경험을 기록합니다.";

// categories.ts 와 동기화되는 라벨 (표시용). 카테고리 추가 시 여기도 갱신할 것.
const LABELS = {
  dev: "개발",
  backend: "백엔드",
  infra: "인프라·DevOps",
  cs: "CS·이론",
  invest: "투자",
  stocks: "주식",
  life: "일상",
  etc: "잡담",
};

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!m) return {};
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return data;
}

/** 페이지 메타로부터 <head> 안에 넣을 태그 문자열을 만든다. */
function buildHeadTags({ title, description, path, type = "website", publishedTime, tags, image }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const url = `${SITE_URL}${path}`;
  const img = image ? (image.startsWith("http") ? image : `${SITE_URL}${image}`) : undefined;

  const lines = [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(fullTitle)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    ...(img ? [`<meta property="og:image" content="${esc(img)}" />`] : []),
    `<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${esc(fullTitle)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    ...(type === "article" && publishedTime
      ? [`<meta property="article:published_time" content="${esc(publishedTime)}" />`]
      : []),
    ...(type === "article" && Array.isArray(tags)
      ? tags.map((t) => `<meta property="article:tag" content="${esc(t)}" />`)
      : []),
  ];

  if (type === "article" && publishedTime) {
    const ld = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description,
      datePublished: publishedTime,
      dateModified: publishedTime,
      author: { "@type": "Person", name: "이현준", url: MAIN_URL },
      publisher: { "@type": "Organization", name: "칸코테크", url: MAIN_URL },
      mainEntityOfPage: url,
      ...(img ? { image: img } : {}),
    };
    // </script> 조기 종료 방지를 위해 < 를 이스케이프
    lines.push(
      `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
    );
  }

  return lines.join("\n    ");
}

/** 템플릿(dist/index.html)의 head 를 페이지 메타로 교체한 HTML 을 만든다. */
function renderHtml(template, meta) {
  return template
    .replace(/\s*<title>[\s\S]*?<\/title>/, "")
    .replace(/\s*<meta name="description"[^>]*\/?>/, "")
    .replace("</head>", `    ${buildHeadTags(meta)}\n  </head>`);
}

async function main() {
  const template = await readFile(join(DIST_DIR, "index.html"), "utf8");

  const files = (await readdir(POSTS_DIR)).filter(
    (f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md" && !f.startsWith("_"),
  );

  let count = 0;
  const categoryPaths = new Set();

  // 1) 글 페이지
  for (const file of files) {
    const raw = await readFile(join(POSTS_DIR, file), "utf8");
    const fm = parseFrontmatter(raw);
    if (fm.draft === "true") continue;
    const slug = file.replace(/\.md$/, "");

    const html = renderHtml(template, {
      title: fm.title || slug,
      description: fm.description || DEFAULT_DESC,
      path: `/${slug}`,
      type: "article",
      publishedTime: typeof fm.date === "string" ? fm.date : undefined,
      tags: Array.isArray(fm.tags) ? fm.tags : undefined,
      image: typeof fm.thumbnail === "string" ? fm.thumbnail : undefined,
    });
    await writeFile(join(DIST_DIR, `${slug}.html`), html, "utf8");
    count++;

    const [p, s] = Array.isArray(fm.category) ? fm.category : [];
    if (p) categoryPaths.add(p);
    if (p && s) categoryPaths.add(`${p}/${s}`);
  }

  // 2) 카테고리 페이지
  for (const cat of categoryPaths) {
    const [p, s] = cat.split("/");
    const label = s
      ? `${LABELS[p] ?? p} › ${LABELS[s] ?? s}`
      : `${LABELS[p] ?? p}`;
    const html = renderHtml(template, {
      title: label,
      description: `${label} 카테고리의 글 — ${SITE_NAME}`,
      path: `/category/${cat}`,
      type: "website",
    });
    const dir = join(DIST_DIR, "category", ...(s ? [p] : []));
    await mkdir(dir, { recursive: true });
    await writeFile(join(DIST_DIR, "category", `${cat}.html`), html, "utf8");
    count++;
  }

  // 3) 홈(index.html) 도 canonical·OG 를 갖도록 보강
  const homeHtml = renderHtml(template, {
    title: undefined,
    description: DEFAULT_DESC,
    path: "/",
    type: "website",
  });
  await writeFile(join(DIST_DIR, "index.html"), homeHtml, "utf8");

  console.log(`[blog] prerender: 글·카테고리 ${count}개 + 홈 정적 head 생성`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
