import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

const CARD_ALT = `${siteConfig.name} — ${siteConfig.author.name}, ${siteConfig.author.title}, ${siteConfig.author.location}`;
const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: CARD_ALT };
const TWITTER_IMAGE = { url: "/twitter-image", width: 1200, height: 630, alt: CARD_ALT };

/**
 * Metadata for a static editorial page.
 *
 * Next merges `openGraph` as a whole key, not field by field, so a page that declares its own
 * `openGraph` replaces the root layout's, including the images the root `opengraph-image.tsx`
 * contributed. The site card is therefore restated here so every page still ships an image.
 */
export function pageMetadata({
  path,
  title,
  description,
  ogTitle,
  card = "summary_large_image",
  profile,
}: {
  /** Canonical path, e.g. "/about". */
  path: string;
  /** Tab title; the root template appends the site name. */
  title: string;
  description: string;
  /** Social title when it should differ from the tab title. */
  ogTitle?: string;
  card?: "summary" | "summary_large_image";
  /** Marks the page as a person's profile (og:type profile). */
  profile?: { firstName: string; lastName: string };
}): Metadata {
  const socialTitle = `${ogTitle ?? title} — ${siteConfig.name}`;
  const common = { url: path, title: socialTitle, description, siteName: siteConfig.name, locale: siteConfig.locale, images: [OG_IMAGE] };
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: profile ? { type: "profile", ...common, ...profile } : { type: "website", ...common },
    twitter: { card, title: socialTitle, description, images: [TWITTER_IMAGE] },
  };
}
