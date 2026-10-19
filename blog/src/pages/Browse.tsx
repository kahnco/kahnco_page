import { useEffect } from "react";
import { useParams } from "react-router-dom";
import BlogHeader from "../components/BlogHeader";
import BlogFooter from "../components/BlogFooter";
import FeaturedSeries from "../components/FeaturedSeries";
import CategoryTabs from "../components/CategoryTabs";
import PostList from "../components/PostList";
import { getAllPosts, getPostsByPrimary, getPostsBySecondary, type Post } from "../lib/posts";
import { primaryBySlug, secondaryBySlug } from "../lib/categories";
import { featuredSeries } from "../lib/listing";
import { setSeo, clearArticleJsonLd } from "../lib/seo";

/** 전체 글(홈) + 카테고리 페이지를 함께 처리하는 목록 화면. */
export default function Browse() {
  const { primary, secondary } = useParams<{ primary?: string; secondary?: string }>();

  const primaryCat = primary ? primaryBySlug(primary) : undefined;
  const secondaryCat = primary && secondary ? secondaryBySlug(primary, secondary) : undefined;
  const validPrimary = primaryCat?.slug;
  const validSecondary = secondaryCat ? secondary : undefined;

  let posts: Post[];
  let heading: string;
  let seoTitle: string;
  if (validPrimary && validSecondary) {
    posts = getPostsBySecondary(validPrimary, validSecondary);
    heading = secondaryCat!.label;
    seoTitle = `${primaryCat!.label} › ${secondaryCat!.label}`;
  } else if (validPrimary) {
    posts = getPostsByPrimary(validPrimary);
    heading = primaryCat!.label;
    seoTitle = primaryCat!.label;
  } else {
    posts = getAllPosts();
    heading = "기술 블로그";
    seoTitle = "";
  }
  const subtitle = `${posts.length}편의 글`;
  const featured = validPrimary ? undefined : featuredSeries();

  useEffect(() => {
    clearArticleJsonLd();
    setSeo({
      title: seoTitle || undefined,
      description: validPrimary ? `${seoTitle} — ${subtitle}` : "인프라·백엔드·Flutter·AI, 만들며 배운 것을 기록합니다.",
      path:
        validPrimary && validSecondary
          ? `/category/${validPrimary}/${validSecondary}`
          : validPrimary
            ? `/category/${validPrimary}`
            : "/",
    });
  }, [seoTitle, subtitle, validPrimary, validSecondary]);

  return (
    <div className="min-h-screen bg-bg font-sans text-ink">
      <BlogHeader />
      <main>
        <header className="mx-auto max-w-site px-gutter pb-5 pt-20">
          <h1 className="text-[clamp(36px,5vw,52px)] font-bold leading-[1.15] tracking-[-0.045em]">{heading}</h1>
          <p className="mt-3 text-[19px] text-ink-3 tabular-nums">{subtitle}</p>
        </header>
        {featured && <FeaturedSeries featured={featured} />}
        <CategoryTabs primary={validPrimary} secondary={validSecondary} />
        <PostList posts={posts} />
      </main>
      <BlogFooter />
    </div>
  );
}
