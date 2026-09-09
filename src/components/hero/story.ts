/**
 * THE STORY — single source of truth for the cinematic homepage.
 *
 * Scroll progress runs 0 → 1 across the pinned stage. Every renderer (WebGL, 2D canvas, static)
 * and the DOM caption layer read the SAME scene table, so the narrative is identical everywhere.
 *
 * Ranges are deliberately generous: each scene has room for the transformation to happen,
 * the caption to be read, and the picture to settle before the next scene begins.
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
      { at: 0.45, hold: 0.07, eyebrow: "Patents", title: "Protecting technical innovation and invention.", body: "A patent is a bargain: disclosure in exchange for a limited monopoly. Every claim is a boundary line that will one day be argued over.", align: "left" },
    ],
  },
  {
    id: "design",
    start: 0.56,
    end: 0.67,
    label: "Design",
    captions: [
      { at: 0.585, hold: 0.06, eyebrow: "Designs", title: "Protecting the visual appearance of innovation.", body: "Shape, configuration, pattern, ornament. Not what a thing does — what it looks like.", align: "right" },
    ],
  },
  {
    id: "trademark",
    start: 0.67,
    end: 0.78,
    label: "Trade Mark",
    captions: [
      { at: 0.695, hold: 0.06, eyebrow: "Trade Marks", title: "Because businesses are remembered by what they are called, shown as, and associated with.", body: "A mark is a promise of origin. Infringement is a broken promise made by someone else.", align: "left" },
    ],
  },
  {
    id: "gi",
    start: 0.78,
    end: 0.89,
    label: "Geographical Indication",
    captions: [
      { at: 0.805, hold: 0.06, eyebrow: "Geographical Indications", title: "Where geography becomes part of identity.", body: "Some names belong to a place before they belong to anyone. A conceptual view — no particular location is implied.", align: "right" },
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

/** The gavel strikes at exactly this progress value. Renderers key the impact off it. */
export const GAVEL_STRIKE_AT = 0.385;

/** Height of the pinned stage as a multiple of the viewport (desktop / mobile). */
export const STAGE_HEIGHT_VH = { desktop: 1100, mobile: 800 };

export function sceneAt(progress: number): Scene {
  return SCENES.find((s) => progress >= s.start && progress < s.end) ?? SCENES[SCENES.length - 1];
}

/** 0–1 progress within a scene (clamped). */
export function localProgress(progress: number, scene: Scene | SceneId): number {
  const s = typeof scene === "string" ? SCENES.find((x) => x.id === scene)! : scene;
  return clamp01((progress - s.start) / (s.end - s.start));
}

/** Smooth 0→1→0 envelope for a caption: fades in over `fade`, holds, fades out. */
export function captionOpacity(progress: number, caption: Caption, fade = 0.02): number {
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

/** Shared palette so every renderer paints the same picture. */
export const PALETTE = {
  ink: "#09090b",
  charcoal: "#16161a",
  graphite: "#202025",
  smoke: "#2c2c33",
  bone: "#b6ad9b",
  parchment: "#e3d9c3",
  ivory: "#f1eadb",
  bronze: "#a67e56",
  bronze2: "#c8a274",
  bronzeDim: "#6b5238",
  seal: "#8b2e2e",
  seal2: "#a83a3a",
  keyLight: "#f2d9b4",
  rimLight: "#8ea0c4",
  steel: "#6e6f74",
  brass: "#8d7350",
} as const;
