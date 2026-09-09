"use client";

import { artAssets, clipFor, placeholderCanvas, type ArtAsset, type ClipAsset } from "../art";
import { FILM, type Beat } from "../story";

/**
 * Loads the film progressively. Every beat gets a Reel: whatever is currently drawable for it.
 *   still beats — the tiny blurred placeholder (or a painted stand-in when no artwork exists yet),
 *                 then the real file when it arrives.
 *   clip beats  — the fallback still until the first frame has loaded, then the nearest LOADED
 *                 frame to the one asked for. Frames are plain Image elements kept in an array
 *                 (the browser holds the compressed bytes; decoding on upload is fine).
 * Stills load first, in story order (the first painting before anything else, so the loader can
 * lift). Frames load sequentially, at most 4 in flight, starting with the beat on screen, then
 * the next beat, then the previous — see `focus()`.
 */
export type Source = {
  /** Whatever is drawable right now: LQIP, placeholder, the painting, or a frame. */
  image: TexImageSource;
  /** Pixel size the fit is computed against (the real picture's size, so cropping is stable). */
  width: number;
  height: number;
  /** Focal point in texture space (y up). */
  focal: [number, number];
};

export type Reel = {
  beat: Beat;
  /** The still (or fallback still) of the beat. */
  asset: ArtAsset;
  /** The clip, when frames exist on disk. */
  clip: ClipAsset | null;
  /** True once the still (or the first frame) is fully loaded. */
  loaded: boolean;
  /** Bumped whenever something drawable changed (renderers redraw on it). */
  version: number;
  /** The drawable for frame index i (nearest loaded frame, else the fallback still). */
  sourceFor: (frame: number) => Source;
  /** The frame index `sourceFor` would actually draw for i (-1 while no frame is loaded). */
  nearestLoaded: (frame: number) => number;
};

export type MediaSet = {
  reels: Reel[];
  /** Resolves when the first picture is fully loaded (or after `firstTimeout` ms, whichever is first). */
  first: Promise<void>;
  /** Tell the loader which beat is on screen: its frames go first, then the next, then the previous. */
  focus: (beat: number) => void;
  cancel: () => void;
};

/** What the renderers expose on `window.__yilFrame` for QA scripts. */
export type FrameDebug = { p: number; a: number; b: number; mix: number; beat: number; frame: number };

const MAX_IN_FLIGHT = 4;

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

export function loadMedia(opts: { small: boolean; firstTimeout?: number; onUpdate?: (beat: number) => void }): MediaSet {
  const assets = artAssets();
  let cancelled = false;

  type State = {
    still: Source;
    frames: (HTMLImageElement | null)[];
    inFlight: Set<number>;
    /** Number of frames loaded — the loader is sequential, so this is (almost always) a prefix. */
    loadedFrames: number;
    failedFrames: number;
    lqipFrame: HTMLImageElement | null;
  };
  const states: State[] = assets.map((asset) => ({
    still: {
      image: placeholderCanvas(asset.entry, 96, 64),
      width: asset.width,
      height: asset.height,
      focal: [asset.focal[0], 1 - asset.focal[1]],
    },
    frames: [],
    inFlight: new Set(),
    loadedFrames: 0,
    failedFrames: 0,
    lqipFrame: null,
  }));

  const reels: Reel[] = FILM.map((beat, i) => {
    const clip = clipFor(beat);
    const st = states[i];
    if (clip) st.frames = new Array<HTMLImageElement | null>(clip.frames).fill(null);
    const frameSource = (img: HTMLImageElement): Source => ({ image: img, width: clip!.width, height: clip!.height, focal: [0.5, 0.5] });
    const nearestLoaded = (frame: number): number => {
      if (!clip || st.loadedFrames === 0) return -1;
      const n = st.frames.length;
      const f = Math.min(n - 1, Math.max(0, Math.round(frame)));
      if (st.frames[f]) return f;
      for (let d = 1; d < n; d++) {
        if (f - d >= 0 && st.frames[f - d]) return f - d;
        if (f + d < n && st.frames[f + d]) return f + d;
      }
      return -1;
    };
    const reel: Reel = {
      beat,
      asset: assets[i],
      clip,
      loaded: false,
      version: 0,
      nearestLoaded,
      sourceFor: (frame) => {
        const f = nearestLoaded(frame);
        if (f >= 0) return frameSource(st.frames[f]!);
        // No frame yet: the fallback still (or, when there is no still at all, the clip's own LQIP).
        if (clip && !assets[i].src && st.lqipFrame) return frameSource(st.lqipFrame);
        return st.still;
      },
    };
    return reel;
  });

  const bump = (i: number) => {
    if (cancelled) return;
    reels[i].version++;
    opts.onUpdate?.(i);
  };

  /* ---------------- stills ---------------- */
  const loadStill = async (i: number) => {
    const a = assets[i];
    const st = states[i];
    if (!a.src) {
      // A clip without a fallback still shows its own blurred first frame while frames load.
      const clip = reels[i].clip;
      if (clip?.lqip) {
        try {
          st.lqipFrame = await decode(clip.lqip);
          bump(i);
        } catch {
          /* keep the placeholder */
        }
      }
      return;
    }
    if (a.lqip) {
      try {
        st.still = { ...st.still, image: await decode(a.lqip) };
        bump(i);
      } catch {
        /* keep the placeholder */
      }
    }
    try {
      const img = await decode(opts.small && a.srcSmall ? a.srcSmall : a.src);
      if (cancelled) return;
      st.still = { ...st.still, image: img };
      reels[i].loaded = true;
      bump(i);
    } catch {
      /* the LQIP or placeholder stays — the story still plays */
    }
  };

  /* ---------------- frames ---------------- */
  let focused = 0;
  let inFlight = 0;

  /** Beats in loading priority: the one on screen, the next, the previous, then the rest in order. */
  const order = (): number[] => {
    const seen = new Set<number>();
    const out: number[] = [];
    const push = (i: number) => {
      if (i >= 0 && i < reels.length && !seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
    };
    push(focused);
    push(focused + 1);
    push(focused - 1);
    for (let i = 0; i < reels.length; i++) push(i);
    return out;
  };

  const nextFrame = (i: number): number => {
    const st = states[i];
    for (let f = 0; f < st.frames.length; f++) if (!st.frames[f] && !st.inFlight.has(f)) return f;
    return -1;
  };

  const pump = () => {
    if (cancelled) return;
    while (inFlight < MAX_IN_FLIGHT) {
      let started = false;
      for (const i of order()) {
        const clip = reels[i].clip;
        if (!clip) continue;
        const st = states[i];
        // Give up on a clip whose files are broken rather than hammering the server.
        if (st.failedFrames > 3) continue;
        const f = nextFrame(i);
        if (f < 0) continue;
        st.inFlight.add(f);
        inFlight++;
        started = true;
        void decode(clip.frameUrl(f, opts.small))
          .then((img) => {
            st.frames[f] = img;
            st.loadedFrames++;
            reels[i].loaded = true;
            bump(i);
          })
          .catch(() => {
            st.failedFrames++;
          })
          .finally(() => {
            st.inFlight.delete(f);
            inFlight--;
            pump();
          });
        break;
      }
      if (!started) return;
    }
  };

  /* ---------------- schedule ---------------- */
  const firstLoad = loadStill(0);
  const first = Promise.race([firstLoad, new Promise<void>((r) => setTimeout(r, opts.firstTimeout ?? 4000))]);
  void firstLoad.finally(async () => {
    // Frames of the opening beat start right after the first still; the other stills follow.
    pump();
    for (let i = 1; i < assets.length && !cancelled; i++) await loadStill(i);
  });

  return {
    reels,
    first,
    focus: (beat) => {
      if (beat === focused) return;
      focused = beat;
      pump();
    },
    cancel: () => {
      cancelled = true;
    },
  };
}
