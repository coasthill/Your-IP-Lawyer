/**
 * THE STORY — single source of truth for the cinematic homepage.
 *
 * Scroll progress runs 0 → 1 across the pinned stage. Every renderer (WebGL, 2D canvas, static)
 * and the DOM layers (captions, annotations, the map) read the SAME scene table, so the narrative
 * is identical everywhere.
 *
 * The picture is a sequence of painted stills (see ART below and content/artwork/manifest.json):
 * each scene holds one painting; between scenes the image dissolves into the next. Ranges are
 * deliberately generous: each scene has room for the caption to be read and the picture to settle.
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
      { at: 0.345, hold: 0.025, eyebrow: "Order", title: "The record is settled.", body: "Rights are only as real as their enforcement.", align: "center" },
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
    ],
  },
  {
    id: "legal-world",
    start: 0.89,
    end: 1,
    label: "The Legal World",
    captions: [
      { at: 0.915, hold: 0.05, eyebrow: "The whole record", title: "Patent. Design. Trade Mark. Copyright. GI.", body: "Separate rights, one practice: IP litigation, dispute resolution, legal research, commentary.", align: "center" },
    ],
  },
];

/** The gavel strikes at exactly this progress value. Renderers key the flash and the sound off it. */
export const GAVEL_STRIKE_AT = 0.385;

/** Height of the pinned stage as a multiple of the viewport (desktop / mobile). */
export const STAGE_HEIGHT_VH = { desktop: 1000, mobile: 760 };

/* ------------------------------------------------------------------------------------------------
   THE PAINTINGS
   One still per scene. `drift` is the slow camera move across the scene (scale and a pan in
   picture units, applied from the scene's start to its end); `light` is which side of the
   picture is bright (captions get a backdrop when they sit over the bright side).
   Focal points and sizes come from art-manifest.json (written by scripts/fetch-artwork.mjs).
   ------------------------------------------------------------------------------------------------ */
export type Drift = { from: [scale: number, x: number, y: number]; to: [scale: number, x: number, y: number] };

export type ArtEntry = {
  scene: SceneId;
  /** Asset id in content/artwork/manifest.json → public/art/scenes/<id>.webp */
  asset: string;
  drift: Drift;
  /** Dominant surface of the painting: captions and annotations adapt their colours. */
  tone: "lapis" | "paper";
  alt: string;
};

export const ART: ArtEntry[] = [
  { scene: "lawyer", asset: "advocate", tone: "lapis", drift: { from: [1.06, 0.02, 0.01], to: [1.0, 0, 0] }, alt: "A painted advocate in a black court gown, seen from behind, holding the gown open like a curtain against a deep blue wall." },
  { scene: "gown", asset: "gown", tone: "lapis", drift: { from: [1.0, 0, 0], to: [1.1, -0.03, -0.02] }, alt: "Black silk gown fabric billowing across a deep blue wall." },
  { scene: "gavel", asset: "gavel", tone: "lapis", drift: { from: [1.08, 0, 0.02], to: [1.0, 0, 0] }, alt: "A wooden gavel with a brass band raised above its sound block on a marble table." },
  { scene: "patent", asset: "patent", tone: "paper", drift: { from: [1.0, 0, 0], to: [1.08, 0.02, -0.01] }, alt: "Antique brass gears and an escapement arranged on marble in bright daylight." },
  { scene: "design", asset: "design", tone: "paper", drift: { from: [1.06, -0.02, 0], to: [1.0, 0.01, 0] }, alt: "A turned porcelain vessel with a raised pattern on a small lathe, a brass caliper resting against it." },
  { scene: "trademark", asset: "trademark", tone: "paper", drift: { from: [1.0, 0, 0], to: [1.07, 0, -0.02] }, alt: "A hand in a black sleeve with a white cuff pressing a brass seal into crimson wax on a document." },
  { scene: "gi", asset: "gi", tone: "paper", drift: { from: [1.05, 0.02, 0], to: [1.0, -0.01, 0] }, alt: "A still life of Indian geographical-indication goods: tea, brocade, mangoes, sandalwood and a shawl on marble." },
  { scene: "legal-world", asset: "legal-world", tone: "lapis", drift: { from: [1.0, 0, 0], to: [1.08, 0, -0.02] }, alt: "The advocate walking away toward a tall bright window in a marble hall, papers lifting into the air." },
];

export function artFor(scene: SceneId): ArtEntry {
  return ART.find((a) => a.scene === scene) ?? ART[0];
}

/* ------------------------------------------------------------------------------------------------
   TRANSITIONS
   Each boundary between consecutive scenes dissolves over a window centred on `at`.
     dissolve — the painting breaks into pigment grains and streaks and reassembles as the next
     curtain  — a dark cloth is drawn across the picture and pulled away to reveal the next
   The gavel strike happens inside the curtain transition: flash, then the world turns white.
   ------------------------------------------------------------------------------------------------ */
export type TransitionKind = "dissolve" | "curtain";
export type Transition = { from: SceneId; to: SceneId; at: number; width: number; kind: TransitionKind };

export const TRANSITIONS: Transition[] = [
  { from: "lawyer", to: "gown", at: 0.1, width: 0.05, kind: "dissolve" },
  { from: "gown", to: "gavel", at: 0.34, width: 0.045, kind: "dissolve" },
  { from: "gavel", to: "patent", at: 0.405, width: 0.05, kind: "curtain" },
  { from: "patent", to: "design", at: 0.56, width: 0.05, kind: "dissolve" },
  { from: "design", to: "trademark", at: 0.67, width: 0.05, kind: "dissolve" },
  { from: "trademark", to: "gi", at: 0.78, width: 0.05, kind: "dissolve" },
  { from: "gi", to: "legal-world", at: 0.89, width: 0.05, kind: "dissolve" },
];

export type Frame = {
  /** Painting currently on screen (index into ART). */
  a: number;
  /** Painting being revealed, or -1 when no transition is in progress. */
  b: number;
  /** 0–1 blend from a → b. */
  mix: number;
  kind: TransitionKind;
  /** Drift (scale, x, y) for a and b at this moment. */
  driftA: [number, number, number];
  driftB: [number, number, number];
};

/** Resolves scroll progress into which paintings are shown and how far the blend has gone. */
export function frameAt(p: number): Frame {
  const idx = (id: SceneId) => ART.findIndex((a) => a.scene === id);
  for (const t of TRANSITIONS) {
    const start = t.at - t.width / 2;
    const end = t.at + t.width / 2;
    if (p >= start && p < end) {
      const mix = smoothstep((p - start) / (end - start));
      return { a: idx(t.from), b: idx(t.to), mix, kind: t.kind, driftA: driftAt(t.from, p), driftB: driftAt(t.to, p) };
    }
  }
  const scene = sceneAt(p);
  const a = idx(scene.id);
  return { a, b: -1, mix: 0, kind: "dissolve", driftA: driftAt(scene.id, p), driftB: driftAt(scene.id, p) };
}

/** Camera drift of a scene's painting at progress p (extrapolation is clamped). */
export function driftAt(id: SceneId, p: number): [number, number, number] {
  const scene = SCENES.find((s) => s.id === id)!;
  const { drift } = artFor(id);
  const t = clamp01((p - scene.start) / (scene.end - scene.start));
  const e = t * t * (3 - 2 * t);
  return [lerp(drift.from[0], drift.to[0], e), lerp(drift.from[1], drift.to[1], e), lerp(drift.from[2], drift.to[2], e)];
}

/* ------------------------------------------------------------------------------------------------
   ANNOTATIONS — the technical-drawing labels pinned to the paintings (DOM layer, see Annotations.tsx).
   Positions are fractions of the stage (x from the left, y from the top) at desktop widths.
   ------------------------------------------------------------------------------------------------ */
export type Annotation = { scene: SceneId; at: number; hold: number; x: number; y: number; label: string; note?: string };

export const ANNOTATIONS: Annotation[] = [
  // Scene 2 — the five subjects rise from the folds of the gown.
  ...IP_ELEMENTS.map((el, i) => ({
    scene: "gown" as SceneId,
    at: 0.13 + i * 0.042,
    hold: 0.03,
    x: [0.36, 0.58, 0.44, 0.63, 0.5][i],
    y: [0.34, 0.28, 0.62, 0.56, 0.44][i],
    label: el.glyph,
    note: el.title,
  })),
  // Scene 4 — the parts of the machine, named like a patent drawing.
  { scene: "patent", at: 0.455, hold: 0.07, x: 0.4, y: 0.13, label: "Fig. 1", note: "Claim 1 — the mechanism" },
  { scene: "patent", at: 0.47, hold: 0.06, x: 0.47, y: 0.66, label: "Fig. 2", note: "Claim 4 — the spring" },
  // Scene 5 — the design as registered.
  { scene: "design", at: 0.59, hold: 0.06, x: 0.62, y: 0.33, label: "Class 07", note: "Shape and configuration" },
  // Scene 6 — the mark.
  { scene: "trademark", at: 0.7, hold: 0.06, x: 0.37, y: 0.4, label: "®", note: "Registered — Class 45" },
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
