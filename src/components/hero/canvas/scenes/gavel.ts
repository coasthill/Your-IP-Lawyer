/**
 * Scene 3 — THE GAVEL (0.33 → 0.42).
 *
 * The advocate's arm swings out of the gown (0.33), rises in a slow arc (0.34→0.38) and drops
 * (0.38→0.385) onto a sound block on a low plinth beside the figure (mirrored to whichever side the layout puts it). The strike itself is wall-time
 * and re-armable: a light pulse that flashes three times and decays, a ≤6px camera shake (350 ms),
 * an expanding ring on the floor and ≤120 sparks with drag and a little gravity.
 */

import { GAVEL_STRIKE_AT, PALETTE, ramp, window01 } from "../../story";
import { BRONZE_RING, TAU, easeInCubic, easeOutCubic, lerp, mulberry32, rgba } from "../helpers";
import type { Frame, Pt } from "../layout";

const SPARKS = 120;
const DRAG = 3.2;
const SHAKE_MS = 0.35;

const sparkDx = new Float32Array(SPARKS);
const sparkDy = new Float32Array(SPARKS);
const sparkSpeed = new Float32Array(SPARKS);
const sparkSize = new Float32Array(SPARKS);
(() => {
  const rnd = mulberry32(0x5741ce);
  for (let i = 0; i < SPARKS; i++) {
    const a = -Math.PI * (0.05 + rnd() * 0.9);
    const spread = Math.pow(rnd(), 1.6);
    const ang = a * (0.3 + 0.7 * spread) + (rnd() - 0.5) * 0.6;
    sparkDx[i] = Math.cos(ang);
    sparkDy[i] = Math.sin(ang);
    sparkSpeed[i] = 0.5 + rnd() * 1.4;
    sparkSize[i] = 1 + rnd() * 1.6;
  }
})();

const WOOD: ReadonlyArray<readonly [number, string]> = [
  [0, "#6b4527"],
  [0.45, "#3a2415"],
  [1, "#160d07"],
];
const STONE: ReadonlyArray<readonly [number, string]> = [
  [0, "#221d24"],
  [0.5, "#17141a"],
  [1, "#0d0b0f"],
];
const FLASH: ReadonlyArray<readonly [number, string]> = [
  [0, rgba(PALETTE.ivory, 0.9)],
  [0.18, rgba(PALETTE.keyLight, 0.45)],
  [0.5, rgba(PALETTE.keyLight, 0.12)],
  [1, rgba(PALETTE.keyLight, 0)],
];

const SLEEVE = "#1c1b21";
const SLEEVE_EDGE = rgba(PALETTE.keyLight, 0.3);
const HEAD_EDGE = rgba(PALETTE.keyLight, 0.45);
const SKIN = "#1a1411";
const HANDLE_HI = rgba("#6a4a2c", 0.6);
const RING_COLOUR = PALETTE.keyLight;
const SPARK_A = PALETTE.keyLight;
const SPARK_B = PALETTE.bronze2;

const ARM_VISIBLE = 0.33;
const RAISE_A = 0.34;
const RAISE_B = 0.38;
const DROP_A = 0.38;

/** Pose angles (screen radians, y down): hanging, raised, striking (computed from the layout). */
const HANG_UPPER = 1.62;
const HANG_FORE = 1.58;
const RAISED_UPPER = 4.0;
const RAISED_FORE = 5.3;

/** Camera shake for a strike of age `age` seconds (≤ 6px, decays over 350 ms). */
export function shakeOffset(age: number, out: Pt): void {
  if (age < 0 || age > SHAKE_MS) {
    out.x = 0;
    out.y = 0;
    return;
  }
  const k = 1 - age / SHAKE_MS;
  const env = 6 * k * k;
  out.x = Math.sin(age * 95) * env;
  out.y = Math.cos(age * 71 + 0.8) * env * 0.7;
}

/** The plinth and sound block the gavel strikes (room space); it arrives with the gavel scene. */
export function drawPlinth(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { L, gfx, p } = f;
  const arrive = ramp(p, 0.29, 0.33);
  if (arrive <= 0.003) return;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * arrive;
  const H = L.fig.H;
  const sx = L.strike.x;
  const blockTop = L.strike.y + 0.035 * H;
  const capY = blockTop + 0.018 * H;
  ctx.fillStyle = gfx.linear(ctx, "gv-stone", sx - 0.06 * H, 0, sx + 0.06 * H, 0, STONE);
  ctx.fillRect(sx - 0.05 * H, capY + 0.03 * H, 0.1 * H, L.fig.feetY - capY - 0.03 * H + 0.01 * H);
  ctx.fillRect(sx - 0.07 * H, capY, 0.14 * H, 0.032 * H);
  // block: a dark wood puck with a bronze rim
  ctx.fillStyle = "#1c110a";
  ctx.beginPath();
  ctx.rect(sx - 0.055 * H, blockTop, 0.11 * H, 0.02 * H);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(sx, blockTop + 0.02 * H, 0.055 * H, 0.016 * H, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = gfx.linear(ctx, "gv-block", sx - 0.055 * H, 0, sx + 0.055 * H, 0, WOOD);
  ctx.beginPath();
  ctx.ellipse(sx, blockTop, 0.055 * H, 0.016 * H, 0, 0, TAU);
  ctx.fill();
  ctx.lineWidth = Math.max(1, 0.006 * H);
  ctx.strokeStyle = gfx.linear(ctx, "gv-rim", sx - 0.055 * H, 0, sx + 0.055 * H, 0, BRONZE_RING);
  ctx.beginPath();
  ctx.ellipse(sx, blockTop, 0.052 * H, 0.0145 * H, 0, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = prevAlpha;
}

/**
 * The arm and the gavel (room space, drawn after the figure). The swing is choreographed with the
 * block at the viewer's left; when the layout puts the block at the viewer's right the whole gesture
 * is mirrored about the shoulder, so the raise, the drop and the recoil read the same either way.
 */
export function drawArm(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { L, gfx, p } = f;
  if (p < ARM_VISIBLE) return;
  const H = L.fig.H;
  const mirror = L.strike.x >= L.fig.cx ? -1 : 1;
  const shoulderX = L.fig.cx - mirror * 0.105 * H;
  const shoulderY = L.fig.feetY - 0.8 * H;
  const upper = 0.22 * H;
  const fore = 0.16 * H;
  const dxS = (L.strike.x - shoulderX) * mirror;
  const dyS = L.strike.y - shoulderY;
  const dist = Math.hypot(dxS, dyS);
  const strikeAngle = Math.atan2(dyS, dxS);
  const reach = Math.max(0.06 * H, dist - upper - fore);

  const raise = ramp(p, RAISE_A, RAISE_B);
  const drop = easeInCubic((p - DROP_A) / (GAVEL_STRIKE_AT - DROP_A));
  const recoil = window01(p, GAVEL_STRIKE_AT, GAVEL_STRIKE_AT + 0.004, GAVEL_STRIKE_AT + 0.01, GAVEL_STRIKE_AT + 0.03) * 0.12;
  // the forearm folds up ahead of the upper arm so the hand stays close to the body mid-swing;
  // on the drop the upper arm goes first and the forearm whips after it, like a hammer blow,
  // so the arm never extends sideways out of a narrow frame
  let a1 = lerp(HANG_UPPER, RAISED_UPPER, raise);
  let a2 = lerp(HANG_FORE, RAISED_FORE, Math.pow(raise, 0.55));
  a1 = lerp(a1, strikeAngle, drop);
  a2 = lerp(a2, strikeAngle, drop * drop);
  a1 = lerp(a1, RAISED_UPPER, recoil);
  a2 = lerp(a2, RAISED_FORE, recoil);
  const wrist = -0.85 * raise * (1 - drop);
  const aG = a2 + wrist;

  // local frame: the shoulder at the origin, the swing toward −x, mirrored on screen if need be
  const ex = Math.cos(a1) * upper;
  const ey = Math.sin(a1) * upper;
  const hx = ex + Math.cos(a2) * fore;
  const hy = ey + Math.sin(a2) * fore;
  const gx = hx + Math.cos(aG) * reach;
  const gy = hy + Math.sin(aG) * reach;

  const prev = ctx.globalAlpha;
  ctx.save();
  ctx.translate(shoulderX, shoulderY);
  ctx.scale(mirror, 1);
  ctx.globalAlpha = prev * ramp(p, ARM_VISIBLE, ARM_VISIBLE + 0.015);
  ctx.lineCap = "round";
  // sleeve
  ctx.strokeStyle = SLEEVE;
  ctx.lineWidth = 0.09 * H;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.lineWidth = 0.07 * H;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  // the key light along the sleeve's upper edge
  ctx.strokeStyle = SLEEVE_EDGE;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-0.02 * H, -0.035 * H);
  ctx.lineTo(ex - 0.015 * H, ey - 0.03 * H);
  ctx.moveTo(ex - 0.01 * H, ey - 0.028 * H);
  ctx.lineTo(hx - 0.005 * H, hy - 0.024 * H);
  ctx.stroke();
  // hand
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(hx, hy, 0.037 * H, 0, TAU);
  ctx.fill();
  // gavel: handle along the wrist direction, head across it
  ctx.strokeStyle = "#2a1a10";
  ctx.lineWidth = 0.015 * H;
  ctx.beginPath();
  ctx.moveTo(hx - Math.cos(aG) * 0.04 * H, hy - Math.sin(aG) * 0.04 * H);
  ctx.lineTo(gx, gy);
  ctx.stroke();
  ctx.strokeStyle = HANDLE_HI;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hx - Math.cos(aG) * 0.04 * H - 1, hy - Math.sin(aG) * 0.04 * H - 1);
  ctx.lineTo(gx - 1, gy - 1);
  ctx.stroke();
  ctx.fillStyle = PALETTE.bronze;
  ctx.beginPath();
  ctx.arc(hx - Math.cos(aG) * 0.045 * H, hy - Math.sin(aG) * 0.045 * H, 0.012 * H, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(aG + Math.PI / 2);
  const hl = 0.06 * H;
  const hh = 0.024 * H;
  ctx.fillStyle = gfx.linear(ctx, "gv-wood", 0, -hh, 0, hh, WOOD);
  ctx.beginPath();
  ctx.rect(-hl, -hh, hl * 2, hh * 2);
  ctx.fill();
  ctx.fillStyle = gfx.linear(ctx, "gv-band", 0, -hh, 0, hh, BRONZE_RING);
  ctx.fillRect(-hl * 0.72, -hh, 0.012 * H, hh * 2);
  ctx.fillRect(hl * 0.72 - 0.012 * H, -hh, 0.012 * H, hh * 2);
  // the key light catches the head's upper edge
  ctx.strokeStyle = HEAD_EDGE;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-hl, -hh + 0.6);
  ctx.lineTo(hl, -hh + 0.6);
  ctx.stroke();
  ctx.restore();
  ctx.lineCap = "butt";
  ctx.restore();
  ctx.globalAlpha = prev;
}

/** The impact: flash, floor ring and sparks, keyed off `f.strikeAge` (wall time). Room space. */
export function drawStrike(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { L, gfx } = f;
  const age = f.strikeAge;
  if (age < 0 || age > 1.1) return;
  const H = L.fig.H;
  const sx = L.strike.x;
  const sy = L.strike.y + 0.035 * H;
  const prev = ctx.globalAlpha;
  // three pulses then a decay
  const flash = age < 0.2 ? 0.55 + 0.45 * Math.cos((age / 0.2) * Math.PI * 6) : Math.max(0, 1 - (age - 0.2) / 0.4) * 0.5;
  if (flash > 0.01) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = prev * flash * 0.7;
    ctx.fillStyle = gfx.radial(ctx, "gv-flash", sx, sy, 0, 0.7 * H, FLASH);
    ctx.fillRect(sx - 0.7 * H, sy - 0.7 * H, 1.4 * H, 1.4 * H);
    ctx.globalCompositeOperation = "source-over";
  }
  // shockwave ring on the floor
  const ringK = age / 0.8;
  if (ringK < 1) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1, 0.32);
    ctx.globalAlpha = prev * (1 - ringK) * 0.55;
    ctx.strokeStyle = RING_COLOUR;
    ctx.lineWidth = 2 + 6 * ringK;
    ctx.beginPath();
    ctx.arc(0, 0, 0.05 * H + easeOutCubic(ringK) * 0.9 * H, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  // sparks
  const travel = ((1 - Math.exp(-DRAG * age)) / DRAG) * 0.55 * H;
  const fade = Math.max(0, 1 - age / 0.6);
  const g = 0.9 * H * age * age;
  for (let i = 0; i < SPARKS; i++) {
    const s = sparkSpeed[i] * travel;
    const x = sx + sparkDx[i] * s;
    const y = sy + sparkDy[i] * s + g * 0.6;
    ctx.globalAlpha = prev * fade * fade * (0.5 + 0.5 * (i % 3 === 0 ? 1 : 0.6));
    ctx.fillStyle = i % 4 === 0 ? SPARK_B : SPARK_A;
    ctx.fillRect(x, y, sparkSize[i], sparkSize[i]);
  }
  ctx.globalAlpha = prev;
}

/** Progress-space envelope: how far the floating objects have been knocked back and dissolved. */
export function knockback(p: number): number {
  return ramp(p, GAVEL_STRIKE_AT, 0.42);
}
