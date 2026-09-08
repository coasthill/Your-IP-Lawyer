import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { loadOgFonts } from "@/components/pages/og/fonts";
import { SocialCard } from "@/components/pages/og/SocialCard";

export const runtime = "nodejs";
export const alt = `${siteConfig.name} — ${siteConfig.author.name}, ${siteConfig.author.title}, ${siteConfig.author.location}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The default Open Graph card for every page that does not supply its own. */
export default async function OpenGraphImage() {
  const fonts = await loadOgFonts();
  return new ImageResponse(<SocialCard {...size} />, { ...size, fonts });
}
