import manifest from "./art-manifest.json";
import { ART, PALETTE, type ArtEntry } from "./story";

/**
 * Resolves the paintings listed in story.ts to real files. art-manifest.json is written by
 * scripts/fetch-artwork.mjs (run by the "Fetch artwork" GitHub Action); until a scene has been
 * generated, a painted placeholder — a lit lapis or paper wall — stands in so the site still runs.
 */
export type ArtAsset = {
  entry: ArtEntry;
  /** Full-size file (desktop) or null when no artwork exists yet. */
  src: string | null;
  /** Smaller file for phones. */
  srcSmall: string | null;
  /** Tiny blurred placeholder as a data URI. */
  lqip: string | null;
  width: number;
  height: number;
  /** Focal point (0–1 from the top-left) that must stay in frame when cropping. */
  focal: [number, number];
};

type ManifestScene = { width: number; height: number; focal?: [number, number]; lqip?: string };
const scenes = (manifest as unknown as { scenes: Record<string, ManifestScene> }).scenes;

export function artAssets(): ArtAsset[] {
  return ART.map((entry) => {
    const m = scenes[entry.asset];
    if (!m) {
      return { entry, src: null, srcSmall: null, lqip: null, width: 3, height: 2, focal: [0.5, 0.5] };
    }
    return {
      entry,
      src: `/art/scenes/${entry.asset}.webp`,
      srcSmall: `/art/scenes/${entry.asset}-sm.webp`,
      lqip: m.lqip ?? null,
      width: m.width,
      height: m.height,
      focal: m.focal ?? [0.5, 0.5],
    };
  });
}

/** True when at least the first painting exists. */
export function hasArtwork(): boolean {
  return Boolean(scenes[ART[0].asset]);
}

/**
 * A stand-in painting drawn on a canvas: a flat wall in the scene's tone with one soft light from
 * the upper left and a faint floor line. Used while the real stills are not in the repository yet.
 */
export function placeholderCanvas(entry: ArtEntry, width = 1200, height = 800): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const lapis = entry.tone === "lapis";
  ctx.fillStyle = lapis ? PALETTE.lapis : PALETTE.paper;
  ctx.fillRect(0, 0, width, height);
  const light = ctx.createRadialGradient(width * 0.2, height * 0.1, 0, width * 0.2, height * 0.1, width * 0.9);
  light.addColorStop(0, lapis ? "rgba(255,243,214,0.28)" : "rgba(255,255,255,0.7)");
  light.addColorStop(1, lapis ? "rgba(8,27,72,0)" : "rgba(230,226,217,0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);
  const shade = ctx.createLinearGradient(0, height * 0.55, 0, height);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, lapis ? "rgba(8,27,72,0.55)" : "rgba(58,63,75,0.18)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = lapis ? "rgba(251,250,247,0.12)" : "rgba(18,20,24,0.12)";
  ctx.fillRect(0, Math.round(height * 0.74), width, 1);
  return canvas;
}
