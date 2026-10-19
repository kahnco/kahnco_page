// 약관 문구가 틀 교체 중에 한 글자도 바뀌지 않았는지 보증한다.
// 최초 1회: CAPTURE_LEGAL=1 yarn test src/pages/legal.test.tsx  → 옛 페이지 문구를 fixture 로 저장
// 이후: fixture 와 현재 페이지 문구(블록 단위, 공백 정규화, 정렬)를 비교
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import PrivacyPage from "./PrivacyPage";
import YourThoughtsPrivacy from "./YourThoughtsPrivacy";
import YourThoughtsTerms from "./YourThoughtsTerms";
import AtomicDemolitionPrivacy from "./AtomicDemolitionPrivacy";
import AtomicDemolitionTerms from "./AtomicDemolitionTerms";

const PAGES: Record<string, () => JSX.Element> = {
  "/privacy": PrivacyPage,
  "/yourthoughts/privacy": YourThoughtsPrivacy,
  "/yourthoughts/terms": YourThoughtsTerms,
  "/atomic-demolition/privacy": AtomicDemolitionPrivacy,
  "/atomic-demolition/terms": AtomicDemolitionTerms,
};
const FIXTURE = join(__dirname, "__fixtures__", "legal-text.json");

function blocks(route: string): string[] {
  const Page = PAGES[route];
  const html = renderToString(
    <StaticRouter location={route}>
      <Page />
    </StaticRouter>,
  );
  const doc = new JSDOM(html).window.document;
  const root = doc.querySelector("article.legal") ?? doc.querySelector("main")!;
  return Array.from(root.querySelectorAll("h1,h2,h3,p,li,th,td"))
    .map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .sort();
}

if (process.env.CAPTURE_LEGAL) {
  mkdirSync(join(__dirname, "__fixtures__"), { recursive: true });
  writeFileSync(FIXTURE, JSON.stringify(Object.fromEntries(Object.keys(PAGES).map((r) => [r, blocks(r)])), null, 2));
}

describe.each(Object.keys(PAGES))("%s", (route) => {
  it("keeps every word of the legal text", () => {
    expect(existsSync(FIXTURE)).toBe(true);
    const before = JSON.parse(readFileSync(FIXTURE, "utf8"))[route];
    expect(blocks(route)).toEqual(before);
  });
});
