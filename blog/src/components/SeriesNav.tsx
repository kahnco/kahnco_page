import { Link } from "react-router-dom";
import { seriesForPost } from "../lib/series";

/** 글이 시리즈에 속하면 본문 위에 접힌 목차를 둔다. 현재 편은 굵게, 예정 편은 흐리게. */
export default function SeriesNav({ slug }: { slug: string }) {
  const found = seriesForPost(slug);
  if (!found) return null;
  const { series, position, total } = found;

  return (
    <details className="mb-11 rounded-[18px] bg-tile px-6 py-5">
      <summary className="flex cursor-pointer list-none justify-between gap-4 text-[15.5px] font-semibold [&::-webkit-details-marker]:hidden">
        <span>{series.title}</span>
        <span className="shrink-0 font-normal text-ink-3 tabular-nums">
          {total}편 중 {position}편 ▾
        </span>
      </summary>
      <ol className="mt-4 space-y-1.5 text-[15px] leading-[1.6]">
        {series.parts.map((part) => {
          const label = (
            <>
              <span className="mr-2 text-ink-3 tabular-nums">{part.order}.</span>
              {part.title}
              {!part.slug && <span className="ml-1 text-ink-3">(예정)</span>}
            </>
          );
          if (part.slug === slug)
            return (
              <li key={part.order} aria-current="true" className="font-bold text-ink">
                {label}
              </li>
            );
          return (
            <li key={part.order}>
              {part.slug ? (
                <Link to={`/${part.slug}`} className="text-ink-2 hover:text-link">
                  {label}
                </Link>
              ) : (
                <span className="text-ink-3">{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
