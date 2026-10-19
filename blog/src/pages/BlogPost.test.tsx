import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BlogPost from "./BlogPost";
import { SERIES } from "../lib/series";
import { writtenParts } from "../lib/listing";
import { COUPANG_DISCLOSURE } from "../lib/coupang";

const render = (slug: string) =>
  renderToString(
    <MemoryRouter initialEntries={[`/${slug}`]}>
      <Routes>
        <Route path="/:slug" element={<BlogPost />} />
      </Routes>
    </MemoryRouter>,
  ).replace(/<!-- -->/g, "");

const parts = writtenParts(SERIES[0]);

describe("BlogPost", () => {
  const html = render(parts[1].slug);
  it("puts the series TOC in a collapsed details above the body", () => {
    expect(html).toMatch(/<details[^>]*>[\s\S]*편 중 2편/);
    expect(html.indexOf("<details")).toBeLessThan(html.indexOf('class="prose'));
  });
  it("renders body inside .prose and shows the Coupang disclosure", () => {
    expect(html).toContain('class="prose"');
    expect(html).toContain(COUPANG_DISCLOSURE);
  });
  it("has prev/next and related lists", () => {
    expect(html).toContain("이전 글");
    expect(html).toContain("다음 글");
    expect(html).toContain("같은 분류의 글");
  });
  it("has no tag pills or emoji labels", () => {
    expect(html).not.toContain("rounded-full");
    expect(html).not.toContain("📚");
  });
  it("shows a not-found page in the same frame", () => {
    const nf = render("no-such-post");
    expect(nf).toContain("글을 찾을 수 없습니다");
    expect(nf).toContain('class="gn"');
  });
});
