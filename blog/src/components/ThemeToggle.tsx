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
