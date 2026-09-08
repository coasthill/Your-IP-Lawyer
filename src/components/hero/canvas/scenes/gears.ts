/**
 * Scene 4 — THE PATENT MACHINE (0.42 → 0.56, lingering under the plate until ~0.64).
 *
 * Eight gears burst out of the gavel's impact point, settle into a train and mesh correctly: every
 * gear shares one module, each child sits at exactly r₁ + r₂ from its parent along a centre line,
 * and `meshedRotation` phases its teeth so a parent tip always meets a child gap. Rotation is a pure
 * function of progress (scroll turns the machine, stopping stops it) plus a bounded sinusoidal idle
 * breath — no accumulated state, so scrolling back replays exactly. Brushed-steel bodies (concentric
 * turning marks + a fixed conic anisotropy under the key light), bronze rims and hub bosses,
 * "PATENT" engraved on the big gear with a 1px light offset. Behind: a parchment blueprint layer
 * (pre-rendered once per size) drifting at a slower parallax.
 * At 0.55 the centres slide onto one axis and the train locks into a rosette for scene 5.
 */

import { PALETTE, ramp, smoothstep, window01, clamp01 } from "../../story";
import {
  BRONZE_RING,
  BRUSH_CONIC,
  HALF_PI,
  TAU,
  arcText,
  dashCentre,
  dimLine,
  easeOutBack,
  easeOutCubic,
  gearPath,
  lerp,
  makeLayer,
  meshedRotation,
  mixHex,
  noDash,
  rgba,
  setFont,
  steelStops,
  type Fonts,
  type Gfx,
  type Layer,
  type Stops,
} from "../helpers";
import type { Frame, Layout } from "../layout";

/** Full turns of the big gear across the scene. */
const TURNS = 1.6;
/** Pitch diameter per tooth in gear units: the 36-tooth gear has R = 1.3 · gearU. */
const MODULE = 2.6 / 36;

type Node = { teeth: number; parent: number; angle: number; spokes: number };

/** The train (canvas angles, y down): each gear meshes with `parent` at `angle` from the parent's centre. */
const TRAIN: readonly Node[] = [
  { teeth: 36, parent: -1, angle: 0, spokes: 6 },
  { teeth: 20, parent: 0, angle: -0.55, spokes: 5 },
  { teeth: 10, parent: 0, angle: 0.45, spokes: 0 },
  { teeth: 18, parent: 2, angle: 0.1, spokes: 5 },
  { teeth: 14, parent: 3, angle: -0.95, spokes: 4 },
  { teeth: 8, parent: 1, angle: -0.95, spokes: 0 },
  { teeth: 12, parent: 5, angle: -0.2, spokes: 0 },
  { teeth: 10, parent: 0, angle: -1.45, spokes: 0 },
];

type Gear = {
  teeth: number;
  r: number;
  /** centre relative to the big gear's centre, px */
  x: number;
  y: number;
  parent: number;
  angle: number;
  path: Path2D;
  cuts: Path2D | null;
  rosScale: number;
  steelKey: string;
  rimKey: string;
  bossKey: string;
  brushKey: string;
};

const STEEL: Stops = steelStops();
const BOSS: Stops = [
  [0, PALETTE.bronze2],
  [0.55, PALETTE.bronze],
  [1, PALETTE.bronzeDim],
];
const PIN: Stops = [
  [0, "#9a9ba2"],
  [0.7, PALETTE.steel],
  [1, "#2a2b30"],
];
const SHADOW = rgba(PALETTE.ink, 0.55);
const CUT = rgba(PALETTE.ink, 0.84);
const EDGE_DARK = rgba(PALETTE.ink, 0.7);
const EDGE_LIT = PALETTE.keyLight;
const TEXT_DARK = rgba("#121214", 0.92);
const TEXT_LIGHT = rgba(PALETTE.bronze2, 0.7);
const BP_LINE = rgba(PALETTE.bronze, 0.62);
const BP_LINE_FAINT = rgba(PALETTE.bronze, 0.34);
const BP_TEXT = rgba(PALETTE.bronze, 0.8);
const BP_PAPER_A = mixHex(PALETTE.ink, PALETTE.parchment, 0.2);
const BP_PAPER_B = mixHex(PALETTE.ink, PALETTE.parchment, 0.09);

const gears: Gear[] = [];
const order: number[] = [];
const rot = new Float64Array(TRAIN.length);
let layoutKey = "";
let blueprint: Layer | null = null;
let fontPatent = "";
let bpX0 = 0;
let bpY0 = 0;

/** Progress that decelerates to a halt between `a` and `b` (derivative 1 → 0) and then stays put. */
function haltingProgress(p: number, a: number, b: number): number {
  if (p <= a) return p;
  const u = Math.min(1, (p - a) / (b - a));
  return a + (b - a) * (u - u * u * 0.5);
}

/** Lightening cut-outs between r0 and r1 with `n` spokes left standing. */
function cutoutsPath(n: number, r0: number, r1: number): Path2D | null {
  if (n <= 0 || r1 <= r0) return null;
  const path = new Path2D();
  const gap = 0.16;
  for (let s = 0; s < n; s++) {
    const a0 = (s / n) * TAU + gap;
    const a1 = ((s + 1) / n) * TAU - gap;
    path.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
    path.arc(0, 0, r0, a0, a1, false);
    path.arc(0, 0, r1, a1, a0, true);
    path.closePath();
  }
  return path;
}

export function resizeGears(L: Layout, fonts: Fonts, dpr: number): void {
  if (L.key === layoutKey && gears.length) return;
  layoutKey = L.key;
  gears.length = 0;
  order.length = 0;
  const U = L.gearU;
  const rosR = L.plateR * 0.86;
  for (let i = 0; i < TRAIN.length; i++) {
    const n = TRAIN[i];
    const r = (n.teeth * MODULE * U) / 2;
    let x = 0;
    let y = 0;
    if (n.parent >= 0) {
      const par = gears[n.parent];
      const d = par.r + r;
      x = par.x + Math.cos(n.angle) * d;
      y = par.y + Math.sin(n.angle) * d;
    }
    const hole = r * 0.11;
    const big = i === 0;
    gears.push({
      teeth: n.teeth,
      r,
      x,
      y,
      parent: n.parent,
      angle: n.angle,
      path: gearPath(n.teeth, r, hole, 0.18),
      cuts: cutoutsPath(n.spokes, r * 0.31, big ? r * 0.62 : r * 0.68),
      rosScale: Math.min(1, rosR / r),
      steelKey: `gr-steel-${i}`,
      rimKey: `gr-rim-${i}`,
      bossKey: `gr-boss-${i}`,
      brushKey: `gr-brush-${i}`,
    });
    order.push(i);
  }
  order.sort((a, b) => gears[b].r - gears[a].r);
  fontPatent = `600 ${(gears[0].r * 0.125).toFixed(1)}px ${fonts.display}`;
  blueprint = buildBlueprint(L, fonts, dpr);
}

/* ------------------------------------------------------------------ blueprint */

function buildBlueprint(L: Layout, fonts: Fonts, dpr: number): Layer | null {
  const W = L.w * 1.25;
  const Hl = L.portrait ? L.h * 0.72 : L.h * 1.08;
  bpX0 = -0.125 * L.w;
  bpY0 = L.portrait ? -0.02 * L.h : -0.06 * L.h;
  const layer = makeLayer(W, Hl, Math.min(dpr, 1.5));
  if (!layer) return null;
  const c = layer.ctx;
  // paper
  const paper = c.createLinearGradient(0, 0, W, Hl);
  paper.addColorStop(0, BP_PAPER_A);
  paper.addColorStop(1, BP_PAPER_B);
  c.fillStyle = paper;
  c.fillRect(0, 0, W, Hl);

  const R = Math.min(0.19 * W, 0.24 * Hl);
  const gx = 0.3 * W;
  const gy = L.portrait ? 0.4 * Hl : 0.47 * Hl;
  const tick = R * 0.05;
  c.lineWidth = 1;
  c.strokeStyle = BP_LINE;

  // the gear drawing: outline, spokes, pitch / root / tip / construction circles
  c.save();
  c.translate(gx, gy);
  c.stroke(gearPath(24, R, R * 0.15, 0.18));
  const cuts = cutoutsPath(5, R * 0.33, R * 0.68);
  if (cuts) c.stroke(cuts);
  c.strokeStyle = BP_LINE_FAINT;
  dashCentre(c);
  c.beginPath();
  for (const k of [1, 0.82, 1.09, 1.62]) {
    c.moveTo(k * R, 0);
    c.arc(0, 0, k * R, 0, TAU);
  }
  c.moveTo(-1.95 * R, 0);
  c.lineTo(1.95 * R, 0);
  c.moveTo(0, -1.95 * R);
  c.lineTo(0, 1.95 * R);
  c.stroke();
  noDash(c);
  // dimensions: across (below), height (right), a radius
  c.strokeStyle = BP_LINE;
  c.beginPath();
  dimLine(c, -1.09 * R, 1.5 * R, 1.09 * R, 1.5 * R, tick);
  c.moveTo(-1.09 * R, 1.15 * R);
  c.lineTo(-1.09 * R, 1.6 * R);
  c.moveTo(1.09 * R, 1.15 * R);
  c.lineTo(1.09 * R, 1.6 * R);
  dimLine(c, 1.5 * R, -1.09 * R, 1.5 * R, 1.09 * R, tick);
  c.moveTo(1.15 * R, -1.09 * R);
  c.lineTo(1.6 * R, -1.09 * R);
  c.moveTo(1.15 * R, 1.09 * R);
  c.lineTo(1.6 * R, 1.09 * R);
  const ra = -0.62;
  c.moveTo(0, 0);
  c.lineTo(Math.cos(ra) * R, Math.sin(ra) * R);
  c.stroke();
  c.restore();

  // section A-A: a shaft with a keyway, hatched (lower right)
  const sx = 0.56 * W;
  const sy = L.portrait ? 0.6 * Hl : 0.66 * Hl;
  const sw = 0.36 * W;
  const sh = L.portrait ? 0.14 * Hl : 0.2 * Hl;
  c.strokeStyle = BP_LINE;
  c.strokeRect(sx, sy, sw, sh);
  c.beginPath();
  c.moveTo(sx, sy + sh * 0.5);
  c.lineTo(sx + sw, sy + sh * 0.5);
  c.rect(sx + sw * 0.32, sy + sh * 0.5 - sh * 0.22, sw * 0.12, sh * 0.22);
  c.stroke();
  hatch(c, sx, sy + sh * 0.5, sw, sh * 0.5, Math.max(6, R * 0.09));
  c.strokeStyle = BP_LINE_FAINT;
  dashCentre(c);
  c.beginPath();
  c.moveTo(sx - sw * 0.08, sy + sh * 0.5);
  c.lineTo(sx + sw * 1.08, sy + sh * 0.5);
  c.stroke();
  noDash(c);
  c.strokeStyle = BP_LINE;
  c.beginPath();
  dimLine(c, sx, sy - sh * 0.25, sx + sw, sy - sh * 0.25, tick);
  c.stroke();

  // a bushing in section (upper right)
  const bx = 0.6 * W;
  const by = L.portrait ? 0.16 * Hl : 0.14 * Hl;
  const bw = 0.3 * W;
  const bh = L.portrait ? 0.08 * Hl : 0.13 * Hl;
  c.strokeRect(bx, by, bw, bh);
  c.strokeRect(bx + bw * 0.17, by + bh * 0.2, bw * 0.66, bh * 0.6);
  hatch(c, bx, by, bw * 0.17, bh, Math.max(5, R * 0.07));
  hatch(c, bx + bw * 0.83, by, bw * 0.17, bh, Math.max(5, R * 0.07));
  c.strokeStyle = BP_LINE_FAINT;
  dashCentre(c);
  c.beginPath();
  c.moveTo(bx - bw * 0.1, by + bh * 0.5);
  c.lineTo(bx + bw * 1.1, by + bh * 0.5);
  c.stroke();
  noDash(c);

  // title block (bottom right) and registration crosses
  const tx = 0.58 * W;
  const ty = L.portrait ? 0.84 * Hl : 0.9 * Hl;
  const tw = 0.36 * W;
  const th = L.portrait ? 0.075 * Hl : 0.07 * Hl;
  c.strokeStyle = BP_LINE;
  c.strokeRect(tx, ty, tw, th);
  c.beginPath();
  c.moveTo(tx, ty + th * 0.5);
  c.lineTo(tx + tw, ty + th * 0.5);
  c.moveTo(tx + tw * 0.55, ty);
  c.lineTo(tx + tw * 0.55, ty + th);
  for (const [cx, cy] of [
    [0.04 * W, 0.04 * Hl],
    [0.96 * W, 0.04 * Hl],
    [0.04 * W, 0.96 * Hl],
  ]) {
    c.moveTo(cx - 6, cy);
    c.lineTo(cx + 6, cy);
    c.moveTo(cx, cy - 6);
    c.lineTo(cx, cy + 6);
  }
  c.stroke();

  // labels
  const fs = Math.max(9, Math.min(13, W * 0.012));
  setFont(c, fonts.mono, fs, 400);
  c.fillStyle = BP_TEXT;
  c.textBaseline = "alphabetic";
  c.textAlign = "left";
  c.fillText("FIG. 1", gx - 1.6 * R, gy - 1.78 * R);
  c.fillText("DIA. 4.36", gx - 0.35 * R, gy + 1.5 * R - fs * 0.5);
  c.fillText("SECTION A-A", sx, sy - sh * 0.25 - fs * 0.5);
  c.fillText("FIG. 2", bx, by - fs * 0.5);
  c.fillText("SHEET 1 OF 1", tx + fs * 0.6, ty + th * 0.5 - fs * 0.4);
  c.fillText("NO. 0042", tx + tw * 0.55 + fs * 0.6, ty + th * 0.5 - fs * 0.4);
  c.fillText("SCALE 2 : 1", tx + fs * 0.6, ty + th - fs * 0.4);

  // soften the sheet's edges into the dark
  c.globalCompositeOperation = "destination-in";
  const edge = c.createRadialGradient(W * 0.45, Hl * 0.42, 0, W * 0.45, Hl * 0.42, Math.max(W, Hl) * 0.62);
  edge.addColorStop(0, "rgba(0,0,0,1)");
  edge.addColorStop(0.62, "rgba(0,0,0,0.9)");
  edge.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = edge;
  c.fillRect(0, 0, W, Hl);
  c.globalCompositeOperation = "source-over";
  return layer;
}

/** 45° section hatching clipped to a rectangle. */
function hatch(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, step: number): void {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.beginPath();
  for (let k = -h; k < w + h; k += step) {
    c.moveTo(x + k, y + h);
    c.lineTo(x + k + h, y);
  }
  c.stroke();
  c.restore();
}

/* ------------------------------------------------------------------ frame */

/** Alpha of the machine act's parchment blueprint. */
function blueprintAlpha(p: number): number {
  return window01(p, 0.415, 0.5, 0.565, 0.615);
}

export function drawGears(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { p, t, gfx, L, focus, w, h } = f;
  if (p < 0.4 || p > 0.65 || gears.length === 0) return;
  const prev = ctx.globalAlpha;

  // the blueprint, parallaxing slower than the machine
  const bp = blueprintAlpha(p);
  if (blueprint && bp > 0.003) {
    const lp = clamp01((p - 0.42) / 0.14);
    ctx.globalAlpha = prev * bp * 0.92;
    ctx.drawImage(blueprint.canvas, bpX0 - lp * 0.06 * w, bpY0 + lp * 0.025 * h, blueprint.w, blueprint.h);
  }

  const fade = 1 - ramp(p, 0.61, 0.65);
  if (fade <= 0.003) {
    ctx.globalAlpha = prev;
    return;
  }

  // rotation: scroll-driven, decelerating to a halt as the train locks into the rosette
  const lock = ramp(p, 0.555, 0.6);
  const q = haltingProgress(p, 0.555, 0.6);
  rot[0] = -Math.max(0, (q - 0.42) / 0.14) * TURNS * TAU - Math.sin(t * 0.35) * 0.02 * (1 - lock);
  for (let i = 1; i < gears.length; i++) {
    const g = gears[i];
    rot[i] = meshedRotation(rot[g.parent], gears[g.parent].teeth, g.teeth, g.angle);
  }

  const ox = focus.x + L.gearAnchor.x * L.gearU;
  const oy = focus.y + L.gearAnchor.y * L.gearU;
  const sx = f.strikeScreen.x;
  const sy = f.strikeScreen.y;

  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const g = gears[i];
    const u = clamp01((p - (0.405 + i * 0.006)) / 0.055);
    if (u <= 0) continue;
    const pe = easeOutBack(u, 0.7);
    const sc = easeOutCubic(u);
    const c = smoothstep((p - (0.55 + i * 0.003)) / 0.04);
    let x = lerp(sx, ox + g.x, pe);
    let y = lerp(sy, oy + g.y, pe);
    x = lerp(x, focus.x, c);
    y = lerp(y, focus.y, c);
    const s = sc * lerp(1, g.rosScale, c);
    if (s <= 0.01) continue;
    drawGear(ctx, gfx, g, i, x, y, s, rot[i], prev * fade * Math.min(1, u * 1.6));
  }
  ctx.globalAlpha = prev;
}

function drawGear(ctx: CanvasRenderingContext2D, gfx: Gfx, g: Gear, i: number, x: number, y: number, s: number, rz: number, alpha: number): void {
  const r = g.r;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;

  // drop shadow onto whatever lies beneath
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.arc(r * 0.05, r * 0.09, r * 1.07, 0, TAU);
  ctx.fill();

  // body: concentric turning marks
  ctx.save();
  ctx.rotate(rz);
  ctx.fillStyle = gfx.radial(ctx, g.steelKey, 0, 0, 0, r * 1.1, STEEL);
  ctx.fill(g.path, "evenodd");
  ctx.restore();

  // fixed anisotropic sheen (the light does not turn with the wheel)
  const brush = gfx.conicGradient(ctx, g.brushKey, 0.6, 0, 0, BRUSH_CONIC);
  if (brush) {
    ctx.save();
    ctx.rotate(rz);
    ctx.clip(g.path, "evenodd");
    ctx.rotate(-rz);
    ctx.fillStyle = brush;
    ctx.fillRect(-r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
    ctx.restore();
  }

  ctx.save();
  ctx.rotate(rz);
  if (g.cuts) {
    ctx.fillStyle = CUT;
    ctx.fill(g.cuts);
    ctx.lineWidth = 1;
    ctx.strokeStyle = EDGE_DARK;
    ctx.stroke(g.cuts);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = EDGE_DARK;
  ctx.stroke(g.path);
  if (i === 0) {
    ctx.font = fontPatent;
    ctx.save();
    ctx.translate(0.8, 0.8);
    ctx.fillStyle = TEXT_LIGHT;
    arcText(ctx, "PATENT", r * 0.755, -HALF_PI, r * 0.03);
    ctx.restore();
    ctx.fillStyle = TEXT_DARK;
    arcText(ctx, "PATENT", r * 0.755, -HALF_PI, r * 0.03);
    ctx.fillStyle = TEXT_LIGHT;
    ctx.save();
    ctx.translate(0.8, 0.8);
    arcText(ctx, "No. 0042", r * 0.755, HALF_PI, r * 0.03);
    ctx.restore();
    ctx.fillStyle = TEXT_DARK;
    arcText(ctx, "No. 0042", r * 0.755, HALF_PI, r * 0.03);
  }
  ctx.restore();

  // lit tooth edges toward the key light
  ctx.save();
  ctx.translate(-0.7, -0.7);
  ctx.rotate(rz);
  ctx.globalAlpha = alpha * 0.2;
  ctx.lineWidth = 1;
  ctx.strokeStyle = EDGE_LIT;
  ctx.stroke(g.path);
  ctx.restore();

  // bronze rim, hub boss, steel pin, hole (all rotationally symmetric: drawn unrotated)
  ctx.lineWidth = Math.max(1.2, r * 0.035);
  ctx.strokeStyle = gfx.linear(ctx, g.rimKey, -r, -r, r, r, BRONZE_RING);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.855, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = gfx.radial(ctx, g.bossKey, -r * 0.06, -r * 0.08, 0, r * 0.28, BOSS);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.24, 0, TAU);
  ctx.fill();
  ctx.fillStyle = gfx.radial(ctx, g.bossKey + "p", -r * 0.02, -r * 0.03, 0, r * 0.1, PIN);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.085, 0, TAU);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.03, 0, TAU);
  ctx.fill();
  ctx.restore();
}
