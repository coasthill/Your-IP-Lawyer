/**
 * THE STORY — single source of truth for the cinematic homepage.
 *
 * Scroll progress runs 0 → 1 across the pinned stage. Every renderer (WebGL, 2D canvas, static)
 * and the DOM layers (captions, annotations, the map) read the SAME tables, so the narrative is
 * identical everywhere.
 *
 * Two layers of structure:
 *   SCENES — the chapters of the story: their ranges, labels and captions (copy lives here).
 *   FILM   — the beats of the picture: each beat is either a painted still with a slow camera
 *            drift or a CLIP, a frame sequence sliced from a generated video and scrubbed by the
 *            scroll. A clip whose frames are not in the repository yet plays as its fallback still,
 *            so the story never depends on the pipeline having run.
 * Ranges are deliberately generous: each beat has room for the caption to be read and the picture
 * to settle.
 */

export type SceneId =
  | "lawyer"
  | "gown"
  | "gavel"
  | "patent"
  | "design"
  | "trademark"
  | "gi"
  | "legal-world";

export type Caption = {
  /** Scroll progress (0–1) at which this caption is fully visible. */
  at: number;
  /** How long (in progress units) the caption stays before fading. */
  hold: number;
  eyebrow?: string;
  title: string;
  body?: string;
  /** Horizontal placement of the caption block. */
  align?: "left" | "right" | "center";
  /**
   * "wordmark": the closing title card — set large in the middle of the stage, no body.
   * "scrim": a side caption that sits over a busy part of the picture and gets the soft backdrop
   * centred captions always have.
   */
  style?: "wordmark" | "scrim";
};

export type Scene = {
  id: SceneId;
  /** Scroll progress range this scene owns. */
  start: number;
  end: number;
  label: string;
  captions: Caption[];
};

/** IP subjects that emerge from the gown in Scene 2, in order. */
export const IP_ELEMENTS = [
  { key: "trademarks", title: "Trade Marks", line: "Protecting the identity behind the business.", glyph: "®" },
  { key: "patents", title: "Patents", line: "Turning invention into enforceable rights.", glyph: "⚙" },
  { key: "copyright", title: "Copyright", line: "Protecting original expression.", glyph: "©" },
  { key: "designs", title: "Designs", line: "Protecting the visual identity of innovation.", glyph: "◇" },
  { key: "gi", title: "Geographical Indications", line: "When place itself becomes part of identity.", glyph: "⌖" },
] as const;

/** Secondary inscriptions that drift past during the swirl (no captions). */
export const IP_INSCRIPTIONS = ["Trade Secrets", "Domain Names", "Passing Off", "IP Litigation", "Arbitration", "Injunctions", "Licensing"];

export const SCENES: Scene[] = [
  {
    id: "lawyer",
    start: 0,
    end: 0.1,
    label: "The Lawyer",
    captions: [
      {
        at: 0.0,
        hold: 0.08,
        eyebrow: "IP Litigation · Delhi",
        title: "Adv. Rohit Pradhan",
        body: "Scroll to begin.",
        align: "left",
      },
    ],
  },
  {
    id: "gown",
    start: 0.1,
    end: 0.34,
    label: "The Gown Moves",
    captions: IP_ELEMENTS.map((el, i) => ({
      at: 0.13 + i * 0.042,
      hold: 0.03,
      eyebrow: `Intellectual Property · ${String(i + 1).padStart(2, "0")}`,
      title: el.title,
      body: el.line,
      align: i % 2 === 0 ? "right" : "left",
    })),
  },
  {
    id: "gavel",
    start: 0.34,
    end: 0.42,
    label: "The Gavel",
    captions: [
      { at: 0.39, hold: 0.025, eyebrow: "Order", title: "The record is settled.", body: "Rights are only as real as their enforcement.", align: "center" },
    ],
  },
  {
    id: "patent",
    start: 0.42,
    end: 0.56,
    label: "The Patent Machine",
    captions: [
      { at: 0.45, hold: 0.07, eyebrow: "Patents", title: "Protecting technical innovation and invention.", body: "A patent is a bargain: disclosure in exchange for a limited monopoly. Every claim is a boundary line that will one day be argued over.", align: "right" },
    ],
  },
  {
    id: "design",
    start: 0.56,
    end: 0.67,
    label: "Design",
    captions: [
      { at: 0.585, hold: 0.06, eyebrow: "Designs", title: "Protecting the visual appearance of innovation.", body: "Shape, configuration, pattern, ornament. Not what a thing does — what it looks like.", align: "left" },
    ],
  },
  {
    id: "trademark",
    start: 0.67,
    end: 0.78,
    label: "Trade Mark",
    captions: [
      { at: 0.695, hold: 0.06, eyebrow: "Trade Marks", title: "Because businesses are remembered by what they are called, shown as, and associated with.", body: "A mark is a promise of origin. Infringement is a broken promise made by someone else.", align: "right" },
    ],
  },
  {
    id: "gi",
    start: 0.78,
    end: 0.89,
    label: "Geographical Indication",
    captions: [
      { at: 0.805, hold: 0.06, eyebrow: "Geographical Indications", title: "Where geography becomes part of identity.", body: "Some names belong to a place before they belong to anyone. A conceptual view — no particular location is implied.", align: "center" },
      { at: 0.855, hold: 0.025, eyebrow: "From the forum", title: "Explained before. Asked again.", body: "Every question here has been asked before. That is the point of writing the answers down.", align: "left", style: "scrim" },
    ],
  },
  {
    id: "legal-world",
    start: 0.89,
    end: 1,
    label: "The Legal World",
    captions: [
      { at: 0.915, hold: 0.05, eyebrow: "The whole record", title: "Patent. Design. Trade Mark. Copyright. GI.", body: "Separate rights, one practice: IP litigation, dispute resolution, legal research, commentary.", align: "center" },
      { at: 0.968, hold: 0.032, eyebrow: "Intellectual property. Without the boring part.", title: "YourIPLawyer", align: "center", style: "wordmark" },
    ],
  },
];

/** The gavel strikes at exactly this progress value. Renderers key the flash and the sound off it. */
export const GAVEL_STRIKE_AT = 0.385;

/** Height of the pinned stage as a multiple of the viewport (desktop / mobile). */
export const STAGE_HEIGHT_VH = { desktop: 1000, mobile: 760 };

/* ------------------------------------------------------------------------------------------------
   THE FILM
   One beat per stretch of the scroll. A still beat holds a painting under a slow camera move
   (`drift`: scale and a pan in picture units, eased from the beat's start to its end). A clip beat
   scrubs a frame sequence extracted from a generated video (public/art/film/<clip>/): progress
   within the beat maps to a frame fraction through `keyframes` (piecewise linear, default
   [[0,0],[1,1]]) so a particular frame can be pinned to a particular scroll position — the gavel's
   impact frame lands on GAVEL_STRIKE_AT. `hold: [a, b]` plays the clip over the first `a` of the
   beat and freezes on its last frame from there on.
   Every beat names a `fallback` still (a chain is allowed): the picture shown while the clip has no
   frames yet or the still has not been painted yet. Sizes, focal points and frame counts come from
   art-manifest.json (written by scripts/fetch-artwork.mjs).
   ------------------------------------------------------------------------------------------------ */
export type Drift = { from: [scale: number, x: number, y: number]; to: [scale: number, x: number, y: number] };

export type Media =
  | {
      kind: "still";
      /** Asset id in content/artwork/manifest.json → public/art/scenes/<id>.webp */
      asset: string;
      /** Still(s) to show while `asset` has not been painted yet, in order of preference. */
      fallback?: string | readonly string[];
      drift: Drift;
    }
  | {
      kind: "clip";
      /** Clip id in content/artwork/manifest.json → public/art/film/<id>/ */
      clip: string;
      /** Still(s) shown until the clip's frames exist, in order of preference. */
      fallback: string | readonly string[];
      /** progress within the beat → frame fraction (0 first frame, 1 last), piecewise linear. */
      keyframes?: ReadonlyArray<readonly [progressWithinBeat: number, frameFraction: number]>;
      /** The clip finishes at `a` (progress within the beat) and holds its last frame until `b`. */
      hold?: readonly [number, number];
      /** Optional camera move on top of the clip (identity when absent: the film moves by itself). */
      drift?: Drift;
    };

export type Beat = {
  id: string;
  scene: SceneId;
  /** Scroll progress range this beat owns. */
  start: number;
  end: number;
  media: Media;
  /** Dominant surface of the picture: captions and annotations adapt their colours. */
  tone: "lapis" | "paper";
  alt: string;
};

export const FILM: Beat[] = [
  {
    id: "assembly",
    scene: "lawyer",
    start: 0,
    end: 0.1,
    tone: "lapis",
    media: { kind: "clip", clip: "assembly", fallback: "advocate", hold: [0.85, 1] },
    alt: "A painted advocate in a black court gown assembles out of drifting dust against a deep blue wall, seen from behind, holding the gown open like a curtain.",
  },
  {
    id: "gown-fills",
    scene: "gown",
    start: 0.1,
    end: 0.34,
    tone: "lapis",
    media: { kind: "clip", clip: "gown-fills", fallback: "gown" },
    alt: "Black silk gown fabric billows and fills the frame against a deep blue wall.",
  },
  {
    id: "strike",
    scene: "gavel",
    start: 0.34,
    end: 0.42,
    tone: "lapis",
    media: { kind: "clip", clip: "strike", fallback: "gavel", keyframes: [[0, 0], [(GAVEL_STRIKE_AT - 0.34) / 0.08, 0.74], [1, 1]] }, // 0.74 × 49 → frame 37 (f037.webp), the moment of contact; f034 is still the raised gavel, f038 the dust
    alt: "A wooden gavel with a brass band is raised above its sound block on a marble table and comes down.",
  },
  {
    id: "orchard",
    scene: "patent",
    start: 0.42,
    end: 0.49,
    tone: "lapis",
    media: { kind: "clip", clip: "orchard", fallback: ["orchard", "patent"] },
    alt: "A great tree on a marble floor against a deep blue wall; its fruit are small golden emblems — copyright and trade mark medallions, a gear, an ornament, a leaf — glowing as a breeze stirs the leaves.",
  },
  {
    id: "disclosure",
    scene: "patent",
    start: 0.49,
    end: 0.56,
    tone: "paper",
    media: { kind: "clip", clip: "disclosure", fallback: "patent" },
    alt: "Two hands in black sleeves with white cuffs hold a glowing golden sphere above a patent drawing; the sphere splits open and a glowing sheet of diagrams unfolds between the halves.",
  },
  {
    id: "structure",
    scene: "design",
    start: 0.56,
    end: 0.67,
    tone: "paper",
    media: { kind: "clip", clip: "structure", fallback: ["structure", "design"] },
    alt: "Sculptors on wooden scaffolding carve a tall marble column crowned with the scales of justice, marble dust drifting in white daylight.",
  },
  {
    id: "certificate",
    scene: "trademark",
    start: 0.67,
    end: 0.78,
    tone: "paper",
    media: { kind: "clip", clip: "certificate", fallback: "trademark" },
    alt: "A hand in a black sleeve with a white cuff presses a brass seal into crimson wax on a certificate.",
  },
  {
    id: "sapling",
    scene: "gi",
    start: 0.78,
    end: 0.89,
    tone: "paper",
    media: { kind: "clip", clip: "sapling", fallback: "gi" },
    alt: "The advocate stands like a statue on a marble pedestal beside a blue drape while a sapling in a terracotta pot grows into a young tree.",
  },
  {
    id: "constellation",
    scene: "legal-world",
    start: 0.89,
    end: 0.955,
    tone: "lapis",
    media: { kind: "still", asset: "legal-world", drift: { from: [1.0, 0, 0], to: [1.06, 0, -0.02] } },
    alt: "The advocate walking away toward a tall bright window in a marble hall, papers lifting into the air.",
  },
  {
    id: "water",
    scene: "legal-world",
    start: 0.955,
    end: 1,
    tone: "lapis",
    media: { kind: "clip", clip: "water", fallback: ["water-still", "legal-world"] },
    alt: "In a bright marble hall a young woman waters a young tree from a brass jug while the advocate stands beside it; loose papers drift through the sunlight.",
  },
];

/** The fallback chain of a beat's media as a plain list (empty for a still without fallback). */
export function fallbacksOf(media: Media): string[] {
  const f = media.fallback;
  return f === undefined ? [] : typeof f === "string" ? [f] : [...f];
}

export function beatIndexAt(progress: number): number {
  const i = FILM.findIndex((b) => progress >= b.start && progress < b.end);
  return i < 0 ? FILM.length - 1 : i;
}

export function beatAt(progress: number): Beat {
  return FILM[beatIndexAt(progress)];
}

/** The first beat of a scene (the picture the static page hangs for it). */
export function beatFor(scene: SceneId): Beat {
  return FILM.find((b) => b.scene === scene) ?? FILM[0];
}

/* ------------------------------------------------------------------------------------------------
   TRANSITIONS
   Each boundary between consecutive beats blends over a window centred on `at`. During the window
   both beats keep playing (A on its last frames, B on its first), so the film never stalls.
     dissolve — the picture breaks into pigment grains and streaks and reassembles as the next
     curtain  — a dark cloth is drawn across the picture and pulled away with an outward ripple,
                revealing the next (the raised gavel)
     ripple   — a wave spreads from the centre of the frame; the next picture follows the wavefront
   ------------------------------------------------------------------------------------------------ */
export type TransitionKind = "dissolve" | "curtain" | "ripple";
export type Transition = { from: string; to: string; at: number; width: number; kind: TransitionKind };

export const TRANSITIONS: Transition[] = [
  { from: "assembly", to: "gown-fills", at: 0.1, width: 0.05, kind: "ripple" },
  { from: "gown-fills", to: "strike", at: 0.35, width: 0.04, kind: "curtain" },
  { from: "strike", to: "orchard", at: 0.42, width: 0.04, kind: "dissolve" },
  { from: "orchard", to: "disclosure", at: 0.49, width: 0.04, kind: "dissolve" },
  { from: "disclosure", to: "structure", at: 0.56, width: 0.05, kind: "dissolve" },
  { from: "structure", to: "certificate", at: 0.67, width: 0.05, kind: "dissolve" },
  { from: "certificate", to: "sapling", at: 0.78, width: 0.05, kind: "dissolve" },
  { from: "sapling", to: "constellation", at: 0.89, width: 0.05, kind: "dissolve" },
  { from: "constellation", to: "water", at: 0.955, width: 0.03, kind: "ripple" },
];

export type FrameRef = {
  /** Index into FILM. */
  beat: number;
  /** Frame index within the clip (0 for stills, or when the frame count is unknown). */
  frame: number;
  /** 0–1 position within the clip, independent of how many frames were extracted. */
  fraction: number;
  /** Camera drift (scale, x, y) at this moment. */
  drift: [number, number, number];
};

export type Frame = {
  /** What is on screen. */
  a: FrameRef;
  /** What is being revealed, or null when no transition is in progress. */
  b: FrameRef | null;
  /** 0–1 blend from a → b. */
  mix: number;
  kind: TransitionKind;
};

/** How many frames a clip has on disk (0 when none have been extracted) — supplied by art.ts. */
export type FrameCount = (clip: string) => number;

/** Resolves scroll progress into the frame(s) to show and how far the blend has gone. */
export function frameAt(p: number, frames?: FrameCount): Frame {
  for (const t of TRANSITIONS) {
    const start = t.at - t.width / 2;
    const end = t.at + t.width / 2;
    if (p >= start && p < end) {
      const mix = smoothstep((p - start) / (end - start));
      return { a: frameRef(beatIndex(t.from), p, frames), b: frameRef(beatIndex(t.to), p, frames), mix, kind: t.kind };
    }
  }
  return { a: frameRef(beatIndexAt(p), p, frames), b: null, mix: 0, kind: "dissolve" };
}

function beatIndex(id: string): number {
  const i = FILM.findIndex((b) => b.id === id);
  return i < 0 ? 0 : i;
}

/** The frame of one beat at progress p (progress outside the beat clamps to its first/last frame). */
export function frameRef(beat: number, p: number, frames?: FrameCount): FrameRef {
  const b = FILM[beat];
  const q = clamp01((p - b.start) / (b.end - b.start));
  const fraction = frameFraction(b.media, q);
  const n = b.media.kind === "clip" && frames ? frames(b.media.clip) : 0;
  const frame = n > 1 ? Math.round(fraction * (n - 1)) : 0;
  return { beat, frame, fraction, drift: driftAt(beat, q) };
}

/** Frame fraction (0–1) of a clip at progress-within-beat q, through `hold` and `keyframes`. */
export function frameFraction(media: Media, q: number): number {
  if (media.kind !== "clip") return 0;
  if (media.hold) {
    if (q >= media.hold[0]) return 1;
    q = media.hold[0] > 0 ? q / media.hold[0] : 1;
  }
  const keys = media.keyframes ?? [[0, 0], [1, 1]];
  if (q <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [x0, y0] = keys[i - 1];
    const [x1, y1] = keys[i];
    if (q <= x1) return x1 > x0 ? lerp(y0, y1, (q - x0) / (x1 - x0)) : y1;
  }
  return keys[keys.length - 1][1];
}

/** Camera drift of a beat at progress-within-beat q (0–1). */
export function driftAt(beat: number, q: number): [number, number, number] {
  const { drift } = FILM[beat].media;
  if (!drift) return [1, 0, 0];
  const e = smoothstep(q);
  return [lerp(drift.from[0], drift.to[0], e), lerp(drift.from[1], drift.to[1], e), lerp(drift.from[2], drift.to[2], e)];
}

/* ------------------------------------------------------------------------------------------------
   ANNOTATIONS — the technical-drawing labels pinned to the paintings (DOM layer, see Annotations.tsx).
   Positions are fractions of the stage (x from the left, y from the top) at desktop widths.
   `smudge` is the humour beat: the label first prints like a bad photocopy — blurred, skewed and
   doubled — and snaps sharp a moment later.
   ------------------------------------------------------------------------------------------------ */
export type Annotation = { scene: SceneId; beat?: string; at: number; hold: number; x: number; y: number; label: string; note?: string; smudge?: true };

/** How long (in progress) a smudged annotation stays smudged after `at`. */
export const SMUDGE_FOR = 0.006;

export const ANNOTATIONS: Annotation[] = [
  // Scene 2 — the five subjects rise from the folds of the gown.
  ...IP_ELEMENTS.map((el, i) => ({
    scene: "gown" as SceneId,
    beat: "gown-fills",
    at: 0.13 + i * 0.042,
    hold: 0.03,
    x: [0.36, 0.58, 0.44, 0.63, 0.5][i],
    y: [0.34, 0.28, 0.62, 0.56, 0.44][i],
    label: el.glyph,
    note: el.title,
    ...(i === 0 ? { smudge: true as const } : {}),
  })),
  // The orchard — the fruit on the branches, each a right. Placeholder positions until the still exists.
  { scene: "patent", beat: "orchard", at: 0.432, hold: 0.045, x: 0.22, y: 0.24, label: "©", note: "Copyright" },
  { scene: "patent", beat: "orchard", at: 0.438, hold: 0.04, x: 0.36, y: 0.2, label: "™", note: "Trade mark" },
  { scene: "patent", beat: "orchard", at: 0.444, hold: 0.036, x: 0.48, y: 0.32, label: "®", note: "Registered" },
  { scene: "patent", beat: "orchard", at: 0.45, hold: 0.032, x: 0.28, y: 0.46, label: "⚙", note: "Patent" },
  { scene: "patent", beat: "orchard", at: 0.456, hold: 0.028, x: 0.42, y: 0.58, label: "GI", note: "Geographical indication" },
  // Scene 4 — the parts of the machine, named like a patent drawing.
  { scene: "patent", beat: "disclosure", at: 0.5, hold: 0.045, x: 0.4, y: 0.13, label: "Fig. 1", note: "Claim 1 — the mechanism" },
  { scene: "patent", beat: "disclosure", at: 0.51, hold: 0.04, x: 0.47, y: 0.66, label: "Fig. 2", note: "Claim 4 — the spring" },
  // Scene 5 — the design as registered.
  { scene: "design", beat: "structure", at: 0.59, hold: 0.06, x: 0.62, y: 0.33, label: "Class 07", note: "Shape and configuration" },
  // Scene 6 — the mark.
  { scene: "trademark", beat: "certificate", at: 0.7, hold: 0.06, x: 0.37, y: 0.4, label: "®", note: "Registered — Class 45" },
];

export function sceneAt(progress: number): Scene {
  return SCENES.find((s) => progress >= s.start && progress < s.end) ?? SCENES[SCENES.length - 1];
}

/** 0–1 progress within a scene (clamped). */
export function localProgress(progress: number, scene: Scene | SceneId): number {
  const s = typeof scene === "string" ? SCENES.find((x) => x.id === scene)! : scene;
  return clamp01((progress - s.start) / (s.end - s.start));
}

/** Smooth 0→1→0 envelope for a caption: fades in over `fade`, holds, fades out. */
export function captionOpacity(progress: number, caption: { at: number; hold: number }, fade = 0.02): number {
  const inStart = caption.at - fade;
  const outEnd = caption.at + caption.hold + fade;
  if (progress <= inStart || progress >= outEnd) return 0;
  if (progress < caption.at) return smoothstep((progress - inStart) / fade);
  if (progress <= caption.at + caption.hold) return 1;
  return 1 - smoothstep((progress - (caption.at + caption.hold)) / fade);
}

/** Range envelope helper: 0 before `a`, eases to 1 by `b`. */
export function ramp(progress: number, a: number, b: number): number {
  return smoothstep(clamp01((progress - a) / (b - a)));
}

/** Bell envelope: ramps up over [a,b], holds, ramps down over [c,d]. */
export function window01(progress: number, a: number, b: number, c: number, d: number): number {
  return ramp(progress, a, b) * (1 - ramp(progress, c, d));
}

export function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Shared palette so every renderer paints the same picture. Mirrors the tokens in globals.css. */
export const PALETTE = {
  lapis: "#1b5ad6",
  lapis2: "#1748b0",
  lapis3: "#0f2f7c",
  lapis4: "#081b48",
  ink: "#121418",
  charcoal: "#262a33",
  graphite: "#3a3f4b",
  smoke: "#565c6b",
  bone: "#c4d0ee",
  parchment: "#edf1fb",
  ivory: "#fbfaf7",
  paper: "#f5f3ee",
  bronze: "#b08d3c",
  bronze2: "#d9b653",
  bronzeDim: "#7d6328",
  seal: "#b2271f",
  seal2: "#d6392f",
  keyLight: "#fff3d6",
  rimLight: "#9fb8f0",
  steel: "#6e6f74",
  brass: "#8d7350",
} as const;
