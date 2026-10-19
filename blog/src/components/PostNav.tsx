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
