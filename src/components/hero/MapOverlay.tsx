"use client";

import { useEffect, useMemo, useRef } from "react";
import { CONCEPTUAL_MARKER, indiaSvgPath, toUnit } from "./india-outline";
import { progressStore } from "./progress-store";
import { window01 } from "./story";

/**
 * The map of India for the Geographical Indication scene, drawn as a vector overlay so the
 * boundary is exact (the outline follows the Survey of India depiction — see india-outline.ts).
 * One conceptual marker lights up; no real place is implied.
 */
export function MapOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const path = useMemo(() => indiaSvgPath(1000, 0.9), []);
  const marker = useMemo(() => {
    const [x, y] = toUnit(CONCEPTUAL_MARKER);
    return { cx: 500 + x * 900, cy: 500 - y * 900 };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = (p: number) => {
      const vis = window01(p, 0.79, 0.815, 0.87, 0.895);
      el.style.opacity = vis.toFixed(3);
      el.style.visibility = vis < 0.01 ? "hidden" : "visible";
      el.style.transform = `translateY(${((1 - vis) * 24).toFixed(1)}px)`;
      const lit = window01(p, 0.815, 0.84, 0.87, 0.89);
      el.style.setProperty("--lit", lit.toFixed(3));
    };
    apply(progressStore.get().value);
    return progressStore.subscribe((s) => apply(s.value));
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute right-[var(--page-x)] top-[60%] z-[15] hidden w-[min(40vh,25rem)] -translate-y-1/2 will-change-[opacity,transform] md:block"
      style={{ opacity: 0 }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 1000 1000" className="h-auto w-full overflow-visible">
        <path d={path} fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <g style={{ opacity: "var(--lit, 0)" }}>
          <circle cx={marker.cx} cy={marker.cy} r="34" fill="none" stroke="currentColor" strokeWidth="1.2" className="animate-[pulse-soft_2.4s_ease-in-out_infinite]" />
          <circle cx={marker.cx} cy={marker.cy} r="9" fill="#d9b653" />
          <line x1={marker.cx + 40} y1={marker.cy} x2={marker.cx + 150} y2={marker.cy} stroke="currentColor" strokeWidth="1.2" />
          <text x={marker.cx + 160} y={marker.cy + 6} fontFamily="var(--font-mono)" fontSize="22" letterSpacing="4" fill="currentColor">
            CONCEPTUAL
          </text>
        </g>
      </svg>
      <p className="mt-2 text-right font-mono text-[0.58rem] uppercase tracking-[0.22em] opacity-70">Survey of India boundary · conceptual view</p>
    </div>
  );
}
