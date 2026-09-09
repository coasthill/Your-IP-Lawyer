"use client";

import { artAssets, clipFor, placeholderCanvas, type ArtAsset, type ClipAsset } from "../art";
import { filmEvents } from "../film-events";
import { FILM, type Beat, type Frame } from "../story";

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
 * The strike clip's `impactAt` is watched: the first time its clock crosses it during a play, one
 * `impact` event goes out on the film bus (the sound and the flash hang off it).
 * Nothing plays before `reveal()`: the stage is behind the loader until then, and the opening clip
 * must not have finished before anyone sees it (it is preloaded meanwhile).
 * With video off (save-data, `?video=0`) no video element is created: posters and stills only.
 * QA (`?snap`): the renderer calls `settle()` once a jump in progress has come to rest; the clips
 * on screen then replay from the start — or, with `holdAt` (`?t=`), are sought to that second and
 * paused — so a capture taken a moment later is deterministic and can show a clip mid-motion.
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
};

export type VideoInfo = { state: VideoState; time: number };

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
  /** The drawable of this moment: the video while it has a frame, else the poster, else the still. */
  source: () => Source;
  /** The clip's playback state, or null for stills and when video is off. */
  video: () => VideoInfo | null;
};

export type MediaSet = {
  reels: Reel[];
  /** Resolves when the first beat's picture is loaded and its clip can play (or 2.5 s passed), capped by `firstTimeout`. */
  first: Promise<void>;
  /** Every progress update: the beat on screen, the beat being revealed (or null) and the blend. */
  update: (a: number, b: number | null, mix: number) => void;
  /** The loader is lifting: clips may play from now on (before this they only preload). */
  reveal: () => void;
  /** QA: a jump in progress has come to rest — replay the clips on screen, or hold them at `holdAt`. */
  settle: () => void;
  /** True while any clip is playing (renderers keep their loop running). */
  playing: () => boolean;
  cancel: () => void;
};

/** What the renderers expose on `window.__yilFrame` for QA scripts. */
export type FrameDebug = { p: number; a: number; b: number; mix: number; beat: number; video: { beat: number; time: number; state: VideoState } | null };

/** The clip `__yilFrame.video` reports: B once the blend has passed half-way (or when only B has one), else A. */
export function videoDebug(frame: Frame, reels: Reel[]): FrameDebug["video"] {
  const va = reels[frame.a.beat].video();
  const vb = frame.b ? reels[frame.b.beat].video() : null;
  const useB = frame.b !== null && vb !== null && (frame.mix > 0.5 || va === null);
  const beat = useB && frame.b ? frame.b.beat : frame.a.beat;
  const v = useB ? vb : va;
  return v ? { beat, time: v.time, state: v.state } : null;
}

export type MediaOptions = {
  /** Phones: the smaller stills and posters. */
  small: boolean;
  /** Phones: the ≤1280-wide clip variants. */
  smallVideo?: boolean;
  /** Whether clips may play as video at all. */
  video: boolean;
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
  let cancelled = false;

  type State = {
    still: Source;
    poster: Source | null;
    video: HTMLVideoElement | null;
    vstate: VideoState;
    /** Counts presented frames (or ticks while playing when the browser has no frame callback). */
    stamp: number;
    lastFrameAt: number;
    /** The beat is A, or B while the blend has started. */
    active: boolean;
    /** QA hold: paused on a chosen frame; the rules leave it alone until the beat leaves. */
    held: boolean;
    retried: boolean;
    impactFired: boolean;
    lastTime: number;
    /** Bumped on every play/stop so a stale `play()` rejection is ignored. */
    playSeq: number;
    canplay: ReturnType<typeof deferred>;
  };
  const states: State[] = assets.map((asset) => ({
    still: {
      image: placeholderCanvas(asset.entry, 96, 64),
      width: asset.width,
      height: asset.height,
      focal: [asset.focal[0], 1 - asset.focal[1]],
    },
    poster: null,
    video: null,
    vstate: "idle",
    stamp: 0,
    lastFrameAt: 0,
    active: false,
    held: false,
    retried: false,
    impactFired: false,
    lastTime: 0,
    playSeq: 0,
    canplay: deferred(),
  }));

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
        const v = st.video;
        if (clip && v && v.readyState >= HAVE_CURRENT_DATA && (st.vstate === "playing" || st.vstate === "ended")) {
          return { image: v, width: clip.width, height: clip.height, focal: st.still.focal, stamp: st.stamp };
        }
        return st.poster ?? st.still;
      },
      video: () => (clip && useVideo ? { state: st.vstate, time: st.video ? st.video.currentTime : 0 } : null),
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

  /* ---------------- video elements ---------------- */
  const holder = useVideo ? createHolder(opts.host) : null;

  const ensureVideo = (i: number, preload: "auto" | "metadata"): HTMLVideoElement | null => {
    const clip = reels[i].clip;
    const st = states[i];
    if (!holder || !clip) return null;
    if (st.video) {
      if (preload === "auto" && st.video.preload !== "auto") {
        st.video.preload = "auto";
        // It only fetched its metadata so far; ask for the whole clip (it is idle, or about to be started).
        if (st.video.readyState < HAVE_FUTURE_DATA && st.video.networkState !== NETWORK_LOADING) st.video.load();
      }
      return st.video;
    }
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
    v.dataset.beat = reels[i].beat.id;
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
          if (st.video !== v) return;
          st.vstate = "failed";
          bump(i);
        });
      }
      v.appendChild(s);
    });
    v.addEventListener("canplay", () => {
      if (st.video !== v) return;
      st.canplay.resolve();
      bump(i);
    });
    v.addEventListener("loadeddata", () => {
      if (st.video !== v) return;
      st.stamp++;
      bump(i);
    });
    v.addEventListener("playing", () => {
      if (st.video !== v) return;
      if (!v.paused && !st.held) st.vstate = "playing";
      bump(i);
    });
    v.addEventListener("ended", () => {
      if (st.video !== v) return;
      st.vstate = "ended";
      bump(i);
    });
    v.addEventListener("seeked", () => {
      if (st.video !== v) return;
      st.stamp++;
      bump(i);
    });
    v.addEventListener("error", () => {
      // A decode or network failure of the source that was playing.
      if (st.video !== v) return;
      st.vstate = "failed";
      bump(i);
    });
    if (typeof v.requestVideoFrameCallback === "function") {
      const onFrame = () => {
        if (st.video !== v || cancelled) return;
        st.stamp++;
        st.lastFrameAt = performance.now();
        v.requestVideoFrameCallback(onFrame);
      };
      v.requestVideoFrameCallback(onFrame);
    }
    holder.appendChild(v);
    st.video = v;
    st.vstate = "idle";
    return v;
  };

  const start = (i: number) => {
    const st = states[i];
    const v = ensureVideo(i, "auto");
    if (!v) return;
    const seq = ++st.playSeq;
    st.held = false;
    st.impactFired = false;
    st.lastTime = 0;
    if (v.networkState === NETWORK_NO_SOURCE) {
      // No playable source (see the last <source>'s error listener): the poster stands in for good.
      if (st.vstate !== "failed") {
        st.vstate = "failed";
        bump(i);
      }
      return;
    }
    v.currentTime = 0;
    st.vstate = "loading";
    bump(i);
    const played = v.play();
    if (played) {
      played
        .then(() => {
          // Playback is running. A clip that was already playing (a replay after `settle()`) or that
          // resumes from a buffered seek need not fire `playing` again, so the state is set here too.
          if (cancelled || st.video !== v || st.playSeq !== seq || v.paused || st.held) return;
          if (st.vstate !== "playing") {
            st.vstate = "playing";
            bump(i);
          }
        })
        .catch(() => {
          if (cancelled || st.video !== v || st.playSeq !== seq) return;
          st.vstate = "failed";
          bump(i);
          armRetry();
        });
    }
  };

  const stop = (i: number) => {
    const st = states[i];
    const v = st.video;
    if (!v) return;
    st.playSeq++;
    v.pause();
    v.currentTime = 0;
    st.vstate = "idle";
    st.held = false;
    st.retried = false;
    st.stamp++;
    bump(i);
  };

  const release = (i: number) => {
    const st = states[i];
    const v = st.video;
    if (!v) return;
    stop(i);
    st.video = null;
    v.removeAttribute("src");
    while (v.firstChild) v.removeChild(v.firstChild);
    v.load();
    v.remove();
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
      for (let i = 0; i < reels.length; i++) {
        const st = states[i];
        if (st.vstate === "failed" && st.active && !st.retried) {
          st.retried = true;
          start(i);
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
  const holdActive = async (t: number) => {
    await Promise.all(
      reels.map(async (reel, i) => {
        const st = states[i];
        const v = st.video;
        if (!reel.clip || !v || !st.active || v.networkState === NETWORK_NO_SOURCE) return;
        const seq = ++st.playSeq;
        if (v.readyState < HAVE_METADATA) await once(v, "loadedmetadata", 4000);
        if (cancelled || st.video !== v || st.playSeq !== seq) return;
        const end = Number.isFinite(v.duration) && v.duration > 0 ? v.duration - 0.001 : t;
        const target = Math.max(0, Math.min(t, end));
        // Paused before the seek, so nothing runs on past the frame while the seek lands.
        v.pause();
        await seekTo(v, target);
        if (cancelled || st.video !== v || st.playSeq !== seq) return;
        if (Math.abs(v.currentTime - target) > 0.02) await seekTo(v, target);
        if (cancelled || st.video !== v || st.playSeq !== seq) return;
        st.held = true;
        st.vstate = "ended";
        st.stamp++;
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
    for (let i = 0; i < reels.length; i++) if (reels[i].clip && states[i].active) start(i);
  };

  /* ---------------- the rules, every progress update ---------------- */
  let revealed = false;
  let lastKey = "";
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
      const alive = new Set([a - 1, a, a + 1, ...active]);
      for (let i = 0; i < reels.length; i++) {
        if (!reels[i].clip) continue;
        const st = states[i];
        const isActive = active.has(i);
        if (isActive && !st.active) {
          st.active = true;
          start(i);
        } else if (!isActive && st.active) {
          st.active = false;
          stop(i);
        }
        if (!alive.has(i)) release(i);
        // The beat on screen (before the loader lifts) and the next one fetch the whole clip; the previous only its metadata.
        else if (!isActive) ensureVideo(i, i === a || i === a + 1 ? "auto" : "metadata");
      }
      scheduleHold();
    }
    tick();
  };

  const tick = () => {
    const now = performance.now();
    for (let i = 0; i < reels.length; i++) {
      const st = states[i];
      const v = st.video;
      if (!v) continue;
      if (st.vstate === "playing" && !v.paused && now - st.lastFrameAt > FRAME_STALE_MS) st.stamp++;
      const impactAt = reels[i].clip?.impactAt;
      if (impactAt != null && st.active && !st.impactFired) {
        const t = v.currentTime;
        if (st.lastTime < impactAt && t >= impactAt) {
          st.impactFired = true;
          filmEvents.emit("impact");
        }
        st.lastTime = t;
      }
    }
  };

  const playing = () => states.some((st) => st.vstate === "playing" && !st.held && st.video !== null && !st.video.paused);

  /* ---------------- schedule ---------------- */
  const firstPicture = loadPicture(0);
  // The opening clip starts downloading at once so it can play the moment the loader lifts.
  const firstClip = useVideo && reels[0].clip && ensureVideo(0, "auto") ? Promise.race([states[0].canplay.promise, delay(2500)]) : Promise.resolve();
  const first = Promise.race([Promise.all([firstPicture, firstClip]).then(() => undefined), delay(opts.firstTimeout ?? 4000)]);
  void firstPicture.finally(async () => {
    for (let i = 1; i < assets.length && !cancelled; i++) await loadPicture(i);
  });

  return {
    reels,
    first,
    update,
    reveal,
    settle,
    playing,
    cancel: () => {
      cancelled = true;
      window.clearTimeout(holdTimer);
      disarmRetry();
      for (let i = 0; i < reels.length; i++) release(i);
      holder?.remove();
    },
  };
}
