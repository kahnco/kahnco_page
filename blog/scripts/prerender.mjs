// 빌드 타임 메타 + 본문 프리렌더.
// vite build 이후 실행되어, 글·카테고리 라우트마다 dist/<path>.html 을 생성하고
// <head> 에 그 페이지의 title·description·canonical·OG·Twitter·JSON-LD 를 정적으로 박는다.
// 글 페이지는 추가로 마크다운 본문을 정적 HTML 로 렌더해 #root 안에 심는다.
// → 크롤러(구글봇·애드센스 심사)가 JS 실행 없이도 글 전문을 읽는다.
//   런타임에는 main.tsx 의 createRoot().render() 가 #root 자식을 교체하므로,
//   사용자는 기존처럼 React(react-markdown) 렌더를 본다(중복 렌더 없음).
//
// Firebase hosting 의 cleanUrls:true 와 함께 동작한다(/slug -> /slug.html).

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "src", "posts");
const DIST_DIR = join(ROOT, "dist");

const SITE_URL = "https://kahnco.me/blog";
const SITE_NAME = "Kahnco Blog";
const MAIN_URL = "https://kahnco.me";
const DEFAULT_DESC = "칸코테크 개발 블로그 — 인프라, DevOps, 풀스택 개발 경험을 기록합니다.";

// categories.ts 와 동기화되는 라벨 (표시용). 카테고리 추가 시 여기도 갱신할 것.
const LABELS = {
  dev: "개발",
  backend: "백엔드",
  infra: "인프라·DevOps",
  cs: "CS·이론",
  handson: "실전·튜토리얼",
  flutter: "Flutter",
  ai: "AI·LLM",
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

/** 프런트매터를 걷어낸 마크다운 본문을 정적 HTML 로 렌더한다(크롤러용). */
function renderBody(raw) {
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  return marked.parse(body);
}

/**
 * 글 본문 프리렌더 래퍼. main.tsx 의 createRoot().render() 가 #root 자식을
 * 통째로 교체하므로, 이 내용은 JS 로딩 전까지만(=크롤러가 보는 시점) 노출된다.
 */
// 크롤러가 보는 정적 푸터 — 블로그 목록·개인정보처리방침 링크(광고 게재 페이지 요건).
const STATIC_FOOTER =
  `<footer style="margin-top:3rem;padding-top:1rem;border-top:1px solid #ddd;font-size:.9rem">` +
  `<a href="/blog">블로그 목록</a> · <a href="/privacy">개인정보처리방침</a> · ` +
  `<a href="https://kahnco.me">칸코테크</a></footer>`;

function bodyWrapper({ title, publishedTime, bodyHtml }) {
  const dateLine = publishedTime
    ? `<p style="color:#888;font-size:.9rem">${esc(publishedTime)}</p>`
    : "";
  return (
    `<div id="root"><main style="max-width:720px;margin:0 auto;padding:2rem 1rem;line-height:1.7">` +
    `<article><h1>${esc(title)}</h1>${dateLine}\n${bodyHtml}</article>${STATIC_FOOTER}</main></div>`
  );
}

/**
 * 목록(홈·카테고리) 프리렌더 래퍼. 크롤러가 JS 없이도 글 제목·링크·요약을 읽도록
 * 실제 글 목록을 #root 안에 정적으로 심는다(런타임엔 React 가 통째로 교체).
 */
function listWrapper({ heading, subtitle, listPosts }) {
  const items = listPosts
    .map((p) => {
      const date = p.date
        ? ` <time style="color:#888;font-size:.85rem">${esc(p.date)}</time>`
        : "";
      const desc = p.description
        ? `<p style="color:#555;margin:.3rem 0 0">${esc(p.description)}</p>`
        : "";
      return (
        `<li style="margin:0 0 1.6rem">` +
        `<a href="/blog/${esc(p.slug)}" style="font-size:1.15rem;font-weight:600">${esc(p.title)}</a>${date}` +
        `${desc}</li>`
      );
    })
    .join("\n");
  return (
    `<div id="root"><main style="max-width:760px;margin:0 auto;padding:2rem 1rem;line-height:1.6">` +
    `<h1>${esc(heading)}</h1><p style="color:#666">${esc(subtitle)}</p>` +
    `<ul style="list-style:none;padding:0">${items}</ul>${STATIC_FOOTER}</main></div>`
  );
}

/** 템플릿(dist/index.html)의 head 를 페이지 메타로 교체한 HTML 을 만든다. */
function renderHtml(template, meta) {
  let html = template
    .replace(/\s*<title>[\s\S]*?<\/title>/, "")
    .replace(/\s*<meta name="description"[^>]*\/?>/, "")
    .replace("</head>", `    ${buildHeadTags(meta)}\n  </head>`);
  // #root 안에 정적 콘텐츠를 심는다(크롤러가 JS 없이 읽도록).
  // 글 페이지는 본문 전문을, 목록(홈·카테고리) 페이지는 글 목록을 넣는다.
  let rootHtml;
  if (meta.bodyHtml) rootHtml = bodyWrapper(meta);
  else if (meta.listPosts) rootHtml = listWrapper(meta);
  if (rootHtml) {
    html = html.replace(/<div id="root">\s*<\/div>/, rootHtml);
  }
  return html;
}

async function main() {
  const template = await readFile(join(DIST_DIR, "index.html"), "utf8");

  const files = (await readdir(POSTS_DIR)).filter(
    (f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md" && !f.startsWith("_"),
  );

  let count = 0;
  const categoryPaths = new Set();
  const allPosts = []; // 목록 페이지(홈·카테고리)에 심을 글 메타

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
      bodyHtml: renderBody(raw),
    });
    await writeFile(join(DIST_DIR, `${slug}.html`), html, "utf8");
    count++;

    const [p, s] = Array.isArray(fm.category) ? fm.category : [];
    if (p) categoryPaths.add(p);
    if (p && s) categoryPaths.add(`${p}/${s}`);

    allPosts.push({
      slug,
      title: fm.title || slug,
      date: typeof fm.date === "string" ? fm.date : "",
      description: fm.description || "",
      primary: p,
      secondary: s,
    });
  }

  // 최신순(날짜 내림차순)으로 정렬 — 목록에 그대로 쓴다.
  allPosts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // 2) 카테고리 페이지 — 해당 글 목록을 정적으로 심는다.
  for (const cat of categoryPaths) {
    const [p, s] = cat.split("/");
    const label = s
      ? `${LABELS[p] ?? p} › ${LABELS[s] ?? s}`
      : `${LABELS[p] ?? p}`;
    const listPosts = allPosts.filter((post) =>
      s ? post.primary === p && post.secondary === s : post.primary === p,
    );
    const html = renderHtml(template, {
      title: label,
      description: `${label} 카테고리의 글 — ${SITE_NAME}`,
      path: `/category/${cat}`,
      type: "website",
      heading: label,
      subtitle: `${label} 카테고리의 글`,
      listPosts,
    });
    const dir = join(DIST_DIR, "category", ...(s ? [p] : []));
    await mkdir(dir, { recursive: true });
    await writeFile(join(DIST_DIR, "category", `${cat}.html`), html, "utf8");
    count++;
  }

  // 3) 홈(index.html = /blog) — 전체 글 목록을 정적으로 심는다.
  const homeHtml = renderHtml(template, {
    title: undefined,
    description: DEFAULT_DESC,
    path: "/",
    type: "website",
    heading: "Blog",
    subtitle: "인프라 · DevOps · 개발, 그리고 이런저런 기록",
    listPosts: allPosts,
  });
  await writeFile(join(DIST_DIR, "index.html"), homeHtml, "utf8");

  console.log(
    `[blog] prerender: 글·카테고리 ${count}개 + 홈/목록에 글 ${allPosts.length}편 정적 심기`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
