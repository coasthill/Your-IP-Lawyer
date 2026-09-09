/**
 * The painted stage in one full-screen fragment shader.
 *
 * Two paintings (A, the one on screen; B, the one being revealed) are cover-fitted to the viewport
 * around their focal points, drifted slowly like a camera on a dolly, and blended by `uMix`:
 *   kind 0 — DISSOLVE: the picture breaks up along a noise field into pigment grains and vertical
 *            streaks (the pixel-sort look), a few gold motes catch the light, and the next painting
 *            settles in behind.
 *   kind 1 — CURTAIN: a dark cloth is drawn across the frame and pulled away; the gavel's flash
 *            happens while the cloth covers the picture.
 * Everything is procedural: no extra textures, no post-processing pass.
 */

export const VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform vec2 uSizeA;      // painting size in pixels
uniform vec2 uSizeB;
uniform vec2 uFocalA;     // focal point, 0–1, y up
uniform vec2 uFocalB;
uniform vec3 uDriftA;     // scale, pan x, pan y
uniform vec3 uDriftB;
uniform vec2 uRes;        // viewport in pixels
uniform float uMix;       // 0 → A, 1 → B
uniform float uKind;      // 0 dissolve, 1 curtain
uniform float uTime;
uniform float uVel;       // |scroll velocity| 0–1
uniform float uFlash;     // gavel flash 0–1
uniform float uSeed;
uniform float uHasB;

const vec3 GOLD = vec3(0.85, 0.71, 0.33);
const vec3 CLOTH = vec3(0.035, 0.035, 0.045);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return v;
}

/* Cover-fit uv (screen, 0-1) into a painting of 'size' px, keeping 'focal' in frame, then apply the drift. */
vec2 coverUv(vec2 uv, vec2 size, vec2 focal, vec3 drift) {
  vec2 s = uRes / size;
  float k = max(s.x, s.y);
  vec2 vis = uRes / (size * k);              // fraction of the painting that fits
  vec2 offset = clamp(focal - vis * 0.5, vec2(0.0), vec2(1.0) - vis);
  vec2 p = offset + uv * vis;
  p = focal + (p - focal) / drift.x + drift.yz * vis;
  return clamp(p, vec2(0.002), vec2(0.998));
}

vec3 sampleSplit(sampler2D tex, vec2 uv, float split) {
  if (split < 0.0005) return texture2D(tex, uv).rgb;
  float r = texture2D(tex, uv + vec2(split, 0.0)).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - vec2(split, 0.0)).b;
  return vec3(r, g, b);
}

void main() {
  vec2 uv = vUv;
  vec2 uvA = coverUv(uv, uSizeA, uFocalA, uDriftA);
  vec3 col;

  if (uHasB < 0.5 || uMix <= 0.0005) {
    col = texture2D(uTexA, uvA).rgb;
  } else if (uKind < 0.5) {
    /* ---------- dissolve ---------- */
    float t = uMix;
    float bell = sin(t * 3.14159);                   // peaks mid-transition
    float n = fbm(uv * vec2(3.2, 2.2) + uSeed * 7.0);
    float w = 0.28;
    float r = clamp((t * (1.0 + w) - n) / w, 0.0, 1.0);   // reveal of B, grain by grain
    float near = 1.0 - abs(r * 2.0 - 1.0);           // 1 at the dissolving edge

    // vertical streaks: each thin column slides at its own speed (the pixel-sort look)
    float col1 = hash(vec2(floor(uv.x * uRes.x / 3.0), 1.7));
    float col2 = hash(vec2(floor(uv.x * uRes.x / 9.0), 4.1));
    float streak = (0.35 + 0.65 * col1) * (0.5 + 0.5 * col2);
    float amount = bell * (0.05 + 0.12 * uVel) * streak;
    vec2 uvB = coverUv(uv + vec2(0.0, amount * (1.0 - t)), uSizeB, uFocalB, uDriftB);
    vec2 uvA2 = coverUv(uv - vec2(0.0, amount * t), uSizeA, uFocalA, uDriftA);

    // coarse blocks right at the edge
    vec2 g = uRes / (10.0 + 26.0 * (1.0 - near));
    vec2 q = floor(uv * g) / g;
    float blocky = smoothstep(0.55, 0.95, near) * bell;
    vec2 uvAq = coverUv(q - vec2(0.0, amount * t), uSizeA, uFocalA, uDriftA);
    vec2 uvBq = coverUv(q + vec2(0.0, amount * (1.0 - t)), uSizeB, uFocalB, uDriftB);
    float split = 0.0035 * near * bell;
    vec3 a = mix(sampleSplit(uTexA, uvA2, split), texture2D(uTexA, uvAq).rgb, blocky);
    vec3 b = mix(sampleSplit(uTexB, uvB, split), texture2D(uTexB, uvBq).rgb, blocky);
    col = mix(a, b, r);

    // pigment grains and gold motes along the edge
    float grain = hash(uv * uRes * 0.5 + uSeed) ;
    col += (grain - 0.5) * 0.18 * near * bell;
    float mote = step(0.994, hash(floor(uv * uRes / 2.0) + uSeed * 3.0)) * near * bell;
    col += GOLD * mote * 0.9;
  } else {
    /* ---------- curtain ---------- */
    float t = uMix;
    float wave = 0.045 * sin(uv.y * 7.0 + uTime * 0.6) + 0.018 * sin(uv.y * 23.0 - uTime * 0.9);
    float e = (t < 0.5) ? 1.15 - t * 2.3 : 1.15 - (t - 0.5) * 2.3;   // edge x position
    float edge = e + wave;
    float cloth = (t < 0.5) ? step(edge, uv.x) : step(uv.x, edge);
    float dist = abs(uv.x - edge);
    vec2 uvB = coverUv(uv, uSizeB, uFocalB, uDriftB);
    vec3 pic = (t < 0.5) ? texture2D(uTexA, uvA).rgb : texture2D(uTexB, uvB).rgb;

    // the cloth: dark folds, a gold rim light along its leading edge
    float folds = 0.5 + 0.5 * sin(uv.x * 46.0 + uv.y * 5.0 + wave * 30.0);
    float folds2 = 0.5 + 0.5 * sin(uv.x * 11.0 - uv.y * 3.0 + uTime * 0.3);
    float sheen = pow(folds, 3.0) * (0.4 + 0.6 * folds2) * (0.5 + 0.5 * noise(uv * vec2(5.0, 3.0) + uTime * 0.1));
    vec3 clothCol = CLOTH + vec3(0.07, 0.08, 0.13) * folds * folds2 + vec3(0.11, 0.10, 0.07) * sheen;
    float rim = smoothstep(0.06, 0.0, dist);
    clothCol += GOLD * rim * 0.55;
    // the picture darkens under the approaching cloth
    float shadow = (t < 0.5) ? smoothstep(0.12, 0.0, uv.x - edge) : smoothstep(0.12, 0.0, edge - uv.x);
    pic *= 1.0 - 0.35 * shadow * (1.0 - cloth);
    col = mix(pic, clothCol, cloth);
  }

  // gavel flash
  col = mix(col, vec3(1.0, 0.98, 0.92), uFlash * 0.7);

  // film grain and vignette
  float fg = hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5;
  col += fg * 0.035;
  vec2 v = (uv - 0.5) * vec2(1.0, 0.85);
  float vig = 1.0 - smoothstep(0.55, 1.35, length(v) * 1.6) * 0.32;
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;
