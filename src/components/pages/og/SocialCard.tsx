import { siteConfig } from "@/config/site";
import { DISPLAY_FAMILY, MONO_FAMILY } from "./fonts";

/*
 * Satori JSX (next/og). Only flexbox, absolute positioning and a subset of CSS are available:
 * every element with more than one child must be `display: flex`; no grid, no CSS classes.
 */

/** The card palette: the site tokens, restated here because Satori cannot read globals.css. */
const LAPIS = "#1b5ad6";
const DEEP = "#0f2f7c";
const IVORY = "#fbfaf7";
const GOLD = "#d9b653";
const GOLD_2 = "#b08d3c";
const INK = "#121418";
const BONE = "#c4d0ee";

/** The registered mark, drawn: a gold ring with a serif R. Scales with `size`. */
export function RegisteredRing({ size, stroke = Math.max(1.5, size / 36) }: { size: number; stroke?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        border: `${stroke}px solid ${GOLD}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: GOLD,
        fontFamily: DISPLAY_FAMILY,
        fontWeight: 600,
        fontSize: size * 0.62,
        lineHeight: 1,
        paddingBottom: size * 0.06,
      }}
    >
      R
    </div>
  );
}

/** A gold ® on lapis: the favicon and the home-screen icon. */
export function IconMark({ size }: { size: number }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: LAPIS, color: INK }}>
      <RegisteredRing size={size * 0.78} />
    </div>
  );
}

/** The 1200×630 social card: the lapis wall, the wordmark in Cormorant, a gold hairline, the byline in tracked mono. */
export function SocialCard({ width = 1200, height = 630 }: { width?: number; height?: number }) {
  const host = siteConfig.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const byline = `${siteConfig.author.name} · IP Litigation · Delhi`;
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        position: "relative",
        background: LAPIS,
        color: IVORY,
        fontFamily: DISPLAY_FAMILY,
      }}
    >
      {/* A subtle deep-blue vignette towards the lower right, and a soft ivory key light from the upper left. */}
      <div style={{ position: "absolute", top: 0, left: 0, width, height, background: `radial-gradient(125% 145% at 18% 10%, ${LAPIS}00 35%, ${DEEP}cc 100%)` }} />
      <div style={{ position: "absolute", top: 0, left: 0, width, height, background: `radial-gradient(55% 70% at 12% 6%, ${IVORY}1f, ${IVORY}00 65%)` }} />

      {/* Plate frame: an ivory hairline at 35 % */}
      <div style={{ position: "absolute", top: 30, left: 30, width: width - 60, height: height - 60, border: `1px solid ${IVORY}59` }} />

      {/* Header row: the address and the mark */}
      <div style={{ position: "absolute", top: 62, left: 76, width: width - 152, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: MONO_FAMILY, fontSize: 18, letterSpacing: 5, textTransform: "uppercase", color: BONE }}>{host}</div>
        <RegisteredRing size={54} />
      </div>

      {/* The wordmark */}
      <div style={{ position: "absolute", left: 76, bottom: 92, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 126, lineHeight: 1, letterSpacing: 6, textTransform: "uppercase", color: IVORY }}>{siteConfig.name}</div>
        <div style={{ width: 168, height: 1, background: GOLD_2, marginTop: 36 }} />
        <div style={{ marginTop: 26, fontFamily: MONO_FAMILY, fontSize: 21, letterSpacing: 7, textTransform: "uppercase", color: GOLD }}>{byline}</div>
      </div>
    </div>
  );
}
