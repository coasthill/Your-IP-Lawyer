import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { loadOgFonts } from "@/components/pages/og/fonts";
import { SocialCard } from "@/components/pages/og/SocialCard";

export const runtime = "nodejs";
export const alt = `${siteConfig.name} — ${siteConfig.author.name}, ${siteConfig.author.title}, ${siteConfig.author.location}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The summary_large_image card. Same plate as Open Graph; X crops nothing at 1.91:1. */
export default async function TwitterImage() {
  const fonts = await loadOgFonts();
  return new ImageResponse(<SocialCard {...size} />, { ...size, fonts });
}
