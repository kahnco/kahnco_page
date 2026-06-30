import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import "highlight.js/styles/github-dark.css";

/**
 * 블로그 본문 마크다운 렌더러.
 * - remark-gfm: 표, 체크리스트, 취소선 등 GitHub 확장 문법
 * - rehype-highlight: 코드 블록 구문 강조 (highlight.js)
 * - rehype-slug: 헤딩에 id 부여 (목차/앵커 링크용)
 * 스타일은 Tailwind 클래스로 컴포넌트별 매핑하여 사이트 다크 테마와 통일.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown-body text-neutral-300 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="scroll-mt-24 text-3xl sm:text-4xl font-bold text-white mt-12 mb-5" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2
              className="scroll-mt-24 text-2xl sm:text-3xl font-bold text-white mt-12 mb-4 pb-2 border-b border-white/10"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3 className="scroll-mt-24 text-xl sm:text-2xl font-semibold text-white mt-8 mb-3" {...props} />
          ),
          h4: ({ ...props }) => (
            <h4 className="scroll-mt-24 text-lg font-semibold text-neutral-100 mt-6 mb-2" {...props} />
          ),
          p: ({ ...props }) => <p className="my-4 text-[15px] sm:text-base" {...props} />,
          a: ({ ...props }) => (
            <a
              className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
              target={props.href?.startsWith("http") ? "_blank" : undefined}
              rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
              {...props}
            />
          ),
          ul: ({ ...props }) => <ul className="my-4 ml-5 list-disc space-y-2 marker:text-neutral-600" {...props} />,
          ol: ({ ...props }) => <ol className="my-4 ml-5 list-decimal space-y-2 marker:text-neutral-600" {...props} />,
          li: ({ ...props }) => <li className="pl-1 text-[15px] sm:text-base" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote
              className="my-5 border-l-4 border-blue-500/60 bg-white/5 px-4 py-2 text-neutral-400 italic rounded-r"
              {...props}
            />
          ),
          hr: ({ ...props }) => <hr className="my-10 border-white/10" {...props} />,
          strong: ({ ...props }) => <strong className="font-semibold text-white" {...props} />,
          img: ({ ...props }) => (
            <img className="my-6 rounded-lg border border-white/10 w-full" loading="lazy" {...props} />
          ),
          table: ({ ...props }) => (
            <div className="my-6 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          th: ({ ...props }) => (
            <th className="border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold text-white" {...props} />
          ),
          td: ({ ...props }) => <td className="border border-white/10 px-3 py-2 text-neutral-300" {...props} />,
          // 인라인 코드만 스타일링. 코드 블록(pre > code)은 rehype-highlight 가 처리하므로 건드리지 않음.
          code: ({ className, children, ...props }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-white/10 px-1.5 py-0.5 text-[0.85em] text-blue-300 font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ ...props }) => (
            <pre
              className="my-5 overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] p-4 text-sm leading-relaxed"
              {...props}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
