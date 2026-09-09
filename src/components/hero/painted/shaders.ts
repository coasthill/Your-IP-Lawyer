/**
 * The painted stage in one full-screen fragment shader.
 *
 * Two pictures (A, the one on screen; B, the one being revealed) — each a painted still or a frame
 * of a clip — are fitted to the viewport, drifted slowly like a camera on a dolly, and blended by
 * `uMix`:
 *   kind 0 — DISSOLVE: the picture breaks up along a noise field into pigment grains and vertical
 *            streaks (the pixel-sort look), a few gold motes catch the light, and the next picture
 *            settles in behind.
 *   kind 1 — CURTAIN: a dark cloth is drawn across the frame and pulled away; the gavel's flash
 *            happens after the cloth has cleared. As it is pulled away the cloth sends an outward
 *            ripple through the picture behind it.
 *   kind 2 — RIPPLE: a wave spreads from the centre of the frame, displacing the picture along its
 *            radius, with a thinner ribbon trailing it; B follows the wavefront outward.
 * Fit (`uFit`): 0 covers the viewport around the focal point (landscape screens); 1 contains the
 * whole picture (portrait screens — the film is never cropped on phones) and fills the surround
 * with the same picture sampled far down the mip chain, darkened: blurred ambient light.
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
uniform vec2 uSizeA;      // picture size in pixels
uniform vec2 uSizeB;
uniform vec2 uFocalA;     // focal point, 0–1, y up
uniform vec2 uFocalB;
uniform vec3 uDriftA;     // scale, pan x, pan y
uniform vec3 uDriftB;
uniform vec2 uRes;        // viewport in pixels
uniform float uMix;       // 0 → A, 1 → B
uniform float uKind;      // 0 dissolve, 1 curtain, 2 ripple
uniform float uFit;       // 0 cover, 1 contain
uniform float uTime;
uniform float uVel;       // |scroll velocity| 0–1
uniform float uFlash;     // gavel flash 0–1
uniform float uSeed;
uniform float uHasB;

const float PI = 3.14159265;
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

/* Cover-fit uv (screen, 0-1) into a picture of 'size' px, keeping 'focal' in frame, then apply the drift. */
vec2 coverUv(vec2 uv, vec2 size, vec2 focal, vec3 drift) {
  vec2 s = uRes / size;
  float k = max(s.x, s.y);
  vec2 vis = uRes / (size * k);              // fraction of the picture that fits
  vec2 offset = clamp(focal - vis * 0.5, vec2(0.0), vec2(1.0) - vis);
  vec2 p = offset + uv * vis;
  p = focal + (p - focal) / drift.x + drift.yz * vis;
  return clamp(p, vec2(0.002), vec2(0.998));
}

/* Contain-fit: the whole picture, centred; 'inside' is 0 for screen pixels outside the picture. */
vec2 containUv(vec2 uv, vec2 size, vec2 focal, vec3 drift, out float inside) {
  vec2 s = uRes / size;
  float k = min(s.x, s.y);
  vec2 vis = uRes / (size * k);              // > 1 on the axis with room to spare
  vec2 p = 0.5 + (uv - 0.5) * vis;
  p = focal + (p - focal) / drift.x + drift.yz;
  vec2 px = abs(p - 0.5) * size;             // distance from the centre in picture pixels
  vec2 edge = smoothstep(size * 0.5, size * 0.5 - 1.5, px);
  inside = edge.x * edge.y;
  return clamp(p, vec2(0.002), vec2(0.998));
}

/* One picture at a screen uv under the current fit: cover, or contain over blurred ambient light. */
vec3 pick(sampler2D tex, vec2 uv, vec2 size, vec2 focal, vec3 drift) {
  if (uFit < 0.5) return texture2D(tex, coverUv(uv, size, focal, drift)).rgb;
  float inside;
  vec2 p = containUv(uv, size, focal, drift, inside);
  vec3 c = texture2D(tex, p).rgb;
  // the surround: the same picture, cover-fitted, far down the mip chain and darkened to 35 %
  vec2 q = coverUv(uv, size, focal, vec3(1.15, 0.0, 0.0));
  vec3 amb = texture2D(tex, q, 6.0).rgb * 0.5 + texture2D(tex, q + vec2(0.03, 0.02), 6.0).rgb * 0.25 + texture2D(tex, q - vec2(0.03, 0.02), 6.0).rgb * 0.25;
  return mix(amb * 0.35, c, inside);
}
vec3 pickA(vec2 uv) { return pick(uTexA, uv, uSizeA, uFocalA, uDriftA); }
vec3 pickB(vec2 uv) { return pick(uTexB, uv, uSizeB, uFocalB, uDriftB); }

vec3 splitA(vec2 uv, float split) {
  if (split < 0.0005) return pickA(uv);
  return vec3(pickA(uv + vec2(split, 0.0)).r, pickA(uv).g, pickA(uv - vec2(split, 0.0)).b);
}
vec3 splitB(vec2 uv, float split) {
  if (split < 0.0005) return pickB(uv);
  return vec3(pickB(uv + vec2(split, 0.0)).r, pickB(uv).g, pickB(uv - vec2(split, 0.0)).b);
}

/* Radial coordinates from the centre of the frame, corrected for the viewport aspect. */
vec2 radial(vec2 uv) {
  vec2 c = uv - 0.5;
  c.x *= uRes.x / uRes.y;
  return c;
}

void main() {
  vec2 uv = vUv;
  vec3 col;

  if (uHasB < 0.5 || uMix <= 0.0005) {
    col = pickA(uv);
  } else if (uKind < 0.5) {
    /* ---------- dissolve ---------- */
    float t = uMix;
    float bell = sin(t * PI);                        // peaks mid-transition
    float n = fbm(uv * vec2(3.2, 2.2) + uSeed * 7.0);
    float w = 0.28;
    float r = clamp((t * (1.0 + w) - n) / w, 0.0, 1.0);   // reveal of B, grain by grain
    float near = 1.0 - abs(r * 2.0 - 1.0);           // 1 at the dissolving edge

    // vertical streaks: each thin column slides at its own speed (the pixel-sort look)
    float col1 = hash(vec2(floor(uv.x * uRes.x / 3.0), 1.7));
    float col2 = hash(vec2(floor(uv.x * uRes.x / 9.0), 4.1));
    float streak = (0.35 + 0.65 * col1) * (0.5 + 0.5 * col2);
    float amount = bell * (0.05 + 0.12 * uVel) * streak;
    vec2 uvB = uv + vec2(0.0, amount * (1.0 - t));
    vec2 uvA2 = uv - vec2(0.0, amount * t);

    // coarse blocks right at the edge
    vec2 g = uRes / (10.0 + 26.0 * (1.0 - near));
    vec2 q = floor(uv * g) / g;
    float blocky = smoothstep(0.55, 0.95, near) * bell;
    float split = 0.0035 * near * bell;
    vec3 a = mix(splitA(uvA2, split), pickA(q - vec2(0.0, amount * t)), blocky);
    vec3 b = mix(splitB(uvB, split), pickB(q + vec2(0.0, amount * (1.0 - t))), blocky);
    col = mix(a, b, r);

    // pigment grains and gold motes along the edge
    float grain = hash(uv * uRes * 0.5 + uSeed);
    col += (grain - 0.5) * 0.18 * near * bell;
    float mote = step(0.994, hash(floor(uv * uRes / 2.0) + uSeed * 3.0)) * near * bell;
    col += GOLD * mote * 0.9;
  } else if (uKind < 1.5) {
    /* ---------- curtain ---------- */
    float t = uMix;
    float wave = 0.045 * sin(uv.y * 7.0 + uTime * 0.6) + 0.018 * sin(uv.y * 23.0 - uTime * 0.9);
    float e = (t < 0.5) ? 1.15 - t * 2.3 : 1.15 - (t - 0.5) * 2.3;   // edge x position
    float edge = e + wave;
    float cloth = (t < 0.5) ? step(edge, uv.x) : step(uv.x, edge);
    float dist = abs(uv.x - edge);

    // as the cloth is pulled away it sends a ring outward through the picture it uncovers
    float t2 = clamp((t - 0.5) * 2.0, 0.0, 1.0);
    vec2 c = radial(uv);
    float d = length(c);
    float front = t2 * 1.2 - 0.05;
    float band = exp(-pow((d - front) * 5.0, 2.0));
    float ring = sin(d * 34.0 - t2 * 14.0) * 0.016 * sin(t2 * PI) * band;
    vec2 disp = (t < 0.5) ? vec2(0.0) : normalize(c + 1e-5) * ring;
    vec3 pic = (t < 0.5) ? pickA(uv) : pickB(uv + disp);
    pic += GOLD * band * sin(t2 * PI) * 0.08 * step(0.5, t);

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
  } else {
    /* ---------- ripple ---------- */
    float t = uMix;
    float bell = sin(t * PI);
    vec2 c = radial(uv);
    float d = length(c);
    vec2 dir = normalize(c + 1e-5);
    float front = t * 1.25 - 0.08;                    // the wavefront radius, growing outward
    float band = exp(-pow((d - front) * 4.5, 2.0));   // the main wave around the front
    float ribbon = exp(-pow((d - front + 0.16) * 14.0, 2.0));   // a thinner ribbon trailing it
    float amp = 0.028 * bell;
    float wave = sin(d * 42.0 - uTime * 6.0) * amp * band + sin(d * 90.0 - uTime * 9.0) * amp * 0.4 * ribbon;
    vec2 disp = dir * wave;
    // B follows the wavefront outward; the join is softened by the wave itself
    float r = smoothstep(front + 0.06, front - 0.06, d + wave * 2.0);
    vec3 a = pickA(uv + disp);
    vec3 b = pickB(uv + disp * 0.6);
    col = mix(a, b, r);
    // light catches the crest
    float crest = max(0.0, sin(d * 42.0 - uTime * 6.0)) * band * bell;
    col += GOLD * crest * 0.14 + vec3(0.06) * ribbon * bell;
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
