"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { detectTier, type RenderTier } from "./capabilities";
import { progressStore } from "./progress-store";
import { FILM, GAVEL_STRIKE_AT, STAGE_HEIGHT_VH, frameAt } from "./story";
import { TextOverlay } from "./TextOverlay";
import { Annotations } from "./Annotations";
import { MapOverlay } from "./MapOverlay";
import { ConstellationOverlay } from "./ConstellationOverlay";
import { Loader } from "./Loader";
import { SoundToggle } from "./SoundToggle";
import { sound } from "./sound";
import { StaticStory } from "./static/StaticStory";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

let cachedTier: RenderTier | null = null;
const noopSubscribe = () => () => {};
const getClientTier = () => (cachedTier ??= detectTier());
const getServerTier = () => null;

const PaintedStory = dynamic(() => import("./painted/PaintedStory").then((m) => m.PaintedStory), { ssr: false });
const CanvasStory = dynamic(() => import("./painted/CanvasStory").then((m) => m.CanvasStory), { ssr: false });

/**
 * The homepage stage. A tall scroll container pins a full-viewport picture; ScrollTrigger maps the
 * scroll position to progress 0–1, which the renderer and every DOM layer read from the store.
 * Nothing here scroll-jacks: the user scrolls normally, the painting follows.
 *
 * The stage switches between the lapis and paper surfaces as the beats of the film change, so
 * captions, annotations and controls always sit on the right colours.
 */
export function CinematicHome() {
  const detected = useSyncExternalStore(noopSubscribe, getClientTier, getServerTier);
  const [webglFailed, setWebglFailed] = useState(false);
  const tier: RenderTier | null = detected === "webgl" && webglFailed ? "canvas" : detected;
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const struckRef = useRef(false);

  // Scroll → progress
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !tier) return;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      scrub: tier === "static" ? false : 0.6,
      onUpdate: (self) => {
        progressStore.set(self.progress);
        sound.update(self.progress, progressStore.get().velocity);
        if (!struckRef.current && self.progress >= GAVEL_STRIKE_AT && self.progress < GAVEL_STRIKE_AT + 0.05) {
          struckRef.current = true;
          sound.gavel();
        }
        if (self.progress < GAVEL_STRIKE_AT - 0.03) struckRef.current = false;
      },
    });
    return () => trigger.kill();
  }, [tier]);

  // Surface tone follows the beat on screen (direct DOM update, no React state per frame).
  useEffect(() => {
    const el = stickyRef.current;
    if (!el || !tier || tier === "static") return;
    let current = "";
    const apply = (p: number) => {
      const f = frameAt(p);
      const tone = FILM[f.b && f.mix > 0.5 ? f.b.beat : f.a.beat].tone;
      if (tone === current) return;
      current = tone;
      el.dataset.tone = tone;
      el.classList.toggle("surface-lapis", tone === "lapis");
      el.classList.toggle("paper", tone === "paper");
    };
    apply(progressStore.get().value);
    return progressStore.subscribe((s) => apply(s.value));
  }, [tier]);

  // Restore sound preference (never autoplay: only re-arm the toggle state on a user gesture).
  useEffect(() => {
    try {
      if (localStorage.getItem("yil-sound") === "1") {
        const arm = () => {
          if (!sound.isEnabled()) void sound.toggle();
          window.removeEventListener("pointerdown", arm);
          window.removeEventListener("keydown", arm);
        };
        window.addEventListener("pointerdown", arm, { once: true });
        window.addEventListener("keydown", arm, { once: true });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const isStatic = tier === "static";
  // The stage height is resolved in CSS (see .stage-height) so the server and the client agree.
  const stageStyle = { "--stage-h-mobile": `${STAGE_HEIGHT_VH.mobile}vh`, "--stage-h-desktop": `${STAGE_HEIGHT_VH.desktop}vh` } as React.CSSProperties;

  return (
    <>
      {!loaded && !isStatic ? <Loader ready={ready} onDone={() => setLoaded(true)} /> : null}
      <div ref={stageRef} className={cn("relative w-full", !isStatic && "stage-height")} style={stageStyle} data-tier={tier ?? "pending"}>
        <div
          ref={stickyRef}
          data-tone="lapis"
          className={cn("group surface-lapis sticky top-0 h-[100dvh] w-full overflow-hidden", isStatic && "relative h-auto")}
        >
          {tier === "webgl" ? <PaintedStory onReady={() => setReady(true)} onFail={() => setWebglFailed(true)} /> : null}
          {tier === "canvas" ? <CanvasStory onReady={() => setReady(true)} /> : null}
          {tier === "static" ? <StaticStory /> : null}
          {tier && !isStatic ? (
            <>
              {/* Phones: captions sit at the bottom, over the busiest part of the painting — a scrim in the surface colour keeps them legible. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[11] h-[58%] bg-gradient-to-t from-lapis-4/85 via-lapis-4/40 to-transparent group-data-[tone=paper]:from-paper/95 group-data-[tone=paper]:via-paper/55 md:hidden"
              />
              <Annotations />
              <MapOverlay />
              <ConstellationOverlay />
              <TextOverlay />
              <FrameMarks />
              <div className="pointer-events-auto absolute bottom-6 left-[var(--page-x)] right-[var(--page-x)] z-30 flex items-end justify-between">
                <ScrollHint />
                <SoundToggle />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

/** Registration marks in the four corners and a beat counter: the drawing-sheet furniture. */
function FrameMarks() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = "";
    const apply = (p: number) => {
      const f = frameAt(p);
      const i = f.b && f.mix > 0.5 ? f.b.beat : f.a.beat;
      const label = `${String(i + 1).padStart(2, "0")} / ${String(FILM.length).padStart(2, "0")}`;
      if (label !== last) {
        last = label;
        el.textContent = label;
      }
    };
    apply(progressStore.get().value);
    return progressStore.subscribe((s) => apply(s.value));
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 z-[12] hidden md:block" aria-hidden="true">
      <span className="reg-mark absolute left-[var(--page-x)] top-[calc(var(--header-height)+0.75rem)]" />
      <span className="reg-mark absolute right-[var(--page-x)] top-[calc(var(--header-height)+0.75rem)]" />
      <span ref={ref} className="absolute right-[var(--page-x)] top-[calc(var(--header-height)+2rem)] font-mono text-[0.6rem] tracking-[0.24em] opacity-70 [font-variant-numeric:tabular-nums]">
        01 / {String(FILM.length).padStart(2, "0")}
      </span>
    </div>
  );
}

function ScrollHint() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return progressStore.subscribe((s) => {
      el.style.opacity = s.value < 0.02 ? "1" : "0";
    });
  }, []);
  return (
    <div ref={ref} className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.2em] opacity-75 transition-opacity duration-700" aria-hidden="true">
      <span className="relative block h-8 w-px overflow-hidden bg-current/30">
        <span className="absolute inset-x-0 top-0 h-3 animate-[scrollhint_1.8s_ease-in-out_infinite] bg-current" />
      </span>
      Scroll
      <style>{`@keyframes scrollhint{0%{transform:translateY(-100%)}60%,100%{transform:translateY(300%)}}`}</style>
    </div>
  );
}
