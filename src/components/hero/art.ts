import manifest from "./art-manifest.json";
import { FILM, PALETTE, fallbacksOf, type Beat, type Drift, type SceneId } from "./story";

/**
 * Resolves the pictures named in story.ts to real files. art-manifest.json is written by
 * scripts/fetch-artwork.mjs (run by the "Fetch artwork" GitHub Action) and may contain
 *   scenes — the painted stills (public/art/scenes/<id>.webp)
 *   clips  — the encoded film clips (public/art/film/<id>/clip.webm and clip.mp4, the ≤1280-wide
 *            clip-sm.* variants for phones, and poster.webp / poster-sm.webp: the first frame).
 *            The bridges — the clips that carry one beat into the next (story.ts `bridge`) — are
 *            ordinary entries here; `bridgeFor` resolves a beat's, and a bridge that is missing
 *            simply does not exist for the film.
 * Either key may be missing. Until a still has been painted or a clip has been encoded, the beat
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

/** The encoded files of one clip: VP9 first, H.264 as the fallback; the small variants are ≤1280 wide. */
export type ClipVideo = { webm: string; mp4: string; webmSmall: string; mp4Small: string };

export type ClipAsset = {
  id: string;
  /** Size of the encoded video (the large variant; the small one keeps the aspect). */
  width: number;
  height: number;
  aspect: number;
  /** The output timeline: seconds and frames per second (a loop clip is twice its source). */
  duration: number;
  fps: number;
  reverse: boolean;
  trim: [number, number] | null;
  /** A seamless ping-pong loop: the element loops and never ends. */
  loop: boolean;
  /** Seconds into the output at which the gavel meets the block, or null. */
  impactAt: number | null;
  video: ClipVideo;
  /** The first frame, 1200 / 640 wide: shown until the video has one, and instead of it when video is off. */
  poster: string | null;
  posterSmall: string | null;
  lqip: string | null;
};

type ManifestScene = { width: number; height: number; focal?: [number, number]; lqip?: string };
type ManifestClip = {
  width: number;
  height: number;
  aspect?: number;
  duration?: number;
  fps?: number;
  reverse?: boolean;
  trim?: [number, number] | null;
  loop?: boolean;
  impactAt?: number | null;
  video?: Partial<ClipVideo>;
  poster?: string;
  posterSmall?: string;
  lqip?: string;
};
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

/** One still per beat of FILM (index-aligned): what a beat shows when it has no clip. */
export function artAssets(): ArtAsset[] {
  return FILM.map(stillFor);
}

/** The clip of a beat, when it has been encoded; null for stills and for clips not yet run. */
export function clipFor(beat: Beat): ClipAsset | null {
  if (beat.media.kind !== "clip") return null;
  return clipAsset(beat.media.clip);
}

export function clipAsset(id: string): ClipAsset | null {
  const c = clips[id];
  const v = c?.video;
  if (!c || !v || !(v.webm || v.mp4) || !(c.width > 0 && c.height > 0)) return null;
  // Every encoded clip has all four files; a partial record still plays with what it has.
  const webm = v.webm ?? v.mp4!;
  const mp4 = v.mp4 ?? v.webm!;
  return {
    id,
    width: c.width,
    height: c.height,
    aspect: c.aspect ?? c.width / c.height,
    duration: c.duration ?? 0,
    fps: c.fps ?? 24,
    reverse: c.reverse ?? false,
    trim: c.trim ?? null,
    loop: c.loop ?? false,
    impactAt: typeof c.impactAt === "number" && Number.isFinite(c.impactAt) ? c.impactAt : null,
    video: { webm, mp4, webmSmall: v.webmSmall ?? webm, mp4Small: v.mp4Small ?? mp4 },
    poster: c.poster ?? null,
    posterSmall: c.posterSmall ?? c.poster ?? null,
    lqip: c.lqip ?? null,
  };
}

/** The bridge that leads into a beat, when it has been encoded; null for beats without one. */
export function bridgeFor(beat: Beat): ClipAsset | null {
  return beat.bridge ? clipAsset(beat.bridge.clip) : null;
}

/** Ids of the beats whose incoming junction is a cut into an encoded bridge: what `frameAt` takes as `cuts`. */
export function bridgedBeats(): Set<string> {
  return new Set(FILM.filter((b, i) => i > 0 && bridgeFor(b) !== null).map((b) => b.id));
}

/** Every clip that has been encoded. */
export function clipAssets(): ClipAsset[] {
  return Object.keys(clips)
    .map(clipAsset)
    .filter((c): c is ClipAsset => c !== null);
}

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
