/**
 * Composition for the canvas renderer. Every anchor is derived from the canvas size once (on resize)
 * so the scenes never do layout maths in the frame loop.
 *
 * Portrait phones: the captions sit bottom-left / bottom-right (TextOverlay), so every focal object
 * lives in the upper ~60% of the frame and the picture composes vertically.
 * Landscape tablets: captions sit at mid-height left or right; the picture composes like the desktop,
 * with the machine drifting to the side opposite the caption.
 */

import type { Fonts, Gfx } from "./helpers";
import { lerp } from "./helpers";
import { ramp } from "../story";

export type Pt = { x: number; y: number };

export type Layout = {
  key: string;
  w: number;
  h: number;
  /** reference size: min(w, h) */
  s: number;
  portrait: boolean;
  /** the advocate: centre x, floor y, full height */
  fig: { cx: number; feetY: number; H: number };
  /** where the gavel lands */
  strike: Pt;
  /** base radius of an IP element while its caption is readable */
  objR: number;
  /** display positions: [0] left of the figure, [1] right */
  display: [Pt, Pt];
  /** where each element settles after its caption (clear of every caption block) */
  rest: Pt[];
  /** band the drifting inscriptions travel through (y range) */
  insBand: { y0: number; y1: number };
  /** machine scale units */
  gearU: number;
  plateR: number;
  emblemR: number;
  mapM: number;
  legalR: number;
  /** machine focal y (portrait keeps everything high) */
  focusY: number;
  /** how far the focal point drifts sideways on landscape (0 on portrait) */
  focusShift: number;
  mapC: Pt;
  legalC: Pt;
  /** offset of the big gear's centre from the machine focus, in gear units */
  gearAnchor: Pt;
};

export function makeLayout(w: number, h: number): Layout {
  const portrait = h > w * 1.05;
  const s = Math.min(w, h);
  const H = portrait ? h * 0.72 : h * 0.78;
  const fig = { cx: portrait ? w * 0.52 : w * 0.62, feetY: portrait ? h * 0.9 : h * 0.93, H };
  // the sound block stands at the advocate's left hand (viewer's right), away from the bottom-left captions
  const strike = { x: fig.cx + 0.25 * H, y: fig.feetY - 0.33 * H };
  const objR = portrait ? Math.min(s * 0.13, 64) : Math.min(s * 0.15, 96);
  const display: [Pt, Pt] = portrait
    ? [
        { x: w * 0.24, y: h * 0.3 },
        { x: w * 0.76, y: h * 0.3 },
      ]
    : [
        { x: w * 0.22, y: h * 0.3 },
        { x: w * 0.82, y: h * 0.3 },
      ];
  // (the site header covers the top ~9% of a phone screen; nothing settles under it)
  const rest: Pt[] = portrait
    ? [
        { x: w * 0.14, y: h * 0.19 },
        { x: w * 0.86, y: h * 0.18 },
        { x: w * 0.34, y: h * 0.135 },
        { x: w * 0.68, y: h * 0.13 },
        { x: w * 0.14, y: h * 0.31 },
      ]
    : [
        { x: w * 0.09, y: h * 0.17 },
        { x: w * 0.91, y: h * 0.16 },
        { x: w * 0.24, y: h * 0.09 },
        { x: w * 0.78, y: h * 0.08 },
        { x: w * 0.07, y: h * 0.32 },
      ];
  const insBand = portrait ? { y0: h * 0.42, y1: h * 0.55 } : { y0: h * 0.74, y1: h * 0.85 };
  const gearU = portrait ? s * 0.24 : s * 0.16;
  const plateR = portrait ? s * 0.27 : s * 0.21;
  const emblemR = portrait ? s * 0.26 : s * 0.21;
  const mapM = portrait ? Math.min(s * 0.86, h * 0.42) : s * 0.62;
  const legalR = portrait ? s * 0.2 : s * 0.13;
  const focusY = portrait ? h * 0.36 : h * 0.5;
  const focusShift = portrait ? 0 : w * 0.22;
  const mapC = { x: w * 0.5, y: portrait ? h * 0.38 : h * 0.5 };
  const legalC = { x: w * 0.5, y: portrait ? h * 0.66 : h * 0.72 };
  const gearAnchor = portrait ? { x: -1.55, y: 0.45 } : { x: -0.9, y: 0.55 };
  return {
    key: `${Math.round(w)}x${Math.round(h)}`,
    w,
    h,
    s,
    portrait,
    fig,
    strike,
    objR,
    display,
    rest,
    insBand,
    gearU,
    plateR,
    emblemR,
    mapM,
    legalR,
    focusY,
    focusShift,
    mapC,
    legalC,
    gearAnchor,
  };
}

/**
 * Focal point of the machine acts (scenes 4–7). On landscape the picture sits opposite the caption:
 * patents (caption left) → right, designs (caption right) → left, and so on. Blended across the
 * scene boundaries so the focal point glides rather than jumps.
 */
export function machineFocus(L: Layout, p: number, out: Pt): void {
  let side = 1;
  side = lerp(side, -1, ramp(p, 0.55, 0.585));
  side = lerp(side, 1, ramp(p, 0.66, 0.695));
  side = lerp(side, -1, ramp(p, 0.77, 0.805));
  side = lerp(side, 0, ramp(p, 0.88, 0.905));
  out.x = L.w * 0.5 + side * L.focusShift;
  out.y = L.focusY;
}

/**
 * The figure act's "camera": a uniform zoom `k` about the pivot plus a small pan. Applied to the
 * room, the advocate, the floating objects and the strike so a dolly-in and a hint of orbit read
 * without any per-object maths.
 */
export type FigureCamera = { k: number; px: number; py: number; dx: number; dy: number };

/** One mutable frame record shared by every scene; the renderer refreshes it each draw. */
export type Frame = {
  ctx: CanvasRenderingContext2D;
  L: Layout;
  fonts: Fonts;
  gfx: Gfx;
  w: number;
  h: number;
  s: number;
  dpr: number;
  portrait: boolean;
  /** eased progress 0–1 */
  p: number;
  /** wall time, seconds */
  t: number;
  /** seconds since the last frame (clamped) */
  dt: number;
  /** smoothed |dp/dt| in progress per second */
  vel: number;
  /** seconds since the gavel struck; −1 while idle */
  strikeAge: number;
  /** machine focal point for this frame (machineFocus) */
  focus: Pt;
  /** figure-act camera for this frame */
  cam: FigureCamera;
  /** screen-space point where the gavel landed (L.strike through `cam`) */
  strikeScreen: Pt;
};

/** Maps a room-space point through the figure camera into screen space. */
export function camToScreen(cam: FigureCamera, x: number, y: number, out: Pt): Pt {
  out.x = cam.px + (x - cam.px) * cam.k + cam.dx;
  out.y = cam.py + (y - cam.py) * cam.k + cam.dy;
  return out;
}
