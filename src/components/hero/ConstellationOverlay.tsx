"use client";

import { useEffect, useRef } from "react";
import { progressStore } from "./progress-store";
import { ramp, window01 } from "./story";

/**
 * The constellation for the closing beat, drawn as a vector overlay in the empty upper-left of the
 * stage (desktop only). Nine small gold stars appear one by one; hairlines join them into the
 * shape of a balance — the scales of justice; then the lines and stars converge into a small
 * glowing tree and fade before the water beat ripples in. Driven from the progress store like the
 * map; no React state per frame.
 */

/** The nine stars, in the order they appear (viewBox units): finial, beam, two pans, the base. */
const STARS: Array<[number, number]> = [
  [160, 42], // finial
  [160, 96], // beam centre
  [66, 96], // beam, left end
  [254, 96], // beam, right end
  [30, 214], // left pan
  [102, 214],
  [218, 214], // right pan
  [290, 214],
  [160, 336], // base
];
/** Hairlines between stars (indices into STARS), in the order they are drawn. */
const LINES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [2, 5],
  [4, 5],
  [3, 6],
  [3, 7],
  [6, 7],
  [1, 8],
];
/** Where each star ends up when the constellation becomes the tree: canopy points and the trunk foot. */
const TREE_CENTRE: [number, number] = [160, 196];
const TREE: Array<[number, number]> = [
  [160, 152],
  [188, 168],
  [196, 200],
  [178, 228],
  [142, 228],
  [124, 200],
  [132, 168],
  [160, 192],
  [160, 262], // the foot of the trunk
];

const APPEAR = [0.895, 0.915];
const CONNECT = [0.915, 0.94];
const CONVERGE = [0.94, 0.952];

const STAR = "M0,-5.5 L1.3,-1.3 L5.5,0 L1.3,1.3 L0,5.5 L-1.3,1.3 L-5.5,0 L-1.3,-1.3 Z";

export function ConstellationOverlay() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stars = Array.from(el.querySelectorAll<SVGGElement>("[data-star]"));
    const lines = Array.from(el.querySelectorAll<SVGLineElement>("[data-line]"));
    const tree = el.querySelector<SVGGElement>("[data-tree]");
    const apply = (p: number) => {
      const vis = window01(p, 0.893, 0.898, 0.951, 0.958);
      el.style.opacity = vis.toFixed(3);
      el.style.visibility = vis < 0.01 ? "hidden" : "visible";
      if (vis < 0.01) return;
      const converge = ramp(p, CONVERGE[0], CONVERGE[1]);
      stars.forEach((star, i) => {
        const t0 = APPEAR[0] + (i / STARS.length) * (APPEAR[1] - APPEAR[0]);
        const born = ramp(p, t0, t0 + 0.004);
        const [x, y] = STARS[i];
        const [tx, ty] = TREE[i];
        const s = born * (1 - 0.55 * converge);
        star.setAttribute("transform", `translate(${(x + (tx - x) * converge).toFixed(1)}, ${(y + (ty - y) * converge).toFixed(1)}) scale(${s.toFixed(3)})`);
        star.style.opacity = born.toFixed(3);
      });
      lines.forEach((line, j) => {
        const t0 = CONNECT[0] + (j / LINES.length) * (CONNECT[1] - CONNECT[0]);
        const drawn = ramp(p, t0, t0 + 0.006);
        line.style.strokeDashoffset = (1 - drawn).toFixed(3);
        line.style.opacity = (drawn * (1 - converge)).toFixed(3);
      });
      if (tree) {
        const lit = ramp(p, 0.945, 0.952);
        tree.style.opacity = lit.toFixed(3);
        tree.setAttribute("transform", `translate(${TREE_CENTRE[0]}, ${TREE_CENTRE[1]}) scale(${(0.7 + 0.3 * lit).toFixed(3)}) translate(${-TREE_CENTRE[0]}, ${-TREE_CENTRE[1]})`);
      }
    };
    apply(progressStore.get().value);
    return progressStore.subscribe((s) => apply(s.value));
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-[8%] top-[10%] z-[15] hidden h-[40%] w-[32%] text-bronze-2 will-change-[opacity] md:block"
      style={{ opacity: 0, visibility: "hidden" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 320 400" preserveAspectRatio="xMidYMid meet" className="h-full w-full overflow-visible">
        <defs>
          <filter id="constellation-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {LINES.map(([a, b], j) => (
          <line
            key={j}
            data-line
            x1={STARS[a][0]}
            y1={STARS[a][1]}
            x2={STARS[b][0]}
            y2={STARS[b][1]}
            pathLength={1}
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="1"
            style={{ strokeDashoffset: 1, opacity: 0 }}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {STARS.map(([x, y], i) => (
          <g key={i} data-star transform={`translate(${x}, ${y}) scale(0)`} style={{ opacity: 0 }}>
            <path d={STAR} fill="currentColor" />
            <circle r="1.6" fill="#fff3d6" />
          </g>
        ))}
        {/* the tree: a trunk and a canopy of rings, glowing */}
        <g data-tree style={{ opacity: 0 }}>
          <g filter="url(#constellation-glow)" opacity="0.8">
            <circle cx={TREE_CENTRE[0]} cy={TREE_CENTRE[1] - 6} r="44" fill="currentColor" />
          </g>
          <line x1="160" y1="262" x2="160" y2="212" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="160" y1="228" x2="140" y2="206" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="160" y1="222" x2="182" y2="198" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="160" cy="190" r="36" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="160" cy="190" r="24" fill="none" stroke="currentColor" strokeWidth="0.9" />
          <circle cx="160" cy="190" r="12" fill="currentColor" fillOpacity="0.5" />
          <line x1="146" y1="262" x2="174" y2="262" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
