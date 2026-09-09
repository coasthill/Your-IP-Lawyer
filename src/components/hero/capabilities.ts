"use client";

/**
 * Decides which renderer the visitor gets, and what it may load.
 *   webgl  → the film: a full-screen shader that plays the clips as video, drifts the stills and
 *            dissolves, ripples or curtains one beat into the next. Cheap enough for phones, so it is
 *            the default wherever WebGL works.
 *   canvas → 2D canvas cross-fades (no WebGL, software GL, or save-data)
 *   static → no animation (prefers-reduced-motion, or explicitly requested)
 * Video is switched off (posters and stills only) on save-data connections and with `?video=0`.
 */
export type RenderTier = "webgl" | "canvas" | "static";

export function detectTier(): RenderTier {
  if (typeof window === "undefined") return "static";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return "static";

  const params = new URLSearchParams(window.location.search);
  const forced = params.get("render");
  if (forced === "webgl" || forced === "canvas" || forced === "static") return forced;

  if (saveData()) return "canvas";

  const gl = probeWebGL();
  if (!gl.ok) return "canvas";
  if (gl.software) return "canvas";
  return "webgl";
}

function saveData(): boolean {
  if (typeof navigator === "undefined") return false;
  return Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
}

function probeWebGL(): { ok: boolean; software: boolean; renderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return { ok: false, software: false, renderer: "" };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    const software = /swiftshader|llvmpipe|software|mesa offscreen/i.test(renderer);
    const loseCtx = gl.getExtension("WEBGL_lose_context");
    loseCtx?.loseContext();
    return { ok: true, software, renderer };
  } catch {
    return { ok: false, software: false, renderer: "" };
  }
}

/** Device pixel ratio cap: 2 on every tier — the clips are sharp enough to deserve it. */
export function dprCap(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, 2);
}

/** Phones and small tablets get the smaller image files. */
export function wantsSmallArt(): boolean {
  if (typeof window === "undefined") return false;
  return Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio || 1, 2) <= 1400;
}

/**
 * The ≤1280-wide clip variants are for screens that cannot show more: the picture is never drawn
 * narrower than the viewport, so its width in device pixels decides.
 */
export function wantsSmallVideo(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth * Math.min(window.devicePixelRatio || 1, 2) <= 1400;
}

/** Whether the clips may play as video at all (off on save-data connections and with `?video=0`). */
export function wantsVideo(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("video") === "0") return false;
  return !saveData();
}

/** QA: `?t=<seconds>` freezes the clips on screen at that second once the page has settled (see media.ts). */
export function snapTime(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("t");
  if (raw === null) return null;
  const t = Number(raw);
  return Number.isFinite(t) && t >= 0 ? t : null;
}
