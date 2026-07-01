// 블로그 카테고리(1차·2차) 정의.
// 메뉴 순서·URL slug·표시 라벨을 여기 한 곳에서 관리한다.
// 글은 frontmatter 의 `category: [1차, 2차]` 로 소속을 지정한다(slug 또는 라벨 모두 허용).

export interface SubCategory {
  slug: string;
  label: string;
}

export interface Category {
  slug: string;
  label: string;
  children: SubCategory[];
}

export const CATEGORIES: Category[] = [
  {
    slug: "dev",
    label: "개발",
    children: [
      { slug: "backend", label: "백엔드" },
      { slug: "infra", label: "인프라·DevOps" },
      { slug: "cs", label: "CS·이론" },
    ],
  },
  {
    slug: "invest",
    label: "투자",
    children: [{ slug: "stocks", label: "주식" }],
  },
  {
    slug: "life",
    label: "일상",
    children: [{ slug: "etc", label: "잡담" }],
  },
];

/** slug 또는 라벨(한글)을 받아 1차 카테고리를 찾는다. */
export function resolvePrimary(token: string): Category | undefined {
  const t = token.trim().toLowerCase();
  return CATEGORIES.find((c) => c.slug.toLowerCase() === t || c.label === token.trim());
}

/** 1차 카테고리 안에서 slug 또는 라벨로 2차 카테고리를 찾는다. */
export function resolveSecondary(primary: Category, token: string): SubCategory | undefined {
  const t = token.trim().toLowerCase();
  return primary.children.find((c) => c.slug.toLowerCase() === t || c.label === token.trim());
}

export function primaryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function secondaryBySlug(primarySlug: string, secondarySlug: string): SubCategory | undefined {
  return primaryBySlug(primarySlug)?.children.find((c) => c.slug === secondarySlug);
}

/** 표시용 라벨 조회 (없으면 slug 그대로). */
export function primaryLabel(slug?: string): string | undefined {
  if (!slug) return undefined;
  return primaryBySlug(slug)?.label ?? slug;
}

export function secondaryLabel(primarySlug?: string, secondarySlug?: string): string | undefined {
  if (!primarySlug || !secondarySlug) return undefined;
  return secondaryBySlug(primarySlug, secondarySlug)?.label ?? secondarySlug;
}
