import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import BlogHeader from "../components/BlogHeader";
import AdSlot from "../components/AdSlot";
import { AD_SLOTS } from "../lib/ads";
import { getAllPosts, getAllTags } from "../lib/posts";
import { setSeo, clearArticleJsonLd } from "../lib/seo";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

export default function BlogList() {
  const posts = getAllPosts();
  const tags = getAllTags();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    clearArticleJsonLd();
    setSeo({
      title: "개발 블로그",
      description: "인프라 · DevOps · 풀스택 개발 경험을 기록하는 칸코테크 개발 블로그입니다.",
      path: "/",
    });
  }, []);

  const filtered = useMemo(
    () => (activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts),
    [posts, activeTag]
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-[family-name:var(--font-geist-sans)]">
      <BlogHeader />

      <main className="mx-auto max-w-3xl px-6 pt-28 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Blog</h1>
          <p className="mt-3 text-neutral-400">
            인프라 · DevOps · 풀스택 개발 경험을 기록합니다.
          </p>
        </motion.div>

        {tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTag(null)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTag === null
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-neutral-400 hover:text-white border border-white/10"
              }`}
            >
              전체
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTag === tag
                    ? "bg-blue-500 text-white"
                    : "bg-white/5 text-neutral-400 hover:text-white border border-white/10"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 space-y-4">
          {filtered.length === 0 && (
            <p className="text-neutral-500 py-16 text-center">아직 발행된 글이 없습니다.</p>
          )}

          {filtered.map((post, i) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.3) }}
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
                  <p className="mt-2 text-sm text-neutral-400 line-clamp-2">{post.description}</p>
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

        {/* 목록 하단 광고 */}
        <AdSlot slot={AD_SLOTS.listBottom} />

        <div className="mt-16 border-t border-white/10 pt-8">
          <a
            href="https://kahnco.me"
            className="text-sm text-neutral-500 transition-colors hover:text-white"
          >
            ← 칸코테크 메인으로
          </a>
        </div>
      </main>
    </div>
  );
}
