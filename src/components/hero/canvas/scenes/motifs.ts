/**
 * THE FIVE MOTIFS, drawn small — the bronze seal (®), the engineering sheet with its gear drawing,
 * the loose manuscript pages, the faceted ornament and the map fragment with its marker.
 * Shared by scene 2 (emerging from the gown), scene 3 (knocked back) and scene 8 (the constellation).
 *
 * Every draw() expects the context translated to the motif's centre (rotated / scaled as the caller
 * wishes) and draws a motif of radius `r` in that space. Paths, facet tables and font strings are
 * built once per size in `buildMotifKit`; nothing here allocates in the frame loop.
 */

import { PALETTE } from "../../story";
import { CONCEPTUAL_MARKER, toUnit } from "../../india-outline";
import {
  BRONZE_RING,
  Gfx,
  TAU,
  circlePath,
  contourPath,
  dashCentre,
  dimLine,
  gearPath,
  indiaPath,
  mixHex,
  mulberry32,
  noDash,
  polarPath,
  rgba,
  vnoise,
  type Fonts,
} from "../helpers";

export type MotifKit = {
  r: number;
  /** seal annulus (fill evenodd), face disc, inner engraved ring, rim ticks */
  ring: Path2D;
  face: Path2D;
  inner: Path2D;
  ticks: Path2D;
  /** the sheet's gear drawing and pitch circle, centred on the drawing */
  sheetGear: Path2D;
  sheetPitch: Path2D;
  /** a solid small gear for the constellation */
  gear: Path2D;
  /** manuscript ink lines, in page-local coordinates */
  inkLines: Path2D;
  /** ornament facets: 6 numbers per triangle */
  facets: Float32Array;
  facetNormals: Float32Array;
  facetCount: number;
  /** pre-quantised facet shades (dark → lit) */
  shades: string[];
  /** map fragment: torn paper edge, the land, its contours, marker in fragment space */
  torn: Path2D;
  india: Path2D;
  contours: Path2D;
  markerX: number;
  markerY: number;
  fontGlyph: string;
  fontMono: string;
  fontBanner: string;
};

const FACET_LIGHT = -2.35;
const SHADE_STEPS = 14;

const INK_80 = rgba(PALETTE.ink, 0.8);
const INK_55 = rgba(PALETTE.ink, 0.55);
const INK_35 = rgba(PALETTE.ink, 0.35);
const INK_14 = rgba(PALETTE.ink, 0.14);
const BRONZE2_60 = rgba(PALETTE.bronze2, 0.6);
const BRONZE_DIM_60 = rgba(PALETTE.bronzeDim, 0.6);
const BRONZE_DIM_90 = rgba(PALETTE.bronzeDim, 0.9);
const BONE_80 = rgba(PALETTE.bone, 0.8);
const KEY_55 = rgba(PALETTE.keyLight, 0.55);
const KEY_30 = rgba(PALETTE.keyLight, 0.3);
const LAND = mixHex(PALETTE.graphite, PALETTE.parchment, 0.22);

const SEAL_FACE: ReadonlyArray<readonly [number, string]> = [
  [0, "#3d2e20"],
  [0.65, "#231a13"],
  [1, "#140f0b"],
];
const SHEET: ReadonlyArray<readonly [number, string]> = [
  [0, PALETTE.parchment],
  [0.55, "#d6cab0"],
  [1, "#b4a88d"],
];
const PAGE: ReadonlyArray<readonly [number, string]> = [
  [0, PALETTE.ivory],
  [1, "#cdc2a7"],
];
const PAPER: ReadonlyArray<readonly [number, string]> = [
  [0, "#d9cfb6"],
  [1, "#a9a08a"],
];
const GLOW: ReadonlyArray<readonly [number, string]> = [
  [0, rgba(PALETTE.keyLight, 0.9)],
  [0.25, rgba(PALETTE.keyLight, 0.35)],
  [1, rgba(PALETTE.keyLight, 0)],
];
const CORE: ReadonlyArray<readonly [number, string]> = [
  [0, "#9a9ba2"],
  [0.6, "#4d4e55"],
  [1, "#26272c"],
];

export function buildMotifKit(r: number, fonts: Fonts): MotifKit {
  // seal
  const ring = circlePath(r);
  ring.moveTo(r * 0.78, 0);
  ring.arc(0, 0, r * 0.78, 0, TAU, true);
  const face = circlePath(r * 0.78);
  const inner = circlePath(r * 0.6);
  const ticks = new Path2D();
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU;
    const r0 = i % 5 === 0 ? r * 0.83 : r * 0.88;
    ticks.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ticks.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
  }
  // sheet + solid gear
  const sheetGear = gearPath(14, r * 0.42, r * 0.07, 0.2);
  sheetGear.moveTo(r * 0.2, 0);
  sheetGear.arc(0, 0, r * 0.2, 0, TAU);
  const sheetPitch = circlePath(r * 0.42);
  const gear = gearPath(12, r * 0.86, r * 0.16, 0.24);
  // pages
  const inkLines = new Path2D();
  for (let i = 0; i < 8; i++) {
    const y = -r * 0.62 + i * r * 0.17;
    const len = r * (0.9 - (i % 3) * 0.14 - (i === 7 ? 0.3 : 0));
    inkLines.moveTo(-r * 0.46, y);
    inkLines.lineTo(-r * 0.46 + len, y);
  }
  // ornament facets: an 8-point inner ring and a 16-point outer ring, triangulated
  const outer: number[] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    const rr = k % 2 === 0 ? r : r * 0.84;
    outer.push(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const innerV: number[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + Math.PI / 16;
    innerV.push(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42);
  }
  const tri: number[] = [];
  const push = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => tri.push(ax, ay, bx, by, cx, cy);
  for (let k = 0; k < 16; k++) {
    const k1 = (k + 1) % 16;
    const iv = Math.floor(k / 2) % 8;
    push(outer[k * 2], outer[k * 2 + 1], outer[k1 * 2], outer[k1 * 2 + 1], innerV[iv * 2], innerV[iv * 2 + 1]);
    if (k % 2 === 1) {
      const iv2 = (iv + 1) % 8;
      push(outer[k1 * 2], outer[k1 * 2 + 1], innerV[iv2 * 2], innerV[iv2 * 2 + 1], innerV[iv * 2], innerV[iv * 2 + 1]);
    }
  }
  const facets = new Float32Array(tri);
  const facetCount = tri.length / 6;
  const facetNormals = new Float32Array(facetCount * 2);
  for (let i = 0; i < facetCount; i++) {
    const cx = (facets[i * 6] + facets[i * 6 + 2] + facets[i * 6 + 4]) / 3;
    const cy = (facets[i * 6 + 1] + facets[i * 6 + 3] + facets[i * 6 + 5]) / 3;
    const len = Math.hypot(cx, cy) || 1;
    facetNormals[i * 2] = cx / len;
    facetNormals[i * 2 + 1] = cy / len;
  }
  const shades: string[] = [];
  for (let i = 0; i <= SHADE_STEPS; i++) shades.push(mixHex("#17181c", PALETTE.keyLight, (i / SHADE_STEPS) * 0.85));
  // map fragment
  const rnd = mulberry32(0x6a9);
  const wob = new Float32Array(48);
  for (let i = 0; i < 48; i++) wob[i] = 0.9 + rnd() * 0.2;
  const torn = polarPath((a) => {
    const k = Math.floor((a / TAU) * 48) % 48;
    return 1.08 * wob[k] + 0.06 * vnoise(Math.cos(a) * 3 + 7, Math.sin(a) * 3);
  }, 96, r);
  const M = r * 1.5;
  const india = indiaPath(M);
  const contours = contourPath(M, [0.82, 0.64, 0.46, 0.28]);
  const mk = toUnit(CONCEPTUAL_MARKER);
  return {
    r,
    ring,
    face,
    inner,
    ticks,
    sheetGear,
    sheetPitch,
    gear,
    inkLines,
    facets,
    facetNormals,
    facetCount,
    shades,
    torn,
    india,
    contours,
    markerX: mk[0] * M,
    markerY: -mk[1] * M,
    fontGlyph: `600 ${(r * 0.95).toFixed(1)}px ${fonts.display}`,
    fontMono: `400 ${Math.max(6, r * 0.12).toFixed(1)}px ${fonts.mono}`,
    fontBanner: `500 ${Math.max(6, r * 0.15).toFixed(1)}px ${fonts.display}`,
  };
}

/** The bronze registration seal with an engraved ®. */
export function drawSeal(ctx: CanvasRenderingContext2D, gfx: Gfx, k: MotifKit): void {
  const r = k.r;
  ctx.fillStyle = gfx.radial(ctx, "mf-ring", 0, 0, r * 0.76, r, BRONZE_RING);
  ctx.fill(k.ring, "evenodd");
  ctx.fillStyle = gfx.radial(ctx, "mf-face", -r * 0.25, -r * 0.28, 0, r * 0.9, SEAL_FACE);
  ctx.fill(k.face);
  ctx.lineWidth = Math.max(0.8, r * 0.028);
  ctx.strokeStyle = INK_55;
  ctx.stroke(k.ticks);
  ctx.lineWidth = Math.max(0.7, r * 0.018);
  ctx.strokeStyle = BRONZE2_60;
  ctx.stroke(k.inner);
  ctx.font = k.fontGlyph;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = INK_80;
  ctx.fillText("®", 0, r * 0.06 + Math.max(1, r * 0.03));
  ctx.fillStyle = PALETTE.bronze2;
  ctx.fillText("®", 0, r * 0.06);
}

/** The unfolding engineering sheet: parchment, a gear drawing, centre and dimension lines, labels. */
export function drawSheet(ctx: CanvasRenderingContext2D, gfx: Gfx, k: MotifKit): void {
  const r = k.r;
  const hw = r * 1.15;
  const hh = r * 0.82;
  ctx.fillStyle = gfx.linear(ctx, "mf-sheet", -hw, -hh, hw, hh, SHEET);
  ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = INK_55;
  ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
  ctx.strokeStyle = INK_14;
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.lineTo(0, hh);
  ctx.stroke();
  // the drawing, on the left half
  ctx.save();
  ctx.translate(-r * 0.5, r * 0.02);
  ctx.lineWidth = Math.max(0.7, r * 0.022);
  ctx.strokeStyle = BRONZE_DIM_90;
  ctx.stroke(k.sheetGear);
  dashCentre(ctx);
  ctx.strokeStyle = BRONZE_DIM_60;
  ctx.stroke(k.sheetPitch);
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, 0);
  ctx.lineTo(r * 0.6, 0);
  ctx.moveTo(0, -r * 0.6);
  ctx.lineTo(0, r * 0.6);
  ctx.stroke();
  noDash(ctx);
  ctx.beginPath();
  dimLine(ctx, -r * 0.47, r * 0.66, r * 0.47, r * 0.66, r * 0.05);
  dimLine(ctx, r * 0.62, -r * 0.47, r * 0.62, r * 0.47, r * 0.05);
  ctx.stroke();
  ctx.restore();
  // labels and a hatched section, on the right half
  ctx.font = k.fontMono;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = BRONZE_DIM_90;
  ctx.fillText("FIG. 1", r * 0.24, -r * 0.5);
  ctx.fillText("Ø 4.36", r * 0.24, -r * 0.3);
  ctx.fillText("SEC. A-A", r * 0.24, r * 0.62);
  ctx.strokeStyle = BRONZE_DIM_60;
  ctx.lineWidth = Math.max(0.6, r * 0.015);
  ctx.strokeRect(r * 0.26, -r * 0.14, r * 0.7, r * 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r * 0.26, -r * 0.14, r * 0.7, r * 0.5);
  ctx.clip();
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const x = r * 0.26 - r * 0.5 + i * r * 0.1;
    ctx.moveTo(x, r * 0.36);
    ctx.lineTo(x + r * 0.5, -r * 0.14);
  }
  ctx.stroke();
  ctx.restore();
}

const PAGE_ROT = [-0.2, 0.06, 0.24];
const PAGE_OX = [-0.16, 0.05, 0.2];
const PAGE_OY = [0.08, -0.04, 0.03];

/** Three loose manuscript pages, tumbling gently; `tumble` (0–1) spreads them while they emerge. */
export function drawPages(ctx: CanvasRenderingContext2D, gfx: Gfx, k: MotifKit, t: number, tumble: number): void {
  const r = k.r;
  const hw = r * 0.62;
  const hh = r * 0.85;
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(PAGE_ROT[i] + Math.sin(t * 0.6 + i * 2.1) * 0.05 + tumble * (i - 1) * 0.7);
    ctx.translate(PAGE_OX[i] * r * (1 + tumble * 1.5), PAGE_OY[i] * r * (1 + tumble));
    ctx.fillStyle = gfx.linear(ctx, "mf-page", -hw, -hh, hw, hh, PAGE);
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = INK_35;
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
    ctx.lineWidth = Math.max(0.6, r * 0.02);
    ctx.strokeStyle = BRONZE_DIM_60;
    ctx.stroke(k.inkLines);
    ctx.restore();
  }
}

/** The faceted ornament: flat facets shaded from the key light, a specular edge on the lit side. */
export function drawOrnament(ctx: CanvasRenderingContext2D, gfx: Gfx, k: MotifKit, rot: number): void {
  const r = k.r;
  const lx = Math.cos(FACET_LIGHT - rot);
  const ly = Math.sin(FACET_LIGHT - rot);
  const f = k.facets;
  const n = k.facetNormals;
  for (let i = 0; i < k.facetCount; i++) {
    const d = n[i * 2] * lx + n[i * 2 + 1] * ly;
    const shade = 0.22 + 0.62 * Math.max(0, d) + 0.08 * Math.max(0, -d);
    ctx.fillStyle = k.shades[Math.round(Math.min(1, shade) * SHADE_STEPS)];
    ctx.beginPath();
    ctx.moveTo(f[i * 6], f[i * 6 + 1]);
    ctx.lineTo(f[i * 6 + 2], f[i * 6 + 3]);
    ctx.lineTo(f[i * 6 + 4], f[i * 6 + 5]);
    ctx.closePath();
    ctx.fill();
    if (d > 0.55) {
      ctx.strokeStyle = KEY_55;
      ctx.lineWidth = Math.max(0.8, r * 0.02);
      ctx.beginPath();
      ctx.moveTo(f[i * 6], f[i * 6 + 1]);
      ctx.lineTo(f[i * 6 + 2], f[i * 6 + 3]);
      ctx.stroke();
    }
  }
  ctx.fillStyle = gfx.radial(ctx, "mf-core", -r * 0.12, -r * 0.14, 0, r * 0.46, CORE);
  ctx.beginPath();
  for (let k2 = 0; k2 < 8; k2++) {
    const a = (k2 / 8) * TAU + Math.PI / 16;
    if (k2 === 0) ctx.moveTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42);
    else ctx.lineTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = KEY_30;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** A torn map fragment: paper, the land with contours, and one glowing marker. */
export function drawMapFragment(ctx: CanvasRenderingContext2D, gfx: Gfx, k: MotifKit, t: number, lit: number): void {
  const r = k.r;
  ctx.fillStyle = gfx.linear(ctx, "mf-paper", -r, -r, r, r, PAPER);
  ctx.fill(k.torn);
  ctx.lineWidth = 1;
  ctx.strokeStyle = INK_55;
  ctx.stroke(k.torn);
  ctx.save();
  ctx.clip(k.torn);
  ctx.fillStyle = LAND;
  ctx.fill(k.india);
  ctx.lineWidth = Math.max(0.6, r * 0.016);
  ctx.strokeStyle = BRONZE_DIM_60;
  ctx.stroke(k.contours);
  ctx.lineWidth = Math.max(0.8, r * 0.024);
  ctx.strokeStyle = BONE_80;
  ctx.stroke(k.india);
  ctx.restore();
  drawMarker(ctx, gfx, k.markerX, k.markerY, r * 0.34, t, lit);
}

/** A conceptual place marker: a soft glow, a pulsing halo, a bronze point and a thin rising line. */
export function drawMarker(ctx: CanvasRenderingContext2D, gfx: Gfx, x: number, y: number, r: number, t: number, lit: number): void {
  ctx.save();
  ctx.translate(x, y);
  const prev = ctx.globalAlpha;
  if (lit > 0.01) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = prev * lit * (0.55 + 0.2 * Math.sin(t * 2.2));
    ctx.fillStyle = gfx.radial(ctx, "mf-glow", 0, 0, 0, r * 1.8, GLOW);
    ctx.fillRect(-r * 1.8, -r * 1.8, r * 3.6, r * 3.6);
    ctx.globalCompositeOperation = "source-over";
    const ph = (t * 0.45) % 1;
    ctx.globalAlpha = prev * lit * (1 - ph) * 0.6;
    ctx.strokeStyle = PALETTE.keyLight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * (0.35 + ph * 1.1), 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = prev;
  ctx.strokeStyle = PALETTE.bronze2;
  ctx.lineWidth = Math.max(0.8, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = PALETTE.ivory;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.11, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = prev * (0.35 + 0.5 * lit);
  ctx.strokeStyle = PALETTE.keyLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.32);
  ctx.lineTo(0, -r * (0.9 + lit * 0.8));
  ctx.stroke();
  ctx.globalAlpha = prev;
  ctx.restore();
}

/** A bare brushed-steel gear with a bronze rim (constellation). */
export function drawSmallGear(ctx: CanvasRenderingContext2D, gfx: Gfx, k: MotifKit, rot: number): void {
  const r = k.r;
  ctx.save();
  ctx.rotate(rot);
  ctx.fillStyle = gfx.radial(ctx, "mf-gear", -r * 0.2, -r * 0.2, 0, r, CORE);
  ctx.fill(k.gear, "evenodd");
  ctx.lineWidth = 1;
  ctx.strokeStyle = INK_55;
  ctx.stroke(k.gear);
  ctx.restore();
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.strokeStyle = gfx.linear(ctx, "mf-gear-rim", -r, -r, r, r, BRONZE_RING);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = PALETTE.bronzeDim;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.1, 0, TAU);
  ctx.fill();
}
