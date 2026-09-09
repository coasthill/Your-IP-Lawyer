"use client";

import { useEffect, useRef } from "react";
import { clipFrameCount } from "../art";
import { dprCap, wantsSmallArt } from "../capabilities";
import { progressStore } from "../progress-store";
import { GAVEL_STRIKE_AT, frameAt } from "../story";
import { createContext, createFullscreenTriangle, createProgram, createTexture, uniformLocations, uploadTexture } from "./gl";
import { loadMedia, type FrameDebug, type MediaSet } from "./media";
import { FRAG, VERT } from "./shaders";

const UNIFORMS = ["uTexA", "uTexB", "uSizeA", "uSizeB", "uFocalA", "uFocalB", "uDriftA", "uDriftB", "uRes", "uMix", "uKind", "uFit", "uTime", "uVel", "uFlash", "uSeed", "uHasB"] as const;

const KIND = { dissolve: 0, curtain: 1, ripple: 2 } as const;

/**
 * The WebGL renderer: the film scrubbed under the scroll — stills drifting, clips playing frame
 * by frame, one dissolving/rippling into the next. Progress eases toward the scroll target every
 * frame (`?snap` disables the easing for QA screenshots). Nothing here touches React state per
 * frame. Two texture slots (A on screen, B being revealed) are re-uploaded only when the drawable
 * behind them changes; when A becomes what B was, the slots swap instead of re-uploading.
 */
export function PaintedStory({ onReady, onFail }: { onReady: () => void; onFail: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    let dirty = true;
    const snap = new URLSearchParams(window.location.search).has("snap");
    const dpr = dprCap("webgl");
    const set: MediaSet = loadMedia({
      small: wantsSmallArt(),
      onUpdate: () => {
        dirty = true;
      },
    });

    // Slot 0 is bound to TEXTURE0 (A), slot 1 to TEXTURE1 (B). Each remembers the drawable it holds,
    // so a picture is uploaded once and then moved between the slots as the film advances or rewinds.
    const slots = [
      { tex: createTexture(gl), image: null as TexImageSource | null },
      { tex: createTexture(gl), image: null as TexImageSource | null },
    ];
    const swap = () => {
      const t = slots[0];
      slots[0] = slots[1];
      slots[1] = t;
    };
    const upload = (slot: number, image: TexImageSource) => {
      uploadTexture(gl, slots[slot].tex, image);
      slots[slot].image = image;
    };
    /** Puts A into slot 0 and B into slot 1 with as few uploads as possible; returns the texture to sample B from. */
    const assign = (imgA: TexImageSource, imgB: TexImageSource): WebGLTexture => {
      const same = imgA === imgB;
      if (slots[0].image !== imgA && slots[1].image === imgA) swap(); // the transition ended: A takes over what B held
      else if (!same && slots[1].image !== imgB && slots[0].image === imgB) swap(); // rewinding into a transition
      if (slots[0].image !== imgA) upload(0, imgA);
      // When both sides want the same picture (no transition, or two beats sharing a fallback
      // still) slot 0 serves both — never shuffle it into slot 1.
      if (same) return slots[0].tex;
      if (slots[1].image !== imgB) upload(1, imgB);
      return slots[1].tex;
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

    let p = progressStore.get().value;
    let lastP = p;
    let vel = 0;
    let lastT = performance.now();
    let raf = 0;
    let readySent = false;
    let disposed = false;
    let lastRender = 0;
    let lastFrameKey = "";

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

      const frame = frameAt(p, clipFrameCount);
      set.focus(frame.b && frame.mix > 0.5 ? frame.b.beat : frame.a.beat);
      const frameKey = `${frame.a.beat}:${frame.a.frame}:${frame.b?.beat ?? -1}:${frame.b?.frame ?? -1}`;
      const moving = Math.abs(target - p) > 0.00005 || frame.b !== null || vel > 0.002 || frameKey !== lastFrameKey;
      lastFrameKey = frameKey;
      // At rest, refresh the grain at ~20fps; skip entirely when not visible.
      if (!visible) return;
      if (!moving && !dirty && now - lastRender < 50) return;
      lastRender = now;
      dirty = false;

      const reelA = set.reels[frame.a.beat];
      const reelB = frame.b ? set.reels[frame.b.beat] : reelA;
      const a = reelA.sourceFor(frame.a.frame);
      const b = frame.b ? reelB.sourceFor(frame.b.frame) : a;
      const texB = assign(a.image, b.image);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, slots[0].tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texB);
      gl.uniform2f(u.uSizeA, a.width, a.height);
      gl.uniform2f(u.uSizeB, b.width, b.height);
      gl.uniform2f(u.uFocalA, a.focal[0], a.focal[1]);
      gl.uniform2f(u.uFocalB, b.focal[0], b.focal[1]);
      const driftB = frame.b ? frame.b.drift : frame.a.drift;
      gl.uniform3f(u.uDriftA, frame.a.drift[0], frame.a.drift[1], frame.a.drift[2]);
      gl.uniform3f(u.uDriftB, driftB[0], driftB[1], driftB[2]);
      gl.uniform1f(u.uMix, frame.mix);
      gl.uniform1f(u.uKind, KIND[frame.kind]);
      gl.uniform1f(u.uHasB, frame.b ? 1 : 0);
      gl.uniform1f(u.uTime, now / 1000);
      gl.uniform1f(u.uVel, vel);
      const flash = Math.max(0, 1 - Math.abs(p - GAVEL_STRIKE_AT) / 0.012);
      gl.uniform1f(u.uFlash, flash * flash);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      (window as unknown as { __yilFrame?: FrameDebug }).__yilFrame = {
        p,
        a: frame.a.beat,
        b: frame.b ? frame.b.beat : -1,
        mix: frame.mix,
        beat: frame.a.beat,
        frame: reelA.nearestLoaded(frame.a.frame) >= 0 ? reelA.nearestLoaded(frame.a.frame) : frame.a.frame,
      };

      if (!readySent && set.reels[0].version > 0) {
        readySent = true;
        onReady();
      }
    };
    raf = requestAnimationFrame(render);
    // Never keep the loader waiting on a slow network: the placeholder counts as a first frame after 4s.
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
      set.cancel();
      slots.forEach((s) => gl.deleteTexture(s.tex));
      gl.deleteProgram(program);
      // The context is deliberately not "lost" here: React's development double-mount would
      // re-acquire the same (dead) context from the canvas and every shader would fail to compile.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" data-renderer="webgl" aria-hidden="true" />;
}
