import manifest from "./art-manifest.json";
import { FILM, PALETTE, fallbacksOf, type Beat, type Drift, type FrameCount, type SceneId } from "./story";

/**
 * Resolves the pictures named in story.ts to real files. art-manifest.json is written by
 * scripts/fetch-artwork.mjs (run by the "Fetch artwork" GitHub Action) and may contain
 *   scenes — the painted stills (public/art/scenes/<id>.webp)
 *   clips  — the frame sequences sliced from generated video (public/art/film/<id>/fNNN.webp)
 * Either key may be missing. Until a still has been painted or a clip has been sliced, the beat
 * plays its fallback still; until even that exists, a painted placeholder — a lit lapis or paper
 * wall — stands in so the site still runs.
 */
export type ArtEntry = {
  /** Beat this picture belongs to (FILM index). */
  beat: string;
  scene: SceneId;
  /** Asset id actually resolved (the beat's own still, or the fallback that stands in for it). */
  asset: string;
  drift: Drift;
  /** Dominant surface of the painting: captions and annotations adapt their colours. */
  tone: "lapis" | "paper";
  alt: string;
};

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

export type ClipAsset = {
  id: string;
  /** Number of frames on disk. */
  frames: number;
  fps: number;
  width: number;
  height: number;
  lqip: string | null;
  /** URL of frame i (0-based); `small` picks the 640px set for phones. */
  frameUrl: (i: number, small: boolean) => string;
};

type ManifestScene = { width: number; height: number; focal?: [number, number]; lqip?: string };
type ManifestClip = { frames: number; fps?: number; width: number; height: number; lqip?: string };
type Manifest = {
  scenes?: Record<string, ManifestScene>;
  /** The pipeline writes a map keyed by id; a list with `id` fields is accepted as well. */
  clips?: Record<string, ManifestClip> | Array<ManifestClip & { id: string }>;
};

const raw = manifest as unknown as Manifest;
const scenes: Record<string, ManifestScene> = raw.scenes ?? {};
const clips: Record<string, ManifestClip> = Array.isArray(raw.clips) ? Object.fromEntries(raw.clips.map((c) => [c.id, c])) : (raw.clips ?? {});

const IDENTITY: Drift = { from: [1, 0, 0], to: [1, 0, 0] };

/** The asset id a beat's still resolves to today: its own still, else the first fallback that exists, else null. */
export function resolveStill(beat: Beat): string | null {
  const chain = beat.media.kind === "still" ? [beat.media.asset, ...fallbacksOf(beat.media)] : fallbacksOf(beat.media);
  return chain.find((id) => Boolean(scenes[id])) ?? null;
}

/** The still (or fallback still) of one beat. */
export function stillFor(beat: Beat): ArtAsset {
  const id = resolveStill(beat);
  const entry: ArtEntry = {
    beat: beat.id,
    scene: beat.scene,
    asset: id ?? (beat.media.kind === "still" ? beat.media.asset : fallbacksOf(beat.media)[0] ?? beat.media.clip),
    drift: beat.media.drift ?? IDENTITY,
    tone: beat.tone,
    alt: beat.alt,
  };
  const m = id ? scenes[id] : undefined;
  if (!id || !m) {
    return { entry, src: null, srcSmall: null, lqip: null, width: 3, height: 2, focal: [0.5, 0.5] };
  }
  return {
    entry,
    src: `/art/scenes/${id}.webp`,
    srcSmall: `/art/scenes/${id}-sm.webp`,
    lqip: m.lqip ?? null,
    width: m.width,
    height: m.height,
    focal: m.focal ?? [0.5, 0.5],
  };
}

/** One still per beat of FILM (index-aligned): what a beat shows when it has no frames. */
export function artAssets(): ArtAsset[] {
  return FILM.map(stillFor);
}

/** The clip of a beat, when its frames have been sliced; null for stills and for clips not yet run. */
export function clipFor(beat: Beat): ClipAsset | null {
  if (beat.media.kind !== "clip") return null;
  return clipAsset(beat.media.clip);
}

export function clipAsset(id: string): ClipAsset | null {
  const c = clips[id];
  if (!c || !(c.frames > 0)) return null;
  return {
    id,
    frames: c.frames,
    fps: c.fps ?? 10,
    width: c.width,
    height: c.height,
    lqip: c.lqip ?? null,
    frameUrl: (i, small) => `/art/film/${id}/${small ? "sm/" : ""}f${String(i + 1).padStart(3, "0")}.webp`,
  };
}

/** Every clip that has frames on disk. */
export function clipAssets(): ClipAsset[] {
  return Object.keys(clips)
    .map(clipAsset)
    .filter((c): c is ClipAsset => c !== null);
}

/** Frame counts for story.ts's frameAt(): 0 for clips that have not been sliced yet. */
export const clipFrameCount: FrameCount = (id) => clips[id]?.frames ?? 0;

/** True when at least the first picture exists. */
export function hasArtwork(): boolean {
  return resolveStill(FILM[0]) !== null;
}

/**
 * A stand-in painting drawn on a canvas: a flat wall in the beat's tone with one soft light from
 * the upper left and a faint floor line. Used while the real stills are not in the repository yet.
 */
export function placeholderCanvas(entry: Pick<ArtEntry, "tone">, width = 1200, height = 800): HTMLCanvasElement {
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
