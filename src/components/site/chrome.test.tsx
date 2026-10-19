import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import AskBand from "./AskBand";

const at = (url: string, el: JSX.Element) =>
  renderToString(<StaticRouter location={url}>{el}</StaticRouter>);

describe("site chrome", () => {
  it("header links services, portfolio, blog and has a theme button", () => {
    const html = at("/services", <SiteHeader />);
    expect(html).toContain('class="gn"');
    expect(html).toMatch(/<a[^>]*(href="\/services"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/services")/);
    expect(html).toContain('href="/portfolio"');
    expect(html).toContain('href="/blog"');
    expect(html).toContain('class="theme-btn"');
  });
  it("footer carries company facts and privacy link", () => {
    const html = at("/", <SiteFooter />);
    expect(html).toContain("465-37-01575");
    expect(html).toContain("대표 이현준");
    expect(html).toContain('href="/privacy"');
  });
  it("ask band has exactly one filled button", () => {
    const html = at("/", <AskBand />);
    expect(html).toContain('id="contact"');
    expect(html.match(/class="btn"/g)).toHaveLength(1);
    expect(html).toContain("mailto:kahnco@kahnco.me");
  });
});
