import { describe, expect, it } from "vitest";
import { mermaidThemeVariables } from "./mermaidTheme";

describe("mermaidThemeVariables", () => {
  it("maps tokens to mermaid base-theme variables", () => {
    const tokens: Record<string, string> = {
      "--bg": "#0b1022", "--tile": "#121834", "--text": "#f5f5f7",
      "--text-3": "#a1a1a6", "--line": "#424245", "--sans": "Pretendard",
    };
    const v = mermaidThemeVariables((n) => tokens[n] ?? "");
    expect(v.background).toBe("#0b1022");
    expect(v.primaryColor).toBe("#121834");
    expect(v.primaryTextColor).toBe("#f5f5f7");
    expect(v.lineColor).toBe("#a1a1a6");
    expect(v.primaryBorderColor).toBe("#424245");
    expect(v.fontFamily).toBe("Pretendard");
  });
});
