// 블로그 포스트 로더
// 글 1편 = src/posts/*.md 파일 1개. 파일 상단의 frontmatter(YAML 유사 형식)로 메타데이터를 정의한다.
//
// 예시:
// ---
// title: GitHub Actions로 CI/CD 파이프라인 처음부터 구축하기
// date: 2026-06-30
// description: YAML 기본부터 빌드·테스트·배포 자동화까지, 중급 개발자를 위한 GitHub Actions 입문.
// tags: [CI/CD, GitHub Actions, DevOps]
// thumbnail: /blog/github-actions-cover.png   # 선택
// draft: false                                 # true면 목록/배포에서 제외
// ---
//
// 본문은 frontmatter 아래에 일반 마크다운으로 작성한다.

export interface PostMeta {
  slug: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  description: string;
  tags: string[];
  thumbnail?: string;
  draft: boolean;
  readingMinutes: number;
}

export interface Post extends PostMeta {
  content: string; // frontmatter를 제외한 마크다운 본문
}

// Vite: src/posts 의 모든 .md 를 raw 문자열로 빌드 타임에 인라인한다.
const rawPosts = import.meta.glob("../posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** "../posts/my-post.md" -> "my-post" */
function slugFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

/** 아주 작은 frontmatter 파서. gray-matter 등 Node 의존 라이브러리 없이 브라우저에서 안전하게 동작. */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const [, fm, body] = match;
  const data: Record<string, unknown> = {};

  for (const line of fm.split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    // 인라인 주석 제거 (값이 따옴표로 감싸지지 않은 경우에 한해)
    if (!/^["'[]/.test(value)) {
      const hashIdx = value.indexOf(" #");
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      // [a, b, c] 형태의 배열
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return { data, body: body ?? "" };
}

/** 한글/영문 혼용 기준 대략적인 읽기 시간(분) 추정. */
function estimateReadingMinutes(body: string): number {
  const text = body.replace(/```[\s\S]*?```/g, " ").replace(/[#>*`_\-]/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (text.match(/[ㄱ-힝]/g) ?? []).length;
  // 영문 220 wpm, 한글 350 자/분 가정
  const minutes = Math.ceil(words / 220 + cjk / 350);
  return Math.max(1, minutes);
}

function buildPost(path: string, raw: string): Post {
  const slug = slugFromPath(path);
  const { data, body } = parseFrontmatter(raw);

  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    date: typeof data.date === "string" ? data.date : "1970-01-01",
    description: typeof data.description === "string" ? data.description : "",
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    thumbnail: typeof data.thumbnail === "string" ? data.thumbnail : undefined,
    draft: data.draft === "true" || data.draft === true,
    readingMinutes: estimateReadingMinutes(body),
    content: body,
  };
}

// README.md, _ 로 시작하는 파일은 글이 아니므로 제외한다.
function isPublishablePath(path: string): boolean {
  const slug = slugFromPath(path);
  return slug.toLowerCase() !== "readme" && !slug.startsWith("_");
}

const allPosts: Post[] = Object.entries(rawPosts)
  .filter(([path]) => isPublishablePath(path))
  .map(([path, raw]) => buildPost(path, raw))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const isDev = import.meta.env.DEV;

/** 발행된 글 목록(최신순). 개발 모드에서는 draft 도 포함해 미리보기 가능. */
export function getAllPosts(): Post[] {
  return isDev ? allPosts : allPosts.filter((p) => !p.draft);
}

export function getPostBySlug(slug: string): Post | undefined {
  const post = allPosts.find((p) => p.slug === slug);
  if (!post) return undefined;
  if (post.draft && !isDev) return undefined;
  return post;
}

/** 모든 태그(중복 제거, 빈도순). */
export function getAllTags(): string[] {
  const counts = new Map<string, number>();
  for (const post of getAllPosts()) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
}
