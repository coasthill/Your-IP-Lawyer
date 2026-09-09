"use client";

import { useEffect, useRef } from "react";
import { dprCap, snapTime, wantsSmallArt, wantsSmallVideo, wantsVideo } from "../capabilities";
import { filmEvents } from "../film-events";
import { progressStore } from "../progress-store";
import { frameAt } from "../story";
import { createContext, createFullscreenTriangle, createProgram, createTexture, uniformLocations, uploadTexture } from "./gl";
import { loadMedia, videoDebug, type FrameDebug, type MediaSet, type Source } from "./media";
import { FRAG, VERT } from "./shaders";

const UNIFORMS = ["uTexA", "uTexB", "uSizeA", "uSizeB", "uFocalA", "uFocalB", "uDriftA", "uDriftB", "uRes", "uMix", "uKind", "uFit", "uTime", "uVel", "uFlash", "uSeed", "uHasB", "uBlurA", "uBlurB"] as const;

const KIND = { dissolve: 0, curtain: 1, ripple: 2 } as const;

/** The gavel's flash: 1 on the `impact` event, gone this many milliseconds later. */
const FLASH_MS = 600;
/** QA (`?snap`): a jump in progress counts as settled after this long at rest. */
const SETTLE_MS = 150;

/**
 * The WebGL renderer: the film under the scroll — stills drifting, clips playing as video while
 * their beat is on screen, one dissolving/rippling/curtaining into the next. Progress eases toward
 * the scroll target every frame (`?snap` disables the easing for QA screenshots and replays the
 * clips on screen once a jump has settled, so captures are deterministic; `?t=<s>` freezes them at
 * that second instead). Nothing here touches React state per frame.
 * Two texture slots (A on screen, B being revealed) hold whatever each side draws: a picture is
 * uploaded once and moved between the slots as the film advances or rewinds; a video is
 * re-uploaded whenever it has presented a new frame — with no mipmaps, so the shader is told
 * (`uBlurA/B`) to blur the ambient surround with taps instead. The loop runs continuously while a
 * clip plays or the flash decays, otherwise only when something changed.
 */
export function PaintedStory({ revealed, onReady, onFail }: { revealed: boolean; onReady: () => void; onFail: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setRef = useRef<MediaSet | null>(null);
  const revealedRef = useRef(false);

  // The loader is lifting: the clips may start (until then they only preload).
  useEffect(() => {
    revealedRef.current = revealed;
    if (revealed) setRef.current?.reveal();
  }, [revealed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = createContext(canvas);
    if (!gl) {
      onFail();
      return;
    }
    let program: WebGLProgram;
    try {
      program = createProgram(gl, VERT, FRAG);
    } catch (err) {
      console.error(err);
      onFail();
      return;
    }
    gl.useProgram(program);
    createFullscreenTriangle(gl, program);
    const u = uniformLocations(gl, program, UNIFORMS);
    gl.uniform1i(u.uTexA, 0);
    gl.uniform1i(u.uTexB, 1);
    gl.uniform1f(u.uSeed, Math.random());
    const isGl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;

    let dirty = true;
    const snap = new URLSearchParams(window.location.search).has("snap");
    const dpr = dprCap();
    const set: MediaSet = loadMedia({
      small: wantsSmallArt(),
      smallVideo: wantsSmallVideo(),
      video: wantsVideo(),
      holdAt: snapTime(),
      host: canvas.parentElement,
      onUpdate: () => {
        dirty = true;
      },
    });
    setRef.current = set;
    if (revealedRef.current) set.reveal();

    // Slot 0 is bound to TEXTURE0 (A), slot 1 to TEXTURE1 (B). Each remembers the drawable it holds
    // (and, for a video, which frame), so a picture is uploaded once and then moved between the
    // slots as the film advances or rewinds, and a video only when it has a new frame.
    type Slot = { tex: WebGLTexture; image: TexImageSource | null; stamp: number | undefined; mip: boolean };
    const slots: Slot[] = [
      { tex: createTexture(gl), image: null, stamp: undefined, mip: false },
      { tex: createTexture(gl), image: null, stamp: undefined, mip: false },
    ];
    const swap = () => {
      const t = slots[0];
      slots[0] = slots[1];
      slots[1] = t;
    };
    const isVideo = (image: TexImageSource): image is HTMLVideoElement => typeof HTMLVideoElement !== "undefined" && image instanceof HTMLVideoElement;
    /** A video frame: non-power-of-two, clamped, linear, no mipmaps (createTexture already clamps). */
    const uploadVideo = (tex: WebGLTexture, video: HTMLVideoElement) => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    const upload = (slot: Slot, s: Source) => {
      if (isVideo(s.image)) {
        uploadVideo(slot.tex, s.image);
        slot.mip = false;
      } else {
        uploadTexture(gl, slot.tex, s.image);
        slot.mip = isGl2;
      }
      slot.image = s.image;
      slot.stamp = s.stamp;
    };
    const stale = (slot: Slot, s: Source) => slot.image !== s.image || (s.stamp !== undefined && slot.stamp !== s.stamp);
    /** Puts A into slot 0 and B into slot 1 with as few uploads as possible; returns the slot to sample B from. */
    const assign = (a: Source, b: Source): Slot => {
      const same = a.image === b.image;
      if (slots[0].image !== a.image && slots[1].image === a.image) swap(); // the transition ended: A takes over what B held
      else if (!same && slots[1].image !== b.image && slots[0].image === b.image) swap(); // rewinding into a transition
      if (stale(slots[0], a)) upload(slots[0], a);
      // When both sides want the same picture (no transition, or two beats sharing a fallback
      // still) slot 0 serves both — never shuffle it into slot 1.
      if (same) return slots[0];
      if (stale(slots[1], b)) upload(slots[1], b);
      return slots[1];
    };

    let width = 0;
    let height = 0;
    const resize = () => {
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w === width && h === height) return;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.uRes, w, h);
      // Portrait viewports contain the whole picture (the film is never cropped on phones).
      gl.uniform1f(u.uFit, h > w ? 1 : 0);
      dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Sleep when the stage is off screen.
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) dirty = true;
    });
    io.observe(canvas);

    // The gavel: the flash starts when the strike clip meets the block.
    let flashAt = -Infinity;
    const offImpact = filmEvents.on("impact", () => {
      flashAt = performance.now();
      dirty = true;
    });

    let p = progressStore.get().value;
    let lastP = p;
    let vel = 0;
    let lastT = performance.now();
    let raf = 0;
    let readySent = false;
    let disposed = false;
    let lastRender = 0;
    let lastTarget = p;
    let jumped = 0;
    let movedAt = 0;

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const dt = Math.min(64, now - lastT);
      lastT = now;
      const target = progressStore.get().value;
      if (snap) p = target;
      else p += (target - p) * Math.min(1, dt / 90);
      if (Math.abs(target - p) < 0.00005) p = target;
      const inst = Math.abs(p - lastP) / Math.max(1, dt);
      vel = vel * 0.85 + Math.min(1, inst * 900) * 0.15;
      lastP = p;

      const frame = frameAt(p);
      set.update(frame.a.beat, frame.b ? frame.b.beat : null, frame.mix);
      // QA (`?snap`): a jump in progress that has come to rest replays (or holds) the clips on screen.
      if (snap) {
        if (Math.abs(target - lastTarget) > 1e-6) {
          jumped += Math.abs(target - lastTarget);
          movedAt = now;
        }
        lastTarget = target;
        if (jumped > 0.002 && now - movedAt > SETTLE_MS) {
          jumped = 0;
          set.settle();
        }
      }
      const flash = Math.max(0, 1 - (now - flashAt) / FLASH_MS);
      const moving = Math.abs(target - p) > 0.00005 || frame.b !== null || vel > 0.002 || flash > 0 || set.playing();
      // At rest, refresh the grain at ~20fps; skip entirely when not visible.
      if (!visible) return;
      if (!moving && !dirty && now - lastRender < 50) return;
      lastRender = now;
      dirty = false;

      const reelA = set.reels[frame.a.beat];
      const reelB = frame.b ? set.reels[frame.b.beat] : reelA;
      const a = reelA.source();
      const b = frame.b ? reelB.source() : a;
      const slotB = assign(a, b);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, slots[0].tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, slotB.tex);
      gl.uniform2f(u.uSizeA, a.width, a.height);
      gl.uniform2f(u.uSizeB, b.width, b.height);
      gl.uniform2f(u.uFocalA, a.focal[0], a.focal[1]);
      gl.uniform2f(u.uFocalB, b.focal[0], b.focal[1]);
      gl.uniform1f(u.uBlurA, slots[0].mip ? 0 : 1);
      gl.uniform1f(u.uBlurB, slotB.mip ? 0 : 1);
      const driftB = frame.b ? frame.b.drift : frame.a.drift;
      gl.uniform3f(u.uDriftA, frame.a.drift[0], frame.a.drift[1], frame.a.drift[2]);
      gl.uniform3f(u.uDriftB, driftB[0], driftB[1], driftB[2]);
      gl.uniform1f(u.uMix, frame.mix);
      gl.uniform1f(u.uKind, KIND[frame.kind]);
      gl.uniform1f(u.uHasB, frame.b ? 1 : 0);
      gl.uniform1f(u.uTime, now / 1000);
      gl.uniform1f(u.uVel, vel);
      gl.uniform1f(u.uFlash, flash * flash);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      (window as unknown as { __yilFrame?: FrameDebug }).__yilFrame = {
        p,
        a: frame.a.beat,
        b: frame.b ? frame.b.beat : -1,
        mix: frame.mix,
        beat: frame.a.beat,
        video: videoDebug(frame, set.reels),
      };
    };
    raf = requestAnimationFrame(render);
    // The loader lifts once the first picture is here and its clip can play (never later than the media timeout).
    void set.first.then(() => {
      if (!disposed && !readySent) {
        readySent = true;
        onReady();
      }
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      offImpact();
      set.cancel();
      setRef.current = null;
      slots.forEach((s) => gl.deleteTexture(s.tex));
      gl.deleteProgram(program);
      // The context is deliberately not "lost" here: React's development double-mount would
      // re-acquire the same (dead) context from the canvas and every shader would fail to compile.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" data-renderer="webgl" aria-hidden="true" />;
}
