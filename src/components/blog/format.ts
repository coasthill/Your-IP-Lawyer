import { absoluteUrl } from "@/config/site";
import type { PostWithMeta } from "@/server/posts";

/* ------------------------------------------------------------------ */
/* Small presentation helpers shared by the blog components            */
/* ------------------------------------------------------------------ */

/** Human file size. Local to the blog so the components never import the storage layer. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function articlePath(slug: string): string {
  return `/blog/${slug}`;
}

export function readingLabel(minutes: number): string {
  return `${Math.max(1, Math.round(minutes))} min read`;
}

/** "September 2026" in IST — used for the masthead "edition" line. */
const editionFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
export function editionLabel(date = new Date()): string {
  return editionFmt.format(date);
}

export type HeroImage = {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  /** True when the host is not in next.config images.remotePatterns — next/image then serves the file as-is. */
  unoptimized: boolean;
};

/**
 * A post may carry an uploaded hero document or a plain hero URL. Uploaded documents win.
 * External hosts that are not allow-listed for the image optimiser are served unoptimised
 * instead of throwing at render time.
 */
export function resolveHeroImage(post: Pick<PostWithMeta, "heroImage" | "heroImageUrl" | "heroImageAlt">): HeroImage | null {
  if (post.heroImage) {
    const doc = post.heroImage;
    return {
      src: doc.url,
      alt: doc.altText || post.heroImageAlt || "",
      width: doc.width ?? null,
      height: doc.height ?? null,
      caption: doc.description || doc.title || null,
      unoptimized: !isOptimisable(doc.url),
    };
  }
  const url = post.heroImageUrl?.trim();
  if (url) {
    return { src: url, alt: post.heroImageAlt || "", width: null, height: null, caption: null, unoptimized: !isOptimisable(url) };
  }
  return null;
}

function isOptimisable(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const u = new URL(src);
    if (u.protocol !== "https:") return false;
    if (u.hostname.endsWith(".public.blob.vercel-storage.com")) return true;
    const extra = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    if (extra.includes(u.hostname)) return true;
    const s3 = process.env.S3_PUBLIC_URL;
    if (s3) {
      try {
        if (new URL(s3).hostname === u.hostname) return true;
      } catch {
        /* ignore malformed env */
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Absolute URL for metadata / structured data (relative upload paths are made absolute). */
export function absoluteImageUrl(src: string): string {
  return src.startsWith("/") ? absoluteUrl(src) : src;
}
