import { siteConfig } from "@/config/site";
import { PALETTE } from "@/components/hero/story";
import { DISPLAY_FAMILY, MONO_FAMILY } from "./fonts";

/*
 * Satori JSX (next/og). Only flexbox, absolute positioning and a subset of CSS are available:
 * every element with more than one child must be `display: flex`; no grid, no CSS classes.
 */

/** The registered mark, drawn: a bronze ring with a serif R. Scales with `size`. */
export function RegisteredRing({ size, stroke = Math.max(1.5, size / 36) }: { size: number; stroke?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        border: `${stroke}px solid ${PALETTE.bronze}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: PALETTE.bronze2,
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

/** A bronze ® on ink: the favicon and the home-screen icon. */
export function IconMark({ size }: { size: number }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: PALETTE.ink }}>
      <RegisteredRing size={size * 0.78} />
    </div>
  );
}

/** The 1200×630 social card: ink, the wordmark in Cormorant, a hairline, the byline in tracked mono. */
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
        background: PALETTE.ink,
        color: PALETTE.ivory,
        fontFamily: DISPLAY_FAMILY,
      }}
    >
      {/* One warm key light from the upper left, a faint cool rim from the right: the homepage lighting. */}
      <div style={{ position: "absolute", top: 0, left: 0, width, height, background: `radial-gradient(60% 80% at 14% 8%, ${PALETTE.keyLight}26, ${PALETTE.ink}00 65%)` }} />
      <div style={{ position: "absolute", top: 0, left: 0, width, height, background: `radial-gradient(40% 60% at 98% 62%, ${PALETTE.rimLight}1a, ${PALETTE.ink}00 65%)` }} />

      {/* Plate frame */}
      <div style={{ position: "absolute", top: 30, left: 30, width: width - 60, height: height - 60, border: `1px solid ${PALETTE.bronze}55` }} />

      {/* Header row: the address and the mark */}
      <div style={{ position: "absolute", top: 62, left: 76, width: width - 152, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: MONO_FAMILY, fontSize: 18, letterSpacing: 5, textTransform: "uppercase", color: PALETTE.bone }}>{host}</div>
        <RegisteredRing size={54} />
      </div>

      {/* The wordmark */}
      <div style={{ position: "absolute", left: 76, bottom: 92, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 126, lineHeight: 1, letterSpacing: 6, textTransform: "uppercase", color: PALETTE.ivory }}>{siteConfig.name}</div>
        <div style={{ width: 168, height: 1, background: PALETTE.bronze, marginTop: 36 }} />
        <div style={{ marginTop: 26, fontFamily: MONO_FAMILY, fontSize: 21, letterSpacing: 7, textTransform: "uppercase", color: PALETTE.bronze2 }}>{byline}</div>
      </div>
    </div>
  );
}
