import { ImageResponse } from "next/og";
import { loadOgFonts } from "@/components/pages/og/fonts";
import { IconMark } from "@/components/pages/og/SocialCard";

export const runtime = "nodejs";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Browser-tab icon: a bronze ® on ink. */
export default async function Icon() {
  const fonts = await loadOgFonts();
  return new ImageResponse(<IconMark size={size.width} />, { ...size, fonts });
}
