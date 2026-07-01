import { Link } from "react-router-dom";
import { CATEGORIES } from "../lib/categories";
import { getCategoryCounts, getAllPosts } from "../lib/posts";

/**
 * 좌측 카테고리 사이드바. 1차·2차 카테고리 트리를 보여주고 현재 위치를 강조한다.
 * 데스크톱에서는 왼쪽 컬럼, 모바일에서는 본문 위에 블록으로 쌓인다.
 */
export default function CategorySidebar({
  activePrimary,
  activeSecondary,
}: {
  activePrimary?: string;
  activeSecondary?: string;
}) {
  const counts = getCategoryCounts();
  const total = getAllPosts().length;
  const isAll = !activePrimary;

  const linkBase = "block rounded px-2 py-1 text-sm transition-colors";
  const active = "bg-blue-500/15 text-blue-400 font-medium";
  const idle = "text-neutral-400 hover:text-white hover:bg-white/5";

  return (
    <nav className="lg:w-52 lg:shrink-0" aria-label="카테고리">
      <div className="lg:sticky lg:top-24 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <Link to="/" className={`${linkBase} ${isAll ? active : idle} font-medium`}>
          전체 글 <span className="text-neutral-600">{total}</span>
        </Link>

        <div className="mt-2 space-y-3">
          {CATEGORIES.map((cat) => {
            const catCount = counts.primary[cat.slug] ?? 0;
            const catActive = activePrimary === cat.slug && !activeSecondary;
            return (
              <div key={cat.slug}>
                <Link
                  to={`/category/${cat.slug}`}
                  className={`${linkBase} ${catActive ? active : idle} font-semibold text-neutral-200`}
                >
                  {cat.label} <span className="text-neutral-600">{catCount}</span>
                </Link>
                <div className="mt-0.5 ml-2 border-l border-white/10 pl-2">
                  {cat.children.map((sub) => {
                    const subCount = counts.secondary[`${cat.slug}/${sub.slug}`] ?? 0;
                    const subActive = activePrimary === cat.slug && activeSecondary === sub.slug;
                    return (
                      <Link
                        key={sub.slug}
                        to={`/category/${cat.slug}/${sub.slug}`}
                        className={`${linkBase} ${subActive ? active : idle}`}
                      >
                        {sub.label} <span className="text-neutral-600">{subCount}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
