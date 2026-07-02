import { useEffect, useRef, useState } from "react";

// 다이어그램마다 고유 id가 필요해서 모듈 단위 카운터를 쓴다.
let counter = 0;
let initialized = false;

/**
 * mermaid는 SVG에 `max-width: Npx` 를 걸어, 좁은 컬럼에서는 다이어그램을 축소해 글자가 안 보이게 만든다.
 * 이 축소 제한을 제거하고 자연 크기(width:Npx)로 렌더한 뒤, 컨테이너의 overflow-x-auto 로
 * 좁으면 가로 스크롤, 넓으면 가운데 정렬되게 한다.
 */
function sizeSvg(raw: string): string {
  const m = raw.match(/max-width:\s*([\d.]+)px/);
  const w = m ? Math.ceil(parseFloat(m[1])) : 0;
  const widthCss = w ? `width:${w}px;` : "";
  return raw
    .replace(
      /(<svg\b[^>]*?)\sstyle="[^"]*"/,
      `$1 style="${widthCss} max-width:none; height:auto; display:block; margin:0 auto;"`,
    )
    .replace(/(<svg\b[^>]*?)\swidth="100%"/, "$1");
}

/**
 * Mermaid 코드 블록을 SVG로 렌더링한다.
 * - mermaid는 무거우므로 동적 import로 지연 로드(다이어그램이 있는 페이지에서만 받음)
 * - 사이트 다크 테마에 맞춰 dark 테마 + 파란 액센트로 초기화
 */
export default function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);
  const idRef = useRef(`mmd-${counter++}`);

  useEffect(() => {
    let active = true;
    import("mermaid")
      .then(({ default: mermaid }) => {
        if (!initialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            theme: "dark",
            themeVariables: {
              fontFamily: "var(--font-geist-sans)",
              primaryColor: "#1e293b",
              primaryBorderColor: "#3b82f6",
              primaryTextColor: "#e5e7eb",
              lineColor: "#64748b",
              background: "#0d1117",
            },
          });
          initialized = true;
        }
        return mermaid.render(idRef.current, chart);
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
  }, [chart]);

  if (failed) {
    // 렌더 실패 시 원본 코드로 폴백
    return (
      <pre className="my-5 overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] p-4 text-sm">
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <div
      className="mermaid-diagram my-6 overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] p-4"
      aria-label="다이어그램"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
