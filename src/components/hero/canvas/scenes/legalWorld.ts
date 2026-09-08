/**
 * Scene 8 — THE LEGAL WORLD (0.89 → 1.00).
 *
 * The five motifs return small — seal, gear, page, ornament, marker — as a pentagon constellation
 * joined by hairlines over a faint ruled legal document; four words fade in around them:
 * IP LITIGATION · DISPUTE RESOLUTION · LEGAL RESEARCH · IP COMMENTARY. From 0.96 everything dims
 * and contracts, and the frame fades to the ink of the page below by 1.0.
 */

import { PALETTE, ramp, smoothstep } from "../../story";
import { TAU, easeOutCubic, mixHex, rgba, roseOrnamentPath, tracked, type Fonts, type Gfx, type Stops } from "../helpers";
import type { Frame, Layout } from "../layout";
import { buildMotifKit, drawMarker, drawSeal, drawSmallGear, type MotifKit } from "./motifs";

const WORDS: ReadonlyArray<readonly [string, number, number, "left" | "right"]> = [
  ["IP LITIGATION", -1, -1, "left"],
  ["DISPUTE RESOLUTION", 1, -1, "right"],
  ["LEGAL RESEARCH", -1, 1, "left"],
  ["IP COMMENTARY", 1, 1, "right"],
];

const DOC = mixHex(PALETTE.ink, PALETTE.bone, 0.45);
const RULE = PALETTE.bronzeDim;
const HAIRLINE = PALETTE.bronze;
const WORD = PALETTE.bone;
const ROSE = PALETTE.bronze2;
const BEAD = PALETTE.bronze;
const PAGE_EDGE = rgba(PALETTE.ink, 0.4);
const PAGE: Stops = [
  [0, PALETTE.parchment],
  [1, "#bfb39a"],
];

let layoutKey = "";
let R = 0;
let kit: MotifKit | null = null;
let rose: Path2D | null = null;
let fontWords = "";
let wordTracking = 0;
let wordX = 0;
let wordY = 0;
const px = new Float32Array(5);
const py = new Float32Array(5);

export function resizeLegalWorld(L: Layout, fonts: Fonts): void {
  if (L.key === layoutKey && kit) return;
  layoutKey = L.key;
  R = L.legalR;
  kit = buildMotifKit(R * 0.3, fonts);
  rose = roseOrnamentPath(R * 0.3);
  const size = Math.max(10, Math.min(20, R * 0.16));
  fontWords = `500 ${size.toFixed(1)}px ${fonts.display}`;
  wordTracking = size * 0.16;
  wordX = 1.96 * R;
  wordY = 1.32 * R;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * TAU;
    px[i] = Math.cos(a) * R;
    py[i] = Math.sin(a) * R;
  }
}

/** A single manuscript page with faint ink lines. */
function drawPage(ctx: CanvasRenderingContext2D, gfx: Gfx, k: MotifKit): void {
  const r = k.r;
  const hw = r * 0.68;
  const hh = r * 0.9;
  ctx.fillStyle = gfx.linear(ctx, "lw-page", -hw, -hh, hw, hh, PAGE);
  ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = PAGE_EDGE;
  ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
  ctx.lineWidth = Math.max(0.6, r * 0.02);
  ctx.strokeStyle = rgba(PALETTE.bronzeDim, 0.75);
  ctx.stroke(k.inkLines);
}

export function drawLegalWorld(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { p, t, gfx, L } = f;
  if (p < 0.88 || !kit || !rose) return;
  const end = smoothstep((p - 0.96) / 0.038);
  const keep = 1 - end;
  if (keep <= 0.003) return;
  const cx = L.legalC.x;
  const cy = L.legalC.y;
  const s = 1 - 0.2 * end;
  const prev = ctx.globalAlpha;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  // the ruled document
  const docIn = ramp(p, 0.885, 0.92);
  if (docIn > 0.003) {
    const hw = 2.12 * R;
    const hh = 1.53 * R;
    ctx.globalAlpha = prev * 0.16 * docIn * keep;
    ctx.fillStyle = DOC;
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2);
    ctx.globalAlpha = prev * 0.28 * docIn * keep;
    ctx.strokeStyle = RULE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const x0 = -hw + hw * 0.14;
    const x1 = hw - hw * 0.12;
    for (let i = 0; i < 22; i++) {
      const y = -hh + hh * 0.2 + (i / 21) * hh * 1.6;
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.moveTo(x0 + hw * 0.14, -hh);
    ctx.lineTo(x0 + hw * 0.14, hh);
    ctx.moveTo(x0 + hw * 0.16, -hh);
    ctx.lineTo(x0 + hw * 0.16, hh);
    ctx.stroke();
  }

  // hairlines: the pentagon and its spokes
  const lines = ramp(p, 0.9, 0.94) * keep;
  if (lines > 0.003) {
    ctx.globalAlpha = prev * 0.32 * lines;
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const j = (i + 1) % 5;
      ctx.moveTo(px[i], py[i]);
      ctx.lineTo(px[j], py[j]);
      ctx.moveTo(px[i], py[i]);
      ctx.lineTo(0, 0);
    }
    ctx.stroke();
  }

  // the five motifs
  for (let i = 0; i < 5; i++) {
    const arrive = easeOutCubic((p - (0.893 + i * 0.008)) / 0.04) * keep;
    if (arrive <= 0.01) continue;
    ctx.save();
    ctx.translate(px[i], py[i]);
    ctx.scale(arrive, arrive);
    ctx.globalAlpha = prev * Math.min(1, arrive * 1.5);
    switch (i) {
      case 0:
        drawSeal(ctx, gfx, kit);
        break;
      case 1:
        drawSmallGear(ctx, gfx, kit, -t * 0.2);
        break;
      case 2:
        ctx.rotate(0.08);
        drawPage(ctx, gfx, kit);
        break;
      case 3: {
        ctx.rotate(t * 0.05);
        ctx.lineWidth = 1;
        ctx.strokeStyle = ROSE;
        ctx.stroke(rose);
        ctx.fillStyle = BEAD;
        ctx.beginPath();
        ctx.arc(0, 0, kit.r * 0.12, 0, TAU);
        ctx.fill();
        break;
      }
      default: {
        ctx.strokeStyle = ROSE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, kit.r * 0.95, 0, TAU);
        ctx.stroke();
        drawMarker(ctx, gfx, 0, 0, kit.r * 0.95, t, 1);
        break;
      }
    }
    ctx.restore();
  }

  // the four words
  ctx.font = fontWords;
  ctx.textBaseline = "middle";
  ctx.fillStyle = WORD;
  for (let i = 0; i < WORDS.length; i++) {
    const [text, sx, sy, align] = WORDS[i];
    const a = ramp(p, 0.905 + i * 0.008, 0.935 + i * 0.008) * keep;
    if (a <= 0.003) continue;
    ctx.globalAlpha = prev * a;
    tracked(ctx, text, sx * wordX, sy * wordY, wordTracking, align);
  }
  ctx.restore();
  ctx.globalAlpha = prev;
}

/** The picture darkens into the ink of the page below (drawn over every scene, under the grain). */
export function drawFadeOut(ctx: CanvasRenderingContext2D, f: Frame): void {
  const a = ramp(f.p, 0.955, 0.995);
  if (a <= 0.003) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * a;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(0, 0, f.w, f.h);
  ctx.globalAlpha = prev;
}
