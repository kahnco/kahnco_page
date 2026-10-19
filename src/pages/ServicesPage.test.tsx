import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ServicesPage from "./ServicesPage";

const html = renderToString(
  <StaticRouter location="/services">
    <ServicesPage />
  </StaticRouter>,
).replace(/<!-- -->/g, "");

describe("ServicesPage", () => {
  it("gives each live service a full-screen tile in order", () => {
    const full = [...html.matchAll(/class="tile full"[\s\S]*?<h2 class="name">([^<]+)</g)].map((m) => m[1]);
    expect(full).toEqual(["그래서요", "사주쿠키", "Atomic Demolition"]);
  });
  it("puts upcoming services in the 곧 만나요 duo with status text", () => {
    expect(html).toContain("곧 만나요");
    expect(html).toContain("비공개 베타 모집 중");
    expect(html).toContain("개발 중");
    expect(html).toContain("화면 공개 예정");
  });
  it("uses links, not filled buttons", () => {
    expect(html).not.toContain('class="btn"');
    expect(html).toContain('href="https://sowhat.run"');
  });
});
