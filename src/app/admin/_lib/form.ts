/**
 * FormData helpers for admin server actions. Everything here treats the request as untrusted.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Trimmed string field, capped at `max` characters. */
export function field(formData: FormData, name: string, max = 10_000): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Raw (untrimmed) text — used for Markdown bodies where leading whitespace is meaningful. */
export function textField(formData: FormData, name: string, max = 400_000): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.replace(/\r\n?/g, "\n").slice(0, max) : "";
}

export function flag(formData: FormData, name: string): boolean {
  const v = formData.get(name);
  return v === "on" || v === "true" || v === "1";
}

export function fileField(formData: FormData, name: string): File | null {
  const v = formData.get(name);
  return v instanceof File && v.size > 0 ? v : null;
}

/** Returns the value only if it is one of the allowed options. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Collects the submitted values of the named fields so a form can be re-filled after a validation error. */
export function echo(formData: FormData, names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of names) {
    const v = formData.get(n);
    if (typeof v === "string") out[n] = v;
  }
  return out;
}

/** Accepts only http(s) URLs (used for external hero images). */
export function safeHttpUrl(value: string): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** A safe "next" path for post-login redirects: only inside /admin, never protocol-relative. */
export function safeAdminPath(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) return "/admin";
  if (value.startsWith("/admin/login")) return "/admin";
  return value.slice(0, 500);
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
