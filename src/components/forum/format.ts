import type { ThreadSort } from "@/server/forum";

/* ------------------------------------------------------------------ */
/* Pure presentation helpers shared by the forum pages and components  */
/* (no database access, safe to import from client components)        */
/* ------------------------------------------------------------------ */

export const PAGE_SIZE = 40;
export const THREAD_BODY_MAX = 8000;
export const REPLY_BODY_MAX = 6000;
export const MAX_TAGS = 8;

export type { ThreadSort };

export const SORTS: ReadonlyArray<{ value: ThreadSort; label: string }> = [
  { value: "active", label: "Active" },
  { value: "newest", label: "Newest" },
  { value: "replies", label: "Most replied" },
];

export const DEFAULT_SORT: ThreadSort = "active";

export function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** `?sort=` → a known sort, defaulting to "active". */
export function parseSort(raw: string | string[] | undefined): ThreadSort {
  const value = first(raw);
  return SORTS.some((s) => s.value === value) ? (value as ThreadSort) : DEFAULT_SORT;
}

/** `?page=` → a positive integer (1 for anything unusable). */
export function parsePage(raw: string | string[] | undefined): number {
  const n = Number.parseInt(first(raw) ?? "", 10);
  return Number.isFinite(n) && n > 1 ? Math.min(n, 9999) : 1;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** `?category=` → a plausible slug or undefined. */
export function parseCategory(raw: string | string[] | undefined): string | undefined {
  const value = first(raw)?.trim().toLowerCase();
  return value && SLUG.test(value) ? value : undefined;
}

export function threadPath(slug: string): string {
  return `/forum/${slug}`;
}

/** Builds /forum?… omitting defaults so canonical URLs stay short. */
export function forumHref(opts: { category?: string | null; sort?: ThreadSort; page?: number } = {}): string {
  const params = new URLSearchParams();
  if (opts.category) params.set("category", opts.category);
  if (opts.sort && opts.sort !== DEFAULT_SORT) params.set("sort", opts.sort);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const query = params.toString();
  return query ? `/forum?${query}` : "/forum";
}

/** Plain-text excerpt of a guest post for metadata: markup markers removed, whitespace collapsed. */
export function excerpt(body: string, max = 160): string {
  const flat = body
    .replace(/^>\s?/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${at > max * 0.6 ? cut.slice(0, at) : cut}…`;
}

/** "September 2026" in IST — the masthead "edition" line. */
const editionFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
export function editionLabel(date = new Date()): string {
  return editionFmt.format(date);
}

/** "01", "02", … the house record label. */
export function recordNumber(n: number): string {
  return String(n).padStart(2, "0");
}

/** Splits "a, b, c" the way ensureTags() will, so the client can count against the cap. */
export function splitTags(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
