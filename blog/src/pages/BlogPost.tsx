import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import BlogHeader from "../components/BlogHeader";
import Markdown from "../components/Markdown";
import AdSlot from "../components/AdSlot";
import { AD_SLOTS } from "../lib/ads";
import { getPostBySlug } from "../lib/posts";
import { primaryLabel, secondaryLabel } from "../lib/categories";
import { setSeo, setArticleJsonLd, clearArticleJsonLd } from "../lib/seo";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

/**
 * 본문을 인아티클 광고를 끼울 두 덩어리로 나눈다.
 * 글 중간에서 가장 가까운 ## 헤딩 경계로 분할(섹션 사이에 자연스럽게 광고가 들어가도록).
 * 헤딩이 2개 미만이면 분할하지 않는다.
 */
function splitForAd(content: string): [string, string] {
  const positions: number[] = [];
  const re = /\n## /g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) positions.push(m.index);
  if (positions.length < 2) return [content, ""];

  const mid = content.length / 2;
  let best = positions[0];
  for (const p of positions) {
    if (Math.abs(p - mid) < Math.abs(best - mid)) best = p;
  }
  return [content.slice(0, best), content.slice(best)];
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);

    if (!post) {
      setSeo({ title: "글을 찾을 수 없습니다", path: `/${slug ?? ""}` });
      clearArticleJsonLd();
      return;
    }

    setSeo({
      title: post.title,
      description: post.description,
      path: `/${post.slug}`,
      type: "article",
      image: post.thumbnail,
      publishedTime: post.date,
      tags: post.tags,
    });
    setArticleJsonLd({
      title: post.title,
      description: post.description,
      path: `/${post.slug}`,
      datePublished: post.date,
      image: post.thumbnail,
    });

    return () => clearArticleJsonLd();
  }, [post, slug]);

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-[family-name:var(--font-geist-sans)]">
        <BlogHeader />
        <main className="mx-auto max-w-3xl px-6 pt-40 pb-24 text-center">
          <h1 className="text-3xl font-bold">글을 찾을 수 없습니다</h1>
          <p className="mt-4 text-neutral-400">요청하신 글이 존재하지 않거나 이동되었습니다.</p>
          <Link
            to="/"
            className="mt-8 inline-block rounded-full bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            블로그 목록으로
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-[family-name:var(--font-geist-sans)]">
      <BlogHeader />

      <main className="mx-auto max-w-3xl px-6 pt-28 pb-24">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link
            to="/"
            className="text-sm text-neutral-500 transition-colors hover:text-white"
          >
            ← 블로그 목록
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            {post.primaryCategory && (
              <>
                <Link
                  to={`/category/${post.primaryCategory}`}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {primaryLabel(post.primaryCategory)}
                </Link>
                {post.secondaryCategory && (
                  <>
                    <span className="text-neutral-600">›</span>
                    <Link
                      to={`/category/${post.primaryCategory}/${post.secondaryCategory}`}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {secondaryLabel(post.primaryCategory, post.secondaryCategory)}
                    </Link>
                  </>
                )}
                <span className="text-neutral-700">·</span>
              </>
            )}
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
            {post.title}
          </h1>

          {post.description && (
            <p className="mt-4 text-lg text-neutral-400">{post.description}</p>
          )}

          {post.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
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
        </motion.header>

        <div className="my-8 border-t border-white/10" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {(() => {
            const [firstHalf, secondHalf] = splitForAd(post.content);
            return (
              <>
                <Markdown>{firstHalf}</Markdown>
                {secondHalf && (
                  <>
                    <AdSlot slot={AD_SLOTS.inArticle} />
                    <Markdown>{secondHalf}</Markdown>
                  </>
                )}
              </>
            );
          })()}
        </motion.div>

        {/* 본문 끝 광고 */}
        <AdSlot slot={AD_SLOTS.articleEnd} />

        <footer className="mt-16 border-t border-white/10 pt-8">
          <Link
            to="/"
            className="text-sm text-neutral-500 transition-colors hover:text-white"
          >
            ← 블로그 목록으로
          </Link>
        </footer>
      </main>
    </div>
  );
}
