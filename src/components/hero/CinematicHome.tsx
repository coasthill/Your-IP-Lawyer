"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { detectTier, type RenderTier } from "./capabilities";
import { progressStore } from "./progress-store";
import { GAVEL_STRIKE_AT, STAGE_HEIGHT_VH } from "./story";
import { TextOverlay } from "./TextOverlay";
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

const WebGLStory = dynamic(() => import("./webgl/WebGLStory").then((m) => m.WebGLStory), { ssr: false });
const CanvasStory = dynamic(() => import("./canvas/CanvasStory").then((m) => m.CanvasStory), { ssr: false });

/**
 * The homepage stage. A tall scroll container pins a full-viewport canvas; ScrollTrigger maps the
 * scroll position to progress 0–1 which every renderer and the caption layer read from the store.
 * Nothing here scroll-jacks: the user scrolls normally, the picture follows.
 */
export function CinematicHome() {
  const tier = useSyncExternalStore(noopSubscribe, getClientTier, getServerTier);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
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
  const stageHeight = tier === "webgl" ? STAGE_HEIGHT_VH.desktop : STAGE_HEIGHT_VH.mobile;

  return (
    <>
      {!loaded && !isStatic ? <Loader ready={ready} onDone={() => setLoaded(true)} /> : null}
      <div
        ref={stageRef}
        className="relative w-full"
        style={{ height: isStatic ? "auto" : `${stageHeight}vh` }}
        data-tier={tier ?? "pending"}
      >
        <div className={cn("sticky top-0 h-[100dvh] w-full overflow-hidden bg-ink", isStatic && "relative h-auto")}>
          {tier === "webgl" ? <WebGLStory onReady={() => setReady(true)} /> : null}
          {tier === "canvas" ? <CanvasStory onReady={() => setReady(true)} /> : null}
          {tier === "static" ? <StaticStory /> : null}
          {tier && !isStatic ? <TextOverlay /> : null}

          {tier && !isStatic ? (
            <div className="pointer-events-auto absolute bottom-6 left-[var(--page-x)] right-[var(--page-x)] z-30 flex items-end justify-between">
              <ScrollHint />
              <SoundToggle />
            </div>
          ) : null}
        </div>
      </div>
    </>
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
    <div ref={ref} className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-bone transition-opacity duration-700" aria-hidden="true">
      <span className="relative block h-8 w-px overflow-hidden bg-bronze/30">
        <span className="absolute inset-x-0 top-0 h-3 animate-[scrollhint_1.8s_ease-in-out_infinite] bg-bronze-2" />
      </span>
      Scroll
      <style>{`@keyframes scrollhint{0%{transform:translateY(-100%)}60%,100%{transform:translateY(300%)}}`}</style>
    </div>
  );
}
