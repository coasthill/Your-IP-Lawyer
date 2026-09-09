import type { Category } from "@/db/schema";
import { getFeaturedPost, listPublishedPosts, type PostWithMeta } from "@/server/posts";
import { listCategories } from "@/server/taxonomy";

export const PAGE_SIZE = 18;

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** `?page=` → a positive integer (1 for anything unusable). */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 1 ? Math.min(n, 9999) : 1;
}

export type IndexData = {
  status: "ok" | "error";
  categories: Category[];
  lead: PostWithMeta | null;
  posts: PostWithMeta[];
  hasNext: boolean;
};

/**
 * Loads one page of the record. The list is ordered featured-first, so item 0 of page 1 is the
 * lead article; on the main index that is exactly what getFeaturedPost() returns.
 * Database failures degrade to `status: "error"` so the masthead still renders.
 */
export async function loadIndex(opts: { page: number; categorySlug?: string; tagSlug?: string; useFeatured?: boolean }): Promise<IndexData> {
  const { page } = opts;
  try {
    const [categories, items, featured] = await Promise.all([
      listCategories("blog"),
      listPublishedPosts({ categorySlug: opts.categorySlug, tagSlug: opts.tagSlug, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE }),
      opts.useFeatured && page === 1 ? getFeaturedPost() : Promise.resolve(null),
    ]);
    const hasNext = items.length > PAGE_SIZE;
    const pageItems = items.slice(0, PAGE_SIZE);
    const lead = page === 1 ? (featured ?? pageItems[0] ?? null) : null;
    const posts = lead ? pageItems.filter((p) => p.id !== lead.id) : pageItems;
    return { status: "ok", categories, lead, posts, hasNext };
  } catch {
    return { status: "error", categories: [], lead: null, posts: [], hasNext: false };
  }
}
