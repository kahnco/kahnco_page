import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import BlogHeader from "../components/BlogHeader";
import CategorySidebar from "../components/CategorySidebar";
import { getAllPosts, getPostsByPrimary, getPostsBySecondary, type Post } from "../lib/posts";
import { primaryBySlug, secondaryBySlug } from "../lib/categories";
import { setSeo, clearArticleJsonLd } from "../lib/seo";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

/** 전체 글(홈) + 카테고리 페이지를 함께 처리하는 브라우징 화면. */
export default function Browse() {
  const { primary, secondary } = useParams<{ primary?: string; secondary?: string }>();

  const primaryCat = primary ? primaryBySlug(primary) : undefined;
  const secondaryCat =
    primary && secondary ? secondaryBySlug(primary, secondary) : undefined;

  // 유효하지 않은 카테고리면 전체로 폴백
  const validPrimary = primaryCat?.slug;
  const validSecondary = secondaryCat ? secondary : undefined;

  let posts: Post[];
  let title: string;
  let heading: string;
  let subtitle: string;

  if (validPrimary && validSecondary) {
    posts = getPostsBySecondary(validPrimary, validSecondary);
    heading = secondaryCat!.label;
    subtitle = `${primaryCat!.label} › ${secondaryCat!.label}`;
    title = `${primaryCat!.label} › ${secondaryCat!.label}`;
  } else if (validPrimary) {
    posts = getPostsByPrimary(validPrimary);
    heading = primaryCat!.label;
    subtitle = `${primaryCat!.label} 카테고리의 글`;
    title = primaryCat!.label;
  } else {
    posts = getAllPosts();
    heading = "Blog";
    subtitle = "인프라 · DevOps · 개발, 그리고 이런저런 기록";
    title = "";
  }

  useEffect(() => {
    clearArticleJsonLd();
    setSeo({
      title: title || undefined,
      description: subtitle,
      path:
        validPrimary && validSecondary
          ? `/category/${validPrimary}/${validSecondary}`
          : validPrimary
            ? `/category/${validPrimary}`
            : "/",
    });
  }, [title, subtitle, validPrimary, validSecondary]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-[family-name:var(--font-geist-sans)]">
      <BlogHeader />

      <main className="mx-auto max-w-5xl px-6 pt-28 pb-24">
        <div className="flex flex-col gap-8 lg:flex-row">
          <CategorySidebar activePrimary={validPrimary} activeSecondary={validSecondary} />

          <div className="min-w-0 flex-1">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{heading}</h1>
              <p className="mt-2 text-neutral-400">{subtitle}</p>
            </motion.div>

            <div className="mt-8 space-y-4">
              {posts.length === 0 && (
                <p className="text-neutral-500 py-16 text-center">
                  아직 이 카테고리에 글이 없습니다.
                </p>
              )}

              {posts.map((post, i) => (
                <motion.article
                  key={post.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Link
                    to={`/${post.slug}`}
                    className="group block rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-blue-500/40 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                      {post.draft && (
                        <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-yellow-400">
                          초안
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-xl font-semibold text-white transition-colors group-hover:text-blue-400">
                      {post.title}
                    </h2>

                    {post.description && (
                      <p className="mt-2 text-sm text-neutral-400 line-clamp-2">
                        {post.description}
                      </p>
                    )}

                    {post.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-neutral-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </motion.article>
              ))}
            </div>

            <div className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-8">
              <a
                href="https://kahnco.me"
                className="text-sm text-neutral-500 transition-colors hover:text-white"
              >
                ← 칸코테크 메인으로
              </a>
              <a
                href="/privacy"
                className="text-sm text-neutral-500 transition-colors hover:text-white"
              >
                개인정보처리방침
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
