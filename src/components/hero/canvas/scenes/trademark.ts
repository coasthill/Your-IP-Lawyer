/**
 * Scene 6 — TRADE MARK (0.67 → 0.78; the ring lives on as the compass rose until ~0.905).
 *
 * The plate warms into a registration emblem: a graphite backing disc in a bronze ring, a wax seal
 * at the centre with a large ®, "TRADE MARK · REGISTERED" engraved around the rim, a ribbon banner
 * unfurling beneath, a wall of typographic specimen sheets behind (pre-rendered once per size) and
 * a hint of a shop-sign frame. At 0.765 the seal dissolves and the two rings travel to the map's
 * north-west corner, shrink, take the map's tilt and fill with a compass rose for scene 7.
 * The emblem sits at the machine focus, high in the frame, clear of the bottom captions.
 */

import { PALETTE, smoothstep, window01 } from "../../story";
import {
  BRONZE_RING,
  HALF_PI,
  TAU,
  arcText,
  compassPath,
  easeOutCubic,
  lerp,
  makeLayer,
  mixHex,
  mulberry32,
  ribbonPath,
  rgba,
  setFont,
  tracked,
  type Fonts,
  type Layer,
  type Stops,
} from "../helpers";
import type { Frame, Layout, Pt } from "../layout";
import { compassCorner, mapTilt } from "./gi";

const RING_TEXT = " MARK · REGISTERED · TRADE MARK · REGISTERED · TRADE";
const SPECIMENS = ["Aa", "Rr", "Mm", "Kk", "Qq", "&", "Gg", "§", "Bb"];

const ENAMEL: Stops = [
  [0, "#34343b"],
  [0.7, "#1d1d22"],
  [1, "#121215"],
];
const WAX: Stops = [
  [0, PALETTE.seal2],
  [0.5, PALETTE.seal],
  [1, "#4a1717"],
];
const RIBBON: Stops = [
  [0, "#d6c9a6"],
  [0.5, "#c6b892"],
  [1, "#a89a78"],
];
const SHADOW = rgba(PALETTE.ink, 0.55);
const WAX_EDGE = rgba(PALETTE.ink, 0.55);
const WAX_HI = rgba(PALETTE.ivory, 0.22);
const TEXT = PALETTE.parchment;
const TEXT_DARK = rgba(PALETTE.ink, 0.85);
const RIBBON_TAIL = "#8f8262";
const RIBBON_EDGE = rgba(PALETTE.ink, 0.45);
const RIBBON_TEXT = PALETTE.ink;
const FRAME = PALETTE.bronze;
const SHEET_FILL = mixHex(PALETTE.ink, PALETTE.bone, 0.42);
const SHEET_RULE = rgba(PALETTE.bronzeDim, 0.55);
const SHEET_TEXT = rgba(PALETTE.bone, 0.42);
const COMPASS_LINE = PALETTE.bronze2;
const COMPASS_STAR = PALETTE.bronze;
const COMPASS_STAR_LIT = PALETTE.bronze2;

let layoutKey = "";
let R = 0;
let wall: Layer | null = null;
let wallW = 0;
let wallH = 0;
let ribbon: { panel: Path2D; tails: Path2D } | null = null;
let compass: { star: Path2D; lines: Path2D } | null = null;
let fontRing = "";
let fontReg = "";
let fontRibbon = "";
let fontN = "";
let ribbonTracking = 0;
const corner: Pt = { x: 0, y: 0 };

export function resizeTradeMark(L: Layout, fonts: Fonts, dpr: number): void {
  if (L.key === layoutKey && compass) return;
  layoutKey = L.key;
  R = L.emblemR;
  ribbon = ribbonPath(2.6 * R, 0.31 * R);
  compass = compassPath(0.72 * R);
  fontRing = `600 ${(R * 0.074).toFixed(1)}px ${fonts.display}`;
  fontReg = `600 ${(R * 0.8).toFixed(1)}px ${fonts.display}`;
  fontRibbon = `600 ${(R * 0.125).toFixed(1)}px ${fonts.display}`;
  fontN = `600 ${(R * 0.26).toFixed(1)}px ${fonts.display}`;
  ribbonTracking = R * 0.023;
  wall = buildWall(L, fonts, dpr);
}

/** The wall of typographic specimen sheets: 3 × 3 sheets, faint rules, one large specimen each. */
function buildWall(L: Layout, fonts: Fonts, dpr: number): Layer | null {
  const sw = 0.94 * R;
  const sh = 1.25 * R;
  const gx = L.portrait ? 1.45 * R : 1.6 * R;
  const gy = 1.32 * R;
  wallW = 2 * gx + sw + 0.4 * R;
  wallH = 2 * gy + sh + 0.4 * R;
  const layer = makeLayer(wallW, wallH, Math.min(dpr, 1.5));
  if (!layer) return null;
  const c = layer.ctx;
  c.translate(wallW / 2, wallH / 2);
  const rnd = mulberry32(11);
  setFont(c, fonts.display, R * 0.56, 600);
  c.textAlign = "center";
  c.textBaseline = "middle";
  for (let i = 0; i < SPECIMENS.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = (col - 1) * gx + (rnd() - 0.5) * 0.2 * R;
    const y = (row - 1) * gy + (rnd() - 0.5) * 0.14 * R;
    const rz = (rnd() - 0.5) * 0.12;
    const alpha = 0.6 + rnd() * 0.4;
    c.save();
    c.translate(x, y);
    c.rotate(rz);
    c.globalAlpha = alpha * 0.62;
    c.fillStyle = SHEET_FILL;
    c.fillRect(-sw / 2, -sh / 2, sw, sh);
    c.globalAlpha = alpha;
    c.strokeStyle = SHEET_RULE;
    c.lineWidth = 1;
    c.beginPath();
    const x0 = -sw / 2 + sw * 0.1;
    const x1 = sw / 2 - sw * 0.1;
    for (let k = 0; k < 9; k++) {
      const yy = sh / 2 - sh * 0.1 - (k / 8) * sh * 0.55;
      c.moveTo(x0, yy);
      c.lineTo(k % 3 === 0 ? x1 : x0 + (x1 - x0) * 0.72, yy);
    }
    c.moveTo(x0, -sh / 2 + sh * 0.1);
    c.lineTo(x1, -sh / 2 + sh * 0.1);
    c.moveTo(x0, -sh / 2 + sh * 0.13);
    c.lineTo(x1, -sh / 2 + sh * 0.13);
    c.stroke();
    c.fillStyle = SHEET_TEXT;
    c.fillText(SPECIMENS[i], 0, -sh * 0.12);
    c.restore();
  }
  // the wall dissolves toward its edges (and away from the captions below)
  c.globalCompositeOperation = "destination-in";
  const edge = c.createRadialGradient(0, -0.1 * R, 0, 0, -0.1 * R, Math.max(wallW, wallH) * 0.55);
  edge.addColorStop(0, "rgba(0,0,0,1)");
  edge.addColorStop(0.6, "rgba(0,0,0,0.85)");
  edge.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = edge;
  c.fillRect(-wallW / 2, -wallH / 2, wallW, wallH);
  c.globalCompositeOperation = "source-over";
  return layer;
}

export function drawTradeMark(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { p, t, gfx, L, focus, w } = f;
  if (p < 0.665 || p > 0.905 || !ribbon || !compass) return;
  const grow = easeOutCubic((p - 0.675) / 0.04);
  if (grow <= 0.002) return;
  const toCompass = smoothstep((p - 0.765) / 0.045);
  const gone = smoothstep((p - 0.885) / 0.02);
  const compassIn = smoothstep((p - 0.79) / 0.035);
  const prev = ctx.globalAlpha;
  const fx = focus.x;
  const fy = focus.y;

  // the specimen wall, drifting slowly
  const wallOp = window01(p, 0.672, 0.72, 0.762, 0.8);
  if (wall && wallOp > 0.003) {
    ctx.globalAlpha = prev * wallOp;
    ctx.drawImage(wall.canvas, fx - wallW / 2 + (p - 0.67) * 0.12 * w, fy - 0.12 * R - wallH / 2, wall.w, wall.h);
  }

  // shop-sign frame: a hint, arriving late and retreating into the dark
  const fin = easeOutCubic((p - 0.69) / 0.04);
  const fout = smoothstep((p - 0.765) / 0.03);
  if (fin > 0.01 && fout < 0.99) {
    const fs = lerp(0.8, 1, fin) * (1 - fout * 0.4);
    const hw = (L.portrait ? 1.5 : 1.62) * R;
    const hh = 1.06 * R;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(fs, fs);
    ctx.globalAlpha = prev * fin * (1 - fout) * 0.85;
    ctx.strokeStyle = FRAME;
    ctx.lineWidth = Math.max(1.5, R * 0.028);
    ctx.beginPath();
    ctx.rect(-hw, -hh, hw * 2, hh * 2);
    ctx.moveTo(-hw * 0.7, -hh);
    ctx.lineTo(-hw * 0.7, -hh - 0.8 * R);
    ctx.moveTo(hw * 0.7, -hh);
    ctx.lineTo(hw * 0.7, -hh - 0.8 * R);
    ctx.stroke();
    ctx.restore();
  }

  // the emblem, then its flight to the corner of the map
  compassCorner(L, p, corner);
  const ex = lerp(fx, corner.x, toCompass);
  const ey = lerp(fy, corner.y, toCompass);
  const es = grow * lerp(1, 0.34, toCompass) * (1 - gone);
  if (es <= 0.005) {
    ctx.globalAlpha = prev;
    return;
  }
  const tilt = lerp(1, mapTilt(p), toCompass);
  const rz = -0.6 * Math.sin(Math.PI * toCompass) + Math.sin(t * 0.3) * 0.02 * (1 - toCompass);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.scale(es, es * tilt);
  ctx.rotate(rz);
  ctx.globalAlpha = prev;

  const seal = 1 - toCompass;
  if (seal > 0.01) {
    ctx.save();
    ctx.scale(seal, seal);
    // shadow on the wall, the backing disc, the wax, its bevel and highlight
    ctx.fillStyle = SHADOW;
    ctx.beginPath();
    ctx.arc(0.05 * R, 0.09 * R, 1.06 * R, 0, TAU);
    ctx.fill();
    ctx.fillStyle = gfx.radial(ctx, "tm-enamel", -0.3 * R, -0.35 * R, 0, 1.25 * R, ENAMEL);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    ctx.fillStyle = gfx.radial(ctx, "tm-wax", -0.22 * R, -0.28 * R, 0, 0.95 * R, WAX);
    ctx.beginPath();
    ctx.arc(0, 0, 0.71 * R, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, R * 0.02);
    ctx.strokeStyle = WAX_EDGE;
    ctx.beginPath();
    ctx.arc(0, 0, 0.7 * R, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = WAX_HI;
    ctx.lineWidth = Math.max(1, R * 0.012);
    ctx.beginPath();
    ctx.arc(0, 0, 0.68 * R, Math.PI * 0.95, Math.PI * 1.55);
    ctx.stroke();
    // ring text ("TRADE MARK" centred at the top, the join at the bottom seamless)
    ctx.font = fontRing;
    ctx.fillStyle = TEXT;
    arcText(ctx, RING_TEXT, 0.88 * R, -HALF_PI, 0, true);
    // the ®, engraved into the wax
    ctx.font = fontReg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = TEXT_DARK;
    ctx.fillText("®", 0, 0.05 * R + Math.max(1, R * 0.012));
    ctx.fillStyle = TEXT;
    ctx.fillText("®", 0, 0.05 * R);
    ctx.restore();
  }

  // the compass rose fills the rings as they land on the map
  if (compassIn > 0.01) {
    ctx.globalAlpha = prev * compassIn;
    ctx.fillStyle = gfx.linear(ctx, "tm-star", -0.7 * R, -0.7 * R, 0.7 * R, 0.7 * R, [
      [0, COMPASS_STAR_LIT],
      [1, COMPASS_STAR],
    ]);
    ctx.fill(compass.star);
    ctx.lineWidth = Math.max(1, R * 0.012);
    ctx.strokeStyle = COMPASS_LINE;
    ctx.stroke(compass.lines);
    ctx.font = fontN;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COMPASS_STAR_LIT;
    ctx.fillText("N", 0, -0.9 * R * 0.72 - 0.3 * R);
    ctx.globalAlpha = prev;
  }

  // the two bronze rings (they are the emblem's frame and, later, the compass's)
  ctx.lineWidth = Math.max(1.5, R * 0.05);
  ctx.strokeStyle = gfx.linear(ctx, "tm-ring", -R, -R, R, R, BRONZE_RING);
  ctx.beginPath();
  ctx.arc(0, 0, 0.775 * R, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, R * 0.028);
  ctx.beginPath();
  ctx.arc(0, 0, 0.985 * R, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // the ribbon unfurls under the emblem and drops away before the map (in front of the seal)
  const unfurl = easeOutCubic((p - 0.7) / 0.045);
  const drop = smoothstep((p - 0.762) / 0.028);
  const rop = unfurl * (1 - drop);
  if (rop > 0.01) {
    ctx.save();
    ctx.translate(fx, fy + 0.98 * R + drop * 0.5 * R);
    ctx.rotate(drop * 0.3);
    ctx.scale(Math.max(0.001, unfurl), 1 - drop * 0.5);
    ctx.globalAlpha = prev * rop;
    ctx.fillStyle = RIBBON_TAIL;
    ctx.fill(ribbon.tails);
    ctx.strokeStyle = RIBBON_EDGE;
    ctx.lineWidth = 1;
    ctx.stroke(ribbon.tails);
    ctx.fillStyle = gfx.linear(ctx, "tm-ribbon", 0, -0.16 * R, 0, 0.16 * R, RIBBON);
    ctx.fill(ribbon.panel);
    ctx.stroke(ribbon.panel);
    ctx.font = fontRibbon;
    ctx.textBaseline = "middle";
    ctx.fillStyle = RIBBON_TEXT;
    tracked(ctx, "TRADE MARKS", 0, 0.01 * R, ribbonTracking, "center");
    ctx.restore();
  }

  ctx.globalAlpha = prev;
}
