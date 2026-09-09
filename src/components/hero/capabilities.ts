"use client";

/**
 * Decides which renderer the visitor gets.
 *   webgl  → the film: a full-screen shader that scrubs clips frame by frame, drifts the stills and
 *            dissolves, ripples or curtains one beat into the next. Cheap enough for phones, so it is
 *            the default wherever WebGL works.
 *   canvas → 2D canvas cross-fades (no WebGL, software GL, or save-data)
 *   static → no animation (prefers-reduced-motion, or explicitly requested)
 */
export type RenderTier = "webgl" | "canvas" | "static";

export function detectTier(): RenderTier {
  if (typeof window === "undefined") return "static";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return "static";

  const params = new URLSearchParams(window.location.search);
  const forced = params.get("render");
  if (forced === "webgl" || forced === "canvas" || forced === "static") return forced;

  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (saveData) return "canvas";

  const gl = probeWebGL();
  if (!gl.ok) return "canvas";
  if (gl.software) return "canvas";
  return "webgl";
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

/** Device pixel ratio cap to keep fill-rate sane (the dissolve shader samples noise per pixel). */
export function dprCap(tier: RenderTier): number {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  return tier === "webgl" ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
}

/** Phones and small tablets get the smaller image files. */
export function wantsSmallArt(): boolean {
  if (typeof window === "undefined") return false;
  return Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio || 1, 2) <= 1400;
}
