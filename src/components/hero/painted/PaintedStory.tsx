"use client";

import { useEffect, useRef } from "react";
import { dprCap, wantsSmallArt } from "../capabilities";
import { progressStore } from "../progress-store";
import { GAVEL_STRIKE_AT, frameAt } from "../story";
import { createContext, createFullscreenTriangle, createProgram, createTexture, uniformLocations, uploadTexture } from "./gl";
import { loadPaintings, type PaintingSet } from "./paintings";
import { FRAG, VERT } from "./shaders";

const UNIFORMS = ["uTexA", "uTexB", "uSizeA", "uSizeB", "uFocalA", "uFocalB", "uDriftA", "uDriftB", "uRes", "uMix", "uKind", "uTime", "uVel", "uFlash", "uSeed", "uHasB"] as const;

/**
 * The WebGL renderer: paintings dissolving into one another under the scroll.
 * Progress eases toward the scroll target every frame (`?snap` disables the easing for QA
 * screenshots). Nothing here touches React state per frame.
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
    const set: PaintingSet = loadPaintings({
      small: wantsSmallArt(),
      onUpdate: () => {
        dirty = true;
      },
    });
    const textures = set.paintings.map(() => createTexture(gl));
    const uploaded = set.paintings.map(() => -1);
    const ensure = (i: number) => {
      if (i < 0) return;
      const p = set.paintings[i];
      if (uploaded[i] !== p.version) {
        uploadTexture(gl, textures[i], p.source);
        uploaded[i] = p.version;
      }
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
    let lastRender = 0;

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
      const moving = Math.abs(target - p) > 0.00005 || frame.b >= 0 || vel > 0.002;
      // At rest, refresh the grain at ~20fps; skip entirely when not visible.
      if (!visible) return;
      if (!moving && !dirty && now - lastRender < 50) return;
      lastRender = now;
      dirty = false;

      ensure(frame.a);
      ensure(frame.b);
      const a = set.paintings[frame.a];
      const b = frame.b >= 0 ? set.paintings[frame.b] : a;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[frame.a]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures[frame.b >= 0 ? frame.b : frame.a]);
      gl.uniform2f(u.uSizeA, a.width, a.height);
      gl.uniform2f(u.uSizeB, b.width, b.height);
      gl.uniform2f(u.uFocalA, a.focal[0], a.focal[1]);
      gl.uniform2f(u.uFocalB, b.focal[0], b.focal[1]);
      gl.uniform3f(u.uDriftA, frame.driftA[0], frame.driftA[1], frame.driftA[2]);
      gl.uniform3f(u.uDriftB, frame.driftB[0], frame.driftB[1], frame.driftB[2]);
      gl.uniform1f(u.uMix, frame.mix);
      gl.uniform1f(u.uKind, frame.kind === "curtain" ? 1 : 0);
      gl.uniform1f(u.uHasB, frame.b >= 0 ? 1 : 0);
      gl.uniform1f(u.uTime, now / 1000);
      gl.uniform1f(u.uVel, vel);
      const flash = Math.max(0, 1 - Math.abs(p - GAVEL_STRIKE_AT) / 0.012);
      gl.uniform1f(u.uFlash, flash * flash);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      (window as unknown as { __yilFrame?: { p: number; a: number; b: number; mix: number } }).__yilFrame = { p, a: frame.a, b: frame.b, mix: frame.mix };

      if (!readySent && set.paintings[0].version > 0) {
        readySent = true;
        onReady();
      }
    };
    raf = requestAnimationFrame(render);
    // Never keep the loader waiting on a slow network: the placeholder counts as a first frame after 4s.
    void set.first.then(() => {
      if (!readySent) {
        readySent = true;
        onReady();
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      set.cancel();
      textures.forEach((t) => gl.deleteTexture(t));
      // The context is deliberately not "lost" here: React's development double-mount would
      // re-acquire the same (dead) context from the canvas and every shader would fail to compile.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" data-renderer="webgl" aria-hidden="true" />;
}
