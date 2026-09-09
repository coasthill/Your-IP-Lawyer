"use client";

import { useEffect, useRef } from "react";
import { dprCap, snapTime, wantsSmallArt, wantsSmallVideo, wantsVideo } from "../capabilities";
import { filmEvents } from "../film-events";
import { progressStore } from "../progress-store";
import { frameAt } from "../story";
import { loadMedia, videoDebug, type FrameDebug, type MediaSet, type Source } from "./media";

/** The gavel's flash: 1 on the `impact` event, gone this many milliseconds later. */
const FLASH_MS = 600;
/** QA (`?snap`): a jump in progress counts as settled after this long at rest. */
const SETTLE_MS = 150;

/**
 * The 2D fallback (no WebGL): the same film and the same timeline on a canvas. Stills drift,
 * clips play as video (drawn straight from the element every frame while they run), the dissolve
 * and the ripple are cross-fades, the curtain is a dark cloth with a wavy edge, the gavel's flash
 * follows the film's `impact` event. Portrait viewports contain the whole picture over a blurred,
 * darkened copy of itself. `?snap` / `?t=` work as in the WebGL renderer (QA captures).
 * Deliberately simple — it exists so nobody sees a blank stage.
 */
export function CanvasStory({ revealed, onReady }: { revealed: boolean; onReady: () => void }) {
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
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const snap = new URLSearchParams(window.location.search).has("snap");
    const dpr = dprCap();
    const canBlur = "filter" in ctx;
    let dirty = true;
    const set = loadMedia({
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

    let flashAt = -Infinity;
    const offImpact = filmEvents.on("impact", () => {
      flashAt = performance.now();
      dirty = true;
    });

    /** The drawable and its size in pixels (a video's decoded size, an image's natural size). */
    const pixelSize = (s: Source) => {
      const src = s.image as CanvasImageSource;
      const el = s.image as unknown as { videoWidth?: number; videoHeight?: number; naturalWidth?: number; naturalHeight?: number; width?: number; height?: number };
      return { src, iw: el.videoWidth || el.naturalWidth || el.width || 1, ih: el.videoHeight || el.naturalHeight || el.height || 1 };
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
    let readySent = false;
    let disposed = false;
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
      const moving = p !== lastP || Math.abs(target - p) > 0.00005 || frame.b !== null || flash > 0 || set.playing();
      lastP = p;
      if (!visible || (!moving && !dirty)) return;
      dirty = false;

      const reelA = set.reels[frame.a.beat];
      const reelB = frame.b ? set.reels[frame.b.beat] : reelA;
      const a = reelA.source();
      ctx.fillStyle = "#1b5ad6";
      ctx.fillRect(0, 0, width, height);
      if (!frame.b || frame.mix <= 0) {
        draw(a, frame.a.drift, 1);
      } else if (frame.kind === "curtain") {
        const b = reelB.source();
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
        const b = reelB.source();
        const bell = Math.sin(frame.mix * Math.PI);
        const smear = frame.kind === "dissolve" ? bell * height * 0.03 : 0;
        draw(a, frame.a.drift, 1, -smear * frame.mix);
        draw(b, frame.b.drift, frame.mix, smear * (1 - frame.mix));
      }
      if (flash > 0) {
        ctx.fillStyle = `rgba(255,250,235,${(flash * flash * 0.85).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" data-renderer="canvas" aria-hidden="true" />;
}
