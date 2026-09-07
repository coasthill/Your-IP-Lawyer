# The Homepage — Storyboard & Visual Direction

The homepage is a scroll-driven cinematic artwork. It is an argument made visually:
**a lawyer → his gown → the subjects of intellectual property → order (the gavel) → the machine of patents → design → the mark → the map → the whole legal world → the website.**

Scroll progress 0–1 runs across a pinned, full-viewport stage (`STAGE_HEIGHT_VH` in `src/components/hero/story.ts`). `SCENES` in that file is the single timeline; captions are DOM elements in `TextOverlay.tsx`; the picture is drawn by one of three renderers chosen by `capabilities.ts`:

| Tier | When | Renderer |
| --- | --- | --- |
| `webgl` | desktop, capable GPU | `hero/webgl/WebGLStory.tsx` (React Three Fiber) |
| `canvas` | phones/tablets, weak GPUs, no WebGL, save-data | `hero/canvas/CanvasStory.tsx` (2D canvas, 2.5D layers) |
| `static` | prefers-reduced-motion | `hero/static/StaticStory.tsx` (no animation, SVG/CSS composition + readable sections) |

All renderers read `progressStore.get().value` each frame (never React state in the render loop) and must call `onReady()` once the first frame is drawable. Force a tier for testing with `?render=webgl|canvas|static`.

## Mood

Academic classical painting meets Indian courtroom meets industrial machinery. Tenebrism: almost everything is darkness; light is scarce, warm and directional (a single key light from upper-left, `PALETTE.keyLight`), with a cool faint rim light from the right (`PALETTE.rimLight`). Surfaces: black wool gown, white cotton bands, aged parchment, brushed steel, bronze, red sealing wax, ink. Grain and vignette always present. Never neon, never saturated, never cartoon.

The figure is an **original, generic Indian advocate** — not a likeness of anyone. Face in shadow, form suggested by light on the gown's folds, shoulders and the white bands at the throat: exactly how a tenebrist painter would treat him. This is both the aesthetic and the honest technical choice (no uncanny procedural faces). The system is built so a custom portrait/generated artwork can later replace the figure layer (`hero/webgl/scenes/LawyerScene.tsx` and `hero/canvas` figure drawing both read from one place).

## Scene by scene (progress ranges from story.ts)

### 1 · The Lawyer — 0.00 → 0.10
Near-black room. The advocate stands centre-right, full length, still, weight on one leg. Black gown falls to the floor; white bands glow at the throat — the brightest thing in the frame. Dust motes drift slowly in the key light. Camera does an almost imperceptible dolly-in. Caption (top-left): ADV. ROHIT PRADHAN / IP LITIGATION · DELHI / "Scroll to begin."

### 2 · The Gown Moves — 0.10 → 0.34
He steps forward; the gown lifts and swirls (cloth simulation on desktop: a high-res plane with verlet/spring physics or a layered noise-displaced shader; on canvas: 5–7 bezier "fabric ribbons" with animated control points). Camera orbits ~15° and drops slightly. From the fabric emerge the five IP subjects, one every ~0.042 of progress, each with its own object language:
- **Trade Marks** — a circular registration seal (bronze, engraved ®) that rotates into view and hangs in the air.
- **Patents** — an unfolding engineering sheet with a gear drawing and dimension lines (thin bronze lines on parchment).
- **Copyright** — loose manuscript pages (parchment planes) with faint ink lines, tumbling gently.
- **Designs** — a faceted ornamental form / product silhouette, metal with a specular edge.
- **Geographical Indications** — a small map fragment with contour lines and one glowing marker.
Secondary inscriptions ("Trade Secrets", "Passing Off", "Arbitration"...) drift past as faint engraved text. Objects drift outward and settle to the sides as the next emerges. Everything must remain readable: elements stay for the caption's hold.

### 3 · The Gavel — 0.34 → 0.42
The swirl settles. The figure raises a gavel (dark wood, bronze band) in a slow, symbolic arc. At **0.385** (`GAVEL_STRIKE_AT`) it strikes: a light pulse (key light flashes 3× for ~200ms then decays), a subtle camera shake (≤6px, 350ms, decaying), a ring of dust/particles expanding outward, and the floating IP objects are knocked back and dissolve to sparks. Sound (optional): thud. Then the darkness itself turns to metal.

### 4 · The Patent Machine — 0.42 → 0.56
Out of the impact emerge heavy gears: one huge gear (left, half out of frame), three medium, several small, all meshing correctly (angular velocity ∝ 1/teeth, alternating direction). Brushed steel with bronze rims, engraved "PATENT" on the big gear's face. Rotation is driven by scroll progress (they turn as you scroll, stop when you stop) plus a tiny idle drift. Behind: a parchment blueprint layer with technical drawings, dimension lines and section hatching, parallaxing slower than the gears. Caption: PATENTS / Protecting technical innovation and invention.

### 5 · Design — 0.56 → 0.67
Gears align: their centres slide onto one axis, teeth lock into a rosette, and the rosette becomes a rotating turned-metal plate. On the plate a fine engraved ornament (guilloché / lotus-inspired radial pattern) is revealed as a light sweep passes; a product silhouette (a clean object profile — a bottle/lamp/chair outline) rises above it as a thin bronze line drawing. The metal refines: fewer, cleaner surfaces, more highlight. Caption: DESIGNS / Protecting the visual appearance of innovation.

### 6 · Trade Mark — 0.67 → 0.78
The plate flattens and warms into a registration emblem: a large circular seal/banner (wax-red centre, bronze ring, small-caps "TRADE MARK" engraved around the rim, a ® in the middle) against a wall of typographic specimen sheets and a hint of a shop-sign frame. A ribbon banner unfurls beneath. Caption: TRADE MARKS / Because businesses are remembered by what they are called, shown as, and associated with.

### 7 · Geographical Indication — 0.78 → 0.89
The emblem's ring becomes a compass rose and the wall becomes a tactile map of India (simplified outline, topographic contour lines, faint graticule, paper texture, engraved place-marker glyphs). The camera tilts down over it; one marker lights up with a soft radial glow — a conceptual location, no real place is implied. Caption: GEOGRAPHICAL INDICATIONS / Where geography becomes part of identity.

### 8 · The Legal World — 0.89 → 1.00
The five objects (seal, gear, page, ornament, marker) return small, arranged as a constellation joined by hairlines, over a legal-document texture. Four words fade in around them: IP LITIGATION · DISPUTE RESOLUTION · LEGAL RESEARCH · IP COMMENTARY. The picture darkens into the ink of the page below; the stage ends and the editorial sections begin (`HomeSections.tsx`).

## After the stage (`HomeSections.tsx`)
1. **Purpose** — "INTELLECTUAL PROPERTY. WITHOUT THE BORING PART." + editorial copy about what YourIPLawyer is for (commentary, developments, case analysis, practical insights, writing, discussion, learning, dispute-resolution and career conversations).
2. **From the blog** — featured article + 3 latest (paper surface).
3. **The IP Forum** — invitation + 3 most active discussions.
4. **About** teaser — factual, modest.
5. **Contact** — HAVE SOMETHING TO SAY? + email.

## Performance & motion rules
- Desktop target: 60fps on a mid-range laptop GPU. DPR capped at 1.75. Post-processing: at most bloom (low intensity) + vignette + film grain; disable on `canvas` tier.
- No model files: geometry is procedural (gears via `ExtrudeGeometry` from a gear `Shape`; seals via lathe/torus; pages via planes; India outline via a hand-authored polygon → `ShapeGeometry`). Text in 3D via drei `<Text>` with the local Cormorant font (`/fonts/cormorant-latin-wght-normal.woff2` copied to `public/fonts`).
- Instancing for particles and repeated pages; frustum-culled scenes are unmounted (`visible=false`) when outside their range ± margin.
- Scroll is never hijacked; ScrollTrigger `scrub: 0.6` smooths; renderers additionally ease toward the target (`lerp` ~0.08/frame) so fast scrolling still looks cinematic.
- Camera moves are small. No flashing beyond the single gavel pulse. Nothing requires precise scrolling; every caption has ≥0.03 of progress hold (≈ 330px of scroll on desktop).
- `prefers-reduced-motion: reduce` → `static` tier; also the sound never autoplays.
- Mobile (`canvas` tier): 2D canvas at DPR ≤ 2, ≤ 120 particles, gradients pre-rendered to offscreen canvases, redraw only when progress or size changes (plus a slow idle tick for motes). Same scene order, same captions.
