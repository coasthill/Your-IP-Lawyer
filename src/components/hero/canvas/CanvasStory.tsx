"use client";

import { useEffect, useRef } from "react";
import { dprCap } from "../capabilities";
import { progressStore } from "../progress-store";
import { GAVEL_STRIKE_AT, PALETTE } from "../story";
import { Gfx, clearTextCache, readFonts, rgba, type Stops } from "./helpers";
import { machineFocus, makeLayout, type Frame, type Pt } from "./layout";
import { applyCamera, drawAdvocate, drawMotes, drawRoom, figureFade, resizeFigure, updateCamera } from "./scenes/figure";
import { drawElements, drawInscriptions, resizeElements } from "./scenes/ipElements";
import { drawArm, drawPlinth, drawStrike, shakeOffset } from "./scenes/gavel";
import { drawGears, resizeGears } from "./scenes/gears";
import { drawDesign, resizeDesign } from "./scenes/design";
import { drawMap, resizeMap } from "./scenes/gi";
import { drawTradeMark, resizeTradeMark } from "./scenes/trademark";
import { drawFadeOut, drawLegalWorld, resizeLegalWorld } from "./scenes/legalWorld";

/** Exponential easing rate toward the scroll target (per second). */
const EASE = 7.5;
/** Idle redraw interval (motes, pulses, the slow spins) — about 24 fps. */
const IDLE_MS = 42;
/** How long the strike's wall-time effects last. */
const STRIKE_S = 1.2;

const VIGNETTE: Stops = [
  [0, rgba(PALETTE.ink, 0)],
  [0.55, rgba(PALETTE.ink, 0.3)],
  [1, rgba(PALETTE.ink, 0.82)],
];

/**
 * The 2.5D canvas renderer (phones, tablets, weak GPUs). One <canvas> sized to its container at
 * dprCap("canvas"); a requestAnimationFrame loop that eases progress toward the store and draws the
 * scenes in order — room and advocate, the IP elements, the gavel, then the machine act — clearing
 * to ink and finishing with the film-grain tile and a vignette. The loop runs at full rate only while
 * the picture is still catching up with the scroll or the gavel burst is live; otherwise it ticks at
 * ~24 fps for the ambient motion, and sleeps entirely while the stage is off-screen or the tab hidden.
 * Every scene is a function of progress, so scrolling back replays the picture exactly.
 */
export function CanvasStory({ onReady }: { onReady: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readyRef = useRef(onReady);

  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      readyRef.current();
      return;
    }
    const dpr = dprCap("canvas");
    const snap = new URLSearchParams(window.location.search).has("snap");
    const gfx = new Gfx(ctx);
    const shake: Pt = { x: 0, y: 0 };
    const f: Frame = {
      ctx,
      L: makeLayout(2, 2),
      fonts: readFonts(),
      gfx,
      w: 2,
      h: 2,
      s: 2,
      dpr,
      portrait: true,
      p: progressStore.get().value,
      t: 0,
      dt: 0,
      vel: 0,
      strikeAge: -1,
      focus: { x: 0, y: 0 },
      cam: { k: 1, px: 0, py: 0, dx: 0, dy: 0 },
      strikeScreen: { x: 0, y: 0 },
    };

    let disposed = false;
    let sized = false;
    let raf = 0;
    let timer = 0;
    let visible = document.visibilityState !== "hidden";
    let onScreen = true;
    let first = true;
    let strikeAt = -1;
    let lastP = f.p;
    let last = performance.now();
    const t0 = last;

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w < 2 || h < 2) return;
      if (sized && Math.abs(w - f.w) < 1 && Math.abs(h - f.h) < 1) return;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      f.L = makeLayout(w, h);
      f.w = w;
      f.h = h;
      f.s = Math.min(w, h);
      f.portrait = f.L.portrait;
      gfx.clear();
      resizeFigure(f.L);
      resizeElements(f.L, f.fonts);
      resizeGears(f.L, f.fonts, dpr);
      resizeDesign(f.L, dpr);
      resizeMap(f.L, dpr);
      resizeTradeMark(f.L, f.fonts, dpr);
      resizeLegalWorld(f.L, f.fonts);
      sized = true;
    };

    const render = () => {
      const { L, w, h, p } = f;
      updateCamera(f);
      machineFocus(L, p, f.focus);
      shakeOffset(f.strikeAge, shake);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(0, 0, w, h);

      // Act I — the room, the advocate, the IP elements, the gavel (room space under the figure camera)
      const ff = figureFade(p);
      if (ff > 0.003) {
        ctx.save();
        ctx.globalAlpha = ff;
        ctx.translate(shake.x, shake.y);
        applyCamera(ctx, f);
        drawRoom(ctx, f);
        drawInscriptions(ctx, f);
        drawAdvocate(ctx, f);
        drawPlinth(ctx, f);
        drawArm(ctx, f);
        drawElements(ctx, f);
        drawStrike(ctx, f);
        drawMotes(ctx, f);
        ctx.restore();
      }

      // Act II — the machine: gears, the turned plate, the chart, the emblem and its compass, the constellation
      if (p > 0.395) {
        drawGears(ctx, f);
        drawDesign(ctx, f);
        drawMap(ctx, f);
        drawTradeMark(ctx, f);
        drawLegalWorld(ctx, f);
        drawFadeOut(ctx, f);
      }

      // film grain (the tile jitters a little on the idle tick) and the vignette
      if (gfx.grain) {
        const j = Math.floor(f.t * 10) % 4;
        const jx = j * 41;
        const jy = (j * 67) % gfx.grainSize;
        ctx.save();
        ctx.globalAlpha = 0.36;
        ctx.translate(jx, jy);
        ctx.fillStyle = gfx.grain;
        ctx.fillRect(-jx, -jy, w, h);
        ctx.restore();
      }
      ctx.fillStyle = gfx.radial(ctx, "vignette", w * 0.5, h * 0.42, Math.min(w, h) * 0.3, Math.max(w, h) * 0.78, VIGNETTE);
      ctx.fillRect(0, 0, w, h);
    };

    const schedule = (fast: boolean) => {
      if (disposed || raf || timer) return;
      if (!visible || !onScreen) return;
      if (fast) raf = requestAnimationFrame(tick);
      else
        timer = window.setTimeout(() => {
          timer = 0;
          if (!disposed) raf = requestAnimationFrame(tick);
        }, IDLE_MS);
    };

    const tick = (now: number) => {
      raf = 0;
      if (disposed) return;
      if (!sized) resize();
      if (!sized) {
        schedule(false);
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      f.t = (now - t0) / 1000;
      f.dt = dt;

      const target = progressStore.get().value;
      const before = f.p;
      if (snap) f.p = target;
      else {
        f.p += (target - f.p) * (1 - Math.exp(-dt * EASE));
        if (Math.abs(target - f.p) < 0.0004) f.p = target;
      }
      const v = Math.abs(f.p - before) / dt;
      f.vel = f.vel * 0.85 + v * 0.15;

      // the gavel strike is wall-time and re-armable
      if (lastP < GAVEL_STRIKE_AT && f.p >= GAVEL_STRIKE_AT) strikeAt = now;
      if (f.p < GAVEL_STRIKE_AT - 0.03) strikeAt = -1;
      lastP = f.p;
      f.strikeAge = strikeAt >= 0 ? (now - strikeAt) / 1000 : -1;
      if (f.strikeAge > STRIKE_S) f.strikeAge = -1;

      render();
      if (first) {
        first = false;
        readyRef.current();
      }
      const busy = Math.abs(target - f.p) > 0.0005 || f.strikeAge >= 0 || f.vel > 0.02;
      schedule(busy);
    };

    const ro = new ResizeObserver(() => {
      resize();
      schedule(true);
    });
    ro.observe(host);
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        schedule(true);
      },
      { threshold: 0 },
    );
    io.observe(host);
    const onVisibility = () => {
      visible = document.visibilityState !== "hidden";
      last = performance.now();
      schedule(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribe = progressStore.subscribe(() => schedule(true));
    // glyph widths measured on the fallback face go stale once the web fonts arrive
    const fontsReady = document.fonts?.ready;
    if (fontsReady) {
      void fontsReady.then(() => {
        if (disposed) return;
        f.fonts = readFonts();
        clearTextCache();
        schedule(true);
      });
    }

    resize();
    schedule(true);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (timer) window.clearTimeout(timer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribe();
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 bg-ink" data-renderer="canvas">
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />
    </div>
  );
}
