"use client";

import { artAssets, bridgeFor, clipFor, placeholderCanvas, type ArtAsset, type ClipAsset } from "../art";
import { filmEvents } from "../film-events";
import { FILM, clamp01, driftAt, lerp, smoothstep, type Beat, type Frame, type FrameRef } from "../story";

/**
 * Loads the film progressively and runs its clips. Every beat gets a Reel: whatever is drawable
 * for it right now.
 *   still beats — the tiny blurred placeholder (or a painted stand-in when no artwork exists yet),
 *                 then the painting when it arrives.
 *   clip beats  — the blurred placeholder, then the poster (the clip's first frame), then the live
 *                 <video> once it is playing (or has ended and holds its last frame). The painting
 *                 named as the beat's fallback is only fetched when there is no poster.
 * Pictures load in story order (the first beat before anything else, so the loader can lift).
 *
 * Clips are real video elements, owned lazily: at most three exist at a time — the beat on screen,
 * the next (preloaded in full before its transition begins) and the previous (metadata only) —
 * and the rest are released. Playback follows the scroll, evaluated on every progress update
 * through `update(a, b, mix)`:
 *   - a beat that becomes A, or B once the blend has started, plays its clip from the start;
 *   - a beat that is neither any more is paused and rewound, so revisiting replays it;
 *   - a clip that ends holds its last frame (loop clips never end);
 *   - a `play()` the browser refuses (autoplay policy, Low Power Mode) is retried once on the next
 *     gesture; until then the poster stands in.
 *
 * BRIDGES. A beat may name the clip that carries the beat before it into it (story.ts `bridge`):
 * it starts on the previous beat's last frame and ends on this beat's first. Its junction is then
 * a cut (`cuts`, handed to `frameAt`), and arriving at the beat forward — from the beat before it —
 * plays the bridge first, in the beat's slot, while the beat's own clip preloads; whatever the
 * scroll does inside the beat's window meanwhile, the picture is the bridge. When it ends the clip
 * starts from 0 and takes over the moment it has a decodable frame — the bridge's last frame is
 * held until then, so the swap never shows a poster. Leaving the beat mid-bridge (back across the
 * junction, or on past the beat) pauses and rewinds the bridge like any other clip; arriving
 * backward plays no bridge; a later forward arrival plays it again. While the beat before is on
 * screen the bridge, not the clip, is the preloaded "next" video; while a bridge is in flight the
 * clip preloads as well, so up to four elements exist (the beat before, the previous of that,
 * the bridge and the beat). A bridge with no playable file is dropped for good and its junction
 * gets its transition back. A bridge has no drift of its own: `cameraAt` eases the camera out of
 * the previous beat's drift over the bridge's first second and back into the beat's after the
 * handoff. The strike's impact is watched on the strike clip only, never during its bridge.
 *
 * The strike clip's `impactAt` is watched: the first time its clock crosses it during a play, one
 * `impact` event goes out on the film bus (the sound and the flash hang off it); every bridge
 * arrival sends a `bridge` event (QA counts them on `window.__yilBridges`).
 * Nothing plays before `reveal()`: the stage is behind the loader until then, and the opening clip
 * must not have finished before anyone sees it (it is preloaded meanwhile).
 * With video off (save-data, `?video=0`) no video element is created: posters and stills only, and
 * no bridges; `?bridge=0` switches the bridges off alone.
 * QA (`?snap`): the renderer calls `settle()` once a jump in progress has come to rest; the clips
 * on screen (a showing bridge included) then replay from the start — or, with `holdAt` (`?t=`),
 * are sought to that second and paused — so a capture taken a moment later is deterministic and
 * can show a clip mid-motion.
 */
export type VideoState = "idle" | "loading" | "playing" | "ended" | "failed";

export type Source = {
  /** Whatever is drawable right now: LQIP, placeholder, the painting, the poster or the video. */
  image: TexImageSource;
  /** Pixel size the fit is computed against (the real picture's size, so cropping is stable). */
  width: number;
  height: number;
  /** Focal point in texture space (y up). */
  focal: [number, number];
  /** Video only: changes whenever the video has presented a new frame (renderers re-upload on it). */
  stamp?: number;
  /** True while the drawable is the bridge into the beat (it has no drift: see `cameraAt`). */
  bridge?: boolean;
  /** When (performance.now()) the drawable took its slot at a bridge's start or end: the camera eases across that moment. */
  since?: number;
};

export type VideoInfo = {
  state: VideoState;
  time: number;
  /** The bridge into the beat is what plays (its state and time above). */
  bridge: boolean;
};

export type Reel = {
  beat: Beat;
  /** The still (or fallback still) of the beat. */
  asset: ArtAsset;
  /** The clip, when it has been encoded. */
  clip: ClipAsset | null;
  /** True once the poster or the still is fully loaded. */
  loaded: boolean;
  /** Bumped whenever something drawable changed (renderers redraw on it). */
  version: number;
  /** The drawable of this moment: the bridge or the video while it has a frame, else the poster, else the still. */
  source: () => Source;
  /** The playback state of what plays for the beat (its bridge or its clip), or null for stills and when video is off. */
  video: () => VideoInfo | null;
};

export type MediaSet = {
  reels: Reel[];
  /** Ids of the beats whose incoming junction is a cut into a bridge — hand it to `frameAt`. Shrinks when a bridge turns out to have no playable file. */
  cuts: ReadonlySet<string>;
  /** Resolves when the first beat's picture is loaded and its clip can play (or 2.5 s passed), capped by `firstTimeout`. */
  first: Promise<void>;
  /** Every progress update: the beat on screen, the beat being revealed (or null) and the blend. */
  update: (a: number, b: number | null, mix: number) => void;
  /** The loader is lifting: clips may play from now on (before this they only preload). */
  reveal: () => void;
  /** QA: a jump in progress has come to rest — replay the clips on screen, or hold them at `holdAt`. */
  settle: () => void;
  /** True while any clip or bridge is playing (renderers keep their loop running). */
  playing: () => boolean;
  cancel: () => void;
};

/** What the renderers expose on `window.__yilFrame` for QA scripts. */
export type FrameDebug = { p: number; a: number; b: number; mix: number; beat: number; video: { beat: number; time: number; state: VideoState; bridge: boolean } | null };

/** The clip `__yilFrame.video` reports: B once the blend has passed half-way (or when only B has one), else A. */
export function videoDebug(frame: Frame, reels: Reel[]): FrameDebug["video"] {
  const va = reels[frame.a.beat].video();
  const vb = frame.b ? reels[frame.b.beat].video() : null;
  const useB = frame.b !== null && vb !== null && (frame.mix > 0.5 || va === null);
  const beat = useB && frame.b ? frame.b.beat : frame.a.beat;
  const v = useB ? vb : va;
  return v ? { beat, time: v.time, state: v.state, bridge: v.bridge } : null;
}

const REST: [number, number, number] = [1, 0, 0];
/** How long the camera takes to ease across a bridge's start (out of the previous beat's drift) and its end (into the beat's). */
const CAMERA_EASE_MS = 1000;

/**
 * The camera of a slot: the beat's own drift (from `frameAt`), except around a bridge. A bridge is
 * a camera move already, so it gets none — the camera eases from the previous beat's final drift
 * to rest over the bridge's first second (the cut lands on the same picture at the same zoom), and
 * once the bridge has handed over it eases from rest into the beat's drift.
 */
export function cameraAt(ref: FrameRef, s: Source, now: number): [number, number, number] {
  if (s.since === undefined) return s.bridge ? REST : ref.drift;
  const k = smoothstep((now - s.since) / CAMERA_EASE_MS);
  const from = s.bridge ? driftAt(Math.max(0, ref.beat - 1), 1) : REST;
  const to = s.bridge ? REST : ref.drift;
  return [lerp(from[0], to[0], k), lerp(from[1], to[1], k), lerp(from[2], to[2], k)];
}

/** True while `cameraAt` is still moving for this drawable (the renderers keep drawing meanwhile). */
export function cameraMoving(s: Source, now: number): boolean {
  return s.since !== undefined && now - s.since < CAMERA_EASE_MS;
}

export type MediaOptions = {
  /** Phones: the smaller stills and posters. */
  small: boolean;
  /** Phones: the ≤1280-wide clip variants. */
  smallVideo?: boolean;
  /** Whether clips may play as video at all. */
  video: boolean;
  /** Whether the bridges may play (never without video; `?bridge=0` turns them off alone). */
  bridges?: boolean;
  /** QA: seek the clips on screen to this second once the beats have settled, then hold. */
  holdAt?: number | null;
  /** Where the (visually hidden) video elements live; the document body when absent. */
  host?: HTMLElement | null;
  firstTimeout?: number;
  onUpdate?: (beat: number) => void;
};

/** Without a frame callback a playing video is re-uploaded whenever its last known frame is older than this. */
const FRAME_STALE_MS = 120;
const HOLD_SETTLE_MS = 150;
const HAVE_METADATA = 1;
const HAVE_CURRENT_DATA = 2;
const HAVE_FUTURE_DATA = 3;
const NETWORK_LOADING = 2;
/** Every <source> was refused: nothing can be played, and a `play()` would never settle. */
const NETWORK_NO_SOURCE = 3;

function decode(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Resolves on the next `event` of `target`, or after `timeout` ms. */
function once(target: EventTarget, event: string, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    let timer = 0;
    const done = () => {
      target.removeEventListener(event, done);
      window.clearTimeout(timer);
      resolve();
    };
    target.addEventListener(event, done);
    timer = window.setTimeout(done, timeout);
  });
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** A container the video elements live in: in the document (Safari wants that), but never seen. */
function createHolder(host: HTMLElement | null | undefined): HTMLDivElement {
  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.dataset.filmVideos = "";
  holder.style.cssText = "position:absolute;left:0;top:0;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);pointer-events:none;";
  (host ?? document.body).appendChild(holder);
  return holder;
}

export function loadMedia(opts: MediaOptions): MediaSet {
  const assets = artAssets();
  const useVideo = opts.video && typeof document !== "undefined";
  const useBridges = useVideo && opts.bridges !== false;
  let cancelled = false;

  /** One video element and its playback state: a beat's clip, or the bridge into a beat. */
  type Track = {
    /** The beat (FILM index) the track draws for. */
    beat: number;
    clip: ClipAsset;
    bridge: boolean;
    video: HTMLVideoElement | null;
    vstate: VideoState;
    /** Counts presented frames (or ticks while playing when the browser has no frame callback). */
    stamp: number;
    lastFrameAt: number;
    /** QA hold: paused on a chosen frame; the rules leave it alone until the beat leaves. */
    held: boolean;
    retried: boolean;
    impactFired: boolean;
    lastTime: number;
    /** Bumped on every play/stop so a stale `play()` rejection is ignored. */
    playSeq: number;
    /** When the last `start()` happened. */
    startedAt: number;
    /** Bridges: the clip's first frame (the previous beat's last), drawn until the video has one. */
    poster: Source | null;
    posterRequested: boolean;
    /** Bridges: no playable file — the bridge is dropped and its junction keeps its transition. */
    broken: boolean;
    canplay: ReturnType<typeof deferred>;
  };
  const newTrack = (beat: number, clip: ClipAsset, bridge: boolean): Track => ({
    beat,
    clip,
    bridge,
    video: null,
    vstate: "idle",
    stamp: 0,
    lastFrameAt: 0,
    held: false,
    retried: false,
    impactFired: false,
    lastTime: 0,
    playSeq: 0,
    startedAt: 0,
    poster: null,
    posterRequested: false,
    broken: false,
    canplay: deferred(),
  });

  type State = {
    still: Source;
    poster: Source | null;
    /** The beat's clip, when it has been encoded and video is on. */
    track: Track | null;
    /** The bridge into the beat, when it has been encoded and bridges are on. */
    bridge: Track | null;
    /** The beat is A, or B while the blend has started. */
    active: boolean;
    /** The bridge is what the beat draws: it is playing, or has ended and the clip has no frame yet. */
    bridgeShowing: boolean;
    /** The bridge has ended (or given up): the clip has been started and takes over once it has a frame. */
    bridgeEnded: boolean;
    /** When the clip took over from the bridge (the camera eases in from there). */
    handoffAt: number | undefined;
  };
  const states: State[] = assets.map((asset, i) => {
    const beat = FILM[i];
    const clip = useVideo ? clipFor(beat) : null;
    const bridge = useBridges && i > 0 ? bridgeFor(beat) : null;
    return {
      still: {
        image: placeholderCanvas(asset.entry, 96, 64),
        width: asset.width,
        height: asset.height,
        focal: [asset.focal[0], 1 - asset.focal[1]],
      },
      poster: null,
      track: clip ? newTrack(i, clip, false) : null,
      bridge: bridge ? newTrack(i, bridge, true) : null,
      active: false,
      bridgeShowing: false,
      bridgeEnded: false,
      handoffAt: undefined,
    };
  });
  const cuts = new Set<string>(FILM.filter((_, i) => states[i].bridge !== null).map((b) => b.id));

  /** The focal point along a bridge: the previous beat's at its start, this beat's at its end (the cut and the swap both land in place). */
  const focalAlongBridge = (i: number, k: number): [number, number] => {
    const to = states[i].still.focal;
    const from = i > 0 ? states[i - 1].still.focal : to;
    return [lerp(from[0], to[0], k), lerp(from[1], to[1], k)];
  };

  const reels: Reel[] = FILM.map((beat, i) => {
    const clip = clipFor(beat);
    const st = states[i];
    return {
      beat,
      asset: assets[i],
      clip,
      loaded: false,
      version: 0,
      source: () => {
        const br = st.bridge;
        if (st.bridgeShowing && br) {
          const bv = br.video;
          const since = br.startedAt;
          if (bv && bv.readyState >= HAVE_CURRENT_DATA && (br.vstate === "playing" || br.vstate === "ended")) {
            const k = br.clip.duration > 0 ? clamp01(bv.currentTime / br.clip.duration) : 1;
            return { image: bv, width: br.clip.width, height: br.clip.height, focal: focalAlongBridge(i, k), stamp: br.stamp, bridge: true, since };
          }
          // Its first frame (the previous beat's last) until the video has one; failing that, the beat's own drawable.
          if (br.poster) return { ...br.poster, focal: focalAlongBridge(i, 0), bridge: true, since };
          return { ...(st.poster ?? st.still), bridge: true, since };
        }
        const tr = st.track;
        const v = tr?.video;
        if (tr && v && v.readyState >= HAVE_CURRENT_DATA && (tr.vstate === "playing" || tr.vstate === "ended")) {
          return { image: v, width: tr.clip.width, height: tr.clip.height, focal: st.still.focal, stamp: tr.stamp, since: st.handoffAt };
        }
        const s = st.poster ?? st.still;
        return st.handoffAt === undefined ? s : { ...s, since: st.handoffAt };
      },
      video: () => {
        if (!useVideo) return null;
        if (st.bridgeShowing && st.bridge) return { state: st.bridge.vstate, time: st.bridge.video?.currentTime ?? 0, bridge: true };
        return st.track ? { state: st.track.vstate, time: st.track.video?.currentTime ?? 0, bridge: false } : null;
      },
    };
  });

  const bump = (i: number) => {
    if (cancelled) return;
    reels[i].version++;
    opts.onUpdate?.(i);
  };

  /* ---------------- pictures ---------------- */
  const loadPicture = async (i: number) => {
    const a = assets[i];
    const st = states[i];
    const clip = reels[i].clip;
    // The blurred placeholder: the clip's own (it matches the poster) when there is one.
    const lqip = clip?.lqip ?? a.lqip;
    if (lqip) {
      try {
        const img = await decode(lqip);
        if (cancelled) return;
        st.still = clip?.lqip ? { ...st.still, image: img, width: clip.width, height: clip.height } : { ...st.still, image: img };
        bump(i);
      } catch {
        /* keep the placeholder */
      }
    }
    // The poster: the clip's first frame, what the video starts from.
    if (clip?.poster) {
      try {
        const img = await decode(opts.small && clip.posterSmall ? clip.posterSmall : clip.poster);
        if (cancelled) return;
        st.poster = { image: img, width: clip.width, height: clip.height, focal: st.still.focal };
        reels[i].loaded = true;
        bump(i);
        return;
      } catch {
        /* fall through to the painting */
      }
    }
    if (!a.src) return;
    try {
      const img = await decode(opts.small && a.srcSmall ? a.srcSmall : a.src);
      if (cancelled) return;
      st.still = { ...st.still, image: img, width: a.width, height: a.height };
      reels[i].loaded = true;
      bump(i);
    } catch {
      /* the LQIP or placeholder stays — the story still plays */
    }
  };

  /** A bridge's first frame: fetched with the bridge itself, so the cut has a picture before the video has decoded one. */
  const loadBridgePoster = async (tr: Track) => {
    tr.posterRequested = true;
    const src = opts.small && tr.clip.posterSmall ? tr.clip.posterSmall : tr.clip.poster;
    if (!src) return;
    try {
      const img = await decode(src);
      if (cancelled || states[tr.beat].bridge !== tr) return;
      tr.poster = { image: img, width: tr.clip.width, height: tr.clip.height, focal: states[tr.beat].still.focal };
      bump(tr.beat);
    } catch {
      /* the beat's own drawable stands in */
    }
  };

  /* ---------------- video elements ---------------- */
  const holder = useVideo ? createHolder(opts.host) : null;

  const ensureVideo = (tr: Track | null, preload: "auto" | "metadata"): HTMLVideoElement | null => {
    if (!holder || !tr || tr.broken) return null;
    if (tr.video) {
      if (preload === "auto" && tr.video.preload !== "auto") {
        tr.video.preload = "auto";
        // It only fetched its metadata so far; ask for the whole clip (it is idle, or about to be started).
        if (tr.video.readyState < HAVE_FUTURE_DATA && tr.video.networkState !== NETWORK_LOADING) tr.video.load();
      }
      return tr.video;
    }
    const clip = tr.clip;
    const v = document.createElement("video");
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.loop = clip.loop;
    v.preload = preload;
    v.disablePictureInPicture = true;
    v.disableRemotePlayback = true;
    v.setAttribute("aria-hidden", "true");
    v.tabIndex = -1;
    v.dataset.beat = FILM[tr.beat].id;
    v.dataset.clip = clip.id;
    const files = opts.smallVideo ? [clip.video.webmSmall, clip.video.mp4Small] : [clip.video.webm, clip.video.mp4];
    const types = ['video/webm; codecs="vp9"', "video/mp4"];
    files.forEach((src, k) => {
      const s = document.createElement("source");
      s.src = src;
      s.type = types[k];
      // When no source can be played at all the browser fires `error` on the last <source>, not
      // on the video (which just waits, NETWORK_NO_SOURCE, and never settles its play() promise).
      if (k === files.length - 1) {
        s.addEventListener("error", () => {
          if (tr.video !== v) return;
          tr.vstate = "failed";
          if (tr.bridge) tr.broken = true;
          bump(tr.beat);
        });
      }
      v.appendChild(s);
    });
    v.addEventListener("canplay", () => {
      if (tr.video !== v) return;
      tr.canplay.resolve();
      bump(tr.beat);
    });
    v.addEventListener("loadeddata", () => {
      if (tr.video !== v) return;
      tr.stamp++;
      bump(tr.beat);
    });
    v.addEventListener("playing", () => {
      if (tr.video !== v) return;
      if (!v.paused && !tr.held) tr.vstate = "playing";
      bump(tr.beat);
    });
    v.addEventListener("ended", () => {
      if (tr.video !== v) return;
      tr.vstate = "ended";
      bump(tr.beat);
    });
    v.addEventListener("seeked", () => {
      if (tr.video !== v) return;
      tr.stamp++;
      bump(tr.beat);
    });
    v.addEventListener("error", () => {
      // A decode or network failure of the source that was playing.
      if (tr.video !== v) return;
      tr.vstate = "failed";
      if (tr.bridge) tr.broken = true;
      bump(tr.beat);
    });
    if (typeof v.requestVideoFrameCallback === "function") {
      const onFrame = () => {
        if (tr.video !== v || cancelled) return;
        tr.stamp++;
        tr.lastFrameAt = performance.now();
        v.requestVideoFrameCallback(onFrame);
      };
      v.requestVideoFrameCallback(onFrame);
    }
    holder.appendChild(v);
    tr.video = v;
    tr.vstate = "idle";
    if (tr.bridge && !tr.posterRequested) void loadBridgePoster(tr);
    return v;
  };

  const start = (tr: Track) => {
    const v = ensureVideo(tr, "auto");
    if (!v) return;
    const seq = ++tr.playSeq;
    tr.held = false;
    tr.impactFired = false;
    tr.lastTime = 0;
    tr.startedAt = performance.now();
    if (v.networkState === NETWORK_NO_SOURCE) {
      // No playable source (see the last <source>'s error listener): the poster stands in for good.
      if (tr.vstate !== "failed") {
        tr.vstate = "failed";
        bump(tr.beat);
      }
      return;
    }
    v.currentTime = 0;
    tr.vstate = "loading";
    bump(tr.beat);
    const played = v.play();
    if (played) {
      played
        .then(() => {
          // Playback is running. A clip that was already playing (a replay after `settle()`) or that
          // resumes from a buffered seek need not fire `playing` again, so the state is set here too.
          if (cancelled || tr.video !== v || tr.playSeq !== seq || v.paused || tr.held) return;
          if (tr.vstate !== "playing") {
            tr.vstate = "playing";
            bump(tr.beat);
          }
        })
        .catch(() => {
          if (cancelled || tr.video !== v || tr.playSeq !== seq) return;
          tr.vstate = "failed";
          bump(tr.beat);
          // A refused bridge is skipped (the beat takes over); a refused clip is retried on the next gesture.
          if (!tr.bridge) armRetry();
        });
    }
  };

  const stop = (tr: Track) => {
    const v = tr.video;
    if (!v) return;
    tr.playSeq++;
    v.pause();
    v.currentTime = 0;
    tr.vstate = "idle";
    tr.held = false;
    tr.retried = false;
    tr.stamp++;
    bump(tr.beat);
  };

  const release = (tr: Track) => {
    const v = tr.video;
    if (!v) return;
    stop(tr);
    tr.video = null;
    v.removeAttribute("src");
    while (v.firstChild) v.removeChild(v.firstChild);
    v.load();
    v.remove();
  };

  /* ---------------- bridges ---------------- */
  /** A forward arrival: the bridge plays in the beat's slot; the clip preloads and waits. */
  const beginBridge = (i: number) => {
    const st = states[i];
    if (!st.bridge) return;
    st.bridgeShowing = true;
    st.bridgeEnded = false;
    st.handoffAt = undefined;
    ensureVideo(st.track, "auto");
    start(st.bridge);
    filmEvents.emit("bridge");
  };
  /** The bridge has ended (or cannot play): the clip starts; the bridge's last frame stays up until the clip has a frame. */
  const endBridge = (i: number) => {
    const st = states[i];
    st.bridgeEnded = true;
    if (st.track) start(st.track);
  };
  /** The clip has a frame: it takes the slot; the bridge is rewound and let go. */
  const handoff = (i: number, now: number) => {
    const st = states[i];
    st.bridgeShowing = false;
    st.bridgeEnded = false;
    st.handoffAt = now;
    // Still the "next" video of the beat before when the visitor sits on the cut; otherwise released.
    if (st.bridge) {
      if (i === lastA + 1) stop(st.bridge);
      else release(st.bridge);
    }
    bump(i);
  };
  /**
   * The scroll has run on to the next beat while the bridge was still playing: the clip takes over
   * at once (its first frame is where the bridge was heading), so no more than four videos exist.
   */
  const abortBridge = (i: number) => {
    const st = states[i];
    const clipStarted = st.bridgeEnded;
    st.bridgeShowing = false;
    st.bridgeEnded = false;
    st.handoffAt = performance.now();
    if (st.bridge) release(st.bridge);
    if (st.track && !clipStarted) start(st.track);
    bump(i);
  };
  /** Leaving the beat: whatever plays for it (the bridge, the clip) is paused and rewound. */
  const leave = (i: number) => {
    const st = states[i];
    if (st.bridgeShowing) {
      st.bridgeShowing = false;
      st.bridgeEnded = false;
      if (st.bridge) stop(st.bridge);
    }
    st.handoffAt = undefined;
    if (st.track) stop(st.track);
  };
  /** No playable file: the bridge is gone for good and its junction keeps its transition. */
  const dropBridge = (i: number) => {
    const st = states[i];
    const br = st.bridge;
    if (!br) return;
    release(br);
    st.bridge = null;
    cuts.delete(FILM[i].id);
    if (st.bridgeShowing) {
      const clipStarted = st.bridgeEnded;
      st.bridgeShowing = false;
      st.bridgeEnded = false;
      if (st.active && st.track && !clipStarted) start(st.track);
    }
    bump(i);
  };

  /* ---------------- autoplay refused: one retry on the next gesture ---------------- */
  const GESTURES = ["pointerdown", "touchstart", "keydown", "wheel"] as const;
  let onGesture: (() => void) | null = null;
  const disarmRetry = () => {
    if (!onGesture) return;
    for (const e of GESTURES) window.removeEventListener(e, onGesture);
    onGesture = null;
  };
  const armRetry = () => {
    if (onGesture || cancelled) return;
    onGesture = () => {
      disarmRetry();
      for (const st of states) {
        const tr = st.track;
        if (tr && tr.vstate === "failed" && st.active && !st.bridgeShowing && !tr.retried) {
          tr.retried = true;
          start(tr);
        }
      }
    };
    for (const e of GESTURES) window.addEventListener(e, onGesture, { passive: true });
  };

  /* ---------------- QA hold (?t=) ---------------- */
  let holdTimer = 0;
  const seekTo = (v: HTMLVideoElement, t: number) => {
    const seeked = once(v, "seeked", 3000);
    v.currentTime = t;
    return seeked;
  };
  /** Seeks what plays for every beat on screen — its bridge while that is showing, else its clip — to `t` and holds it there. */
  const holdActive = async (t: number) => {
    await Promise.all(
      states.map(async (st, i) => {
        if (!st.active) return;
        const tr = st.bridgeShowing ? st.bridge : st.track;
        const v = tr?.video;
        if (!tr || !v || v.networkState === NETWORK_NO_SOURCE) return;
        const seq = ++tr.playSeq;
        if (v.readyState < HAVE_METADATA) await once(v, "loadedmetadata", 4000);
        if (cancelled || tr.video !== v || tr.playSeq !== seq) return;
        const end = Number.isFinite(v.duration) && v.duration > 0 ? v.duration - 0.001 : t;
        const target = Math.max(0, Math.min(t, end));
        // Paused before the seek, so nothing runs on past the frame while the seek lands.
        v.pause();
        await seekTo(v, target);
        if (cancelled || tr.video !== v || tr.playSeq !== seq) return;
        if (Math.abs(v.currentTime - target) > 0.02) await seekTo(v, target);
        if (cancelled || tr.video !== v || tr.playSeq !== seq) return;
        tr.held = true;
        tr.vstate = "ended";
        tr.stamp++;
        bump(i);
      }),
    );
  };
  const scheduleHold = () => {
    if (opts.holdAt == null) return;
    const t = opts.holdAt;
    window.clearTimeout(holdTimer);
    holdTimer = window.setTimeout(() => void holdActive(t), HOLD_SETTLE_MS);
  };
  const settle = () => {
    if (cancelled || !revealed) return;
    if (opts.holdAt != null) {
      scheduleHold();
      return;
    }
    for (const st of states) {
      if (!st.active) continue;
      if (st.bridgeShowing && st.bridge) {
        // Replay the arrival: the bridge from its start, the clip back to waiting.
        if (st.bridgeEnded && st.track) stop(st.track);
        st.bridgeEnded = false;
        st.handoffAt = undefined;
        start(st.bridge);
      } else if (st.track) start(st.track);
    }
  };

  /* ---------------- the rules, every progress update ---------------- */
  let revealed = false;
  let lastKey = "";
  let lastA = -1;
  /** The beats on screen at the previous change (a forward arrival is one from the beat before). */
  let prevActive = new Set<number>();
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    lastKey = "";
  };
  const update = (a: number, b: number | null, mix: number) => {
    if (cancelled) return;
    const bb = b !== null && mix > 0 ? b : -1;
    const key = `${a}:${bb}`;
    if (key !== lastKey) {
      lastKey = key;
      const active = new Set<number>();
      if (revealed) {
        active.add(a);
        if (bb >= 0) active.add(bb);
      }
      for (let i = 0; i < states.length; i++) {
        const st = states[i];
        const isActive = active.has(i);
        if (isActive && !st.active) {
          st.active = true;
          // Arriving forward — from the beat before it — the bridge plays first; otherwise the clip.
          if (st.bridge && !st.bridge.broken && prevActive.has(i - 1)) beginBridge(i);
          else if (st.track) start(st.track);
        } else if (!isActive && st.active) {
          st.active = false;
          leave(i);
        } else if (isActive && st.bridgeShowing && i === a && bb >= 0) {
          abortBridge(i);
        }
        // What stays alive: the beats on screen; the previous beat (metadata only); as the next, the
        // following beat's bridge when it has one, else its clip. Everything else is released.
        if (st.track) {
          if (isActive || i === a - 1 || i === a || (i === a + 1 && !st.bridge)) {
            if (!isActive) ensureVideo(st.track, i === a || i === a + 1 ? "auto" : "metadata");
          } else release(st.track);
        }
        if (st.bridge) {
          if (st.bridgeShowing || i === a + 1) {
            if (!st.bridgeShowing) ensureVideo(st.bridge, "auto");
          } else release(st.bridge);
        }
      }
      prevActive = active;
      lastA = a;
      scheduleHold();
    }
    tick();
  };

  const tick = () => {
    const now = performance.now();
    for (let i = 0; i < states.length; i++) {
      const st = states[i];
      for (const tr of [st.track, st.bridge]) {
        const v = tr?.video;
        if (tr && v && tr.vstate === "playing" && !v.paused && now - tr.lastFrameAt > FRAME_STALE_MS) tr.stamp++;
      }
      const br = st.bridge;
      if (br?.broken) dropBridge(i);
      else if (br && st.bridgeShowing) {
        if (!st.bridgeEnded && !br.held && (br.vstate === "ended" || br.vstate === "failed")) endBridge(i);
        if (st.bridgeEnded) {
          const tr = st.track;
          const v = tr?.video;
          if (!tr || tr.vstate === "failed" || (tr.vstate === "playing" && v && v.readyState >= HAVE_CURRENT_DATA)) handoff(i, now);
        }
      }
      // The gavel: the strike clip's own clock, never its bridge's.
      const tr = st.track;
      const impactAt = tr?.clip.impactAt;
      if (tr?.video && impactAt != null && st.active && !st.bridgeShowing && !tr.impactFired) {
        const t = tr.video.currentTime;
        if (tr.lastTime < impactAt && t >= impactAt) {
          tr.impactFired = true;
          filmEvents.emit("impact");
        }
        tr.lastTime = t;
      }
    }
  };

  const playing = () => states.some((st) => [st.track, st.bridge].some((tr) => tr !== null && tr.vstate === "playing" && !tr.held && tr.video !== null && !tr.video.paused));

  /* ---------------- schedule ---------------- */
  const firstPicture = loadPicture(0);
  // The opening clip starts downloading at once so it can play the moment the loader lifts.
  const firstTrack = states[0].track;
  const firstClip = firstTrack && ensureVideo(firstTrack, "auto") ? Promise.race([firstTrack.canplay.promise, delay(2500)]) : Promise.resolve();
  const first = Promise.race([Promise.all([firstPicture, firstClip]).then(() => undefined), delay(opts.firstTimeout ?? 4000)]);
  void firstPicture.finally(async () => {
    for (let i = 1; i < assets.length && !cancelled; i++) await loadPicture(i);
  });

  return {
    reels,
    cuts,
    first,
    update,
    reveal,
    settle,
    playing,
    cancel: () => {
      cancelled = true;
      window.clearTimeout(holdTimer);
      disarmRetry();
      for (const st of states) {
        if (st.track) release(st.track);
        if (st.bridge) release(st.bridge);
      }
      holder?.remove();
    },
  };
}
