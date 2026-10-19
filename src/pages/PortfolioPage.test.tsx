import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import PortfolioPage from "./PortfolioPage";

const html = renderToString(
  <StaticRouter location="/portfolio">
    <PortfolioPage />
  </StaticRouter>,
).replace(/<!-- -->/g, "");

describe("PortfolioPage", () => {
  it("renders a timeline, not cards or tag pills", () => {
    expect(html.match(/class="tl-item/g)).toHaveLength(12);
    expect(html).not.toContain('class="tag"');
  });
  it("shows updated periods", () => {
    expect(html).toContain("의뢰 · 약 8개월 (실작업 약 2개월)");
    expect(html).toContain("2024.12 ~ 2026.04 · 인수인계 완료");
  });
  it("ends with the ask band", () => {
    expect(html).toContain('id="contact"');
  });
});
