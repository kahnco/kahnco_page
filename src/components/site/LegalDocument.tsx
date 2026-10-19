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
