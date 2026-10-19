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
