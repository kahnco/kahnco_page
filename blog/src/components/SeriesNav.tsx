import { Link } from "react-router-dom";
import { seriesForPost } from "../lib/series";

/**
 * 글이 커리큘럼(시리즈)에 속하면, 그 커리큘럼 전체를 순서대로 보여주는 박스.
 * 현재 글은 강조, 작성된 편은 링크, 예정 편은 흐리게 표시한다.
 */
export default function SeriesNav({ slug }: { slug: string }) {
  const found = seriesForPost(slug);
  if (!found) return null;

  const { series, position, total } = found;

  return (
    <aside className="my-10 rounded-xl border border-blue-500/25 bg-blue-500/[0.05] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-blue-300">📚 {series.title} 커리큘럼</h3>
        <span className="shrink-0 text-xs text-neutral-500">
          {position} / {total}편
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-400">{series.description}</p>

      <ol className="mt-4 space-y-1.5">
        {series.parts.map((part) => {
          const isCurrent = part.slug === slug;
          const written = Boolean(part.slug);

          const label = (
            <span className="flex gap-2">
              <span className={isCurrent ? "text-blue-400" : "text-neutral-600"}>
                {part.order}.
              </span>
              <span>
                {part.title}
                {!written && <span className="ml-1 text-neutral-600">(예정)</span>}
              </span>
            </span>
          );

          if (isCurrent) {
            return (
              <li
                key={part.order}
                className="rounded-md bg-blue-500/15 px-2 py-1.5 text-sm font-medium text-blue-300"
                aria-current="true"
              >
                {label}
              </li>
            );
          }

          return (
            <li key={part.order} className="px-2 py-1.5 text-sm">
              {written ? (
                <Link
                  to={`/${part.slug}`}
                  className="block text-neutral-300 transition-colors hover:text-white"
                >
                  {label}
                </Link>
              ) : (
                <span className="block text-neutral-500">{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
