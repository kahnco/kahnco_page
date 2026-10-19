// 라이트/다크 테마 — 홈(src)·블로그(blog) 공용. 같은 도메인이라 localStorage 를 공유한다.
// 첫 페인트 전 적용은 theme-inline.js(각 index.html <head>)가 맡고, 이 모듈은 전환·구독만 한다.

export type ThemePref = "light" | "dark";

export const THEME_KEY = "kahnco-theme";
export const THEME_EVENT = "kahnco-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function readStoredTheme(
  storage?: Pick<Storage, "getItem">,
): ThemePref | null {
  try {
    const s = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    const v = s?.getItem(THEME_KEY);
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
  if (mq?.addEventListener) mq.addEventListener("change", onSystem);
  else mq?.addListener?.(onSystem);
  return () => {
    window.removeEventListener(THEME_EVENT, onManual);
    if (mq?.removeEventListener) mq.removeEventListener("change", onSystem);
    else mq?.removeListener?.(onSystem);
  };
}
