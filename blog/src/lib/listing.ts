// 목록·글 화면이 쓰는 파생 데이터: 분류 탭, 대표 시리즈, 이전/다음 글, 같은 분류의 글.

import { CATEGORIES } from "./categories";
import { getAllPosts, getCategoryCounts, getPostBySlug, type Post } from "./posts";
import { SERIES, seriesForPost, type Series } from "./series";

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

export interface CategoryTab {
  label: string;
  to: string;
  count: number;
  primary?: string;
  secondary?: string;
}

export function categoryTabs(): CategoryTab[] {
  const counts = getCategoryCounts().secondary;
  const subs: CategoryTab[] = CATEGORIES.flatMap((c) =>
    c.children.map((s) => ({
      label: s.label,
      to: `/category/${c.slug}/${s.slug}`,
      count: counts[`${c.slug}/${s.slug}`] ?? 0,
      primary: c.slug,
      secondary: s.slug,
    })),
  );
  return [
    { label: "전체", to: "/", count: getAllPosts().length },
    ...subs.filter((t) => t.count > 0).sort((a, b) => b.count - a.count),
  ];
}

export function writtenParts(s: Series): { order: number; title: string; slug: string }[] {
  return s.parts
    .filter((p): p is typeof p & { slug: string } => Boolean(p.slug && getPostBySlug(p.slug)))
    .map((p) => ({ order: p.order, title: p.title, slug: p.slug }));
}

export function isComplete(s: Series): boolean {
  return s.parts.length > 0 && writtenParts(s).length === s.parts.length;
}

function endDate(s: Series): string {
  const last = writtenParts(s).at(-1);
  return last ? (getPostBySlug(last.slug)?.date ?? "") : "";
}

export function featuredSeries(): Series | undefined {
  return SERIES.filter(isComplete).sort((a, b) => (endDate(a) < endDate(b) ? 1 : -1))[0];
}

export function seriesLabel(slug: string): string | undefined {
  const f = seriesForPost(slug);
  return f ? `${f.series.title} ${f.part.order}편` : undefined;
}

export function adjacentPosts(slug: string): { prev?: Post; next?: Post } {
  const f = seriesForPost(slug);
  if (f) {
    const parts = writtenParts(f.series);
    const i = parts.findIndex((p) => p.slug === slug);
    return {
      prev: i > 0 ? getPostBySlug(parts[i - 1].slug) : undefined,
      next: i >= 0 && i < parts.length - 1 ? getPostBySlug(parts[i + 1].slug) : undefined,
    };
  }
  const all = getAllPosts(); // 최신순
  const i = all.findIndex((p) => p.slug === slug);
  if (i === -1) return {};
  return { prev: all[i + 1], next: i > 0 ? all[i - 1] : undefined };
}

export function relatedPosts(slug: string, limit = 3): Post[] {
  const base = getPostBySlug(slug);
  if (!base?.primaryCategory) return [];
  return getAllPosts()
    .filter(
      (p) =>
        p.slug !== slug &&
        p.primaryCategory === base.primaryCategory &&
        p.secondaryCategory === base.secondaryCategory,
    )
    .slice(0, limit);
}
