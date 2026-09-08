/**
 * Drawing kit for the 2.5D canvas renderer.
 *
 *   maths     — easing, deterministic value noise, seeded prng (never Math.random: layouts must replay)
 *   colour    — rgba() with a parsed-hex cache
 *   Gfx       — gradients cached by key (cleared on resize), the film-grain tile, conic-gradient probe
 *   geometry  — Path2D builders: gears (tip at angle 0, so meshing phases are exact), rose curves,
 *               the guilloché rosette, the compass rose, the turned vessel, the ribbon, the map of India
 *   text      — the site's CSS fonts read once; tracked text, arc text, engraved (light-offset) text
 *
 * Every builder runs at build time (resize), never inside the frame loop.
 */

import { clamp01 } from "../story";
import { INDIA_OUTLINE, INDIA_BOUNDS, indiaUnitPolygon } from "../india-outline";

export const TAU = Math.PI * 2;
export const HALF_PI = Math.PI / 2;

/* ------------------------------------------------------------------ maths */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
export function clamp(n: number, a: number, b: number): number {
  return n < a ? a : n > b ? b : n;
}
export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  const u = 1 - x;
  return 1 - u * u * u;
}
export function easeInCubic(t: number): number {
  const x = clamp01(t);
  return x * x * x;
}
export function easeInOutSine(t: number): number {
  const x = clamp01(t);
  return -(Math.cos(Math.PI * x) - 1) / 2;
}
/** Back-out ease: overshoots slightly past 1 then settles. */
export function easeOutBack(t: number, overshoot = 1.25): number {
  const x = clamp01(t);
  const c3 = overshoot + 1;
  const u = x - 1;
  return 1 + c3 * u * u * u + overshoot * u * u;
}
/** Smooth bump: 1 at t = 0, 0 at |t| >= 1. */
export function bell(t: number): number {
  const a = 1 - t * t;
  return a > 0 ? a * a : 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix: number, iy: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** 2D value noise in [-1, 1]; smooth, deterministic, allocation-free. */
export function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return (top + (bottom - top) * fy) * 2 - 1;
}

/** Three octaves of value noise in roughly [-1, 1]. */
export function fbm(x: number, y: number): number {
  return vnoise(x, y) * 0.6 + vnoise(x * 2.1 + 5.2, y * 2.1 + 1.3) * 0.28 + vnoise(x * 4.3 + 9.1, y * 4.3 + 7.7) * 0.12;
}

/* ------------------------------------------------------------------ colour */

const hexCache = new Map<string, [number, number, number]>();

function parseHex(hex: string): [number, number, number] {
  let c = hexCache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache.set(hex, c);
  }
  return c;
}

/** `rgba()` string for a #rrggbb colour. */
export function rgba(hex: string, a: number): string {
  const c = parseHex(hex);
  return `rgba(${c[0]},${c[1]},${c[2]},${a < 0 ? 0 : a > 1 ? 1 : a})`;
}

/** Linear mix of two #rrggbb colours → rgba string. */
export function mixHex(a: string, b: string, t: number, alpha = 1): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgba(${r},${g},${bl},${alpha})`;
}

export type Stops = ReadonlyArray<readonly [number, string]>;

/* ------------------------------------------------------------------ Gfx cache */

/**
 * Gradients are expensive to build and cheap to reuse: everything size-dependent is cached here by
 * key and thrown away on resize. Also owns the pre-rendered film-grain tile.
 */
export class Gfx {
  private readonly store = new Map<string, CanvasGradient>();
  readonly grain: CanvasPattern | null;
  readonly grainSize = 160;
  readonly conic: boolean;

  constructor(ctx: CanvasRenderingContext2D) {
    this.grain = ctx.createPattern(makeGrainTile(this.grainSize, 0x9a1e), "repeat");
    this.conic = typeof (ctx as { createConicGradient?: unknown }).createConicGradient === "function";
  }

  clear(): void {
    this.store.clear();
  }

  radial(ctx: CanvasRenderingContext2D, key: string, x: number, y: number, r0: number, r1: number, stops: Stops): CanvasGradient {
    let g = this.store.get(key);
    if (!g) {
      g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.001, r1));
      for (const [o, c] of stops) g.addColorStop(o, c);
      this.store.set(key, g);
    }
    return g;
  }

  linear(ctx: CanvasRenderingContext2D, key: string, x0: number, y0: number, x1: number, y1: number, stops: Stops): CanvasGradient {
    let g = this.store.get(key);
    if (!g) {
      g = ctx.createLinearGradient(x0, y0, x1, y1);
      for (const [o, c] of stops) g.addColorStop(o, c);
      this.store.set(key, g);
    }
    return g;
  }

  /** Conic gradient when the browser has it (brushed-metal anisotropy); null otherwise. */
  conicGradient(ctx: CanvasRenderingContext2D, key: string, angle: number, x: number, y: number, stops: Stops): CanvasGradient | null {
    if (!this.conic) return null;
    let g = this.store.get(key);
    if (!g) {
      g = ctx.createConicGradient(angle, x, y);
      for (const [o, c] of stops) g.addColorStop(o, c);
      this.store.set(key, g);
    }
    return g;
  }
}

/** A transparent speckle tile: light and dark grains with random alpha; drawn at low alpha for film grain. */
export function makeGrainTile(size: number, seed: number): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const c = tile.getContext("2d");
  if (!c) return tile;
  const img = c.createImageData(size, size);
  const d = img.data;
  const rnd = mulberry32(seed);
  for (let i = 0; i < d.length; i += 4) {
    const light = rnd() > 0.5;
    d[i] = light ? 227 : 6;
    d[i + 1] = light ? 217 : 6;
    d[i + 2] = light ? 195 : 8;
    d[i + 3] = Math.floor(rnd() * rnd() * 110);
  }
  c.putImageData(img, 0, 0);
  return tile;
}

/* ------------------------------------------------------------------ metal stops */

/** Brushed steel, seen as concentric turning marks: many faint alternating rings. */
export function steelStops(base = "#6e6f74"): Stops {
  const out: Array<[number, string]> = [];
  const rnd = mulberry32(0x57ee1);
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    const k = 0.62 + 0.5 * Math.sin(t * 5.5) * (1 - t * 0.35) + (rnd() - 0.5) * 0.22;
    out.push([t, mixHex("#101114", base, clamp(k, 0.18, 1.05))]);
  }
  out.push([1, "#1b1c20"]);
  return out;
}

export const BRONZE_RING: Stops = [
  [0, "#4b3624"],
  [0.35, "#a67e56"],
  [0.55, "#e0bf8c"],
  [0.72, "#a67e56"],
  [1, "#4b3624"],
];

export const BRUSH_CONIC: Stops = (() => {
  const out: Array<[number, string]> = [];
  const rnd = mulberry32(0xb2a5);
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const a = 0.03 + 0.07 * Math.abs(Math.sin(t * Math.PI * 2 * 3 + 0.4)) + rnd() * 0.05;
    out.push([t, `rgba(242,217,180,${a.toFixed(3)})`]);
  }
  return out;
})();

/* ------------------------------------------------------------------ geometry */

/**
 * Gear profile with `teeth` trapezoidal teeth on pitch radius `r`. Tooth tips are centred on the
 * angles 2πk/teeth, so a meshing phase can be computed exactly. The hub hole is a reverse-wound
 * subpath: fill with the "evenodd" rule.
 */
export function gearPath(teeth: number, r: number, hole = r * 0.12, toothDepth = 0.18): Path2D {
  const path = new Path2D();
  const td = toothDepth * r;
  const rOuter = r + td * 0.5;
  const rInner = r - td * 0.5;
  const pitch = TAU / teeth;
  for (let k = 0; k < teeth; k++) {
    const b = k * pitch;
    const a0 = b - 0.3 * pitch;
    const a1 = b - 0.17 * pitch;
    const a2 = b + 0.17 * pitch;
    const a3 = b + 0.3 * pitch;
    if (k === 0) path.moveTo(Math.cos(a0) * rInner, Math.sin(a0) * rInner);
    else path.lineTo(Math.cos(a0) * rInner, Math.sin(a0) * rInner);
    path.lineTo(Math.cos(a1) * rOuter, Math.sin(a1) * rOuter);
    path.lineTo(Math.cos(a2) * rOuter, Math.sin(a2) * rOuter);
    path.lineTo(Math.cos(a3) * rInner, Math.sin(a3) * rInner);
  }
  path.closePath();
  if (hole > 0) {
    path.moveTo(hole, 0);
    path.arc(0, 0, hole, 0, TAU, true);
  }
  return path;
}

/** Lightening cut-outs between the hub and the rim (filled with the background colour). */
export function spokesPath(r: number, spokes: number, hole: number): Path2D {
  const path = new Path2D();
  const r0 = hole + r * 0.2;
  const r1 = r * 0.7;
  if (spokes <= 0 || r1 <= r0) return path;
  const gap = 0.17;
  for (let s = 0; s < spokes; s++) {
    const a0 = (s / spokes) * TAU + gap;
    const a1 = ((s + 1) / spokes) * TAU - gap;
    path.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
    path.arc(0, 0, r0, a0, a1, false);
    path.arc(0, 0, r1, a1, a0, true);
    path.closePath();
  }
  return path;
}

/**
 * Meshed rotation of a child gear: the parent turns by `parentRot`, the centre line sits at `angle`.
 * Returns the child's rotation such that a parent tooth tip meets a child gap along the centre line.
 */
export function meshedRotation(parentRot: number, parentTeeth: number, childTeeth: number, angle: number): number {
  const ratio = parentTeeth / childTeeth;
  return -ratio * parentRot + angle * (1 + ratio) + Math.PI - Math.PI / childTeeth;
}

export function circlePath(r: number, cx = 0, cy = 0): Path2D {
  const p = new Path2D();
  p.arc(cx, cy, r, 0, TAU);
  return p;
}

/** Closed polar curve r(θ) sampled `steps` times. */
export function polarPath(fn: (theta: number) => number, steps: number, scale = 1, into?: Path2D): Path2D {
  const p = into ?? new Path2D();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const r = fn(a) * scale;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

/** A lotus / guilloché rosette in unit radius: rings, rose curves, petal rings, rim ticks. */
export function guillochePath(R: number): Path2D {
  const p = new Path2D();
  for (const r of [0.3, 0.56, 0.84, 0.965]) {
    p.moveTo(r * R, 0);
    p.arc(0, 0, r * R, 0, TAU);
  }
  const roses: Array<[number, number, number]> = [
    [12, 0.72, 0.085],
    [18, 0.5, 0.06],
    [8, 0.88, 0.05],
    [24, 0.36, 0.045],
  ];
  for (const [k, c, a] of roses) polarPath((t) => c + a * Math.cos(k * t), 540, R, p);
  petalRing(p, 16, 0.1 * R, 0.44 * R, 0.85);
  petalRing(p, 24, 0.58 * R, 0.93 * R, 0.62);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const r0 = i % 6 === 0 ? 0.9 * R : 0.935 * R;
    p.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    p.lineTo(Math.cos(a) * 0.985 * R, Math.sin(a) * 0.985 * R);
  }
  return p;
}

function petalRing(p: Path2D, count: number, r0: number, r1: number, width: number) {
  const half = (Math.PI / count) * width;
  const steps = 22;
  for (let k = 0; k < count; k++) {
    const base = (k / count) * TAU;
    for (const sign of [1, -1]) {
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const r = r0 + (r1 - r0) * t;
        const w = half * Math.sin(Math.PI * t) * sign;
        const x = Math.cos(base + w) * r;
        const y = Math.sin(base + w) * r;
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
    }
  }
}

/** The small ornament motif: two rose curves in a ring. */
export function roseOrnamentPath(R: number): Path2D {
  const p = new Path2D();
  polarPath((t) => 0.78 + 0.2 * Math.cos(8 * t), 240, R, p);
  polarPath((t) => 0.42 + 0.14 * Math.cos(6 * t), 180, R, p);
  p.moveTo(R, 0);
  p.arc(0, 0, R, 0, TAU);
  return p;
}

/** Compass rose: eight points (cardinals long), two rings, degree ticks. Unit radius R. */
export function compassPath(R: number): { star: Path2D; lines: Path2D } {
  const star = new Path2D();
  const lines = new Path2D();
  for (let i = 0; i < 8; i++) {
    const a = -HALF_PI + (i * TAU) / 8;
    const len = i % 2 === 0 ? 0.92 * R : 0.55 * R;
    const w = i % 2 === 0 ? 0.11 * R : 0.07 * R;
    const ax = Math.cos(a);
    const ay = Math.sin(a);
    const px = -ay;
    const py = ax;
    star.moveTo(ax * len, ay * len);
    star.lineTo(px * w, py * w);
    star.lineTo(ax * 0.05 * R, ay * 0.05 * R);
    star.lineTo(-px * w, -py * w);
    star.closePath();
  }
  for (const r of [0.62, 0.98]) {
    lines.moveTo(r * R, 0);
    lines.arc(0, 0, r * R, 0, TAU);
  }
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const r0 = i % 18 === 0 ? 0.86 * R : i % 6 === 0 ? 0.9 * R : 0.94 * R;
    lines.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    lines.lineTo(Math.cos(a) * 0.98 * R, Math.sin(a) * 0.98 * R);
  }
  return { star, lines };
}

/** A clean turned vessel profile (bottle/lamp silhouette); base at y=0, rising to y = -1.47·S. */
export function vesselPath(S: number): { profile: Path2D; sections: Path2D; height: number } {
  const profile = new Path2D();
  const P = (x: number, y: number): [number, number] => [x * S, -y * S];
  const right: Array<[number, number]> = [];
  const push = (pt: [number, number]) => right.push(pt);
  push(P(0.3, 0));
  push(P(0.34, 0.06));
  cubic(right, P(0.34, 0.06), P(0.64, 0.16), P(0.62, 0.56), P(0.4, 0.8), 14);
  cubic(right, P(0.4, 0.8), P(0.28, 0.93), P(0.16, 0.98), P(0.15, 1.1), 10);
  push(P(0.15, 1.34));
  cubic(right, P(0.15, 1.34), P(0.16, 1.41), P(0.22, 1.42), P(0.245, 1.47), 8);
  profile.moveTo(right[0][0], right[0][1]);
  for (let i = 1; i < right.length; i++) profile.lineTo(right[i][0], right[i][1]);
  profile.moveTo(-right[0][0], right[0][1]);
  for (let i = 1; i < right.length; i++) profile.lineTo(-right[i][0], right[i][1]);
  const sections = new Path2D();
  const rings: Array<[number, number]> = [
    [0, 0.3],
    [0.06, 0.34],
    [0.42, 0.61],
    [0.8, 0.4],
    [1.1, 0.15],
    [1.47, 0.245],
  ];
  for (const [y, r] of rings) sections.ellipse(0, -y * S, r * S, r * S * 0.3, 0, 0, TAU);
  return { profile, sections, height: 1.47 * S };
}

function cubic(out: Array<[number, number]>, p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], n: number) {
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    out.push([x, y]);
  }
}

/** A banner ribbon: central panel with forked tails, centred on the origin. */
export function ribbonPath(w: number, h: number): { panel: Path2D; tails: Path2D } {
  const panel = new Path2D();
  const hw = w * 0.36;
  const hh = h / 2;
  panel.moveTo(-hw, -hh);
  panel.lineTo(hw, -hh);
  panel.lineTo(hw, hh);
  panel.lineTo(-hw, hh);
  panel.closePath();
  const tails = new Path2D();
  const tw = w / 2;
  const notch = h * 0.42;
  for (const s of [1, -1]) {
    tails.moveTo(s * hw, -hh + h * 0.14);
    tails.lineTo(s * tw, -hh + h * 0.14);
    tails.lineTo(s * (tw - notch), h * 0.14);
    tails.lineTo(s * tw, hh + h * 0.14);
    tails.lineTo(s * hw, hh + h * 0.14);
    tails.closePath();
  }
  return { panel, tails };
}

/** The map of India as a Path2D at scale M (unit polygon × M), optionally squashed vertically. */
export function indiaPath(M: number, sy = 1): Path2D {
  const poly = indiaUnitPolygon();
  const p = new Path2D();
  for (let i = 0; i < poly.length; i++) {
    const x = poly[i][0] * M;
    const y = -poly[i][1] * M * sy;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

/** Contour loops: the outline shrunk about its centroid by each factor in `ks`. */
export function contourPath(M: number, ks: readonly number[], sy = 1): Path2D {
  const poly = indiaUnitPolygon();
  let cx = 0;
  let cy = 0;
  for (const [x, y] of poly) {
    cx += x;
    cy += y;
  }
  cx /= poly.length;
  cy /= poly.length;
  const p = new Path2D();
  for (const k of ks) {
    for (let i = 0; i < poly.length; i++) {
      const x = (cx + (poly[i][0] - cx) * k) * M;
      const y = -(cy + (poly[i][1] - cy) * k) * M * sy;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.closePath();
  }
  return p;
}

/** Point-in-polygon (ray casting) on the raw lon/lat outline. */
export function insideIndia(lon: number, lat: number): boolean {
  let inside = false;
  const n = INDIA_OUTLINE.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = INDIA_OUTLINE[i];
    const [xj, yj] = INDIA_OUTLINE[j];
    const hit = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Deterministic engraved place glyph positions inside the land, in unit-map coordinates. */
export function placeGlyphs(count: number, seed: number): Array<[number, number, number]> {
  const rnd = mulberry32(seed);
  const out: Array<[number, number, number]> = [];
  const { minLon, maxLon, minLat, maxLat } = INDIA_BOUNDS;
  const w = (maxLon - minLon) * 0.9;
  const h = maxLat - minLat;
  const scale = 1 / Math.max(w, h);
  const cx = (minLon + maxLon) / 2;
  const cy = (minLat + maxLat) / 2;
  let guard = 0;
  while (out.length < count && guard++ < count * 60) {
    const lon = minLon + 1.5 + rnd() * (maxLon - minLon - 3);
    const lat = minLat + 1.5 + rnd() * (maxLat - minLat - 3);
    if (!insideIndia(lon, lat)) continue;
    out.push([(lon - cx) * 0.9 * scale, (lat - cy) * scale, Math.floor(rnd() * 3)]);
  }
  return out;
}

/* ------------------------------------------------------------------ spline */

const SPLINE_MAX = 16;
const sx = new Float32Array(SPLINE_MAX);
const sy = new Float32Array(SPLINE_MAX);

/**
 * Appends a Catmull-Rom spline through (xs[i], ys[i]) i∈[0,n) to the current path, as cubic
 * béziers. `reverse` walks the points backwards (for the return edge of a ribbon).
 */
export function splineTo(ctx: CanvasRenderingContext2D, xs: Float32Array, ys: Float32Array, n: number, reverse = false, moveFirst = false): void {
  const count = Math.min(n, SPLINE_MAX);
  for (let i = 0; i < count; i++) {
    const k = reverse ? count - 1 - i : i;
    sx[i] = xs[k];
    sy[i] = ys[k];
  }
  if (moveFirst) ctx.moveTo(sx[0], sy[0]);
  for (let i = 0; i < count - 1; i++) {
    const p0x = sx[i > 0 ? i - 1 : 0];
    const p0y = sy[i > 0 ? i - 1 : 0];
    const p1x = sx[i];
    const p1y = sy[i];
    const p2x = sx[i + 1];
    const p2y = sy[i + 1];
    const p3x = sx[i + 2 < count ? i + 2 : count - 1];
    const p3y = sy[i + 2 < count ? i + 2 : count - 1];
    ctx.bezierCurveTo(
      p1x + (p2x - p0x) / 6,
      p1y + (p2y - p0y) / 6,
      p2x - (p3x - p1x) / 6,
      p2y - (p3y - p1y) / 6,
      p2x,
      p2y,
    );
  }
}

/* ------------------------------------------------------------------ lines */

const DASH_SHORT = [3, 3];
const DASH_CENTRE = [9, 3, 2, 3];
const NO_DASH: number[] = [];

export function dashShort(ctx: CanvasRenderingContext2D): void {
  ctx.setLineDash(DASH_SHORT);
}
export function dashCentre(ctx: CanvasRenderingContext2D): void {
  ctx.setLineDash(DASH_CENTRE);
}
export function noDash(ctx: CanvasRenderingContext2D): void {
  ctx.setLineDash(NO_DASH);
}

/** A dimension line with perpendicular end ticks, added to the current path. */
export function dimLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, tick: number): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * tick;
  const py = (dx / len) * tick;
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.moveTo(x0 - px, y0 - py);
  ctx.lineTo(x0 + px, y0 + py);
  ctx.moveTo(x1 - px, y1 - py);
  ctx.lineTo(x1 + px, y1 + py);
}

/* ------------------------------------------------------------------ text */

export type Fonts = { display: string; mono: string; body: string };

const FALLBACK: Fonts = {
  display: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  mono: "'IBM Plex Mono', ui-monospace, Menlo, monospace",
  body: "'DM Sans', system-ui, sans-serif",
};

/**
 * Reads the site's font stacks once. `--font-display` on the root resolves to next/font's generated
 * family names; if the variable is unresolved (or self-referential) a probe element settles it.
 */
export function readFonts(): Fonts {
  if (typeof document === "undefined") return FALLBACK;
  const root = getComputedStyle(document.documentElement);
  const read = (name: string, fb: string) => {
    const raw = root.getPropertyValue(name).trim();
    if (raw && !raw.includes("var(")) return raw;
    const probe = document.createElement("span");
    probe.style.fontFamily = `var(${name})`;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.textContent = "a";
    document.body.appendChild(probe);
    const fam = getComputedStyle(probe).fontFamily;
    probe.remove();
    return fam && !fam.includes("var(") ? fam : fb;
  };
  return {
    display: read("--font-display", FALLBACK.display),
    mono: read("--font-mono", FALLBACK.mono),
    body: read("--font-body", FALLBACK.body),
  };
}

export function setFont(ctx: CanvasRenderingContext2D, family: string, size: number, weight = 500, italic = false): void {
  ctx.font = `${italic ? "italic " : ""}${weight} ${Math.max(1, size).toFixed(2)}px ${family}`;
}

const widthCache = new Map<string, Float32Array>();

function glyphWidths(ctx: CanvasRenderingContext2D, text: string): Float32Array {
  const key = ctx.font + "|" + text;
  let w = widthCache.get(key);
  if (!w) {
    w = new Float32Array(text.length);
    for (let i = 0; i < text.length; i++) w[i] = ctx.measureText(text[i]).width;
    widthCache.set(key, w);
  }
  return w;
}

/** Letter-spaced text (tracking in px). Uses the native letterSpacing when the browser has it. */
export function tracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number, align: "left" | "center" | "right" = "left"): void {
  const widths = glyphWidths(ctx, text);
  let total = 0;
  for (let i = 0; i < widths.length; i++) total += widths[i] + tracking;
  total -= tracking;
  let cx = align === "left" ? x : align === "center" ? x - total / 2 : x - total;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], cx, y);
    cx += widths[i] + tracking;
  }
  ctx.textAlign = prevAlign;
}

/**
 * Text on a circle around the current origin. `centreAngle` is where the middle of the string sits
 * (−π/2 = top). Glyph tops point outward; reads clockwise. `fullCircle` spreads the glyphs evenly.
 */
export function arcText(ctx: CanvasRenderingContext2D, text: string, radius: number, centreAngle: number, tracking: number, fullCircle = false): void {
  const widths = glyphWidths(ctx, text);
  let natural = 0;
  for (let i = 0; i < widths.length; i++) natural += widths[i];
  const gap = fullCircle ? (TAU * radius - natural) / text.length : tracking;
  const total = natural + gap * text.length;
  let cursor = centreAngle - total / 2 / radius;
  const prevAlign = ctx.textAlign;
  const prevBase = ctx.textBaseline;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < text.length; i++) {
    const w = widths[i] + gap;
    const a = cursor + w / 2 / radius;
    if (text[i] !== " ") {
      ctx.save();
      ctx.rotate(a + HALF_PI);
      ctx.fillText(text[i], 0, -radius);
      ctx.restore();
    }
    cursor += w / radius;
  }
  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBase;
}

/** Engraved lettering: a 1px light offset under a dark face. */
export function engraved(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, dark: string, light: string, tracking = 0): void {
  ctx.fillStyle = light;
  tracked(ctx, text, x, y + 1, tracking, "center");
  ctx.fillStyle = dark;
  tracked(ctx, text, x, y, tracking, "center");
}

/** Drops the glyph-width cache (call once the web fonts finish loading: widths measured on the fallback face are stale). */
export function clearTextCache(): void {
  widthCache.clear();
}

/* ------------------------------------------------------------------ offscreen layers */

export type Layer = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number };

/**
 * An offscreen canvas in CSS pixels at the given device pixel ratio. Draw into `layer.ctx` in CSS
 * units; blit with `ctx.drawImage(layer.canvas, x, y, layer.w, layer.h)`.
 */
export function makeLayer(w: number, h: number, dpr: number): Layer | null {
  const canvas = document.createElement("canvas");
  const cw = Math.max(1, Math.round(w * dpr));
  const ch = Math.max(1, Math.round(h * dpr));
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx, w: cw / dpr, h: ch / dpr };
}

/** Rounded rectangle added to the current path (Safari < 16 has no ctx.roundRect). */
export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arc(x + w - rr, y + rr, rr, -HALF_PI, 0);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arc(x + w - rr, y + h - rr, rr, 0, HALF_PI);
  ctx.lineTo(x + rr, y + h);
  ctx.arc(x + rr, y + h - rr, rr, HALF_PI, Math.PI);
  ctx.lineTo(x, y + rr);
  ctx.arc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5);
  ctx.closePath();
}

/** Regular polygon (radius R, `n` sides, first vertex at `phase`) added to the current path. */
export function polygon(ctx: CanvasRenderingContext2D, n: number, R: number, phase = 0): void {
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    if (i === 0) ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
    else ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
  }
  ctx.closePath();
}
