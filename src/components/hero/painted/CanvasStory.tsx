"use client";

import { useEffect, useRef } from "react";
import { clipFrameCount } from "../art";
import { dprCap, wantsSmallArt } from "../capabilities";
import { progressStore } from "../progress-store";
import { GAVEL_STRIKE_AT, frameAt } from "../story";
import { loadMedia, type FrameDebug, type Source } from "./media";

/**
 * The 2D fallback (no WebGL): the same film and the same timeline on a canvas. Stills drift,
 * clips play frame by frame, the dissolve and the ripple are cross-fades, the curtain is a dark
 * cloth with a wavy edge. Portrait viewports contain the whole picture over a blurred, darkened
 * copy of itself. Deliberately simple — it exists so nobody sees a blank stage.
 */
export function CanvasStory({ onReady }: { onReady: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const snap = new URLSearchParams(window.location.search).has("snap");
    const dpr = dprCap("canvas");
    const canBlur = "filter" in ctx;
    let dirty = true;
    const set = loadMedia({
      small: wantsSmallArt(),
      onUpdate: () => {
        dirty = true;
      },
    });

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
      dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) dirty = true;
    });
    io.observe(canvas);

    const pixelSize = (s: Source) => {
      const src = s.image as CanvasImageSource & { width: number; height: number; naturalWidth?: number; naturalHeight?: number };
      return { src, iw: src.naturalWidth || src.width, ih: src.naturalHeight || src.height };
    };

    /** Cover-fit around the focal point, zoomed and panned by the drift. */
    const drawCover = (s: Source, drift: [number, number, number], alpha: number, smear = 0) => {
      const k = Math.max(width / s.width, height / s.height);
      const visW = width / (s.width * k);
      const visH = height / (s.height * k);
      const fx = s.focal[0];
      const fy = 1 - s.focal[1];
      const ox = Math.min(Math.max(fx - visW / 2, 0), 1 - visW);
      const oy = Math.min(Math.max(fy - visH / 2, 0), 1 - visH);
      // source rect in picture units, zoomed about the focal point by drift[0] and panned
      let sx = ox + drift[1] * visW;
      let sy = oy - drift[2] * visH;
      const sw = visW / drift[0];
      const sh = visH / drift[0];
      sx = fx + (sx - fx) / drift[0];
      sy = fy + (sy - fy) / drift[0];
      sx = Math.min(Math.max(sx, 0), 1 - sw);
      sy = Math.min(Math.max(sy, 0), 1 - sh);
      const { src, iw, ih } = pixelSize(s);
      ctx.globalAlpha = alpha;
      ctx.drawImage(src, sx * iw, sy * ih, sw * iw, sh * ih, 0, smear, width, height);
      ctx.globalAlpha = 1;
    };

    /** Contain-fit (portrait): the whole picture centred over a blurred, darkened copy of itself. */
    const drawContain = (s: Source, drift: [number, number, number], alpha: number, smear = 0) => {
      const { src, iw, ih } = pixelSize(s);
      const k = Math.min(width / s.width, height / s.height) * drift[0];
      const dw = s.width * k;
      const dh = s.height * k;
      const dx = (width - dw) / 2 - drift[1] * dw;
      const dy = (height - dh) / 2 + drift[2] * dh;
      ctx.globalAlpha = alpha;
      const ck = Math.max(width / s.width, height / s.height) * 1.15;
      const cw = s.width * ck;
      const ch = s.height * ck;
      if (canBlur) ctx.filter = "blur(24px)";
      ctx.drawImage(src, 0, 0, iw, ih, (width - cw) / 2, (height - ch) / 2, cw, ch);
      if (canBlur) ctx.filter = "none";
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(src, 0, 0, iw, ih, dx, dy + smear, dw, dh);
      ctx.globalAlpha = 1;
    };

    const draw = (s: Source, drift: [number, number, number], alpha: number, smear = 0) => (height > width ? drawContain : drawCover)(s, drift, alpha, smear);

    let p = progressStore.get().value;
    let lastP = -1;
    let lastT = performance.now();
    let raf = 0;
    let ready = false;
    let lastFrameKey = "";
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const dt = Math.min(64, now - lastT);
      lastT = now;
      const target = progressStore.get().value;
      if (snap) p = target;
      else p += (target - p) * Math.min(1, dt / 90);
      const frame = frameAt(p, clipFrameCount);
      set.focus(frame.b && frame.mix > 0.5 ? frame.b.beat : frame.a.beat);
      const frameKey = `${frame.a.beat}:${frame.a.frame}:${frame.b?.beat ?? -1}:${frame.b?.frame ?? -1}`;
      const moving = p !== lastP || Math.abs(target - p) > 0.00005 || frame.b !== null || frameKey !== lastFrameKey;
      lastP = p;
      lastFrameKey = frameKey;
      if (!visible || (!moving && !dirty)) return;
      dirty = false;

      const reelA = set.reels[frame.a.beat];
      const a = reelA.sourceFor(frame.a.frame);
      ctx.fillStyle = "#1b5ad6";
      ctx.fillRect(0, 0, width, height);
      if (!frame.b || frame.mix <= 0) {
        draw(a, frame.a.drift, 1);
      } else if (frame.kind === "curtain") {
        const b = set.reels[frame.b.beat].sourceFor(frame.b.frame);
        const t = frame.mix;
        if (t < 0.5) draw(a, frame.a.drift, 1);
        else draw(b, frame.b.drift, 1);
        const e = (t < 0.5 ? 1.15 - t * 2.3 : 1.15 - (t - 0.5) * 2.3) * width;
        ctx.fillStyle = "#0a0a0d";
        ctx.beginPath();
        const steps = 24;
        if (t < 0.5) {
          ctx.moveTo(width, 0);
          for (let i = 0; i <= steps; i++) {
            const y = (i / steps) * height;
            ctx.lineTo(e + Math.sin((i / steps) * 7 + now / 1500) * width * 0.04, y);
          }
          ctx.lineTo(width, height);
        } else {
          ctx.moveTo(0, 0);
          for (let i = 0; i <= steps; i++) {
            const y = (i / steps) * height;
            ctx.lineTo(e + Math.sin((i / steps) * 7 + now / 1500) * width * 0.04, y);
          }
          ctx.lineTo(0, height);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(217,182,83,0.7)";
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
      } else {
        // dissolve (with a little vertical smear) and ripple: a cross-fade
        const b = set.reels[frame.b.beat].sourceFor(frame.b.frame);
        const bell = Math.sin(frame.mix * Math.PI);
        const smear = frame.kind === "dissolve" ? bell * height * 0.03 : 0;
        draw(a, frame.a.drift, 1, -smear * frame.mix);
        draw(b, frame.b.drift, frame.mix, smear * (1 - frame.mix));
      }
      const flash = Math.max(0, 1 - Math.abs(p - GAVEL_STRIKE_AT) / 0.012);
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,250,235,${(flash * flash * 0.85).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }
      const shown = reelA.nearestLoaded(frame.a.frame);
      (window as unknown as { __yilFrame?: FrameDebug }).__yilFrame = { p, a: frame.a.beat, b: frame.b ? frame.b.beat : -1, mix: frame.mix, beat: frame.a.beat, frame: shown >= 0 ? shown : frame.a.frame };
      if (!ready) {
        ready = true;
        onReady();
      }
    };
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      set.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" data-renderer="canvas" aria-hidden="true" />;
}
