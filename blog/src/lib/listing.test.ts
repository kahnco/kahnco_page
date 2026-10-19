import { describe, expect, it } from "vitest";
import { getAllPosts } from "./posts";
import { SERIES } from "./series";
import {
  adjacentPosts, categoryTabs, featuredSeries, formatDate, isComplete,
  relatedPosts, seriesLabel, writtenParts,
} from "./listing";

const posts = getAllPosts();

describe("formatDate", () => {
  it("dots the ISO date", () => expect(formatDate("2026-05-12")).toBe("2026.05.12"));
  it("passes through odd input", () => expect(formatDate("soon")).toBe("soon"));
});

describe("categoryTabs", () => {
  const tabs = categoryTabs();
  it("starts with 전체 = all posts", () => {
    expect(tabs[0]).toMatchObject({ label: "전체", to: "/", count: posts.length });
  });
  it("lists only non-empty secondaries, biggest first", () => {
    const rest = tabs.slice(1);
    expect(rest.every((t) => t.count > 0)).toBe(true);
    expect(rest.map((t) => t.count)).toEqual([...rest.map((t) => t.count)].sort((a, b) => b - a));
    expect(rest.reduce((n, t) => n + t.count, 0)).toBeLessThanOrEqual(posts.length);
    expect(rest[0].to).toMatch(/^\/category\/[a-z]+\/[a-z]+$/);
  });
});

describe("series helpers", () => {
  it("featured series is complete and the most recently finished", () => {
    const f = featuredSeries();
    expect(f).toBeDefined();
    expect(isComplete(f!)).toBe(true);
    const lastDate = (slug: string) => posts.find((p) => p.slug === slug)!.date;
    const fEnd = lastDate(writtenParts(f!).at(-1)!.slug);
    for (const s of SERIES.filter(isComplete)) {
      expect(fEnd >= lastDate(writtenParts(s).at(-1)!.slug)).toBe(true);
    }
  });
  it("labels a series post with its position", () => {
    const s = SERIES[0];
    const p = writtenParts(s)[0];
    expect(seriesLabel(p.slug)).toBe(`${s.title} ${p.order}편`);
  });
});

describe("adjacentPosts", () => {
  it("walks inside a series", () => {
    const parts = writtenParts(SERIES.find(isComplete)!);
    const mid = parts[1];
    const { prev, next } = adjacentPosts(mid.slug);
    expect(prev?.slug).toBe(parts[0].slug);
    expect(next?.slug).toBe(parts[2]?.slug);
  });
  it("first part has no prev", () => {
    const parts = writtenParts(SERIES.find(isComplete)!);
    expect(adjacentPosts(parts[0].slug).prev).toBeUndefined();
  });
});

describe("relatedPosts", () => {
  it("returns up to 3 posts of the same category, excluding itself", () => {
    const base = posts.find((p) => p.secondaryCategory)!;
    const rel = relatedPosts(base.slug);
    expect(rel.length).toBeLessThanOrEqual(3);
    for (const r of rel) {
      expect(r.slug).not.toBe(base.slug);
      expect(r.primaryCategory).toBe(base.primaryCategory);
      expect(r.secondaryCategory).toBe(base.secondaryCategory);
    }
  });
});
