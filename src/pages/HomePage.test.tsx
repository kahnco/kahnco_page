import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import HomePage from "./HomePage";
import { BLOG_POST_COUNT } from "../data/posts";

const html = renderToString(
  <StaticRouter location="/">
    <HomePage />
  </StaticRouter>,
);
const text = html.replace(/<!-- -->/g, "");

describe("HomePage", () => {
  it("greets as a person, not a product", () => {
    expect(text).toContain("이현준입니다.");
    expect(text).toContain("혼자서 끝까지");
    expect(text).toContain("1인 회사");
  });
  it("tells the 2021 → 2024 → 2026 story", () => {
    for (const y of ["2021", "2024", "2026"]) expect(text).toContain(`>${y}<`);
  });
  it("computes numbers from data", () => {
    expect(text).toContain("12건");
    expect(text).toContain(`${BLOG_POST_COUNT}편`);
    expect(text).toMatch(/지금 운영 중<\/dt><dd[^>]*>3</);
  });
  it("shows all five products with real screenshots", () => {
    for (const n of ["그래서요", "사주쿠키", "Atomic Demolition", "베라페이블", "더그아웃"]) expect(text).toContain(n);
    expect(text).toContain('src="/shots/sowhat.png"');
  });
  it("has exactly one filled button and no quotes", () => {
    expect(text.match(/class="btn"/g)).toHaveLength(1);
    expect(text).not.toContain("<blockquote");
  });
});
