"use client";

/**
 * Decides which renderer the visitor gets.
 *   webgl  → full Three.js experience (desktop-class devices with a capable GPU)
 *   canvas → 2.5D canvas renderer (phones, tablets, weak GPUs, WebGL unavailable)
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

  const width = Math.min(window.innerWidth, window.innerHeight * 1.8);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

  if (saveData) return "canvas";
  if (width < 900 || coarse) return "canvas";
  if (memory < 4 || cores < 4) return "canvas";

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

/** Device pixel ratio cap to keep fill-rate sane. */
export function dprCap(tier: RenderTier): number {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  return tier === "webgl" ? Math.min(dpr, 1.75) : Math.min(dpr, 2);
}
