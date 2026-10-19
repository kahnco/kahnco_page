import { Link } from "react-router-dom";
import { SERIES, type Series } from "../lib/series";
import { isComplete, writtenParts } from "../lib/listing";

// 대표 시리즈 하나는 남색 타일, 나머지는 '이름 · n편' 글자 목록.
export default function FeaturedSeries({ featured }: { featured: Series }) {
  const first = writtenParts(featured)[0];
  const others = SERIES.filter((s) => s !== featured && writtenParts(s).length > 0);

  return (
    <section className="mx-auto max-w-site px-gutter pt-8" aria-label="시리즈">
      <Link to={`/${first.slug}`} className="block rounded-[24px] bg-deep p-8 text-on-deep sm:p-10">
        <p className="text-[13px] font-semibold text-on-deep-2">
          시리즈 · {featured.parts.length}편 완결
        </p>
        <h2 className="mt-2 text-[clamp(28px,3.4vw,36px)] font-bold leading-[1.25] tracking-[-0.035em]">
          {featured.title}
        </h2>
        <p className="mt-3 line-clamp-2 max-w-[40em] text-[15.5px] leading-[1.65] text-on-deep-2">
          {featured.description}
        </p>
        <span className="mt-6 inline-block text-[15px] font-semibold text-on-deep-link">처음부터 읽기 ›</span>
      </Link>
      {others.length > 0 && (
        <ul className="mt-2 grid sm:grid-cols-2 sm:gap-x-8">
          {others.map((s) => {
            const parts = writtenParts(s);
            return (
              <li key={s.slug} className="border-b border-line">
                <Link to={`/${parts[0].slug}`} className="flex justify-between gap-4 py-4 text-[16px] hover:text-link">
                  <span className="font-semibold">{s.title}</span>
                  <span className="shrink-0 text-ink-3 tabular-nums">
                    {parts.length}편{isComplete(s) ? " 완결" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
