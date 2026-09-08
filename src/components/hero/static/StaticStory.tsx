import type { ReactNode } from "react";
import { PALETTE, SCENES, type Caption } from "../story";
import { compass, cutoutsD, fmt, gearD, guilloche, indiaPoints, markerAt, meshedRotation, polygonPoints, roseOrnament, ticksD, tornPoints, vesselD, vesselRings } from "./svg";
import { cn } from "@/lib/utils";

/**
 * The still homepage — served when the visitor prefers reduced motion (or asks for it with
 * ?render=static). Nothing moves and nothing needs JavaScript: one tenebrist plate of the advocate
 * with the five IP subjects around him, five smaller plates for the machine act, and the eight
 * captions of the story laid out as a readable editorial sequence. Every colour is from PALETTE.
 */
export function StaticStory() {
  const [lawyer, gown, gavel, patent, design, trademark, gi, legal] = SCENES;
  const plates: Array<{ scene: (typeof SCENES)[number]; plate: ReactNode; index: string }> = [
    { scene: patent, plate: <GearsPlate />, index: "04" },
    { scene: design, plate: <TurnedPlate />, index: "05" },
    { scene: trademark, plate: <SealPlate />, index: "06" },
    { scene: gi, plate: <MapPlate />, index: "07" },
  ];
  return (
    <div className="relative bg-ink text-ivory" data-renderer="static">
      {/* 01 · The lawyer */}
      <section className="container-editorial pb-16 pt-[calc(var(--header-height)+2.5rem)] md:pb-24 md:pt-[calc(var(--header-height)+4rem)]" aria-labelledby="static-title">
        <div className="grid gap-12 md:grid-cols-12 md:items-center">
          <figure className="mx-auto w-full max-w-[34rem] md:col-span-6">
            <HeroPlate />
            <figcaption className="sr-only">
              An advocate in a black gown with white bands, standing in a single warm light; around him the five subjects of intellectual property — a registration seal, an engineering
              sheet, loose manuscript pages, a faceted ornament and a fragment of a map with one marker.
            </figcaption>
          </figure>
          <div className="md:col-span-6 md:pl-6">
            <SceneIndex n="01" label={lawyer.label} />
            <CaptionBlock caption={lawyer.captions[0]} as="h1" id="static-title" />
          </div>
        </div>
      </section>

      <Rule />

      {/* 02 · The gown moves — the five subjects */}
      <section className="container-editorial py-16 md:py-24" aria-labelledby="static-gown">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <SceneIndex n="02" label={gown.label} />
            <h2 id="static-gown" className="display-md mt-4 text-parchment">
              Five subjects, one gown.
            </h2>
            <p className="mt-5 max-w-sm text-base text-bone">From the folds of the gown emerge the things this practice protects. Each has its own object, its own language, its own law.</p>
          </div>
          <ol className="divide-y divide-bronze/15 border-y border-bronze/15 md:col-span-8">
            {gown.captions.map((c, i) => (
              <li key={c.title} className="grid grid-cols-[3.5rem_1fr] gap-4 py-6 md:grid-cols-[4.5rem_1fr_minmax(0,18rem)] md:items-baseline md:gap-8">
                <span className="pt-1 font-mono text-[0.62rem] tracking-[0.2em] text-bronze-2">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="eyebrow mb-2">{c.eyebrow}</p>
                  <h3 className="font-display text-2xl text-ivory md:text-3xl">{c.title}</h3>
                  <p className="mt-2 text-sm text-bone md:hidden">{c.body}</p>
                </div>
                <p className="hidden text-sm leading-relaxed text-bone md:block">{c.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Rule />

      {/* 03 · The gavel */}
      <section className="container-editorial py-20 md:py-28" aria-labelledby="static-gavel">
        <div className="mx-auto max-w-2xl text-center">
          <SceneIndex n="03" label={gavel.label} center />
          <GavelMark />
          <CaptionBlock caption={gavel.captions[0]} as="h2" id="static-gavel" center />
        </div>
      </section>

      <Rule />

      {/* 04 – 07 · The machine */}
      {plates.map(({ scene, plate, index }) => {
        const c = scene.captions[0];
        const flip = c.align === "right";
        return (
          <div key={scene.id}>
            <section className="container-editorial py-16 md:py-24" aria-labelledby={`static-${scene.id}`}>
              <div className="grid items-center gap-10 md:grid-cols-12 md:gap-14">
                <figure className={cn("md:col-span-5", flip && "md:order-2 md:col-start-8")}>{plate}</figure>
                <div className={cn("md:col-span-6", flip ? "md:order-1 md:col-start-1" : "md:col-start-7")}>
                  <SceneIndex n={index} label={scene.label} />
                  <CaptionBlock caption={c} as="h2" id={`static-${scene.id}`} />
                </div>
              </div>
            </section>
            <Rule />
          </div>
        );
      })}

      {/* 08 · The legal world */}
      <section className="container-editorial py-20 md:py-28" aria-labelledby="static-legal">
        <div className="mx-auto max-w-3xl text-center">
          <SceneIndex n="08" label={legal.label} center />
          <div className="mx-auto mt-8 w-full max-w-md">
            <ConstellationPlate />
          </div>
          <CaptionBlock caption={legal.captions[0]} as="h2" id="static-legal" center />
        </div>
      </section>
      <div className="container-editorial pb-8">
        <div className="rule" role="presentation" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ text */

function Rule() {
  return (
    <div className="container-editorial">
      <div className="rule" role="presentation" />
    </div>
  );
}

function SceneIndex({ n, label, center }: { n: string; label: string; center?: boolean }) {
  return (
    <p className={cn("flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-bone/70", center && "justify-center")}>
      <span className="text-bronze-2">{n}</span>
      <span aria-hidden="true" className="h-px w-6 bg-bronze/40" />
      <span>{label}</span>
    </p>
  );
}

function CaptionBlock({ caption, as, id, center }: { caption: Caption; as: "h1" | "h2"; id: string; center?: boolean }) {
  const Tag = as;
  return (
    <div className={cn("mt-6", center && "mx-auto max-w-2xl text-center")}>
      {caption.eyebrow ? <p className="eyebrow mb-4">{caption.eyebrow}</p> : null}
      <Tag id={id} className={cn(as === "h1" ? "display-xl" : center ? "display-lg" : "display-md", "text-balance")}>
        {caption.title}
      </Tag>
      {caption.body ? (
        <p className={cn("lede mt-5 max-w-md opacity-90", center && "mx-auto", as === "h1" && "font-body text-base tracking-[0.05em] text-bone")}>
          {caption.body}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ shared SVG bits */

const INK = PALETTE.ink;

/** Film grain and a vignette over a plate; `id` keeps the filter unique per SVG. */
function GrainAndVignette({ id, w, h }: { id: string; w: number; h: number }) {
  return (
    <>
      <defs>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" seed="7" />
          <feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0.09 0" />
        </filter>
        <radialGradient id={`${id}-vig`} cx="50%" cy="42%" r="72%">
          <stop offset="0.35" stopColor={INK} stopOpacity="0" />
          <stop offset="1" stopColor={INK} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} filter={`url(#${id}-grain)`} />
      <rect width={w} height={h} fill={`url(#${id}-vig)`} />
    </>
  );
}

/** Brushed steel: a graphite disc under a steel gradient whose opacity alternates like turning marks. */
function SteelGradient({ id }: { id: string }) {
  const stops: ReactNode[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const o = 0.55 + 0.4 * Math.sin(t * 9.5) * (1 - t * 0.4);
    stops.push(<stop key={i} offset={t} stopColor={PALETTE.steel} stopOpacity={Math.max(0.12, Math.min(0.95, o))} />);
  }
  stops.push(<stop key="end" offset="1" stopColor={PALETTE.graphite} stopOpacity="1" />);
  return (
    <radialGradient id={id} cx="50%" cy="50%" r="50%">
      {stops}
    </radialGradient>
  );
}

function BronzeGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={PALETTE.bronzeDim} />
      <stop offset="0.4" stopColor={PALETTE.bronze} />
      <stop offset="0.55" stopColor={PALETTE.bronze2} />
      <stop offset="0.72" stopColor={PALETTE.bronze} />
      <stop offset="1" stopColor={PALETTE.bronzeDim} />
    </linearGradient>
  );
}

const DISPLAY = { fontFamily: "var(--font-display)" } as const;
const MONO = { fontFamily: "var(--font-mono)" } as const;

/** A gear at (x, y): brushed body, cut-outs, bronze rim, boss and pin. */
function Gear({ teeth, r, x, y, rot, spokes, steel, bronze, label }: { teeth: number; r: number; x: number; y: number; rot: number; spokes: number; steel: string; bronze: string; label?: string }) {
  const hole = r * 0.11;
  return (
    <g transform={`translate(${fmt(x)} ${fmt(y)})`}>
      <circle cx={r * 0.05} cy={r * 0.09} r={r * 1.07} fill={INK} opacity="0.55" />
      <g transform={`rotate(${fmt((rot * 180) / Math.PI)})`}>
        <path d={gearD(teeth, r, hole, 0)} fill={PALETTE.graphite} fillRule="evenodd" />
        <path d={gearD(teeth, r, hole, 0)} fill={`url(#${steel})`} fillRule="evenodd" stroke={INK} strokeOpacity="0.7" strokeWidth="1" />
        {spokes > 0 ? <path d={cutoutsD(spokes, r * 0.31, label ? r * 0.62 : r * 0.68)} fill={INK} fillOpacity="0.84" stroke={INK} strokeOpacity="0.7" strokeWidth="1" /> : null}
        {label ? (
          <>
            <defs>
              <path id={`${steel}-arc`} d={`M${fmt(-r * 0.755)} 0A${fmt(r * 0.755)} ${fmt(r * 0.755)} 0 0 1 ${fmt(r * 0.755)} 0`} />
            </defs>
            <text fontSize={r * 0.125} fontWeight={600} fill={PALETTE.bronze2} fillOpacity="0.7" letterSpacing={r * 0.03} style={DISPLAY} transform="translate(0.8 0.8)">
              <textPath href={`#${steel}-arc`} startOffset="50%" textAnchor="middle" dominantBaseline="middle">
                {label}
              </textPath>
            </text>
            <text fontSize={r * 0.125} fontWeight={600} fill={INK} fillOpacity="0.92" letterSpacing={r * 0.03} style={DISPLAY}>
              <textPath href={`#${steel}-arc`} startOffset="50%" textAnchor="middle" dominantBaseline="middle">
                {label}
              </textPath>
            </text>
          </>
        ) : null}
      </g>
      <circle r={r * 0.855} fill="none" stroke={`url(#${bronze})`} strokeWidth={Math.max(1.2, r * 0.035)} />
      <circle r={r * 0.24} fill={PALETTE.bronze} />
      <circle r={r * 0.2} cx={-r * 0.03} cy={-r * 0.04} fill={PALETTE.bronze2} fillOpacity="0.45" />
      <circle r={r * 0.085} fill={PALETTE.steel} />
      <circle r={r * 0.03} fill={INK} />
    </g>
  );
}

function PlateFrame({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 320" role="img" aria-labelledby={`${id}-t`} className="h-auto w-full">
      <title id={`${id}-t`}>{title}</title>
      <defs>
        <radialGradient id={`${id}-bg`} cx="35%" cy="30%" r="90%">
          <stop offset="0" stopColor={PALETTE.charcoal} />
          <stop offset="1" stopColor={INK} />
        </radialGradient>
      </defs>
      <rect width="320" height="320" fill={`url(#${id}-bg)`} />
      {children}
      <GrainAndVignette id={id} w={320} h={320} />
      <rect x="0.5" y="0.5" width="319" height="319" fill="none" stroke={PALETTE.bronze} strokeOpacity="0.28" />
    </svg>
  );
}

/* ------------------------------------------------------------------ the hero plate */

const MOTES = (() => {
  const out: Array<[number, number, number, number]> = [];
  let a = 0x0d05e;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let guard = 0;
  while (out.length < 70 && guard++ < 2000) {
    const x = rnd() * 900;
    const y = rnd() * 1000;
    // inside the beam from the upper-left
    const dx = x + 60;
    const dy = y + 120;
    const cos = (dx * 0.62 + dy * 0.78) / Math.hypot(dx, dy);
    if (cos < 0.93) continue;
    out.push([x, y, 1 + rnd() * 1.8, 0.12 + rnd() * 0.4]);
  }
  return out;
})();

function HeroPlate() {
  const gownFolds = [
    "M392 372 C380 520 340 760 300 1000",
    "M430 364 C420 560 400 780 380 1000",
    "M512 364 C520 560 545 790 570 1000",
    "M548 372 C566 500 610 760 650 1000",
    "M574 388 C600 520 650 760 690 1000",
  ];
  const torn = tornPoints(84, 0x6a9);
  const [mkx, mky] = markerAt(118);
  const sheetGear = gearD(14, 28, 5, 0, 0.2);
  return (
    <svg viewBox="0 0 900 1100" role="img" aria-hidden="true" className="h-auto w-full">
      <defs>
        <radialGradient id="h-key" cx="6%" cy="-4%" r="95%">
          <stop offset="0" stopColor={PALETTE.keyLight} stopOpacity="0.16" />
          <stop offset="0.45" stopColor={PALETTE.keyLight} stopOpacity="0.05" />
          <stop offset="1" stopColor={PALETTE.keyLight} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="h-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={INK} />
          <stop offset="1" stopColor={PALETTE.charcoal} />
        </linearGradient>
        <radialGradient id="h-pool" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={PALETTE.keyLight} stopOpacity="0.18" />
          <stop offset="0.5" stopColor={PALETTE.keyLight} stopOpacity="0.05" />
          <stop offset="1" stopColor={PALETTE.keyLight} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="h-head" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={PALETTE.graphite} />
          <stop offset="0.4" stopColor={PALETTE.charcoal} />
          <stop offset="1" stopColor={INK} />
        </radialGradient>
        <linearGradient id="h-gown" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={PALETTE.smoke} />
          <stop offset="0.28" stopColor={PALETTE.charcoal} />
          <stop offset="0.65" stopColor={INK} />
          <stop offset="1" stopColor={PALETTE.charcoal} />
        </linearGradient>
        <linearGradient id="h-band" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PALETTE.ivory} />
          <stop offset="0.6" stopColor={PALETTE.parchment} />
          <stop offset="1" stopColor={PALETTE.bone} />
        </linearGradient>
        <radialGradient id="h-bandglow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={PALETTE.keyLight} stopOpacity="0.16" />
          <stop offset="1" stopColor={PALETTE.keyLight} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="h-ring" cx="50%" cy="50%" r="50%">
          <stop offset="0.76" stopColor={PALETTE.bronzeDim} />
          <stop offset="0.86" stopColor={PALETTE.bronze2} />
          <stop offset="1" stopColor={PALETTE.bronzeDim} />
        </radialGradient>
        <radialGradient id="h-sealface" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor={PALETTE.graphite} />
          <stop offset="1" stopColor={INK} />
        </radialGradient>
        <linearGradient id="h-sheet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PALETTE.parchment} />
          <stop offset="1" stopColor={PALETTE.bone} />
        </linearGradient>
        <linearGradient id="h-page" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PALETTE.ivory} />
          <stop offset="1" stopColor={PALETTE.parchment} />
        </linearGradient>
        <radialGradient id="h-core" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor={PALETTE.steel} />
          <stop offset="1" stopColor={PALETTE.graphite} />
        </radialGradient>
        <radialGradient id="h-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={PALETTE.keyLight} stopOpacity="0.9" />
          <stop offset="0.3" stopColor={PALETTE.keyLight} stopOpacity="0.3" />
          <stop offset="1" stopColor={PALETTE.keyLight} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* the room */}
      <rect width="900" height="1100" fill={INK} />
      <rect y="880" width="900" height="220" fill="url(#h-floor)" />
      <rect width="900" height="1100" fill="url(#h-key)" />
      <ellipse cx="400" cy="1002" rx="330" ry="62" fill="url(#h-pool)" />
      <ellipse cx="575" cy="1006" rx="150" ry="22" fill={INK} opacity="0.75" />

      {/* dust in the beam */}
      <g fill={PALETTE.keyLight}>
        {MOTES.map(([x, y, s, o], i) => (
          <rect key={i} x={fmt(x)} y={fmt(y)} width={fmt(s)} height={fmt(s)} opacity={fmt(o)} />
        ))}
      </g>

      {/* the advocate */}
      <g>
        <polygon points="448,296 492,296 500,350 440,350" fill={PALETTE.charcoal} />
        <ellipse cx="470" cy="248" rx="54" ry="63" fill={INK} />
        <ellipse cx="470" cy="256" rx="50" ry="58" fill="url(#h-head)" />
        <path d="M362 380 C392 356 432 346 470 346 C508 346 548 356 578 380 C606 520 666 760 700 1000 L 240 1000 C 274 760 334 520 362 380 Z" fill="url(#h-gown)" />
        <path d="M456 350 L484 350 L500 1000 L440 1000 Z" fill={INK} />
        {gownFolds.map((d, i) => (
          <path key={d} d={d} fill="none" stroke={i < 2 ? PALETTE.keyLight : INK} strokeOpacity={i === 0 ? 0.28 : i === 1 ? 0.12 : 0.8} strokeWidth={i < 2 ? 1.2 : 1.6} />
        ))}
        <path d="M578 380 C606 520 666 760 700 1000" fill="none" stroke={PALETTE.rimLight} strokeOpacity="0.16" strokeWidth="1.2" />
        <path d="M362 380 C334 520 274 760 240 1000" fill="none" stroke={PALETTE.keyLight} strokeOpacity="0.22" strokeWidth="1.2" />
        <path d="M362 380 C392 356 432 346 470 346" fill="none" stroke={PALETTE.keyLight} strokeOpacity="0.16" strokeWidth="1.2" />
        <circle cx="470" cy="420" r="120" fill="url(#h-bandglow)" />
        <ellipse cx="470" cy="352" rx="30" ry="6.5" fill={PALETTE.ivory} />
        <ellipse cx="470" cy="349" rx="26" ry="4" fill={INK} />
        <polygon points="452,356 466,356 465,512 447,512" fill="url(#h-band)" transform="rotate(-3 470 356)" />
        <polygon points="474,356 488,356 493,512 475,512" fill="url(#h-band)" transform="rotate(3 470 356)" />
      </g>

      {/* 01 the registration seal */}
      <g transform="translate(150 230)">
        <circle r="74" fill={INK} opacity="0.5" cx="4" cy="6" />
        <circle r="72" fill="url(#h-ring)" />
        <circle r="56" fill="url(#h-sealface)" />
        <path d={ticksD(40, 61, 68, 5, 4)} stroke={INK} strokeOpacity="0.6" strokeWidth="1.4" />
        <circle r="43" fill="none" stroke={PALETTE.bronze2} strokeOpacity="0.6" strokeWidth="1.2" />
        <text textAnchor="middle" dominantBaseline="middle" fontSize="66" fontWeight={600} fill={INK} fillOpacity="0.8" y="6" style={DISPLAY}>
          ®
        </text>
        <text textAnchor="middle" dominantBaseline="middle" fontSize="66" fontWeight={600} fill={PALETTE.bronze2} y="4" style={DISPLAY}>
          ®
        </text>
      </g>

      {/* 02 the engineering sheet */}
      <g transform="translate(748 262) rotate(6)">
        <rect x="-102" y="-72" width="204" height="144" fill={INK} opacity="0.5" transform="translate(5 7)" />
        <rect x="-102" y="-72" width="204" height="144" fill="url(#h-sheet)" stroke={INK} strokeOpacity="0.55" />
        <line x1="0" y1="-72" x2="0" y2="72" stroke={INK} strokeOpacity="0.14" />
        <g transform="translate(-48 4)" fill="none" stroke={PALETTE.bronzeDim} strokeWidth="1.3">
          <path d={sheetGear} strokeOpacity="0.9" />
          <circle r="12" strokeOpacity="0.9" />
          <circle r="28" strokeOpacity="0.6" strokeDasharray="6 2 1.5 2" />
          <path d="M-40 0H40M0 -40V40" strokeOpacity="0.6" strokeDasharray="6 2 1.5 2" />
          <path d="M-32 44H32M-32 40V48M32 40V48M44 -32V32M40 -32H48M40 32H48" strokeOpacity="0.9" />
        </g>
        <g fill={PALETTE.bronzeDim} fontSize="9" style={MONO}>
          <text x="22" y="-44">FIG. 1</text>
          <text x="22" y="-26">Ø 4.36</text>
          <text x="22" y="58">SEC. A-A</text>
        </g>
        <rect x="24" y="-12" width="62" height="44" fill="none" stroke={PALETTE.bronzeDim} strokeOpacity="0.6" />
        <path d="M24 32L68 -12M34 32L78 -12M44 32L86 -10M54 32L86 0M64 32L86 10M74 32L86 20M24 22L58 -12M24 12L48 -12M24 2L38 -12" stroke={PALETTE.bronzeDim} strokeOpacity="0.6" />
      </g>

      {/* 03 loose manuscript pages */}
      <g transform="translate(172 560)">
        {[
          [-16, 8, -14],
          [5, -4, 3],
          [20, 3, 16],
        ].map(([ox, oy, rot], i) => (
          <g key={i} transform={`translate(${ox} ${oy}) rotate(${rot})`}>
            <rect x="-42" y="-58" width="84" height="116" fill={INK} opacity="0.4" transform="translate(4 5)" />
            <rect x="-42" y="-58" width="84" height="116" fill="url(#h-page)" stroke={INK} strokeOpacity="0.35" />
            <path d="M-30 -40H30M-30 -26H18M-30 -12H26M-30 2H14M-30 16H30M-30 30H20M-30 44H-2" stroke={PALETTE.bronzeDim} strokeOpacity="0.65" strokeWidth="1.3" />
          </g>
        ))}
      </g>

      {/* 04 the faceted ornament */}
      <g transform="translate(760 590)">
        <circle r="74" fill={INK} opacity="0.5" cx="4" cy="6" />
        {polygonPoints(16, 1).map(([x, y], k) => {
          const rr = k % 2 === 0 ? 70 : 59;
          const [nx, ny] = polygonPoints(16, 1)[(k + 1) % 16];
          const nr = (k + 1) % 16 === 0 || (k + 1) % 2 === 0 ? 70 : 59;
          const [ix, iy] = polygonPoints(8, 30)[Math.floor(k / 2) % 8];
          const lit = Math.cos(Math.atan2(y, x) + 2.35);
          const fill = lit > 0.35 ? PALETTE.steel : lit > -0.3 ? PALETTE.smoke : PALETTE.graphite;
          return (
            <g key={k}>
              <polygon points={`${fmt(x * rr)},${fmt(y * rr)} ${fmt(nx * nr)},${fmt(ny * nr)} ${fmt(ix)},${fmt(iy)}`} fill={fill} stroke={INK} strokeOpacity="0.5" strokeWidth="0.8" />
              {lit > 0.6 ? <line x1={fmt(x * rr)} y1={fmt(y * rr)} x2={fmt(nx * nr)} y2={fmt(ny * nr)} stroke={PALETTE.keyLight} strokeOpacity="0.55" strokeWidth="1.4" /> : null}
            </g>
          );
        })}
        <polygon points={polygonPoints(8, 30).map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" ")} fill="url(#h-core)" stroke={PALETTE.keyLight} strokeOpacity="0.3" />
      </g>

      {/* 05 the map fragment with its marker */}
      <g transform="translate(190 860) rotate(-4)">
        <polygon points={torn} fill={INK} opacity="0.5" transform="translate(4 6)" />
        <polygon points={torn} fill={PALETTE.bone} stroke={INK} strokeOpacity="0.55" />
        <polygon points={torn} fill={PALETTE.parchment} opacity="0.55" />
        <g>
          <polygon points={indiaPoints(118)} fill={PALETTE.graphite} />
          <polygon points={indiaPoints(118)} fill={PALETTE.parchment} opacity="0.28" />
          {[0.82, 0.64, 0.46, 0.28].map((k) => (
            <polygon key={k} points={indiaPoints(118, 1, k)} fill="none" stroke={PALETTE.bronzeDim} strokeOpacity="0.7" strokeWidth="1" />
          ))}
          <polygon points={indiaPoints(118)} fill="none" stroke={PALETTE.bone} strokeOpacity="0.9" strokeWidth="1.4" />
          <circle cx={fmt(mkx)} cy={fmt(mky)} r="26" fill="url(#h-glow)" />
          <line x1={fmt(mkx)} y1={fmt(mky - 7)} x2={fmt(mkx)} y2={fmt(mky - 34)} stroke={PALETTE.keyLight} strokeOpacity="0.8" />
          <circle cx={fmt(mkx)} cy={fmt(mky)} r="7" fill="none" stroke={PALETTE.bronze2} strokeWidth="1.8" />
          <circle cx={fmt(mkx)} cy={fmt(mky)} r="2.4" fill={PALETTE.ivory} />
        </g>
      </g>

      <GrainAndVignette id="h" w={900} h={1100} />
    </svg>
  );
}

/** A small gavel between the rule and the gavel caption. */
function GavelMark() {
  return (
    <svg viewBox="0 0 120 60" aria-hidden="true" className="mx-auto mt-8 h-14 w-auto">
      <defs>
        <BronzeGradient id="gv-bronze" />
      </defs>
      <g transform="translate(60 30) rotate(-35)">
        <rect x="-4" y="-2" width="60" height="4" rx="1" fill={PALETTE.bronzeDim} />
        <rect x="-26" y="-11" width="30" height="22" rx="2" fill={PALETTE.charcoal} stroke={PALETTE.bronze} strokeOpacity="0.5" />
        <rect x="-21" y="-11" width="4" height="22" fill="url(#gv-bronze)" />
        <rect x="-5" y="-11" width="4" height="22" fill="url(#gv-bronze)" />
        <line x1="-26" y1="-10" x2="4" y2="-10" stroke={PALETTE.keyLight} strokeOpacity="0.5" />
      </g>
      <ellipse cx="86" cy="47" rx="20" ry="5" fill={PALETTE.charcoal} stroke="url(#gv-bronze)" strokeWidth="1.4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ plates 04–08 */

function GearsPlate() {
  const G0 = { teeth: 24, r: 62, x: 122, y: 178, rot: 0.12 };
  const a1 = -0.62;
  const r1 = (12 / 24) * G0.r;
  const G1 = { teeth: 12, r: r1, x: G0.x + Math.cos(a1) * (G0.r + r1), y: G0.y + Math.sin(a1) * (G0.r + r1), rot: meshedRotation(G0.rot, 24, 12, a1) };
  const a2 = 0.5;
  const r2 = (16 / 24) * G0.r;
  const G2 = { teeth: 16, r: r2, x: G1.x + Math.cos(a2) * (G1.r + r2), y: G1.y + Math.sin(a2) * (G1.r + r2), rot: meshedRotation(G1.rot, 12, 16, a2) };
  const a3 = 2.25;
  const r3 = (8 / 24) * G0.r;
  const G3 = { teeth: 8, r: r3, x: G0.x + Math.cos(a3) * (G0.r + r3), y: G0.y + Math.sin(a3) * (G0.r + r3), rot: meshedRotation(G0.rot, 24, 8, a3) };
  return (
    <PlateFrame id="p4" title="The patent machine: four meshing gears, brushed steel with bronze rims, PATENT engraved on the largest, over a parchment blueprint.">
      <defs>
        <SteelGradient id="p4-s0" />
        <SteelGradient id="p4-s1" />
        <SteelGradient id="p4-s2" />
        <SteelGradient id="p4-s3" />
        <BronzeGradient id="p4-bronze" />
      </defs>
      <g fill="none" stroke={PALETTE.bronze} strokeOpacity="0.32" strokeWidth="1">
        <circle cx="236" cy="96" r="70" strokeDasharray="7 3 1.5 3" />
        <circle cx="236" cy="96" r="46" />
        <path d="M150 96H322M236 10V182" strokeDasharray="7 3 1.5 3" />
        <path d="M40 292H160M40 286V298M160 286V298M200 230h96v50h-96zM200 255h96" />
        <path d="M200 280l25 -25M212 280l25 -25M224 280l25 -25M236 280l25 -25M248 280l25 -25M260 280l25 -25M272 280l24 -24M284 280l12 -12" />
      </g>
      <g fill={PALETTE.bronze} fillOpacity="0.7" fontSize="8" letterSpacing="1" style={MONO}>
        <text x="204" y="224">SECTION A-A</text>
        <text x="40" y="282">DIA. 4.36</text>
        <text x="232" y="304">SHEET 1 OF 1</text>
      </g>
      <Gear {...G3} spokes={0} steel="p4-s3" bronze="p4-bronze" />
      <Gear {...G2} spokes={4} steel="p4-s2" bronze="p4-bronze" />
      <Gear {...G1} spokes={0} steel="p4-s1" bronze="p4-bronze" />
      <Gear {...G0} spokes={6} steel="p4-s0" bronze="p4-bronze" label="PATENT" />
    </PlateFrame>
  );
}

function TurnedPlate() {
  const R = 112;
  const g = guilloche(R * 0.93);
  const lathe: number[] = [];
  for (let r = 0.3 * R; r < 0.975 * R; r += 0.045 * R) lathe.push(r);
  return (
    <PlateFrame id="p5" title="Design: a turned-metal plate engraved with a lotus guilloché, a bronze product silhouette standing on it.">
      <defs>
        <SteelGradient id="p5-steel" />
        <BronzeGradient id="p5-bronze" />
        <linearGradient id="p5-sweep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PALETTE.bronze2} stopOpacity="0.95" />
          <stop offset="0.45" stopColor={PALETTE.bronze2} stopOpacity="0.55" />
          <stop offset="1" stopColor={PALETTE.bronzeDim} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <g transform="translate(160 208) scale(1 0.62)">
        <circle r={R * 1.06} cx="6" cy="14" fill={INK} opacity="0.55" />
        <circle r={R} cy="12" fill={PALETTE.graphite} />
        <circle r={R} fill={PALETTE.graphite} />
        <circle r={R} fill="url(#p5-steel)" />
        <g fill="none" stroke={PALETTE.steel} strokeOpacity="0.2" strokeWidth="1">
          {lathe.map((r) => (
            <circle key={r} r={fmt(r)} />
          ))}
        </g>
        <g fill="none" stroke="url(#p5-sweep)" strokeWidth="0.9">
          {g.rings.map((r) => (
            <circle key={r} r={fmt(r)} />
          ))}
          {g.curves.map((pts, i) => (
            <polyline key={i} points={pts} />
          ))}
          <path d={g.ticks} />
        </g>
        <circle r={R * 0.975} fill="none" stroke="url(#p5-bronze)" strokeWidth="3.2" />
        <circle r={R * 0.13} fill={PALETTE.bronze} />
        <circle r={R * 0.04} fill={PALETTE.steel} />
      </g>
      <g transform="translate(160 214)" fill="none" stroke={PALETTE.bronze2} strokeWidth="1.5">
        <path d={vesselD(84)} />
        <g strokeWidth="1" strokeOpacity="0.45" stroke={PALETTE.bronze}>
          {vesselRings(84).map(([cy, rx]) => (
            <ellipse key={cy} cy={fmt(cy)} rx={fmt(rx)} ry={fmt(rx * 0.3)} />
          ))}
        </g>
      </g>
    </PlateFrame>
  );
}

function SealPlate() {
  return (
    <PlateFrame id="p6" title="Trade mark: a wax seal in a bronze ring reading TRADE MARK · REGISTERED, a ® at its centre, a ribbon beneath reading TRADE MARKS.">
      <defs>
        <BronzeGradient id="p6-bronze" />
        <radialGradient id="p6-enamel" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor={PALETTE.smoke} />
          <stop offset="0.7" stopColor={PALETTE.charcoal} />
          <stop offset="1" stopColor={INK} />
        </radialGradient>
        <radialGradient id="p6-wax" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor={PALETTE.seal2} />
          <stop offset="0.55" stopColor={PALETTE.seal} />
          <stop offset="1" stopColor={INK} />
        </radialGradient>
        <linearGradient id="p6-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PALETTE.parchment} />
          <stop offset="1" stopColor={PALETTE.bone} />
        </linearGradient>
        <path id="p6-arc" d="M-92 0A92 92 0 1 1 92 0A92 92 0 1 1 -92 0" />
      </defs>
      <g transform="translate(160 150)">
        <circle r="110" cx="5" cy="9" fill={INK} opacity="0.55" />
        <circle r="106" fill="url(#p6-enamel)" />
        <circle r="74" fill="url(#p6-wax)" />
        <circle r="73" fill="none" stroke={INK} strokeOpacity="0.55" strokeWidth="2" />
        <path d="M-52 -46A70 70 0 0 1 -6 -70" fill="none" stroke={PALETTE.ivory} strokeOpacity="0.22" strokeWidth="1.4" />
        <text fontSize="10.5" fontWeight={600} fill={PALETTE.parchment} letterSpacing="2.6" style={DISPLAY} transform="rotate(-90)">
          <textPath href="#p6-arc" startOffset="0">
            TRADE MARK · REGISTERED · TRADE MARK · REGISTERED ·
          </textPath>
        </text>
        <text textAnchor="middle" dominantBaseline="middle" fontSize="84" fontWeight={600} fill={INK} fillOpacity="0.85" y="7" style={DISPLAY}>
          ®
        </text>
        <text textAnchor="middle" dominantBaseline="middle" fontSize="84" fontWeight={600} fill={PALETTE.parchment} y="5" style={DISPLAY}>
          ®
        </text>
        <circle r="82" fill="none" stroke="url(#p6-bronze)" strokeWidth="5" />
        <circle r="104" fill="none" stroke="url(#p6-bronze)" strokeWidth="2.6" />
      </g>
      <g transform="translate(160 262)">
        <polygon points="-96,-14 -136,-14 -122,2 -136,18 -96,18" fill={PALETTE.bone} stroke={INK} strokeOpacity="0.45" />
        <polygon points="96,-14 136,-14 122,2 136,18 96,18" fill={PALETTE.bone} stroke={INK} strokeOpacity="0.45" />
        <rect x="-100" y="-18" width="200" height="36" fill="url(#p6-ribbon)" stroke={INK} strokeOpacity="0.45" />
        <text textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight={600} fill={INK} letterSpacing="3.2" y="1" style={DISPLAY}>
          TRADE MARKS
        </text>
      </g>
    </PlateFrame>
  );
}

function MapPlate() {
  const M = 236;
  const sy = 0.8;
  const [mkx, mky] = markerAt(M, sy);
  const c = compass(36);
  return (
    <PlateFrame id="p7" title="Geographical indication: a chart of India with contour lines, a graticule, engraved place glyphs, one lit marker and a compass rose.">
      <defs>
        <BronzeGradient id="p7-bronze" />
        <radialGradient id="p7-land" cx="30%" cy="25%" r="90%">
          <stop offset="0" stopColor={PALETTE.bone} />
          <stop offset="1" stopColor={PALETTE.smoke} />
        </radialGradient>
        <radialGradient id="p7-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={PALETTE.keyLight} stopOpacity="0.9" />
          <stop offset="0.3" stopColor={PALETTE.keyLight} stopOpacity="0.3" />
          <stop offset="1" stopColor={PALETTE.keyLight} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g stroke={PALETTE.bronze} strokeOpacity="0.16" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <g key={i}>
            <line x1={20 + i * 35} y1="20" x2={20 + i * 35} y2="300" />
            <line x1="20" y1={20 + i * 35} x2="300" y2={20 + i * 35} />
          </g>
        ))}
      </g>
      <g transform="translate(172 170)">
        <polygon points={indiaPoints(M, sy)} fill={PALETTE.bronzeDim} transform="translate(0 7)" />
        <polygon points={indiaPoints(M, sy)} fill={PALETTE.graphite} />
        <polygon points={indiaPoints(M, sy)} fill="url(#p7-land)" opacity="0.7" />
        {[0.88, 0.76, 0.64, 0.52, 0.4, 0.28].map((k) => (
          <polygon key={k} points={indiaPoints(M, sy, k)} fill="none" stroke={PALETTE.bronzeDim} strokeOpacity="0.75" strokeWidth="0.9" />
        ))}
        <polygon points={indiaPoints(M, sy)} fill="none" stroke={PALETTE.bone} strokeOpacity="0.85" strokeWidth="1.3" />
        <g fill="none" stroke={PALETTE.bronzeDim} strokeWidth="1">
          {[
            [-42, -46],
            [30, -30],
            [74, -8],
            [-20, 28],
            [10, 62],
          ].map(([x, y]) => (
            <g key={`${x}${y}`} transform={`translate(${x} ${y})`}>
              <circle r="3" />
              <path d="M-6.6 0H-4M4 0H6.6M0 -6.6V-4M0 4V6.6" />
            </g>
          ))}
        </g>
        <circle cx={fmt(mkx)} cy={fmt(mky)} r="30" fill="url(#p7-glow)" />
        <circle cx={fmt(mkx)} cy={fmt(mky)} r="16" fill="none" stroke={PALETTE.keyLight} strokeOpacity="0.35" />
        <line x1={fmt(mkx)} y1={fmt(mky - 8)} x2={fmt(mkx)} y2={fmt(mky - 40)} stroke={PALETTE.keyLight} strokeOpacity="0.85" />
        <circle cx={fmt(mkx)} cy={fmt(mky)} r="7.5" fill="none" stroke={PALETTE.bronze2} strokeWidth="1.8" />
        <circle cx={fmt(mkx)} cy={fmt(mky)} r="2.6" fill={PALETTE.ivory} />
      </g>
      <g transform="translate(62 66)">
        <circle r="36" fill="none" stroke="url(#p7-bronze)" strokeWidth="1.6" />
        <circle r="27" fill="none" stroke="url(#p7-bronze)" strokeWidth="2.4" />
        <path d={c.ticks} stroke={PALETTE.bronze2} strokeWidth="0.8" />
        <circle r="23" fill="none" stroke={PALETTE.bronze2} strokeOpacity="0.6" strokeWidth="0.6" />
        {c.points.map((pts, i) => (
          <polygon key={i} points={pts} fill={i % 2 === 0 ? PALETTE.bronze2 : PALETTE.bronze} stroke={INK} strokeOpacity="0.4" strokeWidth="0.5" />
        ))}
        <text textAnchor="middle" y="-40" fontSize="10" fontWeight={600} fill={PALETTE.bronze2} style={DISPLAY}>
          N
        </text>
      </g>
    </PlateFrame>
  );
}

function ConstellationPlate() {
  const R = 84;
  const pts = polygonPoints(5, R);
  const rose = roseOrnament(19);
  const words: Array<[string, number, number, "start" | "end"]> = [
    ["IP LITIGATION", 28, 40, "start"],
    ["DISPUTE RESOLUTION", 292, 40, "end"],
    ["LEGAL RESEARCH", 28, 292, "start"],
    ["IP COMMENTARY", 292, 292, "end"],
  ];
  return (
    <PlateFrame id="p8" title="The legal world: seal, gear, page, ornament and marker as a constellation over a ruled document, with the words IP litigation, dispute resolution, legal research, IP commentary.">
      <defs>
        <SteelGradient id="p8-steel" />
        <BronzeGradient id="p8-bronze" />
        <radialGradient id="p8-wax" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor={PALETTE.seal2} />
          <stop offset="1" stopColor={PALETTE.seal} />
        </radialGradient>
        <radialGradient id="p8-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={PALETTE.keyLight} stopOpacity="0.8" />
          <stop offset="1" stopColor={PALETTE.keyLight} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="30" y="56" width="260" height="208" fill={PALETTE.bone} opacity="0.07" />
      <g stroke={PALETTE.bronzeDim} strokeOpacity="0.4" strokeWidth="1">
        {Array.from({ length: 16 }, (_, i) => (
          <line key={i} x1="48" y1={72 + i * 12} x2="278" y2={72 + i * 12} />
        ))}
        <line x1="64" y1="56" x2="64" y2="264" />
        <line x1="67" y1="56" x2="67" y2="264" />
      </g>
      <g transform="translate(160 164)">
        <g fill="none" stroke={PALETTE.bronze} strokeOpacity="0.45" strokeWidth="1">
          <polygon points={pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(" ")} />
          {pts.map(([x, y], i) => (
            <line key={i} x1="0" y1="0" x2={fmt(x)} y2={fmt(y)} />
          ))}
        </g>
        {/* seal */}
        <g transform={`translate(${fmt(pts[0][0])} ${fmt(pts[0][1])})`}>
          <circle r="21" fill={PALETTE.charcoal} />
          <circle r="16" fill="url(#p8-wax)" />
          <circle r="19.5" fill="none" stroke="url(#p8-bronze)" strokeWidth="2.2" />
          <text textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight={600} fill={PALETTE.parchment} y="1" style={DISPLAY}>
            ®
          </text>
        </g>
        {/* gear */}
        <g transform={`translate(${fmt(pts[1][0])} ${fmt(pts[1][1])}) rotate(12)`}>
          <path d={gearD(12, 19, 3, 0, 0.24)} fill={PALETTE.graphite} fillRule="evenodd" />
          <path d={gearD(12, 19, 3, 0, 0.24)} fill="url(#p8-steel)" fillRule="evenodd" stroke={INK} strokeOpacity="0.6" />
          <circle r="13.5" fill="none" stroke="url(#p8-bronze)" strokeWidth="1.6" />
          <circle r="4.5" fill={PALETTE.bronzeDim} />
        </g>
        {/* page */}
        <g transform={`translate(${fmt(pts[2][0])} ${fmt(pts[2][1])}) rotate(8)`}>
          <rect x="-14" y="-19" width="28" height="38" fill={INK} opacity="0.4" transform="translate(2 3)" />
          <rect x="-14" y="-19" width="28" height="38" fill={PALETTE.parchment} stroke={INK} strokeOpacity="0.4" />
          <path d="M-9 -11H9M-9 -5H6M-9 1H9M-9 7H5M-9 13H-1" stroke={PALETTE.bronzeDim} strokeOpacity="0.8" strokeWidth="1" />
        </g>
        {/* ornament */}
        <g transform={`translate(${fmt(pts[3][0])} ${fmt(pts[3][1])})`} fill="none" stroke={PALETTE.bronze2} strokeWidth="0.9">
          <circle r="19" />
          {rose.map((p, i) => (
            <polyline key={i} points={p} />
          ))}
          <circle r="2.2" fill={PALETTE.bronze} stroke="none" />
        </g>
        {/* marker */}
        <g transform={`translate(${fmt(pts[4][0])} ${fmt(pts[4][1])})`}>
          <circle r="26" fill="url(#p8-glow)" />
          <circle r="18" fill="none" stroke={PALETTE.bronze2} strokeOpacity="0.8" strokeWidth="0.9" />
          <line x1="0" y1="-6" x2="0" y2="-30" stroke={PALETTE.keyLight} strokeOpacity="0.8" />
          <circle r="6" fill="none" stroke={PALETTE.bronze2} strokeWidth="1.6" />
          <circle r="2.2" fill={PALETTE.ivory} />
        </g>
      </g>
      <g fill={PALETTE.bone} fontSize="10.5" fontWeight={500} letterSpacing="1.6" style={DISPLAY}>
        {words.map(([w, x, y, anchor]) => (
          <text key={w} x={x} y={y} textAnchor={anchor}>
            {w}
          </text>
        ))}
      </g>
    </PlateFrame>
  );
}
