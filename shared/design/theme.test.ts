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
