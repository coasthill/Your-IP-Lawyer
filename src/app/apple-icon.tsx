import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/components/pages/og/fonts";
import { IconMark } from "@/components/pages/og/SocialCard";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the same gold ® on lapis, at Apple's 180px. */
export default async function AppleIcon() {
  const fonts = await loadOgFonts();
  return new ImageResponse(<IconMark size={size.width} />, { ...size, fonts });
}
