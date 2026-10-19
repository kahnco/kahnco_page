import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import "katex/dist/katex.min.css";
import MermaidDiagram from "./MermaidDiagram";

/** pre 의 자식 code 엘리먼트에서 raw 텍스트를 추출한다. */
function extractText(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props?: { children?: unknown } }).props?.children);
  }
  return "";
}

/**
 * 블로그 본문 마크다운 렌더러.
 * - remark-gfm: 표, 체크리스트, 취소선 등 GitHub 확장 문법
 * - remark-math + rehype-katex: $인라인$·$$블록$$ 수식을 KaTeX 로 렌더 (수학 시리즈용)
 * - rehype-highlight: 코드 블록 구문 강조 (highlight.js)
 * - rehype-slug: 헤딩에 id 부여 (목차/앵커 링크용)
 * 스타일은 shared/design/prose.css(.prose)가 맡는다.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkMath]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeKatex, { strict: false }],
          [rehypeHighlight, { ignoreMissing: true }],
        ]}
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
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
