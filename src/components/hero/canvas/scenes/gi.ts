/**
 * Scene 7 — GEOGRAPHICAL INDICATION (0.78 → 0.89, gone by ~0.905).
 *
 * The specimen wall becomes a tactile chart of India: a dark parchment sheet with a faint graticule,
 * the land as a lit plate with a visible thickness, topographic contours (shrunk, rounded and
 * noise-distorted copies of the outline, clipped to the land), engraved place glyphs, and one
 * conceptual marker that lights up with a pulsing halo. The camera tilts down over it: a pseudo-3D
 * tilt by vertical scale (1 → 0.75) with a small zoom and drop. The sheet and the land are
 * pre-rendered once per size; only the extrusion and the marker are drawn live.
 * Also owns the map's pose so the trade-mark ring can land on it as a compass rose.
 */

import { PALETTE, ramp, window01 } from "../../story";
import { CONCEPTUAL_MARKER, indiaUnitPolygon, toUnit } from "../../india-outline";
import { indiaPath, lerp, makeLayer, mixHex, placeGlyphs, rgba, type Layer, type Stops } from "../helpers";
import type { Frame, Layout, Pt } from "../layout";
import { drawMarker } from "./motifs";

/** Where the compass rose lands, in unit-map coordinates (x east, y north): the sheet's north-west. */
const COMPASS_LOCAL = { x: -0.4, y: 0.41 };
const SHEET_EXT = 0.66;

const PAPER: Stops = [
  [0, mixHex(PALETTE.ink, PALETTE.parchment, 0.17)],
  [1, mixHex(PALETTE.ink, PALETTE.parchment, 0.08)],
];
const LAND_HI = mixHex(PALETTE.charcoal, PALETTE.parchment, 0.66);
const LAND_LO = mixHex(PALETTE.charcoal, PALETTE.parchment, 0.34);
const LAND_SIDE = mixHex(PALETTE.ink, PALETTE.bronzeDim, 0.55);
const GRID_SHEET = rgba(PALETTE.bronze, 0.16);
const GRID_LAND = rgba(PALETTE.ink, 0.16);
const CONTOUR = rgba(PALETTE.bronzeDim, 0.62);
const COAST = rgba(PALETTE.bone, 0.8);
const GLYPH = rgba(PALETTE.bronzeDim, 0.95);

type Poly = Array<[number, number]>;

let layoutKey = "";
let M = 0;
let sheet: Layer | null = null;
let land: Layer | null = null;
let landPath: Path2D | null = null;
let markerX = 0;
let markerY = 0;

/** Vertical scale of the map as the camera tilts down over it. */
export function mapTilt(p: number): number {
  return lerp(1, 0.75, ramp(p, 0.78, 0.86));
}

/** The map grows a little as the camera comes down. */
export function mapZoom(p: number): number {
  return lerp(1, 1.1, ramp(p, 0.78, 0.86));
}

/** Screen centre of the map (on landscape it sits opposite the caption, like the other acts). */
export function mapCentre(L: Layout, p: number, out: Pt): void {
  out.x = L.w * 0.5 - L.focusShift;
  out.y = L.mapC.y + ramp(p, 0.78, 0.86) * 0.035 * L.h;
}

/** Screen point where the trade-mark ring lands as a compass rose. */
export function compassCorner(L: Layout, p: number, out: Pt): void {
  mapCentre(L, p, out);
  const z = mapZoom(p);
  out.x += COMPASS_LOCAL.x * L.mapM * z;
  out.y += -COMPASS_LOCAL.y * L.mapM * z * mapTilt(p);
}

function inside(poly: Poly, x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function resample(poly: Poly, n: number): Poly {
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    lens.push(l);
    total += l;
  }
  const out: Poly = [];
  const step = total / n;
  let seg = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const target = k * step;
    while (seg < poly.length - 1 && acc + lens[seg] < target) {
      acc += lens[seg];
      seg++;
    }
    const a = poly[seg];
    const b = poly[(seg + 1) % poly.length];
    const t = lens[seg] > 0 ? (target - acc) / lens[seg] : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

function smoothRing(ring: Poly, passes: number): Poly {
  let r = ring;
  for (let p = 0; p < passes; p++) {
    const n = r.length;
    const prev = r;
    r = prev.map((pt, i) => {
      const a = prev[(i + n - 1) % n];
      const b = prev[(i + 1) % n];
      return [(a[0] + pt[0] * 2 + b[0]) / 4, (a[1] + pt[1] * 2 + b[1]) / 4];
    });
  }
  return r;
}

/** Topographic contours: shrunk, rounded, noise-distorted rings clipped to the land (unit map × S). */
function contours(unit: Poly, S: number): Path2D {
  const src = resample(unit, 240);
  let cx = 0;
  let cy = 0;
  for (const [x, y] of src) {
    cx += x;
    cy += y;
  }
  cx /= src.length;
  cy /= src.length;
  let meanR = 0;
  for (const [x, y] of src) meanR += Math.hypot(x - cx, y - cy);
  meanR /= src.length;
  const path = new Path2D();
  const levels = 8;
  for (let k = 1; k <= levels; k++) {
    const s = 1 - k * 0.105;
    const blend = 0.62 * (k / levels);
    const amp = 0.035 * (1 - 0.55 * (k / levels));
    let ring: Poly = src.map(([x, y]) => {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      const th = Math.atan2(dy, dx);
      let rx = cx + dx * s;
      let ry = cy + dy * s;
      const cr = meanR * s;
      rx += (cx + ux * cr - rx) * blend;
      ry += (cy + uy * cr - ry) * blend;
      const n = amp * (Math.sin(th * 5 + k * 1.9) + 0.55 * Math.sin(th * 11 - k * 0.7) + 0.35 * Math.sin(th * 19 + k * 2.3));
      return [rx + ux * n, ry + uy * n];
    });
    ring = smoothRing(ring, 2 + k);
    let pen = false;
    for (let i = 0; i <= ring.length; i++) {
      const a = ring[i % ring.length];
      const b = ring[(i + 1) % ring.length];
      if (inside(unit, a[0], a[1]) && inside(unit, b[0], b[1])) {
        if (!pen) path.moveTo(a[0] * S, -a[1] * S);
        path.lineTo(b[0] * S, -b[1] * S);
        pen = true;
      } else pen = false;
    }
  }
  return path;
}

export function resizeMap(L: Layout, dpr: number): void {
  if (L.key === layoutKey && land) return;
  layoutKey = L.key;
  M = L.mapM;
  const unit = indiaUnitPolygon();
  landPath = indiaPath(M);
  const mk = toUnit(CONCEPTUAL_MARKER);
  markerX = mk[0] * M;
  markerY = -mk[1] * M;
  const size = Math.ceil(M * 1.42);
  const half = size / 2;
  const ldpr = Math.min(dpr, 2);

  // the chart sheet with its graticule, edges dissolving into the dark
  sheet = makeLayer(size, size, ldpr);
  if (sheet) {
    const c = sheet.ctx;
    c.translate(half, half);
    const ext = SHEET_EXT * M;
    const g = c.createLinearGradient(-ext, -ext, ext, ext);
    for (const [o, col] of PAPER) g.addColorStop(o, col);
    c.fillStyle = g;
    c.fillRect(-ext, -ext, ext * 2, ext * 2);
    c.lineWidth = 1;
    c.strokeStyle = GRID_SHEET;
    c.beginPath();
    const step = 0.125 * M;
    for (let x = -ext; x <= ext + 1e-6; x += step) {
      c.moveTo(x, -ext);
      c.lineTo(x, ext);
      c.moveTo(-ext, x);
      c.lineTo(ext, x);
    }
    c.stroke();
    c.globalCompositeOperation = "destination-in";
    const edge = c.createRadialGradient(0, -0.05 * M, 0, 0, -0.05 * M, ext * 1.25);
    edge.addColorStop(0, "rgba(0,0,0,1)");
    edge.addColorStop(0.55, "rgba(0,0,0,0.92)");
    edge.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = edge;
    c.fillRect(-half, -half, size, size);
    c.globalCompositeOperation = "source-over";
  }

  // the land: lit plate, contours, a graticule clipped to it, engraved place glyphs, the coast
  land = makeLayer(size, size, ldpr);
  if (land) {
    const c = land.ctx;
    c.translate(half, half);
    const g = c.createRadialGradient(-0.25 * M, -0.3 * M, 0, -0.25 * M, -0.3 * M, 0.95 * M);
    g.addColorStop(0, LAND_HI);
    g.addColorStop(1, LAND_LO);
    c.fillStyle = g;
    c.fill(landPath);
    c.save();
    c.clip(landPath);
    c.lineWidth = 1;
    c.strokeStyle = GRID_LAND;
    c.beginPath();
    const ext = SHEET_EXT * M;
    const step = 0.125 * M;
    for (let x = -ext; x <= ext + 1e-6; x += step) {
      c.moveTo(x, -ext);
      c.lineTo(x, ext);
      c.moveTo(-ext, x);
      c.lineTo(ext, x);
    }
    c.stroke();
    c.strokeStyle = CONTOUR;
    c.lineWidth = Math.max(0.8, M * 0.003);
    c.stroke(contours(unit, M));
    c.restore();
    // engraved place glyphs (conceptual positions; none near the highlight)
    c.strokeStyle = GLYPH;
    c.lineWidth = 1;
    c.beginPath();
    const r = M * 0.014;
    for (const [ux, uy] of placeGlyphs(9, 1961)) {
      const x = ux * M;
      const y = -uy * M;
      if (Math.hypot(x - markerX, y - markerY) < M * 0.12) continue;
      c.moveTo(x + r, y);
      c.arc(x, y, r, 0, Math.PI * 2);
      c.moveTo(x - r * 2.2, y);
      c.lineTo(x - r * 1.3, y);
      c.moveTo(x + r * 1.3, y);
      c.lineTo(x + r * 2.2, y);
      c.moveTo(x, y - r * 2.2);
      c.lineTo(x, y - r * 1.3);
      c.moveTo(x, y + r * 1.3);
      c.lineTo(x, y + r * 2.2);
    }
    c.stroke();
    c.lineWidth = Math.max(1, M * 0.004);
    c.strokeStyle = COAST;
    c.stroke(landPath);
  }
}

const centre: Pt = { x: 0, y: 0 };

export function drawMap(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { p, t, gfx, L } = f;
  if (p < 0.77 || p > 0.905 || !sheet || !land || !landPath) return;
  const vis = window01(p, 0.77, 0.815, 0.878, 0.9);
  if (vis <= 0.003) return;
  const sy = mapTilt(p);
  const z = mapZoom(p);
  mapCentre(L, p, centre);
  const prev = ctx.globalAlpha;
  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.scale(z, z * sy);
  const half = sheet.w / 2;
  ctx.globalAlpha = prev * vis;
  ctx.drawImage(sheet.canvas, -half, -half, sheet.w, sheet.h);
  // the land's thickness appears as the view tilts
  const thick = (M * 0.028 * (1 - sy)) / 0.25;
  if (thick > 0.3) {
    ctx.fillStyle = LAND_SIDE;
    ctx.translate(0, thick / sy);
    ctx.fill(landPath);
    ctx.translate(0, -thick / sy);
  }
  ctx.drawImage(land.canvas, -half, -half, land.w, land.h);
  ctx.restore();

  // the conceptual marker: a slow pulse, an expanding halo, a thin line rising off the paper
  const lit = window01(p, 0.805, 0.84, 0.878, 0.895);
  ctx.globalAlpha = prev * vis;
  drawMarker(ctx, gfx, centre.x + markerX * z, centre.y + markerY * z * sy, M * 0.09, t, lit);
  ctx.globalAlpha = prev;
}
