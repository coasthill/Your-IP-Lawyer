"use client";

import { useEffect, useRef } from "react";
import { dprCap, wantsSmallArt } from "../capabilities";
import { progressStore } from "../progress-store";
import { GAVEL_STRIKE_AT, frameAt } from "../story";
import { loadPaintings, type Painting } from "./paintings";

/**
 * The 2D fallback (no WebGL): the same paintings and the same timeline, cross-faded on a canvas.
 * The curtain transition is drawn as a dark cloth with a wavy edge; the dissolve is a cross-fade
 * with a little vertical smear. Deliberately simple — it exists so nobody sees a blank stage.
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
    let dirty = true;
    const set = loadPaintings({
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

    const drawPainting = (p: Painting, drift: [number, number, number], alpha: number, smear = 0) => {
      const s = Math.max(width / p.width, height / p.height);
      const visW = width / (p.width * s);
      const visH = height / (p.height * s);
      const fx = p.focal[0];
      const fy = 1 - p.focal[1];
      const ox = Math.min(Math.max(fx - visW / 2, 0), 1 - visW);
      const oy = Math.min(Math.max(fy - visH / 2, 0), 1 - visH);
      // source rect in painting units, zoomed about the focal point by drift[0] and panned
      let sx = ox + drift[1] * visW;
      let sy = oy - drift[2] * visH;
      const sw = visW / drift[0];
      const sh = visH / drift[0];
      sx = fx + (sx - fx) / drift[0];
      sy = fy + (sy - fy) / drift[0];
      sx = Math.min(Math.max(sx, 0), 1 - sw);
      sy = Math.min(Math.max(sy, 0), 1 - sh);
      const src = p.source as CanvasImageSource & { width: number; height: number; naturalWidth?: number; naturalHeight?: number };
      const iw = src.naturalWidth || src.width;
      const ih = src.naturalHeight || src.height;
      ctx.globalAlpha = alpha;
      ctx.drawImage(src, sx * iw, sy * ih, sw * iw, sh * ih, 0, smear, width, height);
      ctx.globalAlpha = 1;
    };

    let p = progressStore.get().value;
    let lastP = -1;
    let lastT = performance.now();
    let raf = 0;
    let ready = false;
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const dt = Math.min(64, now - lastT);
      lastT = now;
      const target = progressStore.get().value;
      if (snap) p = target;
      else p += (target - p) * Math.min(1, dt / 90);
      const frame = frameAt(p);
      const moving = p !== lastP || Math.abs(target - p) > 0.00005 || frame.b >= 0;
      lastP = p;
      if (!visible || (!moving && !dirty)) return;
      dirty = false;

      const a = set.paintings[frame.a];
      ctx.fillStyle = "#1b5ad6";
      ctx.fillRect(0, 0, width, height);
      if (frame.b < 0 || frame.mix <= 0) {
        drawPainting(a, frame.driftA, 1);
      } else if (frame.kind === "dissolve") {
        const b = set.paintings[frame.b];
        const bell = Math.sin(frame.mix * Math.PI);
        drawPainting(a, frame.driftA, 1, -bell * height * 0.03 * frame.mix);
        drawPainting(b, frame.driftB, frame.mix, bell * height * 0.03 * (1 - frame.mix));
      } else {
        const b = set.paintings[frame.b];
        const t = frame.mix;
        if (t < 0.5) drawPainting(a, frame.driftA, 1);
        else drawPainting(b, frame.driftB, 1);
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
      }
      const flash = Math.max(0, 1 - Math.abs(p - GAVEL_STRIKE_AT) / 0.012);
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,250,235,${(flash * flash * 0.85).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }
      (window as unknown as { __yilFrame?: { p: number; a: number; b: number; mix: number } }).__yilFrame = { p, a: frame.a, b: frame.b, mix: frame.mix };
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
