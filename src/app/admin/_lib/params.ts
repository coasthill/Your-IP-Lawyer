/**
 * Helpers for reading `searchParams` on dashboard pages (Next 16: a Promise of string | string[] values).
 */
export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a query key, trimmed; "" when absent. */
export function param(sp: SearchParams, key: string): string {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s.trim() : "";
}

/** The value only if it is one of the allowed options, else the fallback. */
export function paramOneOf<T extends string>(sp: SearchParams, key: string, allowed: readonly T[], fallback: T): T {
  const v = param(sp, key);
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
