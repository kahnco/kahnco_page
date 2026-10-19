import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BlogHeader from "./BlogHeader";
import BlogFooter from "./BlogFooter";

const at = (el: JSX.Element) => renderToString(<StaticRouter location="/">{el}</StaticRouter>);

describe("blog chrome matches the home chrome", () => {
  it("header uses shared classes and marks 블로그 current", () => {
    const html = at(<BlogHeader />);
    expect(html).toContain('class="gn"');
    expect(html).toMatch(/<a[^>]*(href="\/blog"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/blog")/);
    expect(html).toContain('href="/services"');
    expect(html).toContain('class="theme-btn"');
  });
  it("footer carries company facts", () => {
    const html = at(<BlogFooter />);
    expect(html).toContain('class="ft"');
    expect(html).toContain("465-37-01575");
    expect(html).toContain('href="/privacy"');
  });
});
