// SPA 환경에서 라우트 전환 시 document <head> 의 SEO 태그를 갱신한다.
// (react-helmet 같은 추가 의존성 없이 가벼운 직접 조작 방식)
//
// 주의: 이 사이트는 클라이언트 렌더링 SPA 이므로, 검색엔진의 JS 실행에 의존한다.
// 더 강한 SEO 가 필요하면 빌드 타임 프리렌더링(react-snap 등) 도입을 검토할 것.

const SITE_NAME = "Kahnco";
const SITE_URL = "https://kahnco.me";
const DEFAULT_DESCRIPTION = "칸코테크 개발 블로그 — 인프라, DevOps, 풀스택 개발 경험을 기록합니다.";

interface SeoInput {
  title?: string;
  description?: string;
  /** 절대 경로 또는 사이트 기준 상대 경로 (예: /blog/foo) */
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  tags?: string[];
}

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function setSeo(input: SeoInput = {}) {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path = "/",
    image,
    type = "website",
    publishedTime,
    tags,
  } = input;

  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const url = path.startsWith("http") ? path : `${SITE_URL}${path}`;

  document.title = fullTitle;

  upsertMeta('meta[name="description"]', "name", "description", description);
  upsertLink("canonical", url);

  // Open Graph
  upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
  upsertMeta('meta[property="og:description"]', "property", "og:description", description);
  upsertMeta('meta[property="og:type"]', "property", "og:type", type);
  upsertMeta('meta[property="og:url"]', "property", "og:url", url);
  upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
  if (image) {
    const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;
    upsertMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
  }

  // Twitter
  upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", image ? "summary_large_image" : "summary");
  upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
  upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

  // Article 전용
  if (type === "article" && publishedTime) {
    upsertMeta('meta[property="article:published_time"]', "property", "article:published_time", publishedTime);
  }
  if (type === "article" && tags) {
    // 기존 article:tag 제거 후 재삽입
    document.head.querySelectorAll('meta[property="article:tag"]').forEach((el) => el.remove());
    for (const tag of tags) {
      const el = document.createElement("meta");
      el.setAttribute("property", "article:tag");
      el.setAttribute("content", tag);
      document.head.appendChild(el);
    }
  }
}

/** 글 상세 페이지용 JSON-LD(BlogPosting) 구조화 데이터 삽입/갱신. */
export function setArticleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  image?: string;
}) {
  const id = "jsonld-article";
  document.getElementById(id)?.remove();

  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.datePublished,
    author: { "@type": "Person", name: "이현준", url: SITE_URL },
    publisher: { "@type": "Organization", name: "칸코테크", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}${input.path}`,
    ...(input.image ? { image: input.image.startsWith("http") ? input.image : `${SITE_URL}${input.image}` } : {}),
  };

  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/** 페이지 이탈 시 글 전용 JSON-LD 정리. */
export function clearArticleJsonLd() {
  document.getElementById("jsonld-article")?.remove();
}
