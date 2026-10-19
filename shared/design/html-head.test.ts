import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const inline = readFileSync(join(ROOT, "shared/design/theme-inline.js"), "utf8").trim();
const tokens = readFileSync(join(ROOT, "shared/design/tokens.css"), "utf8");

const VARS = [
  "--bg", "--tile", "--text", "--text-2", "--text-3", "--line", "--link",
  "--soon", "--code-bg",
];

describe.each(["index.html", "blog/index.html"])("%s head", (file) => {
  const html = readFileSync(join(ROOT, file), "utf8");
  it("inlines the theme script verbatim before any stylesheet", () => {
    const at = html.indexOf(inline);
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(html.indexOf("pretendard"));
  });
  it("loads Pretendard dynamic subset", () => {
    expect(html).toContain(
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
    );
  });
  it("declares color-scheme and theme-color for both modes", () => {
    expect(html).toContain('<meta name="color-scheme" content="light dark" />');
    expect(html).toContain('media="(prefers-color-scheme: light)"');
    expect(html).toContain('media="(prefers-color-scheme: dark)"');
  });
});

describe("tokens.css", () => {
  it("defines every color var for light and twice for dark", () => {
    for (const v of VARS) {
      const count = tokens.split(`${v}:`).length - 1;
      expect(count, v).toBe(3);
    }
  });
});
