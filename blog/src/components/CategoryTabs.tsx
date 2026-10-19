import { Link } from "react-router-dom";
import { categoryTabs } from "../lib/listing";

// 알약 대신 글자 탭. 선택된 탭만 굵게 + 밑줄.
export default function CategoryTabs({ primary, secondary }: { primary?: string; secondary?: string }) {
  const tabs = categoryTabs();
  return (
    <nav className="mx-auto max-w-site px-gutter pt-11" aria-label="분류">
      <ul className="flex gap-6 overflow-x-auto border-b border-line text-[17px] [scrollbar-width:none]">
        {tabs.map((t) => {
          const on = t.primary ? t.primary === primary && t.secondary === secondary : !primary;
          return (
            <li key={t.to} className="shrink-0">
              <Link
                to={t.to}
                aria-current={on ? "page" : undefined}
                className={
                  on
                    ? "block whitespace-nowrap pb-3.5 font-bold text-ink shadow-[inset_0_-2px_0_var(--text)]"
                    : "block whitespace-nowrap pb-3.5 text-ink-3 hover:text-ink"
                }
              >
                {t.label} <span className="tabular-nums">{t.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
