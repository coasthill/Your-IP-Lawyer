import * as THREE from "three";

/**
 * Two small helpers so the act can dissolve under the machine without transparency sorting:
 *   Dimmer   — darkens OPAQUE materials toward black (colour, emissive, sheen, environment) — a fade-to-ink.
 *   FadeSet  — drives opacity of TRANSPARENT materials (and troika text fillOpacity) for the floating objects.
 * Both only write when the value changes.
 */

type Snapshot = {
  mat: THREE.Material;
  color?: THREE.Color;
  emissive?: THREE.Color;
  sheen?: THREE.Color;
  env?: number;
};

export class Dimmer {
  private readonly snaps: Snapshot[] = [];
  private last = 1;

  constructor(materials: THREE.Material[]) {
    for (const mat of materials) {
      const m = mat as THREE.Material & {
        color?: THREE.Color;
        emissive?: THREE.Color;
        sheenColor?: THREE.Color;
        envMapIntensity?: number;
      };
      this.snaps.push({
        mat,
        color: m.color ? m.color.clone() : undefined,
        emissive: m.emissive ? m.emissive.clone() : undefined,
        sheen: m.sheenColor ? m.sheenColor.clone() : undefined,
        env: typeof m.envMapIntensity === "number" ? m.envMapIntensity : undefined,
      });
    }
  }

  apply(k: number): void {
    if (k === this.last) return;
    this.last = k;
    for (const s of this.snaps) {
      const m = s.mat as THREE.Material & {
        color?: THREE.Color;
        emissive?: THREE.Color;
        sheenColor?: THREE.Color;
        envMapIntensity?: number;
      };
      if (s.color && m.color) m.color.copy(s.color).multiplyScalar(k);
      if (s.emissive && m.emissive) m.emissive.copy(s.emissive).multiplyScalar(k);
      if (s.sheen && m.sheenColor) m.sheenColor.copy(s.sheen).multiplyScalar(k);
      if (s.env !== undefined) m.envMapIntensity = s.env * k;
    }
  }
}

type TextLike = { fillOpacity: number };

export class FadeSet {
  private readonly items: { mat: THREE.Material; base: number }[] = [];
  private readonly texts = new Set<TextLike>();
  private last = -1;

  /** Registers a material; it is made transparent and its current opacity becomes the base. */
  add<M extends THREE.Material>(mat: M, base = mat.opacity): M {
    mat.transparent = true;
    this.items.push({ mat, base });
    this.last = -1;
    return mat;
  }

  remove(mat: THREE.Material): void {
    const i = this.items.findIndex((it) => it.mat === mat);
    if (i >= 0) this.items.splice(i, 1);
  }

  addText(text: TextLike | null): void {
    if (text) {
      this.texts.add(text);
      this.last = -1;
    }
  }

  removeText(text: TextLike | null): void {
    if (text) this.texts.delete(text);
  }

  apply(alpha: number): void {
    if (alpha === this.last) return;
    this.last = alpha;
    for (const it of this.items) it.mat.opacity = it.base * alpha;
    for (const t of this.texts) t.fillOpacity = alpha;
  }
}

/** Disposes every disposable value of a record (geometries, materials, textures). */
export function disposeAll(bag: Record<string, unknown>): void {
  for (const value of Object.values(bag)) {
    if (Array.isArray(value)) {
      for (const v of value) disposeOne(v);
    } else disposeOne(value);
  }
}

function disposeOne(v: unknown) {
  if (v && typeof v === "object" && "dispose" in v && typeof (v as { dispose: unknown }).dispose === "function") {
    (v as { dispose: () => void }).dispose();
  }
}
