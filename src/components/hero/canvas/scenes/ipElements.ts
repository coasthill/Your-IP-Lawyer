/**
 * Scene 2 — THE FIVE IP SUBJECTS (0.10 → 0.42).
 *
 * Each element emerges from the gown's hip on the side OPPOSITE its caption, rises to its display
 * position for the caption's hold (centred on 0.13 + i·0.042, hold 0.03), then drifts to a rest slot
 * in the upper corners at a smaller scale. All stay until the gavel knocks them back and dissolves
 * them (0.385 → 0.42). Secondary inscriptions drift past as faint engraved text.
 * Positions are room space (drawn under the figure camera). Deterministic in progress; the
 * wall-time kick after the strike is the one exception.
 */

import { IP_INSCRIPTIONS, PALETTE, ramp, window01 } from "../../story";
import { easeOutBack, easeOutCubic, lerp, rgba, tracked, type Fonts } from "../helpers";
import type { Frame, Layout, Pt } from "../layout";
import { gownHip } from "./figure";
import { knockback } from "./gavel";
import { buildMotifKit, drawMapFragment, drawOrnament, drawPages, drawSeal, drawSheet, type MotifKit } from "./motifs";

const COUNT = 5;
const CAPTION_HOLD = 0.03;

let kit: MotifKit | null = null;
let layoutKey = "";
let insFont = "";
let insSize = 14;
const hip: Pt = { x: 0, y: 0 };

const INS_DARK = rgba(PALETTE.ink, 0.85);
const INS_LIGHT = PALETTE.bronze2;

function captionAt(i: number): number {
  return 0.13 + i * 0.042;
}

export function resizeElements(L: Layout, fonts: Fonts): void {
  if (L.key === layoutKey && kit) return;
  layoutKey = L.key;
  kit = buildMotifKit(L.objR, fonts);
  insSize = Math.min(18, Math.max(12, L.s * 0.034));
  insFont = `italic 500 ${insSize.toFixed(1)}px ${fonts.display}`;
}

/** The drifting inscriptions ("Trade Secrets", "Passing Off"…), engraved faintly in the room. */
export function drawInscriptions(ctx: CanvasRenderingContext2D, f: Frame): void {
  const { L, p, w } = f;
  const global = window01(p, 0.115, 0.16, 0.3, 0.345);
  if (global <= 0.002) return;
  const prev = ctx.globalAlpha;
  ctx.font = insFont;
  ctx.textBaseline = "middle";
  const band = L.insBand;
  for (let i = 0; i < IP_INSCRIPTIONS.length; i++) {
    const a = 0.105 + i * 0.027;
    const own = window01(p, a, a + 0.03, a + 0.1, a + 0.15);
    const al = global * own * 0.34;
    if (al <= 0.003) continue;
    const fx = 0.1 + ((i * 0.37) % 1) * 0.8;
    const fy = (i * 0.61) % 1;
    const sp = (i % 2 === 0 ? 1 : -1) * (0.5 + 0.5 * ((i * 0.23) % 1));
    const x = fx * w - (p - 0.1) * w * 0.9 * sp;
    const y = band.y0 + (band.y1 - band.y0) * fy;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.05 + fy * 0.08);
    ctx.globalAlpha = prev * al;
    ctx.fillStyle = INS_DARK;
    tracked(ctx, IP_INSCRIPTIONS[i], 1, 1, insSize * 0.12, "center");
    ctx.fillStyle = INS_LIGHT;
    tracked(ctx, IP_INSCRIPTIONS[i], 0, 0, insSize * 0.12, "center");
    ctx.restore();
  }
  ctx.globalAlpha = prev;
}

/** The five elements (room space). */
export function drawElements(ctx: CanvasRenderingContext2D, f: Frame): void {
  if (!kit) return;
  const { L, gfx, p, t } = f;
  if (p < 0.085 || p > 0.425) return;
  const H = L.fig.H;
  const kb = knockback(p);
  const kick = f.strikeAge >= 0 && f.strikeAge < 0.6 ? easeOutCubic(f.strikeAge / 0.6) : 0;
  const prev = ctx.globalAlpha;
  for (let i = 0; i < COUNT; i++) {
    const c = captionAt(i);
    const e = ramp(p, c - 0.036, c - 0.004);
    if (e <= 0) continue;
    const l = ramp(p, c + CAPTION_HOLD, c + CAPTION_HOLD + 0.045);
    const side = i % 2 === 0 ? -1 : 1;
    gownHip(L, side, hip);
    const disp = L.display[side < 0 ? 0 : 1];
    const rest = L.rest[i];
    let x = lerp(lerp(hip.x, disp.x, e), rest.x, l);
    let y = lerp(lerp(hip.y, disp.y, e), rest.y, l) - Math.sin(Math.PI * e) * 0.06 * H + Math.sin(t * 0.8 + i * 1.3) * 0.006 * H;
    let sc = easeOutBack(e) * lerp(1, 0.55, l);
    let alpha = Math.min(1, e * 1.4);
    if (kb > 0 || kick > 0) {
      let dx = x - L.strike.x;
      let dy = y - L.strike.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const push = kb * 0.35 * H + kick * 0.05 * H;
      x += dx * push;
      y += dy * push - kb * 0.05 * H;
      alpha *= 1 - kb;
      sc *= 1 - 0.35 * kb;
    }
    if (alpha <= 0.003 || sc <= 0.01) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = prev * alpha;
    const unseen = 1 - e;
    switch (i) {
      case 0: {
        ctx.rotate(-1.6 * unseen + kb * 1.2);
        ctx.scale(sc * Math.max(0.08, Math.cos(unseen * 1.45)), sc);
        drawSeal(ctx, gfx, kit);
        break;
      }
      case 1: {
        ctx.rotate(-0.1 + unseen * 0.5 - kb * 0.8);
        ctx.scale(sc * (0.06 + 0.94 * easeOutCubic(e)), sc);
        drawSheet(ctx, gfx, kit);
        break;
      }
      case 2: {
        ctx.rotate(kb * 0.9);
        ctx.scale(sc, sc);
        drawPages(ctx, gfx, kit, t, unseen + kb);
        break;
      }
      case 3: {
        const rot = t * 0.22 + unseen * 2 + kb * 1.5;
        ctx.rotate(rot);
        ctx.scale(sc, sc);
        drawOrnament(ctx, gfx, kit, rot);
        break;
      }
      default: {
        ctx.rotate(0.08 - unseen * 0.8 + kb);
        ctx.scale(sc, sc * (0.85 + 0.15 * e));
        drawMapFragment(ctx, gfx, kit, t, window01(p, c - 0.01, c + 0.01, c + CAPTION_HOLD + 0.02, c + CAPTION_HOLD + 0.06) * 0.9 + 0.1);
        break;
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha = prev;
}
