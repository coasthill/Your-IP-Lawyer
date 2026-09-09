"use client";

import { useMemo } from "react";
import { Text } from "@react-three/drei";

type ArcTextProps = {
  text: string;
  radius: number;
  fontSize: number;
  font: string;
  characters: string;
  color: string;
  /** angle (radians) at which the text is centred; π/2 = top of the circle */
  centreAngle?: number;
  /** extra spacing between glyphs, in world units */
  spacing?: number;
  /** distribute the glyphs evenly around the full circle (overrides spacing) */
  fullCircle?: boolean;
  z?: number;
  fillOpacity?: number;
  outlineWidth?: number | string;
  outlineColor?: string;
  outlineOpacity?: number;
  outlineOffsetX?: number | string;
  outlineOffsetY?: number | string;
};

/** Approximate advance widths (em) for spaced capitals — enough for even optical spacing. */
function advance(ch: string) {
  if (ch === " ") return 0.28;
  if (ch === "·" || ch === "." || ch === "I" || ch === "i" || ch === "l") return 0.3;
  if (ch === "M" || ch === "W") return 0.86;
  if ("RDGKOQ".includes(ch)) return 0.7;
  return 0.6;
}

/**
 * Places each glyph of `text` on a circle so the baseline follows the arc (tops pointing
 * outward, reading clockwise). Used for the engraved "PATENT" on the big gear and the
 * ring text of the trade mark emblem. Per-frame opacity is driven by the parent via
 * setTextOpacity on the group's children.
 */
export function ArcText({
  text,
  radius,
  fontSize,
  font,
  characters,
  color,
  centreAngle = Math.PI / 2,
  spacing = 0,
  fullCircle = false,
  z = 0,
  fillOpacity = 1,
  outlineWidth,
  outlineColor,
  outlineOpacity,
  outlineOffsetX,
  outlineOffsetY,
}: ArcTextProps) {
  const glyphs = useMemo(() => {
    const chars = text.split("");
    const widths = chars.map((ch) => advance(ch) * fontSize);
    const natural = widths.reduce((a, b) => a + b, 0);
    const gap = fullCircle ? (Math.PI * 2 * radius - natural) / chars.length : spacing;
    const total = natural + gap * chars.length;
    let cursor = centreAngle + total / 2 / radius;
    const out: { ch: string; angle: number; key: string }[] = [];
    for (let i = 0; i < chars.length; i++) {
      const w = widths[i] + gap;
      const a = cursor - w / 2 / radius;
      if (chars[i] !== " ") out.push({ ch: chars[i], angle: a, key: `${i}-${chars[i]}` });
      cursor -= w / radius;
    }
    return out;
  }, [text, radius, fontSize, centreAngle, spacing, fullCircle]);

  // Only hand troika the outline properties when an outline is wanted (undefined would unset its defaults).
  const outline =
    outlineWidth !== undefined
      ? { outlineWidth, outlineColor: outlineColor ?? color, outlineOpacity: outlineOpacity ?? 1, outlineOffsetX: outlineOffsetX ?? 0, outlineOffsetY: outlineOffsetY ?? 0 }
      : {};

  return (
    <group>
      {glyphs.map((g) => (
        <Text
          key={g.key}
          font={font}
          characters={characters}
          fontSize={fontSize}
          color={color}
          anchorX="center"
          anchorY="middle"
          position={[Math.cos(g.angle) * radius, Math.sin(g.angle) * radius, z]}
          rotation={[0, 0, g.angle - Math.PI / 2]}
          fillOpacity={fillOpacity}
          {...outline}
        >
          {g.ch}
        </Text>
      ))}
    </group>
  );
}
