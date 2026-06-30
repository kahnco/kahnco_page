import { useEffect, useRef, useState } from "react";

// 다이어그램마다 고유 id가 필요해서 모듈 단위 카운터를 쓴다.
let counter = 0;
let initialized = false;

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
        if (active) setSvg(svg);
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
      className="mermaid-diagram my-6 flex justify-center overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] p-4"
      aria-label="다이어그램"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
