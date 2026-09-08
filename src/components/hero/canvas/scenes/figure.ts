/**
 * Scenes 1–3 — THE ROOM AND THE ADVOCATE (0.00 → 0.44).
 *
 * A tenebrist figure: head and shoulders as near-black silhouette, the gown as a base silhouette
 * plus seven layered bezier "fabric ribbons" whose control points breathe with noise, lift and
 * swirl through scene 2 (window01 0.10→0.18 … 0.28→0.34) and stir with scroll velocity. Light is one
 * warm key from the upper-left (rim highlights on the left edges of the folds, a pool on the floor)
 * with a faint cool rim from the right. The white bands at the throat are the brightest element.
 * Dust motes drift in the key light. Everything is deterministic in progress except the slow breath.
 */

import { PALETTE, ramp, window01 } from "../../story";
import { bell, fbm, mulberry32, rgba, splineTo, vnoise } from "../helpers";
import { camToScreen, type Frame, type Layout } from "../layout";

const RIBBONS = 7;
const ROWS = 8;
const MOTES = 120;

type Ribbon = {
  /** horizontal position across the gown, −1 (viewer's left edge) … 1 */
  u: number;
  /** width as a fraction of the gown's half-width */
  wdt: number;
  seed: number;
  xl: Float32Array;
  yl: Float32Array;
  xr: Float32Array;
  yr: Float32Array;
};

/** Back panels first, front edges and the loose front fold last. */
const RIBBON_DEFS: ReadonlyArray<readonly [number, number]> = [
  [-0.86, 0.36],
  [0.86, 0.36],
  [-0.5, 0.42],
  [0.5, 0.42],
  [0.24, 0.34],
  [-0.24, 0.34],
  [-0.64, 0.26],
];

const ribbons: Ribbon[] = RIBBON_DEFS.map(([u, wdt], i) => ({
  u,
  wdt,
  seed: 3.7 + i * 11.3,
  xl: new Float32Array(ROWS),
  yl: new Float32Array(ROWS),
  xr: new Float32Array(ROWS),
  yr: new Float32Array(ROWS),
}));

const silX = new Float32Array(ROWS);
const silY = new Float32Array(ROWS);
const silX2 = new Float32Array(ROWS);
const silY2 = new Float32Array(ROWS);

const moteX = new Float32Array(MOTES);
const moteY = new Float32Array(MOTES);
const motePh = new Float32Array(MOTES);
const moteF = new Float32Array(MOTES);
const moteS = new Float32Array(MOTES);

const INK = PALETTE.ink;
const GOWN_BASE = "#0c0c0f";
const COAT = "#08080a";
const SKIN = "#161110";
const HAIR = "#0a0909";
const KEY_EDGE = rgba(PALETTE.keyLight, 1);
const RIM_EDGE = rgba(PALETTE.rimLight, 1);
const FOLD_EDGE = rgba(INK, 1);

const BEAM: ReadonlyArray<readonly [number, string]> = [
  [0, rgba(PALETTE.keyLight, 0.085)],
  [0.45, rgba(PALETTE.keyLight, 0.03)],
  [1, rgba(PALETTE.keyLight, 0)],
];
const FLOOR: ReadonlyArray<readonly [number, string]> = [
  [0, "#0a0a0c"],
  [1, "#131317"],
];
const POOL: ReadonlyArray<readonly [number, string]> = [
  [0, rgba(PALETTE.keyLight, 0.16)],
  [0.5, rgba(PALETTE.keyLight, 0.05)],
  [1, rgba(PALETTE.keyLight, 0)],
];
const SHADOW: ReadonlyArray<readonly [number, string]> = [
  [0, rgba(INK, 0.75)],
  [1, rgba(INK, 0)],
];
const HEAD: ReadonlyArray<readonly [number, string]> = [
  [0, "#2a221c"],
  [0.35, "#171210"],
  [1, "#0b0a0a"],
];
const BAND: ReadonlyArray<readonly [number, string]> = [
  [0, PALETTE.ivory],
  [0.6, "#e6dfcf"],
  [1, "#bfb6a3"],
];
const BAND_GLOW: ReadonlyArray<readonly [number, string]> = [
  [0, rgba(PALETTE.keyLight, 0.28)],
  [1, rgba(PALETTE.keyLight, 0)],
];
const GOWN_LIGHT: ReadonlyArray<readonly [number, string]> = [
  [0, "#2c2520"],
  [0.3, "#17151a"],
  [0.62, "#0d0d10"],
  [1, "#141821"],
];

let layoutKey = "";

/** Rebuilds the dust cloud for a new canvas size (deterministic). */
export function resizeFigure(L: Layout): void {
  if (L.key === layoutKey) return;
  layoutKey = L.key;
  const rnd = mulberry32(0x0d05e);
  const ox = -0.05 * L.w;
  const oy = -0.12 * L.h;
  const ax = L.fig.cx - ox;
  const ay = L.fig.feetY - 0.4 * L.fig.H - oy;
  const al = Math.hypot(ax, ay) || 1;
  let n = 0;
  let guard = 0;
  while (n < MOTES && guard++ < MOTES * 60) {
    const x = rnd() * L.w;
    const y = rnd() * L.h * 0.92;
    const dx = x - ox;
    const dy = y - oy;
    const dl = Math.hypot(dx, dy) || 1;
    const cos = (dx * ax + dy * ay) / (dl * al);
    if (cos < 0.9) continue;
    moteX[n] = x;
    moteY[n] = y;
    motePh[n] = rnd() * Math.PI * 2;
    moteF[n] = 0.5 + rnd();
    moteS[n] = 0.9 + rnd() * 1.4;
    n++;
  }
}

/** The figure act's camera for this frame: a slow dolly-in, a step forward, a hint of orbit. */
export function updateCamera(f: Frame): void {
  const { L, p } = f;
  const k = (1 + 0.05 * ramp(p, 0, 0.1)) * (1 + 0.07 * ramp(p, 0.11, 0.31));
  const orbit = ramp(p, 0.1, 0.34);
  f.cam.k = k;
  f.cam.px = L.fig.cx;
  f.cam.py = L.fig.feetY - 0.5 * L.fig.H;
  f.cam.dx = -0.03 * L.w * orbit;
  f.cam.dy = 0.012 * L.h * orbit;
  camToScreen(f.cam, L.strike.x, L.strike.y, f.strikeScreen);
}

/** Alpha of the whole act: it fades under the machine 0.40→0.45. */
export function figureFade(p: number): number {
  return 1 - ramp(p, 0.4, 0.45);
}

/** The swirl envelope of scene 2 (0–1). */
export function swirlAt(p: number): number {
  return window01(p, 0.1, 0.18, 0.28, 0.34);
}

/** Applies the figure camera to the context (call inside save/restore). */
export function applyCamera(ctx: CanvasRenderingContext2D, f: Frame): void {
  const c = f.cam;
  ctx.translate(c.px + c.dx, c.py + c.dy);
  ctx.scale(c.k, c.k);
  ctx.translate(-c.px, -c.py);
}

/** Room: the key-light beam on the wall, the floor, its lit pool and the figure's shadow. */
export function drawRoom(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { L, gfx, w, h } = f;
  const H = L.fig.H;
  const horizon = L.fig.feetY - 0.16 * H;
  ctx.fillStyle = gfx.linear(ctx, "fig-floor", 0, horizon, 0, h, FLOOR);
  ctx.fillRect(-w, horizon, w * 3, h * 2);
  ctx.fillStyle = gfx.radial(ctx, "fig-beam", -0.08 * w, -0.1 * h, 0, 1.15 * Math.max(w, h), BEAM);
  ctx.fillRect(-w, -h, w * 3, h * 3);
  // pool of light on the floor, toward the key light
  ctx.save();
  ctx.translate(L.fig.cx - 0.12 * H, L.fig.feetY + 0.01 * H);
  ctx.scale(1, 0.26);
  ctx.fillStyle = gfx.radial(ctx, "fig-pool", 0, 0, 0, 0.62 * H, POOL);
  ctx.fillRect(-0.62 * H, -0.62 * H, 1.24 * H, 1.24 * H);
  ctx.restore();
  // shadow cast away from the light
  ctx.save();
  ctx.translate(L.fig.cx + 0.14 * H, L.fig.feetY + 0.015 * H);
  ctx.scale(1, 0.2);
  ctx.fillStyle = gfx.radial(ctx, "fig-shadow", 0, 0, 0, 0.32 * H, SHADOW);
  ctx.fillRect(-0.32 * H, -0.32 * H, 0.64 * H, 0.64 * H);
  ctx.restore();
}

function gownHalfWidth(H: number, v: number, flare: number): number {
  return H * (0.115 + 0.115 * Math.pow(v, 0.9)) * (1 + flare * v * v);
}

/** The advocate: neck and head, base silhouette and coat, the seven ribbons, collar and bands. */
export function drawAdvocate(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { L, gfx, p, t, vel } = f;
  const H = L.fig.H;
  const cx = L.fig.cx;
  const feetY = L.fig.feetY;
  const shoulderY = feetY - 0.83 * H;
  const swirl = swirlAt(p);
  const flare = 0.32 * swirl;
  const amp = 0.012 + 0.055 * swirl + Math.min(vel, 1.5) * 0.02;
  const wind = t * 0.28 + p * 9;
  const breath = Math.sin(t * 1.15);

  // ---- neck & head (drawn first: the gown's shoulder line overlaps the neck's base)
  const headR = 0.058 * H;
  const headCy = feetY - H + headR * 1.02 + breath * 0.002 * H;
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.42, headCy + headR * 0.6);
  ctx.lineTo(cx + headR * 0.42, headCy + headR * 0.6);
  ctx.lineTo(cx + headR * 0.55, shoulderY + 0.01 * H);
  ctx.lineTo(cx - headR * 0.55, shoulderY + 0.01 * H);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(cx, headCy);
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.ellipse(0, -headR * 0.1, headR * 0.98, headR * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gfx.radial(ctx, "fig-head", -headR * 0.45, -headR * 0.35, 0, headR * 1.25, HEAD);
  ctx.beginPath();
  ctx.ellipse(0, headR * 0.06, headR * 0.9, headR * 1.02, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ---- base silhouette (the union of everything the ribbons will cover)
  for (let k = 0; k < ROWS; k++) {
    const v = k / (ROWS - 1);
    const hw = gownHalfWidth(H, v, flare);
    const wk = Math.pow(v, 1.4);
    const n = fbm(v * 2.2 + 1.3, wind * 0.25 + 4.1);
    const n2 = fbm(v * 2.2 + 7.7, wind * 0.25 + 9.3);
    const y = shoulderY + v * (feetY - shoulderY) - swirl * wk * 0.05 * H * Math.max(0, n);
    silX[k] = cx - hw * (1 + 0.06 * n * wk) - 0.02 * H * bell((v - 0.02) / 0.1);
    silY[k] = y + 0.02 * H * bell(v / 0.08);
    silX2[k] = cx + hw * (1 + 0.06 * n2 * wk) + 0.02 * H * bell((v - 0.02) / 0.1);
    silY2[k] = y + 0.02 * H * bell(v / 0.08);
  }
  ctx.fillStyle = GOWN_BASE;
  ctx.beginPath();
  splineTo(ctx, silX, silY, ROWS, false, true);
  ctx.lineTo(silX2[ROWS - 1], silY2[ROWS - 1]);
  splineTo(ctx, silX2, silY2, ROWS, true, false);
  ctx.closePath();
  ctx.fill();
  // the coat, seen through the front opening
  ctx.fillStyle = COAT;
  ctx.beginPath();
  ctx.moveTo(cx - 0.05 * H, shoulderY);
  ctx.lineTo(cx + 0.05 * H, shoulderY);
  ctx.lineTo(cx + 0.075 * H, feetY);
  ctx.lineTo(cx - 0.075 * H, feetY);
  ctx.closePath();
  ctx.fill();

  // ---- ribbons
  const gownGrad = gfx.linear(ctx, "fig-gown", cx - 0.27 * H, 0, cx + 0.27 * H, 0, GOWN_LIGHT);
  for (let i = 0; i < RIBBONS; i++) {
    const rb = ribbons[i];
    for (let k = 0; k < ROWS; k++) {
      const v = k / (ROWS - 1);
      const hw = gownHalfWidth(H, v, flare);
      const wk = Math.pow(v, 1.45);
      const n1 = fbm(rb.seed + v * 2.6, wind * 0.3 + rb.seed * 0.1);
      const n2 = vnoise(rb.seed * 1.7 + v * 5.5, wind * 0.5 + 2.2);
      const n3 = vnoise(rb.seed * 0.4 + v * 11 + t * 0.4, 3.3);
      const chest = breath * 0.004 * H * bell((v - 0.18) / 0.32);
      const xc = cx + rb.u * hw * (1 - 0.05 * wk) + (n1 * amp * H + chest * Math.sign(rb.u)) * wk + n2 * amp * swirl * 0.5 * H * wk;
      const half = 0.5 * rb.wdt * hw * (1 + 0.3 * n2 * wk) * (1 + 0.15 * v);
      const y =
        shoulderY +
        v * (feetY - shoulderY) +
        0.02 * H * bell(v / 0.08) * Math.abs(rb.u) -
        swirl * wk * (0.03 + 0.07 * Math.max(0, n1)) * H +
        n3 * amp * 0.25 * H * wk;
      rb.xl[k] = xc - half;
      rb.yl[k] = y;
      rb.xr[k] = xc + half;
      rb.yr[k] = y + 0.01 * H * wk * n3;
    }
    ctx.fillStyle = gownGrad;
    ctx.beginPath();
    splineTo(ctx, rb.xl, rb.yl, ROWS, false, true);
    ctx.lineTo(rb.xr[ROWS - 1], rb.yr[ROWS - 1]);
    splineTo(ctx, rb.xr, rb.yr, ROWS, true, false);
    ctx.closePath();
    ctx.fill();
    // fold separation on the shadow side, rim highlight on the lit side
    const prev = ctx.globalAlpha;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = FOLD_EDGE;
    ctx.globalAlpha = prev * 0.6;
    ctx.beginPath();
    splineTo(ctx, rb.xr, rb.yr, ROWS, false, true);
    ctx.stroke();
    const lit = (1 - rb.u) * 0.5;
    ctx.strokeStyle = KEY_EDGE;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = prev * (0.03 + 0.24 * lit * lit) * (1 + swirl * 0.6);
    ctx.beginPath();
    splineTo(ctx, rb.xl, rb.yl, ROWS, false, true);
    ctx.stroke();
    if (rb.u > 0.6) {
      ctx.strokeStyle = RIM_EDGE;
      ctx.lineWidth = 1;
      ctx.globalAlpha = prev * 0.09;
      ctx.beginPath();
      splineTo(ctx, rb.xr, rb.yr, ROWS, false, true);
      ctx.stroke();
    }
    ctx.globalAlpha = prev;
  }

  // ---- collar and the two white bands
  const bandW = 0.028 * H;
  const bandH = 0.115 * H;
  const bandTop = shoulderY - 0.005 * H;
  const sway = vnoise(t * 0.55, 2.2) * 0.05 * (1 + swirl * 4);
  const liftB = Math.max(0, vnoise(t * 0.8, 5.1)) * swirl * 0.25;
  ctx.save();
  ctx.translate(cx, bandTop);
  ctx.fillStyle = gfx.radial(ctx, "fig-bandglow", 0, bandH * 0.4, 0, 0.16 * H, BAND_GLOW);
  ctx.fillRect(-0.16 * H, -0.16 * H + bandH * 0.4, 0.32 * H, 0.32 * H);
  ctx.fillStyle = PALETTE.ivory;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.052 * H, 0.014 * H, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COAT;
  ctx.beginPath();
  ctx.ellipse(0, -0.004 * H, 0.04 * H, 0.009 * H, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(sway);
  ctx.scale(1, 1 - liftB);
  const bandGrad = gfx.linear(ctx, "fig-band", -bandW, 0, bandW, bandH, BAND);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * (bandW * 0.62), 0.006 * H);
    ctx.rotate(s * (0.075 + vnoise(t * 0.7, s * 3) * 0.03 * (1 + swirl * 3)));
    ctx.fillStyle = bandGrad;
    ctx.beginPath();
    ctx.moveTo(-bandW * 0.5, 0);
    ctx.lineTo(bandW * 0.5, 0);
    ctx.lineTo(bandW * 0.58, bandH);
    ctx.lineTo(-bandW * 0.58, bandH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Dust drifting in the key light; stirred by the swirl and by scrolling. */
export function drawMotes(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { L, p, t, vel } = f;
  const H = L.fig.H;
  const swirl = swirlAt(p);
  const stir = (swirl * 0.35 + Math.min(vel, 0.6) * 0.2) * H * 0.1;
  const base = (0.14 + 0.32 * ramp(p, 0, 0.12)) * figureFade(p);
  if (base <= 0.002) return;
  const prev = ctx.globalAlpha;
  ctx.fillStyle = PALETTE.keyLight;
  for (let i = 0; i < MOTES; i++) {
    const ph = motePh[i];
    const fr = moteF[i];
    const x = moteX[i] + Math.sin(t * 0.21 * fr + ph) * H * 0.022 + Math.sin(t * 0.9 + ph * 3) * stir;
    const y = moteY[i] + Math.sin(t * 0.13 * fr + ph * 1.7) * H * 0.012 + Math.cos(t * 0.7 + ph) * stir * 0.4;
    const tw = 0.5 + 0.5 * Math.sin(t * 0.6 * fr + ph * 2);
    ctx.globalAlpha = prev * base * (0.35 + 0.65 * tw);
    ctx.fillRect(x, y, moteS[i], moteS[i]);
  }
  ctx.globalAlpha = prev;
}

/** Gown parameters other scenes may want (the hip where the objects emerge). */
export function gownHip(L: Layout, side: number, out: { x: number; y: number }): void {
  out.x = L.fig.cx + side * 0.11 * L.fig.H;
  out.y = L.fig.feetY - 0.42 * L.fig.H;
}
