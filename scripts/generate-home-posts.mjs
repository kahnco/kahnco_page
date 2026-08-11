// 홈에 노출할 최신 글(제목·날짜·요약)과 총 글 수를 blog/src/posts 프론트매터에서
// 뽑아 src/data/posts.ts 로 생성한다. 새 글을 올리면 홈이 자동으로 최신을 반영한다.
// (build 파이프라인 맨 앞에서 실행 → tsc/vite 가 최신 데이터로 빌드)

import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "blog", "src", "posts");
const OUT = join(ROOT, "src", "data", "posts.ts");

const HOME_COUNT = 9; // 홈에 노출할 최신 글 수
const EXCERPT_MAX = 140;

function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!m) return {};
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = value.replace(/^["']|["']$/g, "");
  }
  return data;
}

function excerpt(desc) {
  const s = (desc || "").trim();
  if (s.length <= EXCERPT_MAX) return s;
  return s.slice(0, EXCERPT_MAX - 1).trimEnd() + "…";
}

async function main() {
  const files = (await readdir(POSTS_DIR)).filter(
    (f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md" && !f.startsWith("_"),
  );

  const posts = [];
  for (const file of files) {
    const raw = await readFile(join(POSTS_DIR, file), "utf8");
    const fm = parseFrontmatter(raw);
    if (fm.draft === "true") continue;
    posts.push({
      slug: file.replace(/\.md$/, ""),
      date: typeof fm.date === "string" ? fm.date : "",
      title: fm.title || file,
      excerpt: excerpt(fm.description),
    });
  }

  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const total = posts.length;
  const featured = posts.slice(0, HOME_COUNT).map((p) => ({
    slug: p.slug,
    date: p.date.replace(/-/g, "."),
    title: p.title,
    excerpt: p.excerpt,
  }));

  const body =
    `// 자동 생성 파일 — scripts/generate-home-posts.mjs 가 blog/src/posts 에서 뽑아 만든다.\n` +
    `// 직접 수정하지 말 것. 새 글을 올리면 build 시 자동으로 갱신된다.\n\n` +
    `export interface PostMeta {\n` +
    `  slug: string;\n  date: string; // YYYY.MM.DD 표기\n  title: string;\n  excerpt: string;\n}\n\n` +
    `export const LATEST_POSTS: PostMeta[] = ${JSON.stringify(featured, null, 2)};\n\n` +
    `// 홈 figure("기술 블로그 N편")와 동기화되는 총 글 수.\n` +
    `export const BLOG_POST_COUNT = ${total};\n`;

  await writeFile(OUT, body, "utf8");
  console.log(`[home] posts.ts 생성: 최신 ${featured.length}편 노출, 총 ${total}편`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
