/**
 * Scene 5 — DESIGN (0.56 → 0.67, lingering under the emblem until ~0.74).
 *
 * The rosette of gears becomes a turned-metal plate: it grows out of the rosette's centre (0.582),
 * tilts back into a turntable (0.62), and a light band sweeps once across its face to reveal an
 * engraved lotus guilloché (pre-rendered once per size, rotated with the plate, revealed through a
 * soft wedge clip that follows the band). A clean product silhouette — a turned vessel — rises above
 * it as a bronze line drawing with elliptical section rings. Towards scene 6 the plate rises back
 * to face the camera, warms toward bronze and shrinks under the emblem. Deterministic in progress
 * except the slow idle spin.
 */

import { PALETTE, ramp, smoothstep } from "../../story";
import {
  BRONZE_RING,
  BRUSH_CONIC,
  TAU,
  easeOutCubic,
  guillochePath,
  lerp,
  makeLayer,
  rgba,
  steelStops,
  vesselPath,
  type Layer,
  type Stops,
} from "../helpers";
import type { Frame, Layout } from "../layout";

/** Where the key light sits on the plate face (upper-left, canvas angle). */
const LIGHT_ANGLE = -2.35;
const BAND_WIDTH = 1.05;

const STEEL: Stops = steelStops("#75767c");
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
const SIDE = "#26272c";
const LATHE = rgba("#a2a3aa", 1);
const WARM = PALETTE.bronze;
const PROFILE = PALETTE.bronze2;
const SECTION = PALETTE.bronze;
const ORN_DARK = rgba(PALETTE.ink, 0.7);
const ORN_LIGHT = PALETTE.bronze2;

let layoutKey = "";
let R = 0;
let lathe: Path2D | null = null;
let ornament: Layer | null = null;
let vessel: { profile: Path2D; sections: Path2D; height: number } | null = null;

export function resizeDesign(L: Layout, dpr: number): void {
  if (L.key === layoutKey && lathe) return;
  layoutKey = L.key;
  R = L.plateR;
  lathe = new Path2D();
  for (let r = 0.3 * R; r < 0.975 * R; r += 0.045 * R) {
    lathe.moveTo(r, 0);
    lathe.arc(0, 0, r, 0, TAU);
  }
  const oR = 0.93 * R;
  const size = Math.ceil(oR * 2 + 6);
  ornament = makeLayer(size, size, Math.min(dpr, 2));
  if (ornament) {
    const c = ornament.ctx;
    const path = guillochePath(oR);
    c.translate(size / 2, size / 2);
    c.lineWidth = 1;
    c.strokeStyle = ORN_DARK;
    c.translate(0.7, 0.7);
    c.stroke(path);
    c.translate(-0.7, -0.7);
    c.strokeStyle = ORN_LIGHT;
    c.stroke(path);
  }
  vessel = vesselPath(R * 0.78);
}

/** Clips to a soft-edged wedge (three nested sectors) about `angle`; call inside save/restore. */
function wedge(ctx: CanvasRenderingContext2D, angle: number, half: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius, angle - half, angle + half);
  ctx.closePath();
  ctx.clip();
}

export function drawDesign(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { p, t, gfx, focus } = f;
  if (p < 0.575 || p > 0.745 || !lathe || !vessel) return;
  const appear = easeOutCubic((p - 0.582) / 0.035);
  if (appear <= 0.002) return;
  const settle = smoothstep((p - 0.62) / 0.045);
  const toEmblem = smoothstep((p - 0.668) / 0.04);
  const cover = smoothstep((p - 0.695) / 0.03);
  const turntable = settle * (1 - toEmblem);
  const fade = 1 - ramp(p, 0.705, 0.745);
  if (fade <= 0.002) return;
  const rz = -(p - 0.58) * 7 - t * 0.08;
  const sc = appear * lerp(1, 0.86, turntable) * lerp(1, 0.5, cover);
  const sy = lerp(1, 0.66, turntable);
  const cx = focus.x;
  const cy = focus.y + turntable * 0.16 * R;
  const prev = ctx.globalAlpha;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc * sy);
  ctx.globalAlpha = prev * fade;

  // shadow, then the plate's edge (its thickness shows as it tilts), then the face
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.arc(0.05 * R, (0.1 * R) / sy, 1.06 * R, 0, TAU);
  ctx.fill();
  if (turntable > 0.01) {
    ctx.fillStyle = SIDE;
    ctx.beginPath();
    ctx.arc(0, (0.075 * R * turntable) / sy, R, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = gfx.radial(ctx, "ds-steel", 0, 0, 0, R * 1.05, STEEL);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();
  const brush = gfx.conicGradient(ctx, "ds-brush", 0.6, 0, 0, BRUSH_CONIC);
  if (brush) {
    ctx.fillStyle = brush;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
  }
  // fine lathe marks
  ctx.globalAlpha = prev * fade * 0.16 * appear * (1 - toEmblem * 0.7);
  ctx.lineWidth = 1;
  ctx.strokeStyle = LATHE;
  ctx.stroke(lathe);
  // the metal warms as it becomes an emblem
  if (toEmblem > 0.01) {
    ctx.globalAlpha = prev * fade * 0.6 * toEmblem;
    ctx.fillStyle = WARM;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
  }

  // the ornament: a faint base, then the light band sweeping once and hovering under the key light
  const reveal = smoothstep((p - 0.612) / 0.06);
  const pass = smoothstep((p - 0.612) / 0.085);
  if (ornament && reveal > 0.01) {
    const band = LIGHT_ANGLE - Math.PI + TAU * pass + Math.sin(t * 0.5) * 0.35 * pass;
    const oh = ornament.w / 2;
    const base = 0.3 * reveal * (1 - toEmblem);
    const peak = 0.95 * reveal * (1 - toEmblem);
    ctx.save();
    ctx.rotate(rz);
    ctx.globalAlpha = prev * fade * base;
    ctx.drawImage(ornament.canvas, -oh, -oh, ornament.w, ornament.h);
    ctx.restore();
    for (let k = 0; k < 3; k++) {
      ctx.save();
      wedge(ctx, band, BAND_WIDTH * (0.5 - k * 0.15), R * 1.1);
      ctx.rotate(rz);
      ctx.globalAlpha = prev * fade * peak * 0.34;
      ctx.drawImage(ornament.canvas, -oh, -oh, ornament.w, ornament.h);
      ctx.restore();
    }
  }

  // bronze rim, hub boss, pin
  ctx.globalAlpha = prev * fade;
  ctx.lineWidth = Math.max(1.5, R * 0.03);
  ctx.strokeStyle = gfx.linear(ctx, "ds-rim", -R, -R, R, R, BRONZE_RING);
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.975, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = gfx.radial(ctx, "ds-boss", -R * 0.03, -R * 0.04, 0, R * 0.15, BOSS);
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = gfx.radial(ctx, "ds-pin", -R * 0.01, -R * 0.015, 0, R * 0.05, PIN);
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.04, 0, TAU);
  ctx.fill();
  ctx.restore();

  // the product silhouette rises from the plate, then sinks away before the emblem
  const rise = easeOutCubic((p - 0.632) / 0.045);
  const sink = smoothstep((p - 0.664) / 0.03);
  const op = rise * (1 - sink);
  if (op > 0.01) {
    ctx.save();
    ctx.translate(cx, cy + 0.02 * R * sc);
    ctx.scale(sc / lerp(1, 0.86, turntable), (sc / lerp(1, 0.86, turntable)) * rise * (1 - sink * 0.5));
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = PROFILE;
    ctx.globalAlpha = prev * fade * 0.95 * op;
    ctx.stroke(vessel.profile);
    ctx.lineWidth = 1;
    ctx.strokeStyle = SECTION;
    ctx.globalAlpha = prev * fade * 0.42 * op;
    ctx.stroke(vessel.sections);
    ctx.restore();
  }
  ctx.globalAlpha = prev;
}
