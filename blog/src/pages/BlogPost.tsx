import { useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import BlogHeader from "../components/BlogHeader";
import BlogFooter from "../components/BlogFooter";
import Markdown from "../components/Markdown";
import CoupangBanner from "../components/CoupangBanner";
import SeriesNav from "../components/SeriesNav";
import PostNav from "../components/PostNav";
import { getPostBySlug } from "../lib/posts";
import { formatDate } from "../lib/listing";
import { primaryLabel, secondaryLabel } from "../lib/categories";
import { setSeo, setArticleJsonLd, clearArticleJsonLd } from "../lib/seo";

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

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg font-sans text-ink">
      <BlogHeader />
      {children}
      <BlogFooter />
    </div>
  );
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
      <Frame>
        <main className="mx-auto max-w-prose px-gutter pb-[120px] pt-[120px]">
          <h1 className="text-[clamp(30px,4.6vw,44px)] font-bold tracking-[-0.04em]">글을 찾을 수 없습니다</h1>
          <p className="mt-4 text-[17px] text-ink-3">요청하신 글이 존재하지 않거나 이동되었습니다.</p>
          <p className="mt-8 text-[17px]">
            <Link to="/" className="lk">
              블로그 목록으로
            </Link>
          </p>
        </main>
      </Frame>
    );
  }

  const [firstHalf, secondHalf] = splitForAd(post.content);
  const cat = post.primaryCategory
    ? post.secondaryCategory
      ? {
          to: `/category/${post.primaryCategory}/${post.secondaryCategory}`,
          label: secondaryLabel(post.primaryCategory, post.secondaryCategory),
        }
      : { to: `/category/${post.primaryCategory}`, label: primaryLabel(post.primaryCategory) }
    : undefined;

  return (
    <Frame>
      <main className="mx-auto max-w-[calc(700px+var(--gutter)*2)] px-gutter pb-[120px] pt-[72px]">
        <header className="mb-11 border-b border-line pb-10">
          <h1 className="text-[clamp(30px,4.6vw,44px)] font-bold leading-[1.3] tracking-[-0.04em]">{post.title}</h1>
          <p className="mt-4 text-[15px] text-ink-3 tabular-nums">
            {cat && (
              <>
                <Link to={cat.to} className="hover:text-ink">
                  {cat.label}
                </Link>
                {" · "}
              </>
            )}
            <time dateTime={post.date}>{formatDate(post.date)}</time> · 읽는 데 약 {post.readingMinutes}분
          </p>
        </header>

        <SeriesNav slug={post.slug} />

        <Markdown>{firstHalf}</Markdown>
        {secondHalf && (
          <>
            <CoupangBanner />
            <Markdown>{secondHalf}</Markdown>
          </>
        )}

        {/* 본문 끝 광고 */}
        <CoupangBanner />

        <PostNav slug={post.slug} />
      </main>
    </Frame>
  );
}
