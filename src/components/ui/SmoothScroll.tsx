"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext<Lenis | null>(null);

/* Module-level store so consumers re-render when the instance appears, without setState inside effects. */
let current: Lenis | null = null;
const subscribers = new Set<() => void>();
const lenisStore = {
  subscribe(cb: () => void) {
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  },
  get: () => current,
  getServer: () => null,
  set(instance: Lenis | null) {
    current = instance;
    for (const cb of subscribers) cb();
  },
};

export function useLenis() {
  return useContext(LenisContext);
}

/**
 * Smooth scrolling (Lenis) synchronised with GSAP's ticker so ScrollTrigger and Lenis share one clock.
 * Disabled automatically for users who prefer reduced motion and on coarse-pointer (touch) devices,
 * where native scrolling feels better.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenis = useSyncExternalStore(lenisStore.subscribe, lenisStore.get, lenisStore.getServer);
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || touch) {
      ScrollTrigger.refresh();
      return;
    }
    const instance = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.95,
      smoothWheel: true,
      syncTouch: false,
    });
    lenisRef.current = instance;
    lenisStore.set(instance);
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenisRef.current = null;
      lenisStore.set(null);
    };
  }, []);

  // Reset scroll position on navigation and refresh triggers after the new page paints.
  useEffect(() => {
    const l = lenisRef.current;
    if (l) l.scrollTo(0, { immediate: true });
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
