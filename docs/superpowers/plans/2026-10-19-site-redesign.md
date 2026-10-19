# kahnco.me 홈·블로그 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈(kahnco.me)과 블로그(kahnco.me/blog)를 토스·애플 결의 한 디자인 언어(라이트/다크)로 다시 만든다.

**Architecture:** 두 개의 독립 Vite 앱(루트 `src/`, `blog/`)이 `shared/design/`의 CSS 토큰·공통 조각·테마 스크립트를 상대 경로로 가져다 쓴다. React 컴포넌트는 공유하지 않는다(앱마다 React 사본이 달라 훅이 깨짐) — 헤더·푸터는 **같은 CSS 클래스, 앱별 마크업**. 루트는 커스텀 CSS(`src/styles/site.css`), 블로그는 Tailwind 3 색을 CSS 변수에 매핑한다. 프리렌더·Firebase 설정·URL 은 그대로.

**Tech Stack:** React 18, Vite 6, react-router 7, Tailwind 3.4(블로그·앱 랜딩), react-markdown + rehype-katex/highlight, mermaid 11, Vitest 3.2.4 + jsdom 26(신규, 테스트 전용).

**Spec:** `docs/superpowers/specs/2026-10-19-site-redesign-design.md`

## Global Constraints

- 작업 폴더는 원래 저장소, 브랜치 `feature/site-redesign`. **worktree·저장소 복사 금지.**
- 커밋 메시지에 `Co-Authored-By`/`Claude-Session` 등 AI 트레일러 **절대 금지**. 메시지 본문만.
- 앱 랜딩 `/yourthoughts`, `/atomic-demolition` 과 그 컴포넌트·`src/App.css` 의 Geist·Tailwind 설정은 **변경 금지** (랜딩이 쓰므로 Geist 는 `App.css` 에 남긴다. 제거 대상은 `site.css`·`blog/src/index.css` 의 Geist).
- 약관 5쪽의 **문구는 한 글자도 바꾸지 않는다** (Task 9 의 텍스트 비교 테스트로 보증).
- 얼굴 사진·지어낸 인용문·추천사 금지. 1인 회사 어투("우리 팀" 금지).
- 금지 모양: 점 달린 eyebrow 라벨, 둘째 줄만 액센트색 슬로건, 리드 문단, 채운+외곽선 버튼 쌍, 테두리+그림자 둥근 카드, 제목 위 액센트색 머리 라벨, 알약 배지/태그, 전부 같은 반경, 의미 없는 01/02/03 번호.
- 그림자는 제품 이미지(폰·브라우저 틀)에만. 채운 버튼(`.btn`)은 한 화면에 하나.
- 색은 토큰(`var(--…)`)만. 새 hex 하드코딩 금지 (토큰 파일과 기기 틀 회색 제외).
- 굵기 700·600·500·400 만. 숫자 열은 `tabular-nums`.
- `prefers-reduced-motion: reduce` 면 움직임 없음. 400px 폭에서 가로 스크롤 없음.
- 루트 패키지는 **yarn**, `blog/` 은 **npm** 으로 설치하고 `blog/yarn.lock` 도 `yarn` 으로 같이 갱신한다(두 락파일 공존 중).
- 테스트 실행: 루트 `yarn test`, 블로그 `cd blog && npm test`.

---

## File Structure

```
shared/
  company.ts                 # COMPANY (src/data/company.ts 에서 이전, 두 앱 공용)
  design/
    tokens.css               # 색·크기 변수, 라이트/다크
    chrome.css               # 헤더(.gn)·푸터(.ft)·링크(.lk)·버튼(.btn)·테마버튼(.theme-btn)
    prose.css                # 글 본문·약관 공통(.prose), 코드 강조 색
    theme.ts                 # 테마 읽기/쓰기/전환/구독
    theme-inline.js          # <head> 인라인 스크립트 원본(두 index.html 에 그대로 복사)
    theme.test.ts
    html-head.test.ts        # 두 index.html 이 인라인 스크립트·폰트·메타를 갖는지
public/shots/                # 제품 캡처 5장 중 4장(더그아웃은 없음)
src/
  data/company.ts            # shared/company 재수출
  data/services.ts           # 5개 서비스 + 상태
  data/portfolio.ts          # 쿠펀 추가, 축신 기간
  data/home.ts               # 경력 계산, 이야기·네 겹·일하는 방식 문구
  data/*.test.ts
  lib/useReveal.ts           # 스크롤 페이드업
  components/site/SiteHeader.tsx   # (Masthead.tsx 대체)
  components/site/SiteFooter.tsx
  components/site/ThemeToggle.tsx
  components/site/AskBand.tsx
  components/site/DeviceFrame.tsx  # BrowserFrame, PhoneFrame
  components/site/ServiceTile.tsx
  components/site/LegalDocument.tsx
  components/home/*.tsx      # 홈 구역별
  pages/HomePage.tsx, ServicesPage.tsx, PortfolioPage.tsx   # 재작성
  pages/PrivacyPage.tsx, YourThoughtsPrivacy/Terms.tsx, AtomicDemolitionPrivacy/Terms.tsx  # 틀만 교체
  pages/*.test.tsx
  styles/site.css            # 재작성
blog/
  tailwind.config.ts         # 토큰 매핑
  src/index.css              # Geist 제거, shared CSS import
  src/lib/listing.ts (+ .test.ts)  # 분류 탭·대표 시리즈·이전/다음·같은 분류
  src/components/BlogHeader.tsx, BlogFooter.tsx, ThemeToggle.tsx
  src/components/FeaturedSeries.tsx, CategoryTabs.tsx, PostList.tsx, PostNav.tsx
  src/components/SeriesNav.tsx, Markdown.tsx, MermaidDiagram.tsx, CoupangBanner.tsx  # 재스타일
  src/pages/Browse.tsx, BlogPost.tsx
  src/components/CategorySidebar.tsx  # 삭제
  scripts/prerender.mjs      # 인라인 색 → 토큰
```

---

### Task 1: 테스트 기반 (Vitest)

**Files:**
- Modify: `package.json`, `tsconfig.json`, `blog/package.json`, `blog/tsconfig.json`
- Create: `vitest.config.ts`, `blog/vitest.config.ts`, `shared/design/smoke.test.ts`, `blog/src/lib/smoke.test.ts`

**Interfaces:**
- Produces: `yarn test` (루트: `src/**`, `shared/**`), `npm test` (blog: `blog/src/**`). 테스트 파일은 `tsc -b` 에서 제외.

- [ ] **Step 1: 의존성 설치**

```bash
cd /Users/tripmate/IdeaProjects/kahnco_page
yarn add -D vitest@3.2.4 jsdom@26.1.0
cd blog && npm install -D vitest@3.2.4 && yarn add -D vitest@3.2.4 && cd ..
```

- [ ] **Step 2: 설정 파일 작성**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}", "shared/**/*.test.ts"],
    environment: "node",
  },
});
```

`blog/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
```

`package.json` scripts 에 `"test": "vitest run"` 추가. `blog/package.json` scripts 에도 `"test": "vitest run"` 추가.

`tsconfig.json` 과 `blog/tsconfig.json` 의 `"include": ["src"]` 다음 줄에 추가:
```json
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
```

- [ ] **Step 3: 스모크 테스트 작성**

`shared/design/smoke.test.ts`:
```ts
import { expect, it } from "vitest";
it("runs", () => expect(1 + 1).toBe(2));
```
`blog/src/lib/smoke.test.ts`: 같은 내용.

- [ ] **Step 4: 실행해 통과 확인**

Run: `yarn test && (cd blog && npm test)`
Expected: 두 쪽 모두 `1 passed`.

- [ ] **Step 5: 스모크 테스트 삭제 후 빌드 확인**

`shared/design/smoke.test.ts`, `blog/src/lib/smoke.test.ts` 삭제.
Run: `npm run build:site`
Expected: 성공 (`[main] prerender: 10개 라우트`).

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock tsconfig.json vitest.config.ts blog/package.json blog/package-lock.json blog/yarn.lock blog/tsconfig.json blog/vitest.config.ts
git commit -m "chore: Vitest 테스트 기반 추가 (루트·블로그)"
```

---

### Task 2: 테마 스크립트 (`shared/design/theme.ts`, `theme-inline.js`)

**Files:**
- Create: `shared/design/theme.ts`, `shared/design/theme-inline.js`, `shared/design/theme.test.ts`

**Interfaces:**
- Produces (`shared/design/theme.ts`):
  - `type ThemePref = "light" | "dark"`
  - `const THEME_KEY = "kahnco-theme"`, `const THEME_EVENT = "kahnco-theme"`
  - `readStoredTheme(storage?: Pick<Storage, "getItem">): ThemePref | null` — 값이 없거나 이상하거나 접근이 throw 하면 null
  - `resolveTheme(stored: ThemePref | null, systemDark: boolean): ThemePref`
  - `currentTheme(): ThemePref` — `<html data-theme>` 우선, 없으면 시스템
  - `setTheme(t: ThemePref): void` — 저장(try/catch) + `data-theme` + `THEME_EVENT` 발송
  - `toggleTheme(): ThemePref`
  - `onThemeChange(cb: (t: ThemePref) => void): () => void` — 수동 전환과, 저장값 없을 때의 시스템 변경 둘 다 통지
- Produces (`theme-inline.js`): 한 줄 IIFE. 저장값이 있으면 `data-theme` 설정, 항상 `<html>` 에 `js` 클래스 추가.

- [ ] **Step 1: 실패하는 테스트 작성**

`shared/design/theme.test.ts`:
```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  THEME_KEY,
  currentTheme,
  onThemeChange,
  readStoredTheme,
  resolveTheme,
  setTheme,
  toggleTheme,
} from "./theme";

function mockSystemDark(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes("dark") ? dark : false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  mockSystemDark(false);
});
afterEach(() => vi.restoreAllMocks());

describe("readStoredTheme", () => {
  it("returns stored light/dark", () => {
    expect(readStoredTheme({ getItem: () => "dark" })).toBe("dark");
    expect(readStoredTheme({ getItem: () => "light" })).toBe("light");
  });
  it("returns null for missing or invalid values", () => {
    expect(readStoredTheme({ getItem: () => null })).toBeNull();
    expect(readStoredTheme({ getItem: () => "blue" })).toBeNull();
  });
  it("returns null when storage throws", () => {
    expect(
      readStoredTheme({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBeNull();
  });
});

describe("resolveTheme", () => {
  it("prefers stored value over system", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("falls back to system", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });
});

describe("setTheme / toggleTheme / currentTheme", () => {
  it("currentTheme follows system when nothing is set", () => {
    mockSystemDark(true);
    expect(currentTheme()).toBe("dark");
  });
  it("setTheme stores, sets data-theme and notifies", () => {
    const cb = vi.fn();
    const off = onThemeChange(cb);
    setTheme("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(cb).toHaveBeenCalledWith("dark");
    off();
    setTheme("light");
    expect(cb).toHaveBeenCalledTimes(1);
  });
  it("toggleTheme flips the current theme", () => {
    setTheme("light");
    expect(toggleTheme()).toBe("dark");
    expect(toggleTheme()).toBe("light");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test shared/design/theme.test.ts`
Expected: FAIL — `Failed to resolve import "./theme"`.

- [ ] **Step 3: 구현**

`shared/design/theme.ts`:
```ts
// 라이트/다크 테마 — 홈(src)·블로그(blog) 공용. 같은 도메인이라 localStorage 를 공유한다.
// 첫 페인트 전 적용은 theme-inline.js(각 index.html <head>)가 맡고, 이 모듈은 전환·구독만 한다.

export type ThemePref = "light" | "dark";

export const THEME_KEY = "kahnco-theme";
export const THEME_EVENT = "kahnco-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function readStoredTheme(
  storage: Pick<Storage, "getItem"> | undefined = typeof localStorage === "undefined"
    ? undefined
    : localStorage,
): ThemePref | null {
  try {
    const v = storage?.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function resolveTheme(stored: ThemePref | null, systemDark: boolean): ThemePref {
  return stored ?? (systemDark ? "dark" : "light");
}

function systemDark(): boolean {
  return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches;
}

export function currentTheme(): ThemePref {
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return resolveTheme(null, systemDark());
}

export function setTheme(t: ThemePref): void {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    // 저장이 막혀도 이번 페이지에서는 적용한다.
  }
  document.documentElement.dataset.theme = t;
  window.dispatchEvent(new CustomEvent<ThemePref>(THEME_EVENT, { detail: t }));
}

export function toggleTheme(): ThemePref {
  const next: ThemePref = currentTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function onThemeChange(cb: (t: ThemePref) => void): () => void {
  const onManual = (e: Event) => cb((e as CustomEvent<ThemePref>).detail);
  const mq = typeof matchMedia === "function" ? matchMedia(DARK_QUERY) : undefined;
  const onSystem = () => {
    if (!readStoredTheme()) cb(currentTheme());
  };
  window.addEventListener(THEME_EVENT, onManual);
  mq?.addEventListener("change", onSystem);
  return () => {
    window.removeEventListener(THEME_EVENT, onManual);
    mq?.removeEventListener("change", onSystem);
  };
}
```

`shared/design/theme-inline.js` (정확히 이 한 줄, 끝에 개행):
```js
(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem("kahnco-theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}})();
```

- [ ] **Step 4: 통과 확인**

Run: `yarn test shared/design/theme.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/design/theme.ts shared/design/theme-inline.js shared/design/theme.test.ts
git commit -m "feat(design): 라이트/다크 테마 전환 모듈과 head 인라인 스크립트"
```

---

### Task 3: 토큰·공통 조각·본문 CSS, 두 앱 `<head>` 연결

**Files:**
- Create: `shared/design/tokens.css`, `shared/design/chrome.css`, `shared/design/prose.css`, `shared/design/html-head.test.ts`, `shared/company.ts`
- Modify: `index.html`, `blog/index.html`, `src/data/company.ts`, `blog/vite.config.ts`

**Interfaces:**
- Produces CSS 변수: `--bg --tile --text --text-2 --text-3 --line --link --btn --btn-text --soon --deep --on-deep --on-deep-2 --on-deep-link --code-bg --code-text --sans --mono --max --gutter --prose --header-h`
- Produces CSS 클래스(chrome.css): `.gn .gn-in .gn-brand .gn-nav .theme-btn .ft .ft-in .ft-links .ft-biz .ft-row .lk .btn .tnum .on-deep`
- Produces CSS 클래스(prose.css): `.prose`(+ `ul.num`, `.table-wrap`, `.hljs-*`)
- Produces `shared/company.ts`: `export const COMPANY` (기존 `src/data/company.ts` 내용 그대로)

- [ ] **Step 1: 실패하는 테스트 작성**

`shared/design/html-head.test.ts`:
```ts
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
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test shared/design/html-head.test.ts`
Expected: FAIL — `ENOENT ... tokens.css`.

- [ ] **Step 3: `shared/design/tokens.css` 작성**

```css
/* 칸코 디자인 토큰 — 홈(src)·블로그(blog) 공용.
 * 값의 근거: docs/superpowers/specs/2026-10-19-site-redesign-design.md §3
 * 다크는 두 번 적는다: OS 다크(저장값 없음) / ◐ 로 고른 다크. */
:root {
  --bg: #ffffff;
  --tile: #f5f5f7;
  --text: #1d1d1f;
  --text-2: #424245;
  --text-3: #6e6e73;
  --line: #d2d2d7;
  --link: #0066cc;
  --btn: #0071e3;
  --btn-text: #ffffff;
  --soon: #bf4800;
  --code-bg: #1d1d1f;
  --code-text: #f5f5f7;

  /* 고정 남색 타일 — 테마와 무관 */
  --deep: #0f1428;
  --on-deep: #f5f5f7;
  --on-deep-2: #a1a1a6;
  --on-deep-link: #2997ff;

  --sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui,
    "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --max: 1024px;
  --gutter: 22px;
  --prose: 700px;
  --header-h: 48px;

  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0b1022;
    --tile: #121834;
    --text: #f5f5f7;
    --text-2: #d2d2d7;
    --text-3: #a1a1a6;
    --line: #424245;
    --link: #2997ff;
    --soon: #ff9f0a;
    --code-bg: #060914;
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --bg: #0b1022;
  --tile: #121834;
  --text: #f5f5f7;
  --text-2: #d2d2d7;
  --text-3: #a1a1a6;
  --line: #424245;
  --link: #2997ff;
  --soon: #ff9f0a;
  --code-bg: #060914;
  color-scheme: dark;
}

@media (max-width: 700px) {
  :root {
    --gutter: 18px;
  }
}
```

- [ ] **Step 4: `shared/design/chrome.css` 작성**

```css
/* 두 앱이 같이 쓰는 조각: 헤더·푸터·링크·버튼·테마 버튼. 마크업은 앱마다 따로 둔다. */

.tnum { font-variant-numeric: tabular-nums; }

/* 헤더 — 애플식 얇은 반투명 */
.gn {
  position: sticky; top: 0; z-index: 50; height: var(--header-h);
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid color-mix(in srgb, var(--line) 50%, transparent);
  font-family: var(--sans);
}
.gn-in {
  max-width: var(--max); height: 100%; margin: 0 auto; padding: 0 var(--gutter);
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.gn-brand { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; color: var(--text); text-decoration: none; }
.gn-nav { display: flex; align-items: center; gap: 28px; font-size: 13px; }
.gn-nav a { color: var(--text-2); text-decoration: none; }
.gn-nav a:hover, .gn-nav a[aria-current="page"] { color: var(--text); }
@media (max-width: 520px) { .gn-nav { gap: 18px; } }

.theme-btn {
  all: unset; cursor: pointer; width: 32px; height: 32px; display: grid; place-items: center;
  border-radius: 999px; color: var(--text-2); font-size: 16px; line-height: 1;
}
.theme-btn:hover { color: var(--text); background: var(--tile); }
.theme-btn:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }

/* 푸터 — 애플식 작은 회색 */
.ft { background: var(--tile); color: var(--text-3); font-family: var(--sans); font-size: 12px; line-height: 1.8; }
.ft-in { max-width: var(--max); margin: 0 auto; padding: 22px var(--gutter) 40px; }
.ft-links { display: flex; flex-wrap: wrap; gap: 4px 20px; margin-bottom: 10px; }
.ft a { color: var(--text-2); text-decoration: none; }
.ft a:hover { text-decoration: underline; }
.ft-row {
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 20px;
  border-top: 1px solid var(--line); margin-top: 14px; padding-top: 14px;
}

/* 링크·버튼 */
.lk { color: var(--link); text-decoration: none; }
.lk:hover { text-decoration: underline; }
.lk::after { content: " ›"; }
.on-deep .lk { color: var(--on-deep-link); }

.btn {
  display: inline-block; background: var(--btn); color: var(--btn-text); border-radius: 999px;
  padding: 10px 22px; font-size: 15px; font-weight: 500; text-decoration: none;
}
.btn:hover { filter: brightness(1.08); }
.btn:focus-visible, .lk:focus-visible { outline: 2px solid var(--link); outline-offset: 3px; }
```

- [ ] **Step 5: `shared/design/prose.css` 작성**

```css
/* 글 본문(블로그)과 약관이 같이 쓰는 문서 스타일. */
.prose { font-family: var(--sans); font-size: 18px; line-height: 1.85; color: var(--text-2); letter-spacing: -0.01em; word-break: keep-all; overflow-wrap: anywhere; }
@media (max-width: 700px) { .prose { font-size: 17px; } }
.prose > :first-child { margin-top: 0; }
.prose p { margin: 0 0 26px; }
.prose h1, .prose h2, .prose h3, .prose h4 { color: var(--text); font-weight: 700; scroll-margin-top: calc(var(--header-h) + 24px); }
.prose h1 { font-size: clamp(30px, 4.6vw, 44px); line-height: 1.3; letter-spacing: -0.04em; margin: 0 0 18px; }
.prose h2 { font-size: 28px; line-height: 1.35; letter-spacing: -0.035em; margin: 64px 0 20px; }
.prose h3 { font-size: 22px; line-height: 1.4; letter-spacing: -0.03em; margin: 44px 0 14px; }
.prose h4 { font-size: 19px; font-weight: 600; margin: 32px 0 10px; }
.prose strong, .prose b { color: var(--text); font-weight: 600; }
.prose a { color: var(--link); text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.prose ul, .prose ol { margin: 0 0 26px; padding-left: 1.3em; }
.prose ul { list-style: disc; }
.prose ol, .prose ul.num { list-style: decimal; }
.prose li { margin: 6px 0; padding-left: 4px; }
.prose li::marker { color: var(--text-3); }
.prose li > ul, .prose li > ol { margin: 6px 0 0; }
.prose blockquote { margin: 0 0 26px; padding: 2px 0 2px 20px; border-left: 3px solid var(--line); color: var(--text-3); }
.prose hr { border: 0; border-top: 1px solid var(--line); margin: 56px 0; }
.prose img { display: block; max-width: 100%; height: auto; margin: 32px auto; border-radius: 14px; }

.prose .table-wrap { margin: 0 0 30px; overflow-x: auto; }
.prose table { width: 100%; border-collapse: collapse; font-size: 15.5px; line-height: 1.6; }
.prose th, .prose td { border-bottom: 1px solid var(--line); padding: 10px 12px 10px 0; text-align: left; vertical-align: top; }
.prose th { color: var(--text); font-weight: 600; }

.prose :not(pre) > code { font-family: var(--mono); font-size: 0.86em; background: var(--tile); color: var(--text); border-radius: 6px; padding: 2px 6px; }
.prose pre {
  margin: 0 0 30px; padding: 22px 24px; border-radius: 14px; overflow-x: auto;
  background: var(--code-bg); color: var(--code-text);
  font: 14px/1.75 var(--mono); letter-spacing: 0;
}
.prose pre code { font: inherit; background: none; padding: 0; color: inherit; }

.prose .katex-display { margin: 0 0 30px; overflow-x: auto; overflow-y: hidden; padding: 4px 0; color: var(--text); }
.prose .katex { color: var(--text); }

/* 코드 강조 — 짙은 코드 배경 하나에 맞춘 팔레트(라이트·다크 공통) */
.hljs-comment, .hljs-quote { color: #8b929e; font-style: italic; }
.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-meta .hljs-keyword { color: #ff7ab2; }
.hljs-string, .hljs-regexp, .hljs-addition, .hljs-template-string { color: #ff8170; }
.hljs-number, .hljs-symbol, .hljs-bullet { color: #d9c97c; }
.hljs-title, .hljs-title.function_, .hljs-section { color: #6bdfff; }
.hljs-title.class_, .hljs-type, .hljs-built_in { color: #dabaff; }
.hljs-attr, .hljs-attribute, .hljs-variable, .hljs-property, .hljs-params { color: #acf2e4; }
.hljs-meta, .hljs-deletion { color: #fd8f3f; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: 600; }
```

- [ ] **Step 6: `<head>` 연결**

`index.html` 의 `<meta name="viewport" …/>` 다음 줄에 삽입(아래 `<script>` 줄 내용은 `theme-inline.js` 와 **글자 하나 다르지 않게**):
```html
    <script>(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem("kahnco-theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}})();</script>
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0b1022" media="(prefers-color-scheme: dark)" />
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
```
`blog/index.html` 에도 같은 블록을 같은 위치에 삽입.

`blog/vite.config.ts` 를 다음으로 교체(`shared/` 가 blog 루트 밖이라 dev 서버 접근 허용):
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 블로그는 kahnco.me/blog 경로에서 서빙된다(별도 서브도메인 아님).
  plugins: [react()],
  base: '/blog/',
  // 공용 디자인 파일(../shared)을 dev 서버가 읽을 수 있게 한다.
  server: { fs: { allow: ['..'] } },
})
```

- [ ] **Step 7: COMPANY 이전**

`shared/company.ts` 생성 — 현재 `src/data/company.ts` 내용을 그대로 옮기고 첫 줄 주석만:
```ts
// 칸코테크 사업자/연락처 정보 단일 소스 — 홈(src)·블로그(blog) 푸터가 같이 쓴다.
```
`src/data/company.ts` 는 다음으로 교체:
```ts
// 실제 값은 shared/company.ts (블로그와 공유).
export { COMPANY } from "../../shared/company";
```

- [ ] **Step 8: 통과 확인**

Run: `yarn test shared/design`
Expected: PASS (theme 9 + head 7).
Run: `npm run build:site`
Expected: 성공.

- [ ] **Step 9: Commit**

```bash
git add shared index.html blog/index.html blog/vite.config.ts src/data/company.ts
git commit -m "feat(design): 토큰·공통 조각·본문 CSS, 두 앱 head 에 테마 스크립트·Pretendard 연결"
```

---

### Task 4: 루트 앱 뼈대 — site.css 재작성, 헤더·푸터·테마 버튼·페이드업

**Files:**
- Create: `src/components/site/SiteHeader.tsx`, `src/components/site/ThemeToggle.tsx`, `src/components/site/AskBand.tsx`, `src/lib/useReveal.ts`, `src/components/site/chrome.test.tsx`
- Modify: `src/components/site/SiteFooter.tsx`, `src/main.tsx`, `src/entry-server.tsx`(변경 없음 확인만), `src/styles/site.css`(전체 교체)
- Delete: `src/components/site/Masthead.tsx`

**Interfaces:**
- Consumes: `shared/design/theme.ts` (`currentTheme`, `toggleTheme`, `onThemeChange`, `ThemePref`), `COMPANY`
- Produces:
  - `SiteHeader(): JSX.Element` — `.gn` 헤더, NavLink 로 현재 위치 `aria-current="page"`
  - `SiteFooter(): JSX.Element` — `.ft`
  - `ThemeToggle(): JSX.Element` — `button.theme-btn`
  - `AskBand(): JSX.Element` — `section.ask.on-deep#contact`, 채운 버튼 하나(메일)
  - `useReveal(deps?: unknown[]): void` — `.reveal` 요소에 `is-in` 추가

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/site/chrome.test.tsx`:
```tsx
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
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
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test src/components/site/chrome.test.tsx`
Expected: FAIL — `Failed to resolve import "./SiteHeader"`.

- [ ] **Step 3: 컴포넌트 구현**

`src/components/site/ThemeToggle.tsx`:
```tsx
import { useEffect, useState } from "react";
import { currentTheme, onThemeChange, toggleTheme, type ThemePref } from "../../../shared/design/theme";

// ◐ 라이트/다크 전환. 프리렌더 시점엔 테마를 모르므로 라벨은 마운트 후 채운다.
export default function ThemeToggle() {
  const [theme, setThemeState] = useState<ThemePref | null>(null);

  useEffect(() => {
    setThemeState(currentTheme());
    return onThemeChange(setThemeState);
  }, []);

  const label = theme === "dark" ? "라이트 모드로 전환" : theme === "light" ? "다크 모드로 전환" : "테마 전환";

  return (
    <button type="button" className="theme-btn" aria-label={label} onClick={() => setThemeState(toggleTheme())}>
      ◐
    </button>
  );
}
```

`src/components/site/SiteHeader.tsx`:
```tsx
import { Link, NavLink } from "react-router-dom";
import { COMPANY } from "../../data/company";
import ThemeToggle from "./ThemeToggle";

// 회사 홈 공통 헤더. 블로그(/blog)는 별도 빌드라 일반 링크로 이동한다.
// 블로그 쪽 헤더(blog/src/components/BlogHeader.tsx)와 같은 클래스·같은 구조를 유지할 것.
export default function SiteHeader() {
  return (
    <header className="gn">
      <div className="gn-in">
        <Link className="gn-brand" to="/">
          {COMPANY.nameEn}
        </Link>
        <nav className="gn-nav" aria-label="주요 메뉴">
          <NavLink to="/services">서비스</NavLink>
          <NavLink to="/portfolio">포트폴리오</NavLink>
          <a href="/blog">블로그</a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
```

`src/components/site/SiteFooter.tsx` (전체 교체):
```tsx
import { Link } from "react-router-dom";
import { COMPANY } from "../../data/company";

// 블로그 푸터(blog/src/components/BlogFooter.tsx)와 같은 구조를 유지할 것.
export default function SiteFooter() {
  return (
    <footer className="ft">
      <div className="ft-in">
        <nav className="ft-links" aria-label="사이트 링크">
          <Link to="/services">서비스</Link>
          <Link to="/portfolio">포트폴리오</Link>
          <a href="/blog">블로그</a>
          <a href="/#contact">문의</a>
          <Link to="/privacy">개인정보처리방침</Link>
        </nav>
        <div className="ft-biz">
          {COMPANY.nameKo} ({COMPANY.nameEn}) · 대표 {COMPANY.ceo} · 사업자등록번호 {COMPANY.bizNo}
          <br />
          {COMPANY.address} · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </div>
        <div className="ft-row">
          <span>Copyright © 2026 {COMPANY.nameEn}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
```

`src/components/site/AskBand.tsx`:
```tsx
import { COMPANY } from "../../data/company";

// 남색 문의 띠 — 홈·포트폴리오 맨 아래. 이 화면의 유일한 채운 버튼.
export default function AskBand() {
  return (
    <section className="ask on-deep" id="contact">
      <h2 className="reveal">기획안 한 장이면 충분합니다</h2>
      <p className="reveal">앱·웹·서버·인프라를 한 사람에게 맡기고 싶으시면 메일 주세요.</p>
      <a className="btn" href={`mailto:${COMPANY.email}`}>
        메일 보내기
      </a>
      <p className="ask-mail tnum">{COMPANY.email}</p>
    </section>
  );
}
```

`src/lib/useReveal.ts`:
```ts
import { useEffect } from "react";

// .reveal 요소가 화면에 들어오면 한 번만 is-in 을 붙인다(페이드업).
// CSS 는 html.js 일 때만 숨기므로, JS 가 없거나 이 훅이 돌기 전엔 그대로 보인다.
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)"));
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
```

`src/main.tsx` 의 CSS import 를 다음 순서로 교체(`App.css` 는 랜딩용으로 유지):
```tsx
import './App.css'
import '../shared/design/tokens.css'
import '../shared/design/chrome.css'
import '../shared/design/prose.css'
import './styles/site.css'
```

`src/components/site/Masthead.tsx` 삭제. (페이지들은 Task 6~9 에서 `SiteHeader` 로 바뀐다. 그때까지 빌드가 깨지지 않도록 **이 태스크에서** `HomePage`, `ServicesPage`, `PortfolioPage`, `PrivacyPage` 의 `import Masthead from "../components/site/Masthead";` → `import SiteHeader from "../components/site/SiteHeader";`, `<Masthead />` → `<SiteHeader />` 로만 바꿔 둔다.)

- [ ] **Step 4: `src/styles/site.css` 전체 교체**

```css
/* 회사 홈(.site) 스타일.
 * 토큰: shared/design/tokens.css · 헤더/푸터/링크/버튼: chrome.css · 문서: prose.css
 * 앱 랜딩(/yourthoughts, /atomic-demolition)은 App.css(Tailwind)를 쓰며 여기와 무관하다. */

body:has(.site) { background: var(--bg); color: var(--text); }
.site {
  min-height: 100vh; background: var(--bg); color: var(--text);
  font-family: var(--sans); letter-spacing: -0.015em; -webkit-font-smoothing: antialiased;
}
.site *, .site *::before, .site *::after { box-sizing: border-box; }
:where(.site) a { color: inherit; text-decoration: none; }
:where(.site) h1, :where(.site) h2, :where(.site) h3, :where(.site) p { margin: 0; }

.wrap { max-width: var(--max); margin: 0 auto; padding: 0 var(--gutter); }

/* 페이드업 — JS 가 있을 때만 숨긴다 */
.js .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
.js .reveal.is-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .js .reveal { opacity: 1; transform: none; transition: none; }
}

/* 공통 머리 */
.sec { max-width: var(--max); margin: 0 auto; padding: 110px var(--gutter) 40px; }
.sec h2 { font-size: clamp(34px, 4.6vw, 52px); font-weight: 700; letter-spacing: -0.045em; line-height: 1.2; }
.sec .sub { font-size: 19px; color: var(--text-3); margin-top: 10px; }
.phead { max-width: var(--max); margin: 0 auto; padding: 96px var(--gutter) 48px; }
.phead h1 { font-size: clamp(40px, 6vw, 64px); font-weight: 700; letter-spacing: -0.045em; line-height: 1.1; }
.phead h2 { font-size: clamp(32px, 4vw, 44px); font-weight: 700; letter-spacing: -0.04em; line-height: 1.2; }
.phead p { font-size: clamp(19px, 2.2vw, 22px); color: var(--text-3); margin-top: 16px; max-width: 32em; line-height: 1.55; }

/* ── 홈: 첫 인사 ── */
.me { min-height: calc(100svh - var(--header-h)); display: flex; align-items: center; }
.me .wrap { width: 100%; padding-top: 80px; padding-bottom: 80px; }
.me h1 { font-size: clamp(48px, 8vw, 96px); font-weight: 700; letter-spacing: -0.05em; line-height: 1.08; margin-bottom: 40px; }
.me .say { font-size: clamp(22px, 2.8vw, 32px); font-weight: 500; letter-spacing: -0.03em; line-height: 1.5; color: var(--text-3); max-width: 24em; }
.me .say b { color: var(--text); font-weight: 700; }
.me .down { display: inline-block; margin-top: 80px; font-size: 22px; color: var(--text-3); }

/* ── 홈: 이야기 ── */
.story {
  max-width: var(--max); margin: 0 auto; padding: 140px var(--gutter);
  display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start;
}
.story h2 {
  position: sticky; top: calc(var(--header-h) + 62px);
  font-size: clamp(34px, 4.4vw, 48px); font-weight: 700; letter-spacing: -0.04em; line-height: 1.25;
}
.years { border-top: 1px solid var(--line); list-style: none; margin: 0; padding: 0; }
.yr { display: grid; grid-template-columns: 110px 1fr; gap: 20px; padding: 26px 0; border-bottom: 1px solid var(--line); }
.yr .y { font-size: 30px; font-weight: 700; letter-spacing: -0.04em; color: var(--text-3); }
.yr h3 { font-size: 20px; font-weight: 700; letter-spacing: -0.03em; margin: 4px 0 8px; color: var(--text-3); }
.yr p { font-size: 15.5px; line-height: 1.7; color: var(--text-3); }
.yr.now .y, .yr.now h3, .yr:hover .y, .yr:hover h3 { color: var(--text); }
.yr.now p, .yr:hover p { color: var(--text-2); }
@media (max-width: 820px) {
  .story { grid-template-columns: 1fr; padding: 90px var(--gutter); }
  .story h2 { position: static; }
  .yr { grid-template-columns: 1fr; gap: 4px; }
}

/* ── 홈: 네 겹(남색) ── */
.layers { background: var(--deep); color: var(--on-deep); }
.layers .wrap { padding-top: 130px; padding-bottom: 130px; }
.layers h2 { font-size: clamp(34px, 4.6vw, 52px); font-weight: 700; letter-spacing: -0.045em; margin-bottom: 56px; }
.stack { display: grid; gap: 10px; list-style: none; margin: 0; padding: 0; }
.ly { display: grid; grid-template-columns: 160px 1fr; align-items: center; gap: 24px; padding: 26px 30px; border-radius: 20px; background: rgba(255, 255, 255, 0.05); }
.ly:nth-child(2) { margin-left: 4%; } .ly:nth-child(3) { margin-left: 8%; } .ly:nth-child(4) { margin-left: 12%; }
.ly b { font-size: 34px; font-weight: 700; letter-spacing: -0.04em; }
.ly span { font-size: 16px; line-height: 1.6; color: var(--on-deep-2); }
@media (max-width: 700px) {
  .ly { grid-template-columns: 1fr; gap: 6px; padding: 22px 22px; }
  .ly:nth-child(n) { margin-left: 0; }
  .ly b { font-size: 28px; }
}

/* ── 홈: 숫자 ── */
.nums { background: var(--tile); }
.nums dl { max-width: var(--max); margin: 0 auto; padding: 100px var(--gutter); display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
.nums dt { font-size: 15px; color: var(--text-3); margin-bottom: 6px; }
.nums dd { margin: 0; font-size: clamp(40px, 5vw, 56px); font-weight: 700; letter-spacing: -0.04em; }
@media (max-width: 700px) { .nums dl { grid-template-columns: 1fr 1fr; padding: 70px var(--gutter); } }

/* ── 홈: 일하는 방식(펼침) ── */
.way { max-width: var(--max); margin: 0 auto; padding: 120px var(--gutter) 40px; }
.way h2 { font-size: clamp(34px, 4.4vw, 48px); font-weight: 700; letter-spacing: -0.04em; margin-bottom: 36px; }
.acc { max-width: 720px; border-top: 1px solid var(--line); }
.acc details { border-bottom: 1px solid var(--line); }
.acc summary { list-style: none; cursor: pointer; padding: 20px 0; font-size: 19px; font-weight: 600; color: var(--text-3); transition: color 0.2s; }
.acc summary::-webkit-details-marker { display: none; }
.acc details[open] summary, .acc summary:hover { color: var(--text); }
.acc details p { font-size: 15.5px; line-height: 1.65; color: var(--text-2); padding: 0 0 22px; margin-top: -6px; }
@media (prefers-reduced-motion: reduce) { .acc summary { transition: none; } }

/* ── 홈: 만든 것(가로 레일) ── */
.rail {
  --rail-pad: max(var(--gutter), calc((100vw - var(--max)) / 2 + var(--gutter)));
  display: flex; gap: 18px; overflow-x: auto; list-style: none; margin: 0;
  padding: 4px var(--gutter) 30px var(--rail-pad);
  scroll-snap-type: x mandatory; scroll-padding-left: var(--rail-pad); scrollbar-width: none;
}
.rail::-webkit-scrollbar { display: none; }
.pc { flex: none; width: 320px; scroll-snap-align: start; }
.pc .shot { height: 400px; border-radius: 24px; overflow: hidden; background: var(--tile); display: flex; align-items: flex-start; justify-content: center; }
.pc .shot img { display: block; }
.pc .shot.browser img { width: 180%; max-width: none; margin-right: -80%; }
.pc .shot.phone { padding-top: 36px; }
.pc .shot.phone img { width: 62%; border-radius: 26px 26px 0 0; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25); }
.pc .shot.none { align-items: center; font-size: 14px; color: var(--text-3); }
.pc .meta { display: block; font-size: 13px; color: var(--text-3); margin: 16px 4px 4px; }
.pc .meta .soon { color: var(--soon); font-weight: 600; }
.pc h3 { font-size: 21px; font-weight: 700; letter-spacing: -0.03em; margin: 0 4px; }
@media (max-width: 520px) { .pc { width: 78vw; } .pc .shot { height: 360px; } }
.more-line { max-width: var(--max); margin: 0 auto; padding: 8px var(--gutter) 0; font-size: 17px; }

/* ── 글 목록(홈 미리보기) ── */
.posts { max-width: var(--max); margin: 0 auto; padding: 0 var(--gutter) 120px; list-style: none; }
.pl { display: block; padding: 28px 0; border-bottom: 1px solid var(--line); }
.pl h3 { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.4; margin-bottom: 8px; }
.pl:hover h3 { color: var(--link); }
.pl p { font-size: 16px; line-height: 1.65; color: var(--text-2); margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.pl small { font-size: 14px; color: var(--text-3); }
.posts .more-line { padding: 28px 0 0; }

/* ── 문의 띠(남색) ── */
.ask { background: var(--deep); color: var(--on-deep); text-align: center; padding: 120px var(--gutter); }
.ask h2 { font-size: clamp(34px, 4.6vw, 52px); font-weight: 700; letter-spacing: -0.04em; margin-bottom: 14px; }
.ask p { font-size: 19px; color: var(--on-deep-2); margin-bottom: 30px; }
.ask .ask-mail { font-size: 15px; margin: 16px 0 0; }

/* ── 서비스 타일 ── */
.tiles { display: grid; gap: 12px; padding: 0 12px; }
.tile { position: relative; overflow: hidden; text-align: center; background: var(--tile); border-radius: 0; padding: 56px var(--gutter) 0; }
.tile .name { font-size: clamp(36px, 6vw, 56px); font-weight: 700; letter-spacing: -0.035em; line-height: 1.07; }
.tile .tl { font-size: clamp(19px, 2.4vw, 28px); font-weight: 500; letter-spacing: -0.02em; color: var(--text-2); margin-top: 8px; }
.tile .st { font-size: 14px; color: var(--text-3); margin-top: 10px; }
.tile .st.soon { color: var(--soon); font-weight: 600; margin: 0 0 6px; }
.tile .go { margin-top: 18px; font-size: 17px; }
.tile .vis { margin: 44px auto 0; max-width: 980px; }
.tile.full { height: calc(100svh - var(--header-h)); min-height: 620px; max-height: 1100px; display: flex; flex-direction: column; }
.tile.full .vis { flex: 1; min-height: 0; width: 100%; display: flex; justify-content: center; align-items: flex-start; overflow: hidden; margin-top: 40px; }
.duo { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 12px 12px; }
.duo .tile { padding-top: 50px; }
.duo .tile .name { font-size: clamp(32px, 4vw, 40px); }
.duo .tile .tl { font-size: 19px; }
.duo .tile .vis { height: 420px; margin-top: 36px; }
@media (max-width: 820px) { .duo { grid-template-columns: 1fr; } }

/* 기기 틀 — 그림자는 여기에만 */
.frame-browser { width: min(980px, 100%); border-radius: 14px 14px 0 0; overflow: hidden; background: #f4f3f1; border: 1px solid rgba(0, 0, 0, 0.06); border-bottom: 0; box-shadow: 0 -10px 60px rgba(0, 0, 0, 0.12); display: flex; flex-direction: column; max-height: 100%; }
.frame-browser .bar { display: flex; gap: 6px; align-items: center; padding: 11px 14px; background: #e8e8ea; }
.frame-browser .bar i { width: 11px; height: 11px; border-radius: 50%; background: #ff5f57; }
.frame-browser .bar i + i { background: #febc2e; }
.frame-browser .bar i + i + i { background: #28c840; }
.frame-browser .bar span { margin: 0 auto; background: #fff; border-radius: 7px; padding: 4px 48px; font-size: 12px; color: #6e6e73; }
.frame-browser img { display: block; width: 100%; flex: 1; min-height: 0; object-fit: cover; object-position: top; }
.frame-phone { position: relative; width: min(300px, 62vw); margin: 0 auto; border-radius: 52px; padding: 12px; background: #1d1d1f; box-shadow: inset 0 0 0 2px #3a3a3c, 0 40px 80px rgba(0, 0, 0, 0.25); }
.frame-phone .sc { border-radius: 40px; overflow: hidden; aspect-ratio: 9 / 19.5; background: #000; }
.frame-phone .sc img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
.frame-phone .di { position: absolute; top: 24px; left: 50%; transform: translateX(-50%); width: 92px; height: 26px; border-radius: 999px; background: #000; z-index: 2; }
.duo .frame-phone { width: 240px; border-radius: 44px; padding: 10px; }
.duo .frame-phone .sc { border-radius: 34px; }
.frame-empty { width: 240px; height: 100%; margin: 0 auto; border-radius: 44px 44px 0 0; background: var(--bg); display: grid; place-items: center; color: var(--text-3); font-size: 14px; }

/* ── 포트폴리오 연표 ── */
.pf-group { max-width: var(--max); margin: 0 auto; padding: 40px var(--gutter) 60px; }
.pf-group h2 { font-size: 28px; font-weight: 700; letter-spacing: -0.035em; padding-bottom: 18px; border-bottom: 1px solid var(--text); }
.pf-group h2 .n { color: var(--text-3); font-weight: 500; margin-left: 8px; }
.tl { list-style: none; margin: 0; padding: 0; }
.tl-item { display: grid; grid-template-columns: 220px 1fr; gap: 24px; padding: 26px 0; border-bottom: 1px solid var(--line); }
.tl-when { font-size: 15px; color: var(--text-3); line-height: 1.6; }
.tl-item h3 { font-size: 20px; font-weight: 700; letter-spacing: -0.03em; }
.tl-item p { font-size: 15.5px; line-height: 1.7; color: var(--text-2); margin-top: 6px; }
.tl-item .tech { font-size: 14px; color: var(--text-3); }
.tl-links { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 10px; font-size: 15px; }
@media (max-width: 700px) { .tl-item { grid-template-columns: 1fr; gap: 6px; } }

/* ── 약관 ── */
.legal-wrap { max-width: var(--max); margin: 0 auto; padding: 72px var(--gutter) 120px; display: grid; grid-template-columns: minmax(0, var(--prose)) 1fr; gap: 64px; }
.legal { grid-column: 1; grid-row: 1; }
.legal h1 { margin-bottom: 8px; }
.legal .legal-meta { font-size: 15px; color: var(--text-3); padding-bottom: 36px; border-bottom: 1px solid var(--line); margin-bottom: 44px; }
.legal-toc { grid-column: 2; grid-row: 1; font-size: 14px; line-height: 1.6; }
.legal-toc details { position: sticky; top: calc(var(--header-h) + 32px); }
.legal-toc summary { list-style: none; font-weight: 600; color: var(--text); margin-bottom: 10px; cursor: pointer; }
.legal-toc summary::-webkit-details-marker { display: none; }
.legal-toc ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.legal-toc a { color: var(--text-3); }
.legal-toc a:hover { color: var(--text); }
@media (max-width: 1100px) {
  .legal-wrap { grid-template-columns: minmax(0, 1fr); gap: 0; max-width: calc(var(--prose) + var(--gutter) * 2); }
  .legal-toc { grid-column: 1; grid-row: 1; margin-bottom: 32px; padding: 16px 20px; background: var(--tile); border-radius: 18px; }
  .legal-toc details { position: static; }
  .legal-toc summary { margin-bottom: 0; }
  .legal-toc details[open] summary { margin-bottom: 10px; }
  .legal { grid-row: 2; }
}
```

- [ ] **Step 5: 통과 확인**

Run: `yarn test src/components/site/chrome.test.tsx`
Expected: PASS (3 tests).
Run: `yarn build`
Expected: 성공.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/site src/lib/useReveal.ts src/main.tsx src/styles/site.css src/pages/HomePage.tsx src/pages/ServicesPage.tsx src/pages/PortfolioPage.tsx src/pages/PrivacyPage.tsx
git commit -m "feat(site): 새 site.css 와 공통 헤더·푸터·테마 버튼·문의 띠"
```

---

### Task 5: 데이터 — 서비스 5개, 포트폴리오(쿠펀·축신), 홈 문구, 제품 캡처

**Files:**
- Modify: `src/data/services.ts`(전체 교체), `src/data/portfolio.ts`
- Create: `src/data/home.ts`, `src/data/data.test.ts`, `public/shots/sowhat.png`, `public/shots/sajucookie.png`, `public/shots/atomic.png`, `public/shots/verafable.jpg`

**Interfaces:**
- Produces (`services.ts`):
  - `type ServiceStatus = "live" | "beta" | "building"`
  - `interface ServiceShot { src: string; frame: "browser" | "phone"; url?: string; alt: string }`
  - `interface Service { id; name; kind; tagline; status: ServiceStatus; statusLabel; href?; external?; cta?; shot? }`
  - `SERVICES: Service[]`(순서: 그래서요, 사주쿠키, Atomic Demolition, 베라페이블, 더그아웃), `LIVE_SERVICES`, `UPCOMING_SERVICES`, `LIVE_COUNT: number`
- Produces (`portfolio.ts`): 기존 `PORTFOLIO`, `PORTFOLIO_COUNT`(=13), `PortfolioItem` 유지
- Produces (`home.ts`): `CAREER_START`, `careerYears(now: Date): number`, `STORY: {year; title; body; now?}[]`, `LAYERS: {name; stack}[]`, `WAYS: {title; body}[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/data/data.test.ts`:
```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LIVE_COUNT, LIVE_SERVICES, SERVICES, UPCOMING_SERVICES } from "./services";
import { PORTFOLIO, PORTFOLIO_COUNT } from "./portfolio";
import { careerYears, STORY, WAYS, LAYERS } from "./home";

const all = PORTFOLIO.flatMap((g) => g.items);

describe("services", () => {
  it("lists five services in story order", () => {
    expect(SERVICES.map((s) => s.name)).toEqual([
      "그래서요", "사주쿠키", "Atomic Demolition", "베라페이블", "더그아웃",
    ]);
  });
  it("splits live and upcoming", () => {
    expect(LIVE_COUNT).toBe(3);
    expect(LIVE_SERVICES.every((s) => s.status === "live")).toBe(true);
    expect(UPCOMING_SERVICES.map((s) => s.statusLabel)).toEqual(["비공개 베타 모집 중", "개발 중"]);
  });
  it("every screenshot exists in public/", () => {
    for (const s of SERVICES) {
      if (s.shot) expect(existsSync(join(__dirname, "../../public", s.shot.src)), s.shot.src).toBe(true);
    }
  });
});

describe("portfolio", () => {
  it("has 13 items including 쿠펀", () => {
    expect(PORTFOLIO_COUNT).toBe(13);
    const coufun = all.find((i) => i.title.startsWith("쿠펀"));
    expect(coufun?.period).toBe("의뢰 · 약 8개월 (실작업 약 2개월)");
  });
  it("축신 shows handover", () => {
    expect(all.find((i) => i.title === "축신")?.period).toBe("2024.12 ~ 2026.04 · 인수인계 완료");
  });
});

describe("home", () => {
  it("counts career years from 2021-08", () => {
    expect(careerYears(new Date(2026, 9, 19))).toBe(5);
    expect(careerYears(new Date(2026, 6, 31))).toBe(4);
    expect(careerYears(new Date(2026, 7, 1))).toBe(5);
  });
  it("has three story years, four layers, four ways", () => {
    expect(STORY.map((s) => s.year)).toEqual(["2021", "2024", "2026"]);
    expect(LAYERS.map((l) => l.name)).toEqual(["앱", "웹", "서버", "인프라"]);
    expect(WAYS).toHaveLength(4);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test src/data/data.test.ts`
Expected: FAIL — `LIVE_COUNT` 등 export 없음 / `./home` 없음.

- [ ] **Step 3: 캡처 복사**

```bash
mkdir -p public/shots
S=.superpowers/brainstorm/38832-1792384118/content
cp $S/shot-sowhat.png public/shots/sowhat.png
cp $S/shot-saju2.png public/shots/sajucookie.png
cp $S/shot-atomic.png public/shots/atomic.png
cp $S/shot-verafable.jpg public/shots/verafable.jpg
```

- [ ] **Step 4: `src/data/services.ts` 전체 교체**

```ts
// 칸코테크가 직접 만들고 운영하는(또는 만들고 있는) 서비스 단일 소스.
// 홈의 '만든 것' 레일과 /services 타일이 이 배열을 공유한다. 순서 = 노출 순서.

export type ServiceStatus = "live" | "beta" | "building";

export interface ServiceShot {
  src: string; // public/ 기준 경로
  frame: "browser" | "phone";
  url?: string; // 브라우저 틀 주소창 표기
  alt: string;
}

export interface Service {
  id: string;
  name: string;
  kind: string; // "AI 토론 · 웹"
  tagline: string; // 타일 한 줄 (사실만)
  status: ServiceStatus;
  statusLabel: string;
  href?: string;
  external?: boolean; // 외부 링크 → 새 탭
  cta?: string; // 링크 문구 (기본 "사용해 보기")
  shot?: ServiceShot;
}

export const SERVICES: Service[] = [
  {
    id: "sowhat",
    name: "그래서요",
    kind: "AI 토론 · 웹",
    tagline: "AI가 항상 당신의 반대편에 섭니다.",
    status: "live",
    statusLabel: "운영 중",
    href: "https://sowhat.run",
    external: true,
    shot: { src: "/shots/sowhat.png", frame: "browser", url: "sowhat.run", alt: "그래서요 첫 화면" },
  },
  {
    id: "sajucookie",
    name: "사주쿠키",
    kind: "운세 · 웹",
    tagline: "생년월일로 사주와 오늘의 운세를 봅니다.",
    status: "live",
    statusLabel: "운영 중",
    href: "https://sajucookie.kahnco.me",
    external: true,
    shot: { src: "/shots/sajucookie.png", frame: "phone", alt: "사주쿠키 모바일 화면" },
  },
  {
    id: "atomic-demolition",
    name: "Atomic Demolition",
    kind: "퍼즐 · Android",
    tagline: "타일을 분열시키고 소멸시키는 전략 퍼즐. 5개 존, 30개 레벨.",
    status: "live",
    statusLabel: "운영 중",
    href: "/atomic-demolition",
    cta: "자세히 보기",
    shot: { src: "/shots/atomic.png", frame: "phone", alt: "Atomic Demolition 레벨 선택 화면" },
  },
  {
    id: "verafable",
    name: "베라페이블",
    kind: "AI 캐릭터 · 앱/웹",
    tagline: "얼굴을 드러내지 않는 AI 캐릭터 스튜디오.",
    status: "beta",
    statusLabel: "비공개 베타 모집 중",
    href: "https://verafable.com",
    external: true,
    cta: "둘러보기",
    shot: { src: "/shots/verafable.jpg", frame: "browser", url: "verafable.com", alt: "베라페이블 첫 화면" },
  },
  {
    id: "dugout",
    name: "더그아웃",
    kind: "야구 시뮬레이션 · 웹",
    tagline: "야구 시뮬레이션 웹 게임을 만들고 있습니다.",
    status: "building",
    statusLabel: "개발 중",
  },
];

export const LIVE_SERVICES = SERVICES.filter((s) => s.status === "live");
export const UPCOMING_SERVICES = SERVICES.filter((s) => s.status !== "live");
export const LIVE_COUNT = LIVE_SERVICES.length;
```

- [ ] **Step 5: `src/data/portfolio.ts` 수정**

`freelance` 그룹 `items` 맨 앞에 추가:
```ts
      {
        title: "쿠펀 (CoUFun)",
        period: "의뢰 · 약 8개월 (실작업 약 2개월)",
        description:
          "매장 스탬프·리워드 서비스. 고객 앱과 사장님 앱, 관리자 웹과 서버를 함께 만들었습니다.",
        tags: ["Flutter", "Firebase", "Cloud Functions", "관리자 웹"],
      },
```
축신 항목의 `period: "2024.12 ~ 2026.03",` → `period: "2024.12 ~ 2026.04 · 인수인계 완료",`

- [ ] **Step 6: `src/data/home.ts` 작성**

```ts
// 홈(사람 이야기) 문구 단일 소스. 사실만 쓴다 — 지어낸 인용·추천사 금지.

export const CAREER_START = { year: 2021, month: 8 }; // 첫 취업

/** 첫 취업월부터 now 까지 만 연차. */
export function careerYears(now: Date): number {
  const months = (now.getFullYear() - CAREER_START.year) * 12 + (now.getMonth() + 1 - CAREER_START.month);
  return Math.floor(months / 12);
}

export const STORY = [
  {
    year: "2021",
    title: "회사에서 전 과정을 배웠습니다",
    body: "Android 앱을 Flutter로 옮기는 일로 시작해, 모놀리식 서버를 MSA로 쪼개고 EKS에 올렸습니다. SaaS 인프라 자동화, 서버리스, 선박 안전 관리 시스템, AI 여행 추천 앱까지 — 앱과 인프라 사이를 다 걸어 봤습니다.",
  },
  {
    year: "2024",
    title: "남의 서비스를 끝까지 만들어 드렸습니다",
    body: "축구 레슨 플랫폼 축신, 커리어 네트워킹 앱 피어클럽, 라이프 매니지먼트 앱 내인생시계, 매장 리워드 서비스 쿠펀. 기획안을 받아 스토어 출시와 인수인계까지 맡았습니다.",
  },
  {
    year: "2026",
    title: "지금은 제 서비스를 만들고 운영합니다",
    body: "그래서요, 사주쿠키, Atomic Demolition을 운영하고, 베라페이블과 더그아웃을 만들고 있습니다.",
    now: true,
  },
];

export const LAYERS = [
  { name: "앱", stack: "Flutter로 Android·iOS 동시에 · Riverpod · 클린 아키텍처 · 인앱결제 · 푸시" },
  { name: "웹", stack: "React · Next.js · TypeScript · 랜딩부터 관리자 화면까지" },
  { name: "서버", stack: "Firebase · Node.js · Python · gRPC · Spring/Kotlin · 소셜 로그인" },
  { name: "인프라", stack: "AWS(CDK·Lambda·EKS·Amplify) · Kubernetes · ArgoCD · GitHub Actions" },
];

export const WAYS = [
  { title: "기획안 한 장이면 시작할 수 있습니다", body: "어디서부터 시작할지 막막해도 괜찮습니다. 설계·개발·배포·운영까지 제가 순서를 잡습니다." },
  { title: "범위와 일정은 계약서로 먼저 정합니다", body: "무엇을 언제까지 만드는지 시작 전에 글로 맞춥니다." },
  { title: "진행 상황은 수시로 보여 드립니다", body: "중간 결과물을 자주 공유하고, 연락에는 빨리 답합니다." },
  { title: "출시 뒤에도 책임집니다", body: "검수 후 하자보수를 드리고, 원하시면 운영과 자동화까지 맡습니다." },
];
```

- [ ] **Step 7: 통과 확인**

Run: `yarn test src/data/data.test.ts`
Expected: PASS (8 tests).
(`yarn build` 는 HomePage/ServicesPage 가 옛 필드를 써서 실패한다 — Task 6·7 에서 해결. 이 태스크에선 테스트만 확인.)

- [ ] **Step 8: Commit**

```bash
git add src/data public/shots
git commit -m "feat(data): 서비스 5개·상태, 쿠펀 추가·축신 기간 갱신, 홈 문구 데이터, 제품 캡처"
```

---

### Task 6: 홈 `/`

**Files:**
- Create: `src/components/site/DeviceFrame.tsx`, `src/components/home/Hello.tsx`, `src/components/home/Story.tsx`, `src/components/home/Layers.tsx`, `src/components/home/Numbers.tsx`, `src/components/home/WayOfWork.tsx`, `src/components/home/ProductRail.tsx`, `src/components/home/LatestPosts.tsx`, `src/pages/HomePage.test.tsx`
- Modify: `src/pages/HomePage.tsx`(전체 교체), `src/data/routeMeta.ts`(`"/"` 항목)

**Interfaces:**
- Consumes: `SERVICES`, `LIVE_COUNT`, `PORTFOLIO_COUNT`, `LATEST_POSTS`, `BLOG_POST_COUNT`, `careerYears`, `STORY`, `LAYERS`, `WAYS`, `SiteHeader`, `SiteFooter`, `AskBand`, `useReveal`
- Produces: `BrowserFrame({ src, alt, url })`, `PhoneFrame({ src, alt })` (Task 7 도 사용)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/HomePage.test.tsx`:
```tsx
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
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
    expect(text).toContain("13건");
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
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test src/pages/HomePage.test.tsx`
Expected: FAIL (옛 HomePage 가 `NEXT_SERVICE` 등 없는 export 를 import).

- [ ] **Step 3: 기기 틀 구현**

`src/components/site/DeviceFrame.tsx`:
```tsx
// 제품 캡처를 감싸는 기기 틀. 사이트에서 그림자를 쓰는 유일한 곳.

export function BrowserFrame({ src, alt, url }: { src: string; alt: string; url?: string }) {
  return (
    <div className="frame-browser">
      <div className="bar" aria-hidden="true">
        <i />
        <i />
        <i />
        {url && <span>{url}</span>}
      </div>
      <img src={src} alt={alt} loading="lazy" />
    </div>
  );
}

export function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="frame-phone">
      <div className="di" aria-hidden="true" />
      <div className="sc">
        <img src={src} alt={alt} loading="lazy" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 홈 구역 구현**

`src/components/home/Hello.tsx`:
```tsx
import { COMPANY } from "../../data/company";

export default function Hello() {
  return (
    <section className="me">
      <div className="wrap">
        <h1 className="reveal">
          안녕하세요,
          <br />
          {COMPANY.ceo}입니다.
        </h1>
        <p className="say reveal">
          앱부터 웹, 서버, 인프라까지 <b>혼자서 끝까지</b> 만드는 개발자입니다. {COMPANY.nameKo}는 제가 제
          이름을 걸고 일하는 1인 회사입니다.
        </p>
        <a className="down" href="#story" aria-label="이야기로 내려가기">
          ↓
        </a>
      </div>
    </section>
  );
}
```

`src/components/home/Story.tsx`:
```tsx
import { STORY } from "../../data/home";

export default function Story() {
  return (
    <section className="story" id="story">
      <h2 className="reveal">
        회사에서 배우고,
        <br />
        맡아서 만들고,
        <br />
        이제 제 것을 만듭니다
      </h2>
      <ol className="years">
        {STORY.map((s) => (
          <li className={`yr reveal${s.now ? " now" : ""}`} key={s.year}>
            <span className="y tnum">{s.year}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

`src/components/home/Layers.tsx`:
```tsx
import { LAYERS } from "../../data/home";

export default function Layers() {
  return (
    <section className="layers">
      <div className="wrap">
        <h2 className="reveal">한 사람이 네 겹을 다 맡습니다</h2>
        <ol className="stack">
          {LAYERS.map((l) => (
            <li className="ly reveal" key={l.name}>
              <b>{l.name}</b>
              <span>{l.stack}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

`src/components/home/Numbers.tsx`:
```tsx
import { careerYears } from "../../data/home";
import { PORTFOLIO_COUNT } from "../../data/portfolio";
import { LIVE_COUNT } from "../../data/services";
import { BLOG_POST_COUNT } from "../../data/posts";

export default function Numbers() {
  const items = [
    ["개발 경력", `${careerYears(new Date())}년`],
    ["제작 이력", `${PORTFOLIO_COUNT}건`],
    ["지금 운영 중", `${LIVE_COUNT}`],
    ["기술 블로그", `${BLOG_POST_COUNT}편`],
  ];
  return (
    <section className="nums" aria-label="숫자로 본 이력">
      <dl>
        {items.map(([k, v]) => (
          <div className="reveal" key={k}>
            <dt>{k}</dt>
            <dd className="tnum">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

`src/components/home/WayOfWork.tsx`:
```tsx
import { WAYS } from "../../data/home";

// <details name> 로 하나만 열리는 펼침 목록 — JS 없이도 동작한다.
export default function WayOfWork() {
  return (
    <section className="way">
      <h2 className="reveal">이렇게 일합니다</h2>
      <div className="acc reveal">
        {WAYS.map((w, i) => (
          <details key={w.title} open={i === 0} {...{ name: "way" }}>
            <summary>{w.title}</summary>
            <p>{w.body}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
```

`src/components/home/ProductRail.tsx`:
```tsx
import { Link } from "react-router-dom";
import { SERVICES, type Service } from "../../data/services";
import { PORTFOLIO_COUNT } from "../../data/portfolio";

function Card({ s }: { s: Service }) {
  const shot = s.shot ? (
    <div className={`shot ${s.shot.frame}`}>
      <img src={s.shot.src} alt={s.shot.alt} loading="lazy" />
    </div>
  ) : (
    <div className="shot none">화면 공개 예정</div>
  );
  const meta = (
    <span className="meta">
      <span className={s.status === "live" ? undefined : "soon"}>{s.statusLabel}</span> · {s.kind}
    </span>
  );
  const body = (
    <>
      {shot}
      {meta}
      <h3>{s.name}</h3>
    </>
  );
  if (!s.href) return <div>{body}</div>;
  if (s.external)
    return (
      <a href={s.href} target="_blank" rel="noopener noreferrer">
        {body}
      </a>
    );
  return <Link to={s.href}>{body}</Link>;
}

export default function ProductRail() {
  return (
    <>
      <div className="sec">
        <h2 className="reveal">만든 것</h2>
        <p className="sub reveal">지금 직접 운영하는 서비스와, 곧 나올 것들.</p>
      </div>
      <ul className="rail">
        {SERVICES.map((s) => (
          <li className="pc" key={s.id}>
            <Card s={s} />
          </li>
        ))}
      </ul>
      <p className="more-line">
        <Link className="lk" to="/portfolio">
          제작 이력 {PORTFOLIO_COUNT}건 전체 보기
        </Link>
      </p>
    </>
  );
}
```

`src/components/home/LatestPosts.tsx`:
```tsx
import { LATEST_POSTS } from "../../data/posts";

const SHOW = 4;

export default function LatestPosts() {
  return (
    <>
      <div className="sec">
        <h2 className="reveal">생각은 글로 남깁니다</h2>
        <p className="sub reveal">만들면서 배운 것을 블로그에 씁니다.</p>
      </div>
      <ul className="posts">
        {LATEST_POSTS.slice(0, SHOW).map((p) => (
          <li key={p.slug}>
            <a className="pl" href={`/blog/${p.slug}`}>
              <h3>{p.title}</h3>
              {p.excerpt && <p>{p.excerpt}</p>}
              <small className="tnum">{p.date}</small>
            </a>
          </li>
        ))}
        <li className="more-line">
          <a className="lk" href="/blog">
            블로그 전체 보기
          </a>
        </li>
      </ul>
    </>
  );
}
```

`src/pages/HomePage.tsx` (전체 교체):
```tsx
import SiteHeader from "../components/site/SiteHeader";
import SiteFooter from "../components/site/SiteFooter";
import AskBand from "../components/site/AskBand";
import Hello from "../components/home/Hello";
import Story from "../components/home/Story";
import Layers from "../components/home/Layers";
import Numbers from "../components/home/Numbers";
import WayOfWork from "../components/home/WayOfWork";
import ProductRail from "../components/home/ProductRail";
import LatestPosts from "../components/home/LatestPosts";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { useReveal } from "../lib/useReveal";
import { ROUTE_META } from "../data/routeMeta";

// 홈은 제품 진열장이 아니라 '이현준'의 이야기. 제품은 그 증거로 뒤에 나온다.
export default function HomePage() {
  useDocumentMeta(ROUTE_META["/"].title, ROUTE_META["/"].description);
  useReveal();

  return (
    <div className="site">
      <SiteHeader />
      <main>
        <Hello />
        <Story />
        <Layers />
        <Numbers />
        <WayOfWork />
        <ProductRail />
        <LatestPosts />
        <AskBand />
      </main>
      <SiteFooter />
    </div>
  );
}
```

`src/data/routeMeta.ts` 의 `"/"` description 교체:
```ts
    description:
      "칸코테크(Kahnco)는 개발자 이현준의 1인 회사입니다. 앱·웹·서버·인프라를 혼자서 끝까지 만들고, 그래서요·사주쿠키·Atomic Demolition을 운영합니다.",
```

- [ ] **Step 5: 통과 확인**

Run: `yarn test src/pages/HomePage.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: 눈으로 확인**

Run: `yarn dev` → `http://localhost:5173/` 를 1280px·390px, 라이트·다크(◐)로 확인.
확인할 것: 첫 인사가 한 화면, 이야기 제목이 스크롤 중 고정(넓은 화면), 남색 네 겹, 레일 첫 카드가 본문 왼쪽 여백에 맞음, 390px 에서 가로 스크롤 없음, 펼침 목록 하나만 열림.

- [ ] **Step 7: Commit**

```bash
git add src/components/site/DeviceFrame.tsx src/components/home src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/data/routeMeta.ts
git commit -m "feat(home): 사람 중심 홈 — 인사·이야기·네 겹·숫자·일하는 방식·만든 것·글·문의"
```

---

### Task 7: 서비스 `/services`

**Files:**
- Create: `src/components/site/ServiceTile.tsx`, `src/pages/ServicesPage.test.tsx`
- Modify: `src/pages/ServicesPage.tsx`(전체 교체), `src/data/routeMeta.ts`(`"/services"` description)

**Interfaces:**
- Consumes: `LIVE_SERVICES`, `UPCOMING_SERVICES`, `Service`, `BrowserFrame`, `PhoneFrame`
- Produces: `ServiceTile({ service, full }: { service: Service; full?: boolean })`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/ServicesPage.test.tsx`:
```tsx
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
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
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test src/pages/ServicesPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: 구현**

`src/components/site/ServiceTile.tsx`:
```tsx
import { Link } from "react-router-dom";
import type { Service } from "../../data/services";
import { BrowserFrame, PhoneFrame } from "./DeviceFrame";

function Go({ s }: { s: Service }) {
  if (!s.href) return null;
  const label = s.cta ?? "사용해 보기";
  return (
    <p className="go">
      {s.external ? (
        <a className="lk" href={s.href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ) : (
        <Link className="lk" to={s.href}>
          {label}
        </Link>
      )}
    </p>
  );
}

// 서비스 하나 = 타일 하나. full 이면 한 화면을 다 차지한다.
export default function ServiceTile({ service: s, full = false }: { service: Service; full?: boolean }) {
  return (
    <section className={full ? "tile full" : "tile"} aria-label={s.name}>
      {s.status !== "live" && <p className="st soon">{s.statusLabel}</p>}
      <h2 className="name">{s.name}</h2>
      <p className="tl">{s.tagline}</p>
      <p className="st">{s.kind}</p>
      <Go s={s} />
      <div className="vis">
        {s.shot?.frame === "browser" && <BrowserFrame src={s.shot.src} alt={s.shot.alt} url={s.shot.url} />}
        {s.shot?.frame === "phone" && <PhoneFrame src={s.shot.src} alt={s.shot.alt} />}
        {!s.shot && <div className="frame-empty">화면 공개 예정</div>}
      </div>
    </section>
  );
}
```

`src/pages/ServicesPage.tsx` (전체 교체):
```tsx
import SiteHeader from "../components/site/SiteHeader";
import SiteFooter from "../components/site/SiteFooter";
import ServiceTile from "../components/site/ServiceTile";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { ROUTE_META } from "../data/routeMeta";
import { LIVE_SERVICES, UPCOMING_SERVICES } from "../data/services";

export default function ServicesPage() {
  useDocumentMeta(ROUTE_META["/services"].title, ROUTE_META["/services"].description);

  return (
    <div className="site">
      <SiteHeader />
      <main>
        <header className="phead">
          <h1>서비스</h1>
          <p>제가 직접 만들고 운영하는 서비스입니다.</p>
        </header>
        <div className="tiles">
          {LIVE_SERVICES.map((s) => (
            <ServiceTile key={s.id} service={s} full />
          ))}
        </div>
        <header className="phead">
          <h2>곧 만나요</h2>
          <p>지금 만들고 있는 서비스입니다.</p>
        </header>
        <div className="duo">
          {UPCOMING_SERVICES.map((s) => (
            <ServiceTile key={s.id} service={s} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
```
`src/data/routeMeta.ts` `"/services"` description:
```ts
    description:
      "칸코테크가 직접 만들고 운영하는 서비스 — 그래서요, 사주쿠키, Atomic Demolition. 베라페이블과 더그아웃을 만들고 있습니다.",
```

- [ ] **Step 4: 통과 확인**

Run: `yarn test src/pages/ServicesPage.test.tsx && yarn build`
Expected: PASS(3), 빌드 성공(포트폴리오·약관은 아직 옛 마크업이지만 컴파일은 됨).

- [ ] **Step 5: 눈으로 확인**

`/services` 1280·390, 라이트·다크. 타일이 뷰포트 높이 안에 들어오는지(1280×800 에서 넘치지 않음), 폰 캡처가 잘리지 않고 위쪽이 보이는지.

- [ ] **Step 6: Commit**

```bash
git add src/components/site/ServiceTile.tsx src/pages/ServicesPage.tsx src/pages/ServicesPage.test.tsx src/data/routeMeta.ts
git commit -m "feat(services): 서비스마다 한 화면 타일, 곧 만나요 2칸"
```

---

### Task 8: 포트폴리오 `/portfolio`

**Files:**
- Create: `src/pages/PortfolioPage.test.tsx`
- Modify: `src/pages/PortfolioPage.tsx`(전체 교체)

**Interfaces:**
- Consumes: `PORTFOLIO`, `PORTFOLIO_COUNT`, `PortfolioItem`, `AskBand`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/PortfolioPage.test.tsx`:
```tsx
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { describe, expect, it } from "vitest";
import PortfolioPage from "./PortfolioPage";

const html = renderToString(
  <StaticRouter location="/portfolio">
    <PortfolioPage />
  </StaticRouter>,
).replace(/<!-- -->/g, "");

describe("PortfolioPage", () => {
  it("renders a timeline, not cards or tag pills", () => {
    expect(html.match(/class="tl-item"/g)).toHaveLength(13);
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
```

- [ ] **Step 2: 실패 확인**

Run: `yarn test src/pages/PortfolioPage.test.tsx`
Expected: FAIL — `tl-item` 0개.

- [ ] **Step 3: 구현**

`src/pages/PortfolioPage.tsx` (전체 교체):
```tsx
import { Link } from "react-router-dom";
import SiteHeader from "../components/site/SiteHeader";
import SiteFooter from "../components/site/SiteFooter";
import AskBand from "../components/site/AskBand";
import { useDocumentMeta } from "../lib/useDocumentMeta";
import { useReveal } from "../lib/useReveal";
import { PORTFOLIO, PORTFOLIO_COUNT, type PortfolioItem } from "../data/portfolio";
import { ROUTE_META } from "../data/routeMeta";

function Links({ item }: { item: PortfolioItem }) {
  if (!item.href && !item.appStore && !item.playStore) return null;
  return (
    <p className="tl-links">
      {item.href && (
        <Link className="lk" to={item.href}>
          소개 페이지
        </Link>
      )}
      {item.appStore && (
        <a className="lk" href={item.appStore} target="_blank" rel="noopener noreferrer">
          App Store
        </a>
      )}
      {item.playStore && (
        <a className="lk" href={item.playStore} target="_blank" rel="noopener noreferrer">
          Google Play
        </a>
      )}
    </p>
  );
}

export default function PortfolioPage() {
  useDocumentMeta(ROUTE_META["/portfolio"].title, ROUTE_META["/portfolio"].description);
  useReveal();

  return (
    <div className="site">
      <SiteHeader />
      <main>
        <header className="phead">
          <h1>만든 것들</h1>
          <p>
            자사 앱, 의뢰·프리랜스, 재직 프로젝트로 만든 {PORTFOLIO_COUNT}건입니다. 지금 운영하는 서비스는{" "}
            <Link className="lk" to="/services">
              서비스
            </Link>
            에 따로 모았습니다.
          </p>
        </header>
        {PORTFOLIO.map((group) => (
          <section className="pf-group" key={group.key}>
            <h2>
              {group.label}
              <span className="n tnum">{group.items.length}</span>
            </h2>
            <ol className="tl">
              {group.items.map((item) => (
                <li className="tl-item reveal" key={item.title}>
                  <div className="tl-when tnum">{item.period}</div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <p className="tech">{item.tags.join(" · ")}</p>
                    <Links item={item} />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
        <AskBand />
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `yarn test src/pages/PortfolioPage.test.tsx && yarn build`
Expected: PASS(3), 빌드 성공.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PortfolioPage.tsx src/pages/PortfolioPage.test.tsx
git commit -m "feat(portfolio): 연표형 제작 이력과 문의 띠"
```

---

### Task 9: 약관 5쪽 — 공통 문서 틀 (문구 불변)

**Files:**
- Create: `src/components/site/LegalDocument.tsx`, `src/pages/legal.test.tsx`, `src/pages/__fixtures__/legal-text.json`(테스트가 생성)
- Modify: `src/pages/PrivacyPage.tsx`, `src/pages/YourThoughtsPrivacy.tsx`, `src/pages/YourThoughtsTerms.tsx`, `src/pages/AtomicDemolitionPrivacy.tsx`, `src/pages/AtomicDemolitionTerms.tsx`

**Interfaces:**
- Consumes: `SiteHeader`, `SiteFooter`, `prose.css`(`.prose`, `ul.num`, `.table-wrap`)
- Produces:
  - `LegalSection({ title, id?, children })` — `<section id><h2>{title}</h2>…</section>`
  - `LegalDocument({ title, meta, children })` — `children` 중 `LegalSection` 의 `title` 로 목차 생성, id 는 `sec-1…`

- [ ] **Step 1: 옛 문구를 고정하는 테스트 작성**

`src/pages/legal.test.tsx`:
```tsx
// 약관 문구가 틀 교체 중에 한 글자도 바뀌지 않았는지 보증한다.
// 최초 1회: CAPTURE_LEGAL=1 yarn test src/pages/legal.test.tsx  → 옛 페이지 문구를 fixture 로 저장
// 이후: fixture 와 현재 페이지 문구(블록 단위, 공백 정규화, 정렬)를 비교
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
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
```

- [ ] **Step 2: 옛 문구 저장 후 통과 확인 (아직 페이지 수정 전)**

Run: `CAPTURE_LEGAL=1 yarn test src/pages/legal.test.tsx && yarn test src/pages/legal.test.tsx`
Expected: 두 번 다 PASS(5). `src/pages/__fixtures__/legal-text.json` 생성됨. **이 파일을 먼저 커밋한다:**
```bash
git add src/pages/legal.test.tsx src/pages/__fixtures__/legal-text.json
git commit -m "test(legal): 약관 5쪽 문구 고정 테스트"
```

- [ ] **Step 3: `LegalDocument` 구현**

`src/components/site/LegalDocument.tsx`:
```tsx
import { Children, cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export function LegalSection({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

type SectionEl = ReactElement<{ title: string; id?: string; children: ReactNode }>;

const WIDE = "(min-width: 1101px)";

// 약관 공통 틀: 문서 이름·시행일·목차·본문(prose). 문구는 각 페이지가 그대로 넘긴다.
// 목차는 넓은 화면에서 오른쪽에 펼쳐 고정, 좁은 화면에선 본문 위에 접어 둔다.
export default function LegalDocument({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  const toc: { id: string; title: string }[] = [];
  let n = 0;
  const body = Children.map(children, (child) => {
    if (isValidElement(child) && child.type === LegalSection) {
      n += 1;
      const el = child as SectionEl;
      const id = `sec-${n}`;
      toc.push({ id, title: el.props.title });
      return cloneElement(el, { id });
    }
    return child;
  });

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof matchMedia === "function") setOpen(matchMedia(WIDE).matches);
  }, []);

  return (
    <div className="site">
      <SiteHeader />
      <main className="legal-wrap">
        {toc.length > 1 && (
          <nav className="legal-toc" aria-label="목차">
            <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
              <summary>목차</summary>
              <ol>
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`}>{t.title}</a>
                  </li>
                ))}
              </ol>
            </details>
          </nav>
        )}
        <article className="legal prose">
          <h1>{title}</h1>
          <p className="legal-meta">{meta}</p>
          {body}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 4: 앱 약관 4쪽 변환**

네 파일(`YourThoughtsPrivacy.tsx`, `YourThoughtsTerms.tsx`, `AtomicDemolitionPrivacy.tsx`, `AtomicDemolitionTerms.tsx`) 각각:

1. 본문 안의 번호 목록 클래스를 의미 클래스로, 나머지 Tailwind 클래스는 제거:
```bash
for f in src/pages/YourThoughtsPrivacy.tsx src/pages/YourThoughtsTerms.tsx src/pages/AtomicDemolitionPrivacy.tsx src/pages/AtomicDemolitionTerms.tsx; do
  perl -0pi -e 's/ className="list-decimal[^"]*"/ className="num"/g; s/ className="(?!num")[^"]*"//g' "$f"
done
```
2. 손으로 고칠 것 (문구는 건드리지 않는다):
   - `import { motion } from "framer-motion";` → `import LegalDocument, { LegalSection } from "../components/site/LegalDocument";` 와 `import { useDocumentMeta } from "../lib/useDocumentMeta";`, `import { ROUTE_META } from "../data/routeMeta";`
   - 컴포넌트 첫 줄에 `useDocumentMeta(ROUTE_META["<이 페이지 경로>"].title, ROUTE_META["<이 페이지 경로>"].description);`
   - 바깥 `<div>`·`<header>`·`<main>`·`<motion.h1>`·`<motion.p>`·`<motion.div>`·`<footer>…</footer>` 를 지우고 다음으로 감싼다:
     ```tsx
     return (
       <LegalDocument title="개인정보처리방침" meta={`${APP_NAME} · 시행일: ${EFFECTIVE_DATE}`}>
         {/* 기존 <Section …> 들 그대로 */}
       </LegalDocument>
     );
     ```
     (`title` 은 원래 `<motion.h1>` 안의 글자 — 개인정보처리방침 / 이용약관. `meta` 는 원래 `<motion.p>` 안의 글자 그대로.)
   - `<Section title=` → `<LegalSection title=`, `</Section>` → `</LegalSection>`
   - 파일 끝의 로컬 `function Section(…)` 삭제
   - 표가 있는 `AtomicDemolitionPrivacy.tsx`: 표를 감싸던 `<div>`(원래 `overflow-x-auto`) 에 `className="table-wrap"` 부여
   - 이제 안 쓰는 `COMPANY_NAME`·`CONTACT_EMAIL` 상수가 본문에서 쓰이면 그대로 두고, 안 쓰이면(`noUnusedLocals`) 삭제

- [ ] **Step 5: `PrivacyPage.tsx` 변환**

- `phead` 섹션과 `<section className="band"><div className="wrap legal">` 를 지우고 `LegalDocument` 로 감싼다:
  ```tsx
  <LegalDocument title="개인정보처리방침" meta={`시행일: ${EFFECTIVE_DATE}`}>
    <p>
      칸코테크(Kahnco)는 이용자의 개인정보를 소중히 다루며, 관련 법령을 준수합니다.
      본 방침은 회사 홈페이지 kahnco.me 및 블로그(blog.kahnco.me)에 적용됩니다.
    </p>
    <LegalSection title="1. 수집하는 개인정보 항목">…기존 h2 다음부터 다음 h2 전까지…</LegalSection>
    …8번까지 같은 방식…
  </LegalDocument>
  ```
- 기존 `<p className="eff">시행일: …</p>` 는 `meta` 로 옮겼으므로 삭제.
- 각 `<h2>N. …</h2>` 를 `LegalSection` 의 `title` 로 옮기고, 그 뒤 내용을 children 으로.
- 표(`<table>`)는 `<div className="table-wrap">` 로 감싼다.
- `Masthead/SiteHeader`, `SiteFooter` import 는 제거(LegalDocument 가 렌더).

- [ ] **Step 6: 문구 불변 확인**

Run: `yarn test src/pages/legal.test.tsx`
Expected: PASS(5). 실패하면 diff 에 나온 블록을 원문대로 되돌린다(“시행일” 줄이 meta 로 옮겨진 것은 같은 `p` 블록이라 그대로 일치해야 한다).

Run: `yarn build`
Expected: 성공.

- [ ] **Step 7: 눈으로 확인**

`/privacy`, `/yourthoughts/terms`, `/atomic-demolition/privacy`(표) — 1280 에서 목차 오른쪽 고정·펼침, 390 에서 본문 위 회색 상자로 접힘, 라이트·다크, 번호 목록이 숫자로 보이는지.
`/yourthoughts`, `/atomic-demolition` 랜딩이 **개편 전과 같은지** 캡처 비교(`git stash` 없이: `main` 브랜치 배포본 kahnco.me 와 나란히).

- [ ] **Step 8: Commit**

```bash
git add src/components/site/LegalDocument.tsx src/pages/PrivacyPage.tsx src/pages/YourThoughtsPrivacy.tsx src/pages/YourThoughtsTerms.tsx src/pages/AtomicDemolitionPrivacy.tsx src/pages/AtomicDemolitionTerms.tsx
git commit -m "feat(legal): 약관 5쪽을 공통 문서 틀로 통일 (문구 변경 없음)"
```

---

### Task 10: 블로그 뼈대 — Tailwind 토큰, 헤더·푸터·테마 버튼

**Files:**
- Modify: `blog/tailwind.config.ts`, `blog/src/index.css`, `blog/src/components/BlogHeader.tsx`
- Create: `blog/src/components/BlogFooter.tsx`, `blog/src/components/ThemeToggle.tsx`, `blog/src/components/chrome.test.tsx`

**Interfaces:**
- Consumes: `shared/design/{tokens,chrome,prose}.css`, `shared/design/theme.ts`, `shared/company.ts`
- Produces Tailwind 색: `bg tile ink ink-2 ink-3 line link btn soon deep on-deep on-deep-2 on-deep-link`; `maxWidth.site`(1024px), `maxWidth.prose`(700px); `spacing.gutter`(var(--gutter)); `fontFamily.sans/mono` = 토큰
- Produces: `BlogHeader()`, `BlogFooter()`, `ThemeToggle()`

- [ ] **Step 1: 실패하는 테스트 작성**

`blog/src/components/chrome.test.tsx`:
```tsx
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
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
```

- [ ] **Step 2: 실패 확인**

Run: `cd blog && npm test src/components/chrome.test.tsx`
Expected: FAIL — `BlogFooter` 없음.

- [ ] **Step 3: Tailwind·CSS**

`blog/tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

// 색은 전부 shared/design/tokens.css 의 CSS 변수. 라이트/다크 전환은 변수가 맡는다.
const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        tile: "var(--tile)",
        ink: { DEFAULT: "var(--text)", 2: "var(--text-2)", 3: "var(--text-3)" },
        line: "var(--line)",
        link: "var(--link)",
        btn: "var(--btn)",
        soon: "var(--soon)",
        deep: "var(--deep)",
        "on-deep": { DEFAULT: "var(--on-deep)", 2: "var(--on-deep-2)", link: "var(--on-deep-link)" },
      },
      maxWidth: { site: "1024px", prose: "700px" },
      spacing: { gutter: "var(--gutter)" },
      fontFamily: { sans: "var(--sans)", mono: "var(--mono)" },
    },
  },
  plugins: [],
};
export default config;
```

`blog/src/index.css` (전체 교체):
```css
@import "../../shared/design/tokens.css";
@import "../../shared/design/chrome.css";
@import "../../shared/design/prose.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  letter-spacing: -0.015em;
  -webkit-font-smoothing: antialiased;
}

html {
  scroll-behavior: smooth;
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}

/* 프리렌더 HTML(크롤러·JS 로딩 전) 껍데기 — blog/scripts/prerender.mjs */
.prerender-shell { max-width: calc(var(--prose) + var(--gutter) * 2); margin: 0 auto; padding: 72px var(--gutter) 120px; }
```
`blog/src/assets/fonts/` 의 Geist 파일은 더 이상 안 쓰면 삭제(`grep -r Geist blog/src` 결과가 없을 때만).

- [ ] **Step 4: 컴포넌트**

`blog/src/components/ThemeToggle.tsx`: 루트 `src/components/site/ThemeToggle.tsx` 와 같은 코드, import 경로만:
```tsx
import { currentTheme, onThemeChange, toggleTheme, type ThemePref } from "../../../shared/design/theme";
```

`blog/src/components/BlogHeader.tsx` (전체 교체):
```tsx
import ThemeToggle from "./ThemeToggle";

// 홈 헤더(src/components/site/SiteHeader.tsx)와 같은 클래스·같은 구조.
// 블로그는 /blog 아래 별도 앱이라 홈 링크는 일반 <a> 로 간다.
export default function BlogHeader() {
  return (
    <header className="gn">
      <div className="gn-in">
        <a className="gn-brand" href="/">
          Kahnco
        </a>
        <nav className="gn-nav" aria-label="주요 메뉴">
          <a href="/services">서비스</a>
          <a href="/portfolio">포트폴리오</a>
          <a href="/blog" aria-current="page">
            블로그
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
```

`blog/src/components/BlogFooter.tsx`:
```tsx
import { COMPANY } from "../../../shared/company";

// 홈 푸터(src/components/site/SiteFooter.tsx)와 같은 구조.
export default function BlogFooter() {
  return (
    <footer className="ft">
      <div className="ft-in">
        <nav className="ft-links" aria-label="사이트 링크">
          <a href="/services">서비스</a>
          <a href="/portfolio">포트폴리오</a>
          <a href="/blog">블로그</a>
          <a href="/#contact">문의</a>
          <a href="/privacy">개인정보처리방침</a>
        </nav>
        <div className="ft-biz">
          {COMPANY.nameKo} ({COMPANY.nameEn}) · 대표 {COMPANY.ceo} · 사업자등록번호 {COMPANY.bizNo}
          <br />
          {COMPANY.address} · <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </div>
        <div className="ft-row">
          <span>Copyright © 2026 {COMPANY.nameEn}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: 통과 확인**

Run: `cd blog && npm test src/components/chrome.test.tsx && npm run build`
Expected: PASS(2), 빌드 성공.

- [ ] **Step 6: Commit**

```bash
git add blog/tailwind.config.ts blog/src/index.css blog/src/components/BlogHeader.tsx blog/src/components/BlogFooter.tsx blog/src/components/ThemeToggle.tsx blog/src/components/chrome.test.tsx
git add -A blog/src/assets/fonts
git commit -m "feat(blog): Tailwind 색을 토큰에 연결, 홈과 같은 헤더·푸터·테마 버튼"
```

---

### Task 11: 블로그 목록 `/blog`, 분류 `/blog/category/…`

**Files:**
- Create: `blog/src/lib/listing.ts`, `blog/src/lib/listing.test.ts`, `blog/src/components/FeaturedSeries.tsx`, `blog/src/components/CategoryTabs.tsx`, `blog/src/components/PostList.tsx`
- Modify: `blog/src/pages/Browse.tsx`(전체 교체)
- Delete: `blog/src/components/CategorySidebar.tsx`

**Interfaces:**
- Consumes: `getAllPosts`, `getPostBySlug`, `getCategoryCounts`, `Post`, `CATEGORIES`, `SERIES`, `seriesForPost`, `Series`
- Produces (`listing.ts`):
  - `formatDate(iso: string): string` — `2026-05-12` → `2026.05.12`
  - `interface CategoryTab { label: string; to: string; count: number; primary?: string; secondary?: string }`
  - `categoryTabs(): CategoryTab[]` — 첫 칸 `전체`, 이후 글 있는 2차 분류를 글 수 내림차순
  - `writtenParts(s: Series): { order: number; title: string; slug: string }[]` — 발행된 편만
  - `isComplete(s: Series): boolean`
  - `featuredSeries(): Series | undefined` — 완결 시리즈 중 마지막 편 날짜가 가장 최근인 것
  - `seriesLabel(slug: string): string | undefined` — `"AI의 수학적 기초 7편"`
  - `adjacentPosts(slug: string): { prev?: Post; next?: Post }` — 시리즈 글이면 시리즈 안 앞/뒤 편, 아니면 날짜순(prev = 더 오래된 글)
  - `relatedPosts(slug: string, limit?: number): Post[]` — 같은 1·2차 분류, 자기 제외, 최신순, 기본 3

- [ ] **Step 1: 실패하는 테스트 작성**

`blog/src/lib/listing.test.ts`:
```ts
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
```

- [ ] **Step 2: 실패 확인**

Run: `cd blog && npm test src/lib/listing.test.ts`
Expected: FAIL — `./listing` 없음.

- [ ] **Step 3: `blog/src/lib/listing.ts` 구현**

```ts
// 목록·글 화면이 쓰는 파생 데이터: 분류 탭, 대표 시리즈, 이전/다음 글, 같은 분류의 글.

import { CATEGORIES } from "./categories";
import { getAllPosts, getCategoryCounts, getPostBySlug, type Post } from "./posts";
import { SERIES, seriesForPost, type Series } from "./series";

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

export interface CategoryTab {
  label: string;
  to: string;
  count: number;
  primary?: string;
  secondary?: string;
}

export function categoryTabs(): CategoryTab[] {
  const counts = getCategoryCounts().secondary;
  const subs: CategoryTab[] = CATEGORIES.flatMap((c) =>
    c.children.map((s) => ({
      label: s.label,
      to: `/category/${c.slug}/${s.slug}`,
      count: counts[`${c.slug}/${s.slug}`] ?? 0,
      primary: c.slug,
      secondary: s.slug,
    })),
  );
  return [
    { label: "전체", to: "/", count: getAllPosts().length },
    ...subs.filter((t) => t.count > 0).sort((a, b) => b.count - a.count),
  ];
}

export function writtenParts(s: Series): { order: number; title: string; slug: string }[] {
  return s.parts
    .filter((p): p is typeof p & { slug: string } => Boolean(p.slug && getPostBySlug(p.slug)))
    .map((p) => ({ order: p.order, title: p.title, slug: p.slug }));
}

export function isComplete(s: Series): boolean {
  return s.parts.length > 0 && writtenParts(s).length === s.parts.length;
}

function endDate(s: Series): string {
  const last = writtenParts(s).at(-1);
  return last ? (getPostBySlug(last.slug)?.date ?? "") : "";
}

export function featuredSeries(): Series | undefined {
  return SERIES.filter(isComplete).sort((a, b) => (endDate(a) < endDate(b) ? 1 : -1))[0];
}

export function seriesLabel(slug: string): string | undefined {
  const f = seriesForPost(slug);
  return f ? `${f.series.title} ${f.part.order}편` : undefined;
}

export function adjacentPosts(slug: string): { prev?: Post; next?: Post } {
  const f = seriesForPost(slug);
  if (f) {
    const parts = writtenParts(f.series);
    const i = parts.findIndex((p) => p.slug === slug);
    return {
      prev: i > 0 ? getPostBySlug(parts[i - 1].slug) : undefined,
      next: i >= 0 && i < parts.length - 1 ? getPostBySlug(parts[i + 1].slug) : undefined,
    };
  }
  const all = getAllPosts(); // 최신순
  const i = all.findIndex((p) => p.slug === slug);
  if (i === -1) return {};
  return { prev: all[i + 1], next: i > 0 ? all[i - 1] : undefined };
}

export function relatedPosts(slug: string, limit = 3): Post[] {
  const base = getPostBySlug(slug);
  if (!base?.primaryCategory) return [];
  return getAllPosts()
    .filter(
      (p) =>
        p.slug !== slug &&
        p.primaryCategory === base.primaryCategory &&
        p.secondaryCategory === base.secondaryCategory,
    )
    .slice(0, limit);
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd blog && npm test src/lib/listing.test.ts`
Expected: PASS(9).

- [ ] **Step 5: 목록 컴포넌트**

`blog/src/components/FeaturedSeries.tsx`:
```tsx
import { Link } from "react-router-dom";
import { SERIES, type Series } from "../lib/series";
import { isComplete, writtenParts } from "../lib/listing";

// 대표 시리즈 하나는 남색 타일, 나머지는 '이름 · n편' 글자 목록.
export default function FeaturedSeries({ featured }: { featured: Series }) {
  const first = writtenParts(featured)[0];
  const others = SERIES.filter((s) => s !== featured && writtenParts(s).length > 0);

  return (
    <section className="mx-auto max-w-site px-gutter pt-8" aria-label="시리즈">
      <Link to={`/${first.slug}`} className="block rounded-[24px] bg-deep p-8 text-on-deep sm:p-10">
        <p className="text-[13px] font-semibold text-on-deep-2">
          시리즈 · {featured.parts.length}편 완결
        </p>
        <h2 className="mt-2 text-[clamp(28px,3.4vw,36px)] font-bold leading-[1.25] tracking-[-0.035em]">
          {featured.title}
        </h2>
        <p className="mt-3 line-clamp-2 max-w-[40em] text-[15.5px] leading-[1.65] text-on-deep-2">
          {featured.description}
        </p>
        <span className="mt-6 inline-block text-[15px] font-semibold text-on-deep-link">처음부터 읽기 ›</span>
      </Link>
      {others.length > 0 && (
        <ul className="mt-2 grid sm:grid-cols-2 sm:gap-x-8">
          {others.map((s) => {
            const parts = writtenParts(s);
            return (
              <li key={s.slug} className="border-b border-line">
                <Link to={`/${parts[0].slug}`} className="flex justify-between gap-4 py-4 text-[16px] hover:text-link">
                  <span className="font-semibold">{s.title}</span>
                  <span className="shrink-0 text-ink-3 tabular-nums">
                    {parts.length}편{isComplete(s) ? " 완결" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

`blog/src/components/CategoryTabs.tsx`:
```tsx
import { Link } from "react-router-dom";
import { categoryTabs } from "../lib/listing";

// 알약 대신 글자 탭. 선택된 탭만 굵게 + 밑줄.
export default function CategoryTabs({ primary, secondary }: { primary?: string; secondary?: string }) {
  const tabs = categoryTabs();
  return (
    <nav className="mx-auto max-w-site px-gutter pt-11" aria-label="분류">
      <ul className="flex gap-6 overflow-x-auto border-b border-line text-[17px] [scrollbar-width:none]">
        {tabs.map((t) => {
          const on = t.primary ? t.primary === primary && t.secondary === secondary : !primary;
          return (
            <li key={t.to} className="shrink-0">
              <Link
                to={t.to}
                aria-current={on ? "page" : undefined}
                className={
                  on
                    ? "block whitespace-nowrap pb-3.5 font-bold text-ink shadow-[inset_0_-2px_0_var(--text)]"
                    : "block whitespace-nowrap pb-3.5 text-ink-3 hover:text-ink"
                }
              >
                {t.label} <span className="tabular-nums">{t.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

`blog/src/components/PostList.tsx`:
```tsx
import { Link } from "react-router-dom";
import type { Post } from "../lib/posts";
import { formatDate, seriesLabel } from "../lib/listing";

export default function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-site px-gutter py-20 text-[17px] text-ink-3">
        아직 글이 없습니다.{" "}
        <Link to="/" className="lk">
          전체 글 보기
        </Link>
      </div>
    );
  }
  return (
    <ul className="mx-auto max-w-site px-gutter pb-[120px]">
      {posts.map((post) => {
        const meta = [seriesLabel(post.slug), formatDate(post.date), `약 ${post.readingMinutes}분`]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={post.slug} className="border-b border-line">
            <Link to={`/${post.slug}`} className="group block py-7">
              <h2 className="text-[20px] font-bold leading-[1.4] tracking-[-0.03em] group-hover:text-link sm:text-[22px]">
                {post.title}
              </h2>
              {post.description && (
                <p className="mt-2 line-clamp-1 text-[16px] leading-[1.65] text-ink-2">{post.description}</p>
              )}
              <p className="mt-2 text-[14px] text-ink-3 tabular-nums">
                {meta}
                {post.draft && <span className="font-semibold text-soon"> · 초안</span>}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

`blog/src/pages/Browse.tsx` (전체 교체):
```tsx
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import BlogHeader from "../components/BlogHeader";
import BlogFooter from "../components/BlogFooter";
import FeaturedSeries from "../components/FeaturedSeries";
import CategoryTabs from "../components/CategoryTabs";
import PostList from "../components/PostList";
import { getAllPosts, getPostsByPrimary, getPostsBySecondary, type Post } from "../lib/posts";
import { primaryBySlug, secondaryBySlug } from "../lib/categories";
import { featuredSeries } from "../lib/listing";
import { setSeo, clearArticleJsonLd } from "../lib/seo";

/** 전체 글(홈) + 카테고리 페이지를 함께 처리하는 목록 화면. */
export default function Browse() {
  const { primary, secondary } = useParams<{ primary?: string; secondary?: string }>();

  const primaryCat = primary ? primaryBySlug(primary) : undefined;
  const secondaryCat = primary && secondary ? secondaryBySlug(primary, secondary) : undefined;
  const validPrimary = primaryCat?.slug;
  const validSecondary = secondaryCat ? secondary : undefined;

  let posts: Post[];
  let heading: string;
  let seoTitle: string;
  if (validPrimary && validSecondary) {
    posts = getPostsBySecondary(validPrimary, validSecondary);
    heading = secondaryCat!.label;
    seoTitle = `${primaryCat!.label} › ${secondaryCat!.label}`;
  } else if (validPrimary) {
    posts = getPostsByPrimary(validPrimary);
    heading = primaryCat!.label;
    seoTitle = primaryCat!.label;
  } else {
    posts = getAllPosts();
    heading = "기술 블로그";
    seoTitle = "";
  }
  const subtitle = `${posts.length}편의 글`;
  const featured = validPrimary ? undefined : featuredSeries();

  useEffect(() => {
    clearArticleJsonLd();
    setSeo({
      title: seoTitle || undefined,
      description: validPrimary ? `${seoTitle} — ${subtitle}` : "인프라·백엔드·Flutter·AI, 만들며 배운 것을 기록합니다.",
      path:
        validPrimary && validSecondary
          ? `/category/${validPrimary}/${validSecondary}`
          : validPrimary
            ? `/category/${validPrimary}`
            : "/",
    });
  }, [seoTitle, subtitle, validPrimary, validSecondary]);

  return (
    <div className="min-h-screen bg-bg font-sans text-ink">
      <BlogHeader />
      <main>
        <header className="mx-auto max-w-site px-gutter pb-5 pt-20">
          <h1 className="text-[clamp(36px,5vw,52px)] font-bold leading-[1.15] tracking-[-0.045em]">{heading}</h1>
          <p className="mt-3 text-[19px] text-ink-3 tabular-nums">{subtitle}</p>
        </header>
        {featured && <FeaturedSeries featured={featured} />}
        <CategoryTabs primary={validPrimary} secondary={validSecondary} />
        <PostList posts={posts} />
      </main>
      <BlogFooter />
    </div>
  );
}
```

`blog/src/components/CategorySidebar.tsx` 삭제.

- [ ] **Step 6: 확인**

Run: `cd blog && npm test && npm run build`
Expected: 모든 테스트 PASS, 빌드 성공.
`cd blog && npm run dev` → `http://localhost:5173/blog/` 1280·390, 라이트·다크. 탭이 좁은 화면에서 가로로만 스크롤되고 페이지 전체는 가로 스크롤 없음.

- [ ] **Step 7: Commit**

```bash
git add -A blog/src/lib/listing.ts blog/src/lib/listing.test.ts blog/src/components blog/src/pages/Browse.tsx
git commit -m "feat(blog): 목록 — 대표 시리즈(남색)·글자 탭·선 구분 글 목록"
```

---

### Task 12: 블로그 글 `/blog/:slug`

**Files:**
- Create: `blog/src/components/PostNav.tsx`, `blog/src/pages/BlogPost.test.tsx`
- Modify: `blog/src/pages/BlogPost.tsx`(전체 교체), `blog/src/components/Markdown.tsx`, `blog/src/components/SeriesNav.tsx`(전체 교체), `blog/src/components/CoupangBanner.tsx`(아래 `aside`·고지 `p` 클래스만)

**Interfaces:**
- Consumes: `adjacentPosts`, `relatedPosts`, `formatDate`, `seriesForPost`, `primaryLabel`, `secondaryLabel`, `.prose`
- Produces: `PostNav({ slug })`, `SeriesNav({ slug })`(접는 `<details>`)

- [ ] **Step 1: 실패하는 테스트 작성**

`blog/src/pages/BlogPost.test.tsx`:
```tsx
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
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
```

- [ ] **Step 2: 실패 확인**

Run: `cd blog && npm test src/pages/BlogPost.test.tsx`
Expected: FAIL (`<details` 없음, `📚` 있음 등).

- [ ] **Step 3: Markdown 재스타일**

`blog/src/components/Markdown.tsx`:
- `import "highlight.js/styles/github-dark.css";` 줄 삭제(색은 `prose.css` 의 `.hljs-*`).
- 바깥 `<div className="markdown-body text-neutral-300 leading-relaxed">` → `<div className="prose">`.
- `components` 를 다음으로 교체(요소 스타일은 `.prose` 가 맡는다):
```tsx
        components={{
          a: ({ ...props }) => (
            <a
              target={props.href?.startsWith("http") ? "_blank" : undefined}
              rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
              {...props}
            />
          ),
          img: ({ ...props }) => <img loading="lazy" {...props} />,
          table: ({ ...props }) => (
            <div className="table-wrap">
              <table {...props} />
            </div>
          ),
          pre: ({ children, ...props }) => {
            // ```mermaid 코드 블록은 다이어그램으로 렌더링한다.
            const child = Array.isArray(children) ? children[0] : children;
            const cls =
              child && typeof child === "object" && "props" in child
                ? ((child as { props?: { className?: string } }).props?.className ?? "")
                : "";
            if (cls.includes("language-mermaid")) {
              const code = extractText(child).replace(/\n$/, "");
              return <MermaidDiagram chart={code} />;
            }
            return <pre {...props}>{children}</pre>;
          },
        }}
```
- 파일 위 주석의 "스타일은 Tailwind 클래스로…" 줄을 "스타일은 shared/design/prose.css(.prose)가 맡는다." 로 교체.

- [ ] **Step 4: SeriesNav (접는 목차)**

`blog/src/components/SeriesNav.tsx` (전체 교체):
```tsx
import { Link } from "react-router-dom";
import { seriesForPost } from "../lib/series";

/** 글이 시리즈에 속하면 본문 위에 접힌 목차를 둔다. 현재 편은 굵게, 예정 편은 흐리게. */
export default function SeriesNav({ slug }: { slug: string }) {
  const found = seriesForPost(slug);
  if (!found) return null;
  const { series, position, total } = found;

  return (
    <details className="mb-11 rounded-[18px] bg-tile px-6 py-5">
      <summary className="flex cursor-pointer list-none justify-between gap-4 text-[15.5px] font-semibold [&::-webkit-details-marker]:hidden">
        <span>{series.title}</span>
        <span className="shrink-0 font-normal text-ink-3 tabular-nums">
          {total}편 중 {position}편 ▾
        </span>
      </summary>
      <ol className="mt-4 space-y-1.5 text-[15px] leading-[1.6]">
        {series.parts.map((part) => {
          const label = (
            <>
              <span className="mr-2 text-ink-3 tabular-nums">{part.order}.</span>
              {part.title}
              {!part.slug && <span className="ml-1 text-ink-3">(예정)</span>}
            </>
          );
          if (part.slug === slug)
            return (
              <li key={part.order} aria-current="true" className="font-bold text-ink">
                {label}
              </li>
            );
          return (
            <li key={part.order}>
              {part.slug ? (
                <Link to={`/${part.slug}`} className="text-ink-2 hover:text-link">
                  {label}
                </Link>
              ) : (
                <span className="text-ink-3">{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
```

- [ ] **Step 5: PostNav**

`blog/src/components/PostNav.tsx`:
```tsx
import { Link } from "react-router-dom";
import { adjacentPosts, formatDate, relatedPosts } from "../lib/listing";

export default function PostNav({ slug }: { slug: string }) {
  const { prev, next } = adjacentPosts(slug);
  const related = relatedPosts(slug, 3);

  return (
    <>
      {(prev || next) && (
        <nav className="mt-16 grid gap-3.5 sm:grid-cols-2" aria-label="이전·다음 글">
          {prev ? (
            <Link to={`/${prev.slug}`} className="rounded-[18px] bg-tile px-6 py-5 hover:text-link">
              <small className="mb-1.5 block text-[13px] text-ink-3">이전 글</small>
              <b className="text-[17px] leading-[1.45] tracking-[-0.02em]">{prev.title}</b>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}
          {next && (
            <Link to={`/${next.slug}`} className="rounded-[18px] bg-tile px-6 py-5 text-right hover:text-link">
              <small className="mb-1.5 block text-[13px] text-ink-3">다음 글</small>
              <b className="text-[17px] leading-[1.45] tracking-[-0.02em]">{next.title}</b>
            </Link>
          )}
        </nav>
      )}
      {related.length > 0 && (
        <section className="mt-16" aria-label="같은 분류의 글">
          <h2 className="text-[20px] font-bold tracking-[-0.03em]">같은 분류의 글</h2>
          <ul className="mt-4 border-t border-line">
            {related.map((p) => (
              <li key={p.slug} className="border-b border-line">
                <Link to={`/${p.slug}`} className="block py-4 text-[17px] font-semibold hover:text-link">
                  {p.title}
                  <span className="mt-1 block text-[14px] font-normal text-ink-3 tabular-nums">
                    {formatDate(p.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
```

- [ ] **Step 6: CoupangBanner 여백·고지**

`blog/src/components/CoupangBanner.tsx`:
- `<aside className="my-8" …>` → `<aside className="my-14" …>`
- 고지 `<p className="mt-2 text-center text-[11px] leading-relaxed text-neutral-500">` → `<p className="mt-2 text-center text-[13px] leading-relaxed text-ink-3">`

- [ ] **Step 7: `blog/src/pages/BlogPost.tsx` 전체 교체**

```tsx
import { useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import BlogHeader from "../components/BlogHeader";
import BlogFooter from "../components/BlogFooter";
import Markdown from "../components/Markdown";
import CoupangBanner from "../components/CoupangBanner";
import SeriesNav from "../components/SeriesNav";
import PostNav from "../components/PostNav";
import { getPostBySlug } from "../lib/posts";
import { formatDate } from "../lib/listing";
import { primaryLabel, secondaryLabel } from "../lib/categories";
import { setSeo, setArticleJsonLd, clearArticleJsonLd } from "../lib/seo";

/**
 * 본문을 인아티클 광고를 끼울 두 덩어리로 나눈다.
 * 글 중간에서 가장 가까운 ## 헤딩 경계로 분할(섹션 사이에 자연스럽게 광고가 들어가도록).
 * 헤딩이 2개 미만이면 분할하지 않는다.
 */
function splitForAd(content: string): [string, string] {
  const positions: number[] = [];
  const re = /\n## /g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) positions.push(m.index);
  if (positions.length < 2) return [content, ""];

  const mid = content.length / 2;
  let best = positions[0];
  for (const p of positions) {
    if (Math.abs(p - mid) < Math.abs(best - mid)) best = p;
  }
  return [content.slice(0, best), content.slice(best)];
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg font-sans text-ink">
      <BlogHeader />
      {children}
      <BlogFooter />
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!post) {
      setSeo({ title: "글을 찾을 수 없습니다", path: `/${slug ?? ""}` });
      clearArticleJsonLd();
      return;
    }
    setSeo({
      title: post.title,
      description: post.description,
      path: `/${post.slug}`,
      type: "article",
      image: post.thumbnail,
      publishedTime: post.date,
      tags: post.tags,
    });
    setArticleJsonLd({
      title: post.title,
      description: post.description,
      path: `/${post.slug}`,
      datePublished: post.date,
      image: post.thumbnail,
    });
    return () => clearArticleJsonLd();
  }, [post, slug]);

  if (!post) {
    return (
      <Frame>
        <main className="mx-auto max-w-prose px-gutter pb-[120px] pt-[120px]">
          <h1 className="text-[clamp(30px,4.6vw,44px)] font-bold tracking-[-0.04em]">글을 찾을 수 없습니다</h1>
          <p className="mt-4 text-[17px] text-ink-3">요청하신 글이 존재하지 않거나 이동되었습니다.</p>
          <p className="mt-8 text-[17px]">
            <Link to="/" className="lk">
              블로그 목록으로
            </Link>
          </p>
        </main>
      </Frame>
    );
  }

  const [firstHalf, secondHalf] = splitForAd(post.content);
  const cat = post.primaryCategory
    ? post.secondaryCategory
      ? {
          to: `/category/${post.primaryCategory}/${post.secondaryCategory}`,
          label: secondaryLabel(post.primaryCategory, post.secondaryCategory),
        }
      : { to: `/category/${post.primaryCategory}`, label: primaryLabel(post.primaryCategory) }
    : undefined;

  return (
    <Frame>
      <main className="mx-auto max-w-[calc(700px+var(--gutter)*2)] px-gutter pb-[120px] pt-[72px]">
        <header className="mb-11 border-b border-line pb-10">
          <h1 className="text-[clamp(30px,4.6vw,44px)] font-bold leading-[1.3] tracking-[-0.04em]">{post.title}</h1>
          <p className="mt-4 text-[15px] text-ink-3 tabular-nums">
            {cat && (
              <>
                <Link to={cat.to} className="hover:text-ink">
                  {cat.label}
                </Link>
                {" · "}
              </>
            )}
            <time dateTime={post.date}>{formatDate(post.date)}</time> · 읽는 데 약 {post.readingMinutes}분
          </p>
        </header>

        <SeriesNav slug={post.slug} />

        <Markdown>{firstHalf}</Markdown>
        {secondHalf && (
          <>
            <CoupangBanner />
            <Markdown>{secondHalf}</Markdown>
          </>
        )}

        {/* 본문 끝 광고 */}
        <CoupangBanner />

        <PostNav slug={post.slug} />
      </main>
    </Frame>
  );
}
```

- [ ] **Step 8: 통과 확인**

Run: `cd blog && npm test && npm run build`
Expected: 모든 테스트 PASS, 빌드 성공. `grep -rn "neutral-\|blue-[0-9]\|#0a0a0a\|#0d1117" blog/src` 결과가 `MermaidDiagram.tsx` 외에는 없어야 한다(그 파일은 Task 13).

- [ ] **Step 9: 눈으로 확인**

`npm run dev` → 코드·수식이 있는 글(예: `/blog/ai-math-transformer`)과 Mermaid 가 있는 글을 라이트·다크·390px 로 확인. 본문 18px·폭 700, 코드 블록 짙은 배경, 수식 가로 넘침은 그 블록만 스크롤, 쿠팡 배너 2개와 고지 문구.

- [ ] **Step 10: Commit**

```bash
git add blog/src/pages/BlogPost.tsx blog/src/pages/BlogPost.test.tsx blog/src/components/Markdown.tsx blog/src/components/SeriesNav.tsx blog/src/components/PostNav.tsx blog/src/components/CoupangBanner.tsx
git commit -m "feat(blog): 글 화면 — prose 본문, 접는 시리즈 목차, 이전·다음·같은 분류 글"
```

---

### Task 13: Mermaid 를 토큰 색으로, 테마 전환 시 다시 그리기

**Files:**
- Modify: `blog/src/components/MermaidDiagram.tsx`
- Create: `blog/src/components/mermaidTheme.ts`, `blog/src/components/mermaidTheme.test.ts`

**Interfaces:**
- Consumes: `onThemeChange` (`shared/design/theme.ts`)
- Produces: `mermaidThemeVariables(read: (name: string) => string): Record<string, string>`

- [ ] **Step 1: 실패하는 테스트 작성**

`blog/src/components/mermaidTheme.test.ts`:
```ts
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
```

- [ ] **Step 2: 실패 확인**

Run: `cd blog && npm test src/components/mermaidTheme.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

`blog/src/components/mermaidTheme.ts`:
```ts
// mermaid 'base' 테마 변수를 현재 CSS 토큰에서 뽑는다 → 라이트/다크 모두 본문과 같은 색.
export function mermaidThemeVariables(read: (name: string) => string): Record<string, string> {
  const bg = read("--bg");
  const tile = read("--tile");
  const text = read("--text");
  const text3 = read("--text-3");
  const line = read("--line");
  return {
    fontFamily: read("--sans"),
    background: bg,
    mainBkg: tile,
    primaryColor: tile,
    secondaryColor: tile,
    tertiaryColor: bg,
    primaryTextColor: text,
    secondaryTextColor: text,
    tertiaryTextColor: text,
    textColor: text,
    primaryBorderColor: line,
    nodeBorder: line,
    clusterBkg: bg,
    clusterBorder: line,
    lineColor: text3,
    edgeLabelBackground: bg,
    noteBkgColor: tile,
    noteTextColor: text,
    noteBorderColor: line,
    actorBkg: tile,
    actorBorder: line,
    actorTextColor: text,
    signalColor: text3,
    signalTextColor: text,
  };
}
```

`blog/src/components/MermaidDiagram.tsx`:
- 모듈 상단 `let initialized = false;` 삭제.
- import 추가:
```tsx
import { onThemeChange } from "../../../shared/design/theme";
import { mermaidThemeVariables } from "./mermaidTheme";
```
- 컴포넌트 안에 테마 버전 상태와 구독 추가, 렌더 effect 교체:
```tsx
  const [themeVer, setThemeVer] = useState(0);
  useEffect(() => onThemeChange(() => setThemeVer((v) => v + 1)), []);

  useEffect(() => {
    let active = true;
    import("mermaid")
      .then(({ default: mermaid }) => {
        const cs = getComputedStyle(document.documentElement);
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "base",
          themeVariables: mermaidThemeVariables((n) => cs.getPropertyValue(n).trim()),
        });
        // 같은 id 로 다시 render 하면 충돌하므로 테마 버전을 붙인다.
        return mermaid.render(`${idRef.current}-${themeVer}`, chart);
      })
      .then(({ svg }) => {
        if (active) setSvg(sizeSvg(svg));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [chart, themeVer]);
```
- 실패 폴백 `<pre className="my-5 overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] p-4 text-sm">` → `<pre>` (prose 의 pre 스타일 사용). 
- 다이어그램 `div` 의 className → `"mermaid-diagram mb-[30px] overflow-x-auto rounded-[14px] border border-line bg-bg p-4"`.
- 파일 위 주석의 "사이트 다크 테마에 맞춰 dark 테마 + 파란 액센트로 초기화" → "CSS 토큰에서 색을 읽어 base 테마로 초기화, ◐ 전환 시 다시 그림".

- [ ] **Step 4: 통과 확인**

Run: `cd blog && npm test && npm run build`
Expected: PASS, 빌드 성공. `grep -rn "neutral-\|blue-[0-9]\|#0a0a0a\|#0d1117" blog/src` → 결과 없음.
`npm run dev` 에서 Mermaid 글을 열고 ◐ 를 눌러 다이어그램 색이 바뀌는지 확인.

- [ ] **Step 5: Commit**

```bash
git add blog/src/components/MermaidDiagram.tsx blog/src/components/mermaidTheme.ts blog/src/components/mermaidTheme.test.ts
git commit -m "feat(blog): Mermaid 를 토큰 색으로 그리고 테마 전환 시 다시 그림"
```

---

### Task 14: 프리렌더 HTML 토큰화와 전체 검증

**Files:**
- Modify: `blog/scripts/prerender.mjs`(`STATIC_FOOTER`, `bodyWrapper`, `listWrapper`), `docs/superpowers/specs/2026-10-19-site-redesign-design.md`(실행 중 바뀐 결정 반영)

- [ ] **Step 1: 프리렌더 인라인 색을 토큰으로**

`blog/scripts/prerender.mjs` 에서:
- `STATIC_FOOTER` 의 `border-top:1px solid #ddd` → `border-top:1px solid var(--line)`
- `bodyWrapper`:
  - `<p style="color:#888;font-size:.9rem">` → `<p style="color:var(--text-3);font-size:.9rem">`
  - `<main style="max-width:720px;margin:0 auto;padding:2rem 1rem;line-height:1.7">` → `<main class="prerender-shell">`
  - `<article>` → `<article class="prose">`
- `listWrapper`:
  - `<time style="color:#888;font-size:.85rem">` → `<time style="color:var(--text-3);font-size:.85rem">`
  - `<p style="color:#555;margin:.3rem 0 0">` → `<p style="color:var(--text-2);margin:.3rem 0 0">`
  - `<main style="max-width:760px;margin:0 auto;padding:2rem 1rem;line-height:1.6">` → `<main class="prerender-shell">`
  - `<p style="color:#666">` → `<p style="color:var(--text-3)">`

- [ ] **Step 2: 전체 테스트·빌드**

Run: `yarn test && (cd blog && npm test) && npm run build:site`
Expected: 모두 PASS, `[main] prerender: 10개 라우트`, 블로그 프리렌더 성공.

Run: `grep -c "class=\"prose\"" dist/blog/ai-math-transformer.html && grep -c "이현준입니다" dist/index.html && grep -c "theme-inline\|kahnco-theme" dist/index.html dist/blog/index.html`
Expected: 각각 1 이상.

- [ ] **Step 3: 화면 검증 (Firebase 에뮬레이터 없이 정적 서버)**

Run: `npx serve dist -l 4173` (또는 `yarn preview`, 단 `/blog` 는 `dist/blog` 가 합쳐진 `serve` 쪽이 정확)
각 화면을 1280×800·390×844, 라이트·다크로 캡처해 확인:
`/`, `/services`, `/portfolio`, `/privacy`, `/yourthoughts/terms`, `/atomic-demolition/privacy`, `/blog`, `/blog/category/dev/flutter`, `/blog/ai-math-transformer`(수식·코드), Mermaid 있는 글 1편.
체크리스트:
- [ ] 390px 에서 어떤 화면도 가로 스크롤 없음
- [ ] ◐ 전환 후 새로고침해도 깜빡임 없음, 홈 → 블로그 이동 시 테마 유지
- [ ] JS 끈 상태(DevTools → Disable JavaScript)에서도 OS 다크면 다크로 읽힘, 페이드업 요소가 숨어 있지 않음
- [ ] 쿠팡 고지 문구가 배너마다 보임
- [ ] `/yourthoughts`, `/atomic-demolition` 랜딩이 kahnco.me(현재 배포본)와 같음
- [ ] 동작 줄이기(macOS 손쉬운 사용) 켜면 페이드업 없음

- [ ] **Step 4: 스펙에 실행 중 정한 것 반영**

`docs/superpowers/specs/2026-10-19-site-redesign-design.md` 수정:
- §3.2 "Geist(woff 파일, `@font-face`)는 두 앱에서 제거." → "Geist 는 홈 `site.css`·블로그에서 제거. 앱 랜딩이 쓰는 `src/App.css` 의 Geist 는 유지."
- §4 파일 목록에 `chrome.css # 헤더·푸터·링크·버튼 공통 클래스` 와 `shared/company.ts` 추가.
- §5.1 "모바일은 메뉴 접힘." → "메뉴가 세 개뿐이라 모바일에서도 그대로 한 줄(간격만 좁힘)."
- §5.3 '사용해 보기 ›' 뒤에 "(서비스별 문구 가능: 자세히 보기, 둘러보기)" 추가.

- [ ] **Step 5: Commit**

```bash
git add blog/scripts/prerender.mjs docs/superpowers/specs/2026-10-19-site-redesign-design.md
git commit -m "feat(blog): 프리렌더 HTML 을 토큰 색으로, 스펙에 실행 중 결정 반영"
```

- [ ] **Step 6: 플레이북 갱신**

비자명하게 성공/실패한 것이 있으면 `~/.claude/playbook/web/`(예: `vite-shared-design-tokens.md`)에 기록: 두 Vite 앱이 저장소 밖 폴더 CSS 를 import 할 때 `server.fs.allow`, 공유 React 컴포넌트가 React 사본 둘로 깨지는 문제, head 인라인 테마 스크립트로 깜빡임 방지.

---

## Self-Review 메모 (작성자 확인 완료)

- 스펙 §1 범위 → Task 6·7·8·9·11·12. §2 규칙 → Global Constraints + 각 테스트(버튼 1개, 인용 없음, 알약 없음). §3 토큰 → Task 3. §3.4 테마 → Task 2·3·4·10. §4 구조 → Task 3·4·10. §5.1 → Task 4·10. §5.2 → Task 6. §5.3 → Task 7. §5.4 → Task 5·8. §5.5 → Task 11. §5.6 → Task 12·13. §5.7 → Task 9. §6 예외 → PostList 빈 상태, BlogPost not-found, 이미지 실패 시 `--tile` 배경(`.pc .shot`, `.frame-*`), JS 꺼짐(`.js .reveal`, 토큰 media query). §7 검증 → Task 14.
- 이름 일관성: `LIVE_COUNT`/`LIVE_SERVICES`/`UPCOMING_SERVICES`, `writtenParts`/`isComplete`/`featuredSeries`, `BrowserFrame`/`PhoneFrame`, `LegalDocument`/`LegalSection`, `mermaidThemeVariables` — 정의 태스크와 사용 태스크 일치.
