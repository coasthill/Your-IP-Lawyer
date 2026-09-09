import * as THREE from "three";
import { FIGURE } from "./constants";
import { bell, simplex3 } from "./noise";

/**
 * THE GOWN — a high-resolution cloth sheet draped as a full-length advocate's gown.
 *
 * Parametric rest shape: u runs around the body from the front-right edge, over the back, to the
 * front-left edge (the front stays open so the bands show); v runs from the shoulders to the hem.
 * The cross-section is an ellipse that flares toward the floor, with a longer back panel, two
 * soft bulges where the arms hang under the fabric and faint vertical pleats.
 *
 * Every frame the sheet is displaced by three octaves of simplex noise travelling with a slowly
 * rotating wind; amplitude grows toward the hem (the shoulders are pinned). Normals are recomputed
 * from the grid (cross of the two grid tangents), which is cheaper and smoother than per-triangle.
 * No per-frame allocations: every array is preallocated.
 */

export const GOWN_SEG_U = 56;
export const GOWN_SEG_V = 72;

const OPEN_HALF = 0.5; // half-angle of the front opening (radians)
const TWO_PI = Math.PI * 2;

export type ClothParams = {
  t: number;
  /** wind direction, radians */
  wind: number;
  /** noise displacement amplitude (world units at the hem) */
  amp: number;
  /** 0–1 swirl envelope: flare, lift and travelling folds */
  swirl: number;
};

export class GownCloth {
  readonly geometry = new THREE.BufferGeometry();
  private readonly cols = GOWN_SEG_U + 1;
  private readonly rows = GOWN_SEG_V + 1;
  private readonly count = this.cols * this.rows;
  private readonly positions = new Float32Array(this.count * 3);
  private readonly normals = new Float32Array(this.count * 3);
  private readonly rest = new Float32Array(this.count * 3);
  /** outward horizontal direction per vertex (x, z) */
  private readonly outward = new Float32Array(this.count * 2);
  /** u, v, sinθ, cosθ */
  private readonly params = new Float32Array(this.count * 4);
  private readonly weight = new Float32Array(this.count);
  private readonly posAttr: THREE.BufferAttribute;
  private readonly normAttr: THREE.BufferAttribute;
  private normalSign = 1;

  constructor() {
    this.buildRest();
    this.buildIndex();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.normAttr = new THREE.BufferAttribute(this.normals, 3);
    this.normAttr.setUsage(THREE.DynamicDrawUsage);
    const uv = new Float32Array(this.count * 2);
    for (let k = 0; k < this.count; k++) {
      uv[k * 2] = this.params[k * 4];
      uv[k * 2 + 1] = 1 - this.params[k * 4 + 1];
    }
    this.geometry.setAttribute("position", this.posAttr);
    this.geometry.setAttribute("normal", this.normAttr);
    this.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    // Generous fixed bounds: the mesh is never frustum-culled by accident mid-swirl.
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.05, 0), 1.9);
    this.positions.set(this.rest);
    this.computeNormals();
    // Decide the normal orientation once so it points outward.
    const k = Math.floor(this.rows / 2) * this.cols + Math.floor(this.cols / 4);
    const dot = this.normals[k * 3] * this.outward[k * 2] + this.normals[k * 3 + 2] * this.outward[k * 2 + 1];
    if (dot < 0) {
      this.normalSign = -1;
      this.computeNormals();
    }
  }

  private buildRest() {
    const top = FIGURE.gownTop;
    const hem = FIGURE.gownHem;
    for (let j = 0; j < this.rows; j++) {
      const v = j / GOWN_SEG_V;
      const y = top - v * (top - hem);
      const rv = Math.pow(v, 0.9);
      const rx0 = 0.3 + 0.36 * rv;
      const rz0 = 0.19 + 0.31 * rv;
      for (let i = 0; i < this.cols; i++) {
        const u = i / GOWN_SEG_U;
        const theta = OPEN_HALF + u * (TWO_PI - 2 * OPEN_HALF);
        const s = Math.sin(theta);
        const c = Math.cos(theta);
        const signed = theta > Math.PI ? theta - TWO_PI : theta;
        const back = Math.max(0, -c);
        // arms hanging under the fabric
        const bulge = 0.075 * bell((v - 0.21) / 0.27) * bell((Math.abs(signed) - Math.PI / 2) / 0.62);
        // faint vertical pleats that deepen toward the hem
        const pleat = 0.016 * Math.sin(theta * 11 + 0.7) * Math.pow(v, 1.2);
        // shoulders: the top rows curve inward slightly toward the neck
        const cap = 1 - 0.16 * bell(v / 0.07);
        const rx = (rx0 + bulge + pleat) * cap;
        const rz = (rz0 * (1 + 0.1 * v * back) + pleat) * cap;
        const k = j * this.cols + i;
        this.rest[k * 3] = rx * s;
        this.rest[k * 3 + 1] = y + 0.04 * bell(v / 0.07) * Math.abs(s); // shoulder slope
        this.rest[k * 3 + 2] = rz * c;
        // ellipse outward normal ∝ (s / rx, c / rz)
        let ox = s / rx;
        let oz = c / rz;
        const len = Math.hypot(ox, oz) || 1;
        ox /= len;
        oz /= len;
        this.outward[k * 2] = ox;
        this.outward[k * 2 + 1] = oz;
        this.params[k * 4] = u;
        this.params[k * 4 + 1] = v;
        this.params[k * 4 + 2] = s;
        this.params[k * 4 + 3] = c;
        this.weight[k] = Math.pow(v, 1.45);
      }
    }
  }

  private buildIndex() {
    const index = new Uint32Array(GOWN_SEG_U * GOWN_SEG_V * 6);
    let n = 0;
    for (let j = 0; j < GOWN_SEG_V; j++) {
      for (let i = 0; i < GOWN_SEG_U; i++) {
        const a = j * this.cols + i;
        const b = a + 1;
        const c = a + this.cols;
        const d = c + 1;
        index[n++] = a;
        index[n++] = c;
        index[n++] = b;
        index[n++] = b;
        index[n++] = c;
        index[n++] = d;
      }
    }
    this.geometry.setIndex(new THREE.BufferAttribute(index, 1));
  }

  /** Displaces the sheet for this frame and refreshes normals. */
  update(prm: ClothParams): void {
    const { t, wind, amp, swirl } = prm;
    const wx = Math.cos(wind) * t * 0.35;
    const wz = Math.sin(wind) * t * 0.35;
    const tv = t * 0.32;
    const breath = 0.006 * Math.sin(t * 1.15);
    const flare = swirl * 0.17;
    const pos = this.positions;
    const rest = this.rest;
    const out = this.outward;
    const prms = this.params;
    const w = this.weight;

    for (let k = 0; k < this.count; k++) {
      const k3 = k * 3;
      const k4 = k * 4;
      const v = prms[k4 + 1];
      const s = prms[k4 + 2];
      const c = prms[k4 + 3];
      const wk = w[k];
      const ox = out[k * 2];
      const oz = out[k * 2 + 1];

      const n1 = simplex3(s * 1.7 + wx, v * 2.6 - tv, c * 1.7 + wz);
      const n2 = simplex3(s * 3.6 + wx * 1.7 + 5.2, v * 5.5 - tv * 1.6, c * 3.6 + wz * 1.7);
      const n3 = simplex3(s * 7.5 + t * 0.9 + 9.1, v * 11 - t * 1.1, c * 7.5);
      const n = n1 * 0.6 + n2 * 0.28 + n3 * 0.12;

      const chest = breath * bell((v - 0.18) / 0.32);
      const d = wk * amp * n + chest;
      // folds travel around the body during the swirl
      const tg = wk * amp * swirl * 0.5 * n2;
      const f = 1 + flare * v * v;

      pos[k3] = rest[k3] * f + ox * d + oz * tg;
      pos[k3 + 1] = rest[k3 + 1] + swirl * wk * (0.05 + 0.09 * Math.max(0, n1)) + wk * amp * 0.3 * n3;
      pos[k3 + 2] = rest[k3 + 2] * f + oz * d - ox * tg;
    }

    this.computeNormals();
    this.posAttr.needsUpdate = true;
    this.normAttr.needsUpdate = true;
  }

  private computeNormals() {
    const pos = this.positions;
    const nor = this.normals;
    const cols = this.cols;
    const rows = this.rows;
    const sign = this.normalSign;
    for (let j = 0; j < rows; j++) {
      const j0 = j > 0 ? j - 1 : j;
      const j1 = j < rows - 1 ? j + 1 : j;
      for (let i = 0; i < cols; i++) {
        const i0 = i > 0 ? i - 1 : i;
        const i1 = i < cols - 1 ? i + 1 : i;
        const a = (j * cols + i0) * 3;
        const b = (j * cols + i1) * 3;
        const c = (j0 * cols + i) * 3;
        const d = (j1 * cols + i) * 3;
        const ux = pos[b] - pos[a];
        const uy = pos[b + 1] - pos[a + 1];
        const uz = pos[b + 2] - pos[a + 2];
        const vx = pos[d] - pos[c];
        const vy = pos[d + 1] - pos[c + 1];
        const vz = pos[d + 2] - pos[c + 2];
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx = (nx / len) * sign;
        ny = (ny / len) * sign;
        nz = (nz / len) * sign;
        const k = (j * cols + i) * 3;
        nor[k] = nx;
        nor[k + 1] = ny;
        nor[k + 2] = nz;
      }
    }
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
