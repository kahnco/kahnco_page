import { Link } from "react-router-dom";
import type { Post } from "../lib/posts";
import { formatDate, seriesLabel } from "../lib/listing";

export default function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-site px-gutter py-20 text-[17px] text-ink-3">
        아직 글이 없습니다.{" "}
        <Link to="/" className="lk">
          전체 글 보기
        </Link>
      </div>
    );
  }
  return (
    <ul className="mx-auto max-w-site px-gutter pb-[120px]">
      {posts.map((post) => {
        const meta = [seriesLabel(post.slug), formatDate(post.date), `약 ${post.readingMinutes}분`]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={post.slug} className="border-b border-line">
            <Link to={`/${post.slug}`} className="group block py-7">
              <h2 className="text-[20px] font-bold leading-[1.4] tracking-[-0.03em] group-hover:text-link sm:text-[22px]">
                {post.title}
              </h2>
              {post.description && (
                <p className="mt-2 line-clamp-1 text-[16px] leading-[1.65] text-ink-2">{post.description}</p>
              )}
              <p className="mt-2 text-[14px] text-ink-3 tabular-nums">
                {meta}
                {post.draft && <span className="font-semibold text-soon"> · 초안</span>}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
