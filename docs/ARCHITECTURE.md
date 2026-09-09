# YourIPLawyer — Technical Architecture

This document is the contract every part of the codebase follows. Read it before adding code.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, React 19, TypeScript, Turbopack) | Server components + server actions give us a real backend without a separate API server. |
| Styling | **Tailwind CSS v4** + design tokens in `src/app/globals.css` | Utilities for layout, hand-written component classes for the editorial look. |
| Fonts | Self-hosted via `next/font/local` (`src/app/fonts.ts`) | No runtime request to Google; zero layout shift. Cormorant Garamond (display), DM Sans (body), IBM Plex Mono (labels). |
| Homepage | A **scroll-scrubbed film** — nine Kling clips sliced into WebP frame sequences (`public/art/film`) and thirteen painted stills (`public/art/scenes`) — drawn by a **hand-written WebGL shader** (`src/components/hero/painted`), **GSAP ScrollTrigger**, **Lenis** | Cinematic homepage without a video element or a 3D library: one fragment shader shows the current frame of the film and dissolves, ripples or curtains it into the next. A 2D canvas fallback and a static composition stand in where WebGL or motion is unavailable. |
| Artwork pipeline | `content/artwork/*.json` → `scripts/fetch-artwork.mjs` (**sharp** + **ffmpeg**) → the **Fetch artwork** GitHub Action (`.github/workflows/artwork.yml`) | The stills are generated in Higgsfield (GPT Image 2) and the clips with Kling 3.0 from those stills; the repository only ever stores URLs plus the converted WebP stills and frame sequences the Action commits. |
| Database | **PostgreSQL** via **Drizzle ORM** (`src/db`) | Production: any Postgres (`DATABASE_URL`). Local dev: **PGlite** (embedded Postgres in `./.data/pglite`) with zero setup. Same schema, same migrations. |
| Auth | Hand-rolled, minimal: scrypt password hashes + database sessions in an httpOnly cookie (`src/lib/auth`) | No third-party auth provider needed for a single-owner admin. |
| Uploads | Storage abstraction (`src/lib/storage`): `local` disk, `vercel-blob`, or `s3` (R2/Supabase/AWS) | Large files never enter the Git repository. |
| Content | Blog posts are **Markdown stored in the database**, edited through the admin dashboard; rendered to sanitised HTML at save time (`src/lib/markdown.ts`) | Non-technical editing, portable content. |
| Anti-spam | Honeypot, rate limiting (DB-backed), duplicate detection, heuristic spam score, optional Cloudflare Turnstile, moderation queue (`src/lib/security`) | Guest posting without accounts, safely. |

## Directory map

```
src/
  app/
    layout.tsx                 root: fonts + metadata
    (site)/                    public site: Navigation + <main> + Footer, smooth scroll
      page.tsx                 homepage (cinematic stage + editorial sections)
      about/ blog/ forum/ submission-guidelines/ contact/ disclaimer/
    admin/                     dashboard (own layout, guarded by requireAdmin)
    api/uploads/[...key]       serves files for the `local` storage driver
    sitemap.ts robots.ts not-found.tsx error.tsx
  components/
    navigation/ footer/ ui/    shared chrome and primitives (SmoothScroll, primitives.tsx, Turnstile)
    hero/                      homepage — see "Homepage" below
      story.ts                 the timeline: SCENES (copy), FILM (the ten beats), TRANSITIONS, ANNOTATIONS, GAVEL_STRIKE_AT, STAGE_HEIGHT_VH, frameAt()
      art.ts art-manifest.json stills and clips resolved to files (the manifest is written by scripts/fetch-artwork.mjs)
      capabilities.ts          renderer tier detection (webgl | canvas | static), DPR cap, small-art switch
      progress-store.ts        scroll progress shared by every layer
      CinematicHome.tsx        the pinned stage: ScrollTrigger → progress, surface switching, layer composition
      painted/                 PaintedStory.tsx (WebGL), CanvasStory.tsx (2D fallback), media.ts (progressive loader: one reel of stills/frames per beat), shaders.ts, gl.ts
      static/                  StaticStory.tsx — reduced-motion editorial composition
      TextOverlay Annotations MapOverlay ConstellationOverlay Loader SoundToggle sound.ts india-outline.ts   DOM layers
      HomeSections.tsx         the editorial sections after the stage
    blog/ forum/ comments/ admin/ ip-elements/ scenes/
  config/site.ts               ALL identity + contact + nav + disclaimers + footer copy
  db/schema.ts client.ts       Drizzle schema, client (pg | PGlite)
  lib/
    auth/                      password.ts (scrypt), session.ts (cookie + DB), guard.ts (requireAdmin / assertAdmin)
    security/                  request.ts (ip hash, origin), rate-limit.ts, spam.ts, sanitize.ts, turnstile.ts
    storage/                   index.ts (drivers), validate.ts (magic bytes, limits, safe names)
    markdown.ts utils.ts
  server/                      data-access layer (plain async functions, no HTTP): posts, comments, forum, submissions, documents, taxonomy, admin-users, revalidate
  proxy.ts                     coarse /admin gate (cookie presence); real check is server-side
content/demo-posts/*.md        demo articles imported by `npm run db:seed`
content/demo-forum.json        demo forum threads
content/artwork/               manifest.json (scenes: id, source URL, focal point · clips: id, source mp4 URL, fps, reverse, trim), prompts.json, candidates.json
public/art/scenes/             <id>.webp (2000px) and <id>-sm.webp (1100px) — written by the Fetch artwork workflow
public/art/film/<id>/          fNNN.webp frames (≤1200px), sm/fNNN.webp (640px) and sheet.jpg (contact sheet) per clip — written by the workflow
public/art/candidates/         1000px review copies of candidates.json
.github/workflows/artwork.yml  the Fetch artwork workflow
drizzle/                       SQL migrations (generated by drizzle-kit)
scripts/                       migrate, seed, create-admin, screenshots, fetch-artwork.mjs
docs/                          this file, STORYBOARD.md
```

## Conventions

- **Server Components by default.** Add `"use client"` only for interactivity (forms with state, canvases, GSAP).
- **Server Actions** live in `actions.ts` next to the route that uses them (`"use server"` at top). Every admin action starts with `await assertAdmin()`. Every public write action goes through the `src/server/*` function which applies validation, rate limiting, spam scoring and moderation.
- **Mutations call `revalidateContent([...extraPaths])`** from `src/server/revalidate.ts` so public pages refresh.
- **Pages that read the DB are dynamic.** Export `export const dynamic = "force-dynamic"` (or use request APIs) so builds do not require a database.
- **Params are async** (Next 16): `const { slug } = await props.params;` — use the generated `PageProps<"/blog/[slug]">` helper.
- **Never render `authorEmail`, `ipHash` or `userAgent`** — the data layer strips them; keep it that way.
- **User-generated text is plain text.** Render it with `renderPlainText()` from `src/lib/security/sanitize.ts` inside an element with class `prose-ugc`. Never `dangerouslySetInnerHTML` raw user input.
- **Article HTML** comes pre-sanitised from `post.bodyHtml`; render inside `.prose-editorial`.
- **Uploads:** only through `storeUpload(file, allowedKinds, meta)` in `src/server/documents.ts`.
- **Slugs** via `slugify()`; dates via `formatDate()` / `timeAgo()` in `src/lib/utils.ts`.
- **Config, never constants:** site name, author, email, disclaimers come from `siteConfig`.
- **No new npm dependencies** without a note in the README — the dependency set is deliberately small.

## Data-access API (src/server)

```ts
// posts.ts
listPublishedPosts({ categorySlug?, tagSlug?, limit?, offset? }) → PostWithMeta[]   // featured first, then newest
getFeaturedPost() / getPostBySlug(slug, { includeDrafts? }) / getPostById(id) / getRelatedPosts(post, n)
countPublishedPosts()
listPostsForAdmin() / savePost(PostInput) / setPostStatus(id, status) / deletePost(id)
attachDocumentToPost(postId, documentId, label?) / detachDocumentFromPost(postId, documentId)
// PostWithMeta = Post & { category, tags[], heroImage: Document|null, documents: (Document & {label})[] }

// taxonomy.ts
listCategories("blog" | "forum" | undefined) / getCategoryBySlug / ensureCategory(name, scope) / updateCategory / deleteCategory
ensureTags("a, b, c" | string[]) / listTags() / DEFAULT_CATEGORIES

// comments.ts
listApprovedComments(postId) → CommentNode[] (tree)
createComment({ postId, parentId?, name, email?, body, honeypot?, turnstileToken? }) → { ok, status: "approved"|"pending" } | { ok:false, error }
listCommentsForAdmin(status?) / countPendingComments() / setCommentStatus(id, status) / deleteComment(id)

// forum.ts
listThreads({ categorySlug?, sort: "active"|"newest"|"replies", limit?, offset? }) → ThreadPublic[]
getThreadBySlug(slug) / incrementThreadViews(id) / listApprovedReplies(threadId) → ReplyPublic[] (tree) / countThreads()
createThread({ title, body, categoryId?, tags?, name, email?, honeypot?, turnstileToken? }) → { ok, status, slug } | { ok:false, error }
createReply({ threadId, parentId?, body, name, email?, honeypot?, turnstileToken? })
reportContent({ targetType: "comment"|"thread"|"reply", targetId, reason? })
listThreadsForAdmin(status?) / listRepliesForAdmin(status?) / countPendingForum() / setThreadStatus / setThreadFlags({pinned?, locked?}) / deleteThread / setReplyStatus / deleteReply / listOpenReports / resolveReport / createThreadAsAdmin

// submissions.ts
createSubmission({ name, email, affiliation?, title, kind?, abstract, file?: File, honeypot?, turnstileToken? })
listSubmissions(status?) / getSubmission(id) / countNewSubmissions() / updateSubmission(id, { status?, adminNotes? }) / deleteSubmission(id)

// documents.ts
storeUpload(file: File, allowed: ("image"|"pdf"|"file")[], { uploadedBy?, title?, description?, altText? }) → { ok, document } | { ok:false, error }
listDocuments(kind?) / getDocument(id) / updateDocumentMeta(id, meta) / deleteDocument(id) / formatBytes(n)

// admin-users.ts
upsertAdminUser({ email, name, password }) / countAdminUsers() / listAdminUsers() / deleteAdminUser(id)

// auth (src/lib/auth)
requireAdmin() — pages (redirects to /admin/login);  assertAdmin() — actions (throws)
createSession(userId) / destroySession() / getCurrentAdmin()
verifyPassword(password, hash) / hashPassword(password) / passwordProblems(password)

// security
rateLimit(key, RATE_LIMITS.login) → { ok }; getRequestMeta() → { ip, ipHash, userAgent }
```

## Moderation policy

`MODERATION_MODE=auto` (default): clean guest content is published immediately; anything with links, profanity, shouting or blocked phrases is held as `pending`; obvious spam is stored as `spam` (never shown). `MODERATION_MODE=manual`: everything waits for approval. Admin can approve / hide / delete / mark spam, pin or lock threads, and resolve community reports.

## Homepage (`src/components/hero`)

The homepage is a film scrubbed by the scroll: ten beats, each either a painted still under a slow camera drift or a clip — a five-second Kling 3.0 video generated image-to-video from one of the stills and sliced into a WebP frame sequence — played frame by frame as the visitor scrolls. There is no `<video>`, no 3D, no model file and no scene graph; the whole picture is one fragment shader sampling two textures. STORYBOARD.md describes what is on screen; this section describes the machinery.

**Data flow.** `CinematicHome.tsx` pins a full-viewport stage inside a tall scroll container (`STAGE_HEIGHT_VH`) and a GSAP ScrollTrigger (`scrub: 0.6`) writes 0–1 progress into `progress-store.ts`. Nothing scroll-jacks. Every consumer — the renderer, captions, annotations, the map, the constellation, the frame marks, the surface switch, the sound engine — subscribes to that store and updates the DOM directly; no React state changes per frame. `story.ts` is the single source of truth, in two layers: `SCENES` — the eight chapters: ranges, labels and captions (copy only); `FILM` — the ten beats, `{ id, scene, start, end, tone, alt, media }` where `media` is `{ kind: "still", asset, fallback?, drift }` or `{ kind: "clip", clip, fallback, keyframes?, hold?, drift? }`. Around them: `TRANSITIONS` — `{ from, to, at, width, kind: "dissolve" | "curtain" | "ripple" }` for each beat boundary; `ANNOTATIONS` (with an optional `beat` and a `smudge` flag); `GAVEL_STRIKE_AT`; `STAGE_HEIGHT_VH`.

**`frameAt(p, frameCount)`** resolves progress into `{ a, b, mix, kind }`. `a` and `b` are `FrameRef`s — `{ beat, frame, fraction, drift }` — with `b` null outside a transition window and `mix` a smoothstep across it; during the window both beats keep playing (A on its last frames, B on its first), so the film never stalls. `frameCount(clipId)` — supplied by `art.ts` as `clipFrameCount` — turns the 0–1 `fraction` into a frame index (`round(fraction · (n − 1))`), 0 when the clip has no frames on disk. Within a clip beat the progress-within-beat `q` first passes through `hold` (`[a, b]`: the clip finishes at `q = a` and freezes on its last frame — the assembly uses `[0.85, 1]`) and then through `keyframes` (piecewise-linear `[q, fraction]` pairs, default `[[0, 0], [1, 1]]`). That is how the strike beat pins the clip's impact frame to the scroll: `[[0, 0], [(GAVEL_STRIKE_AT − start) / (end − start), 0.68], [1, 1]]` lands the frame 68 % through the clip on `GAVEL_STRIKE_AT`, where the shader flash and `sound.gavel()` are keyed; a new strike clip means a new `0.68`. Within a still beat `driftAt` eases `drift.from → drift.to` (scale, pan x, pan y) with smoothstep; a clip has identity drift unless it declares one.

**Fallbacks.** Every clip beat names a fallback still, and a chain is allowed (`water` → `["water-still", "legal-world"]`); a still beat may name one too (`orchard` → `patent`, `structure` → `design`). `art.ts` resolves each beat against what exists in `art-manifest.json` today: `resolveStill` walks the chain, `stillFor` returns the file pair, size and focal point (or a 3:2 stand-in with no `src`), `clipFor` returns the clip's frame count, size, LQIP and `frameUrl(i, small)` only when frames exist, and `placeholderCanvas` paints a lit lapis or paper wall when nothing exists at all. The site therefore runs with an empty `public/art`, with stills but no frames, or with everything; the static tier hangs one still per scene (the scene's first beat, or its fallback) and never a frame.

**Renderers** (`capabilities.ts` picks one; `?render=webgl|canvas|static` forces it, `?snap` disables the per-frame easing for screenshots):

- `webgl` — `painted/PaintedStory.tsx`. Default wherever WebGL is available and hardware-rendered, phones included. One program (`painted/shaders.ts`), one full-screen triangle (`painted/gl.ts`), two texture slots. Each frame it calls `frameAt(p, clipFrameCount)`, asks the two reels for `sourceFor(frame)` and uploads a texture only when the drawable behind a slot changed (`assign`: when A becomes what B was the slots swap instead of re-uploading; when both sides want the same picture slot 0 serves both). The fragment shader fits each picture — cover-fit around the focal point on landscape viewports; contain-fit on portrait viewports (`uFit`), with the surround filled by the same picture sampled at mip level 6 and darkened to 35 % as blurred ambient light, so the film is never cropped on phones — applies the drift, and blends A into B: the *pigment dissolve* (noise-field reveal, vertical streaks whose amplitude follows scroll velocity, coarse blocks at the edge, gold motes, a chromatic split), the *curtain* (a dark cloth with a gold rim drawn across from the right and pulled away; as it is pulled away it sends an outward ring through the picture it uncovers, and the gavel flash is applied after the cloth has cleared) or the *ripple* (a wave from the centre displacing the picture along its radius, a thinner ribbon trailing it, B following the wavefront outward past the corners). DPR is capped at 1.5; the loop eases progress toward the target (`dt/90`), redraws whenever the frame key (beats and frame indices) changes, idles at ~20fps at rest and sleeps when the stage is off screen; `set.focus()` tells the loader which beat is on screen. A compile or context failure calls `onFail` and the stage falls back to `canvas`.
- `canvas` — `painted/CanvasStory.tsx`. Used when WebGL is missing or software-rendered (SwiftShader/llvmpipe) or `navigator.connection.saveData` is on. Same film, same `frameAt`, same reels, drawn with `drawImage`: cover-fit on landscape, contain over a `blur(24px)` darkened copy on portrait; the dissolve is a cross-fade with a light vertical smear, the ripple a plain cross-fade, the curtain a wavy-edged dark shape with a gold stroke. DPR ≤ 2.
- `static` — `static/StaticStory.tsx`. `prefers-reduced-motion`. A plain editorial sequence: one `<img>` per scene from `artAssets()` with the captions, the map inline as SVG. Nothing moves, nothing runs per frame, no loader.

**Media in the browser (`painted/media.ts`).** `loadMedia({ small })` builds one `Reel` per beat: `asset` (the still or fallback still from `art.ts`), `clip` (null without frames), `sourceFor(frame)` → `{ image, width, height, focal }` — the nearest *loaded* frame to the one asked for, or the fallback still until the first frame has arrived (or the clip's own LQIP when there is no still at all) — `nearestLoaded(frame)`, and a `version` bumped whenever something drawable changed so renderers redraw. Loading order: the first still (its LQIP, then the file) before anything else so the loader can lift — `first` resolves then, or after 4 s; then the frames of the opening beat start and the remaining stills follow in story order. Frames load sequentially with at most four in flight, prioritised by `focus(beat)`: the beat on screen, the next, the previous, then the rest; a clip with more than three failed frames is left alone rather than hammered. Frames are plain `Image` elements kept in an array — the browser holds the compressed bytes — so the whole film is ≈21 MB of WebP fetched progressively, never all at once. `wantsSmallArt()` (viewport × DPR ≤ 1400) selects the 1100px stills and the 640px `sm/` frames.

**DOM layers** (`CinematicHome` composes them over the renderer): `TextOverlay.tsx` — every caption is always in the DOM, opacity/transform driven from the store, `aria-hidden` when faded; `style: "scrim"` gives a side caption the soft backdrop centred captions have, `style: "wordmark"` sets the closing title card large in the middle of the stage; `Annotations.tsx` — registration marks, leader lines and mono labels pinned to points on the picture (`ANNOTATIONS`), desktop only; a `smudge` annotation prints blurred, skewed and doubled by a ghost copy until `at + SMUDGE_FOR` and then snaps sharp (the Trade Marks glyph); `MapOverlay.tsx` — the vector map of India for the sapling beat, drawn from `india-outline.ts`, which follows the Survey of India boundary (the whole of Jammu & Kashmir and Ladakh, Arunachal Pradesh, both island groups; derived from Natural Earth's India point-of-view file and simplified) and must not be replaced by a generic atlas outline; `ConstellationOverlay.tsx` — in the upper-left of the stage during the constellation beat, nine gold stars appear one by one (0.895 → 0.915), ten hairlines join them into a balance (0.915 → 0.94), then the lines fade and the stars converge into a small glowing tree (0.94 → 0.952), desktop only; frame marks and the `01 / 10` beat counter (`FILM.length`); `Loader.tsx` (≈2.2s sequence, never blocks past 3.5s); `SoundToggle.tsx` + `sound.ts` (procedural Web Audio, nothing autoplays, one gavel impact fired once from the ScrollTrigger callback when progress crosses `GAVEL_STRIKE_AT`, re-armed when it drops 0.03 below). The stage element toggles `surface-lapis` / `paper` according to the tone of the beat on screen (`FILM[].tone`, switching at the midpoint of a transition) so every layer inherits the right colours; on phones a scrim in the surface colour sits under the captions.

**Artwork pipeline.** The repository stores URLs, not originals. `content/artwork/manifest.json` has `scenes` — each still's `id`, `source` URL and `focal` point (0–1 from the top-left; the point that must stay in frame when cover-fitting on landscape screens) — and `clips` — each clip's `id`, `source` mp4 URL, `fps` (default and current: 10), `reverse` (true only for the assembly, which was generated as the advocate dissolving into dust) and an optional `trim: [start, end]` in seconds. `content/artwork/prompts.json` keeps every still prompt (with `reference` where the `advocate` still was attached as an image reference) and the shared style sentence, every clip prompt (with `from`: the still it was generated from) and `clips_note` — Kling 3.0 on Higgsfield (`kling3_0`), std mode, sound off, 5 s, 16:9, about 6.25 credits per clip, pro mode needs a Plus plan; image-to-video with the still as `start_image`; every clip prompt opens with "Oil painting come to life, the painterly texture preserved throughout." and closes with "Static camera, no zoom, no text."; if Higgsfield answers with a preset recommendation, resubmit with `declined_preset_id`. `content/artwork/candidates.json` holds review-only URLs.

`scripts/fetch-artwork.mjs` does the conversion. Stills: download each `source`, sharp → `public/art/scenes/<id>.webp` (2000px, q82) and `<id>-sm.webp` (1100px, q78) plus a 24px LQIP; a still whose `source` is unchanged is skipped (a `focal`-only edit just rewrites the manifest). Clips: download the mp4 to a temp dir, `ffmpeg -vf fps=<fps>,scale='min(1200,iw)':-1[,reverse]` (with `-ss`/`-t` for `trim`) to PNG, then sharp → `public/art/film/<id>/f001.webp …` (q72, at most 1200px wide — 1176 × 780 as Kling delivers them), `sm/f001.webp …` (640px, q70), `sheet.jpg` (five 320px tiles at 0 / 25 / 50 / 75 / 100 % of the clip, for review) and a 24px LQIP of the first frame; the frames are written to a staging directory and renamed into place, a clip is re-extracted only when its `source`, `fps`, `reverse` or `trim` changed or its frames are missing, directories of clips no longer listed are deleted, and without ffmpeg on PATH the clips are skipped (existing frames kept) while the stills still run. The script writes `src/components/hero/art-manifest.json`: `scenes` (width, height, aspect, focal, lqip, source size) and `clips` (source, fps, frames, width, height, aspect, reverse, trim, lqip); the `clips` key appears only once at least one clip has frames, so the file is byte-identical on machines without ffmpeg. `art.ts` accepts `clips` as the map the script writes or as a list with `id` fields.

`.github/workflows/artwork.yml` ("Fetch artwork") runs on every push that touches `manifest.json`, `candidates.json`, the script or the workflow itself, on any branch, and can be dispatched by hand once it is on the default branch. It uses Node 22, installs only `sharp@0.34.3` (the site is not built there) and ffmpeg if the runner image lacks it, runs the script (with `WITH_CANDIDATES` for the review copies), and commits `public/art` and `art-manifest.json` back to the same branch (commit message "Artwork: fetch and convert scene stills"). At 10 fps a five-second clip is 50 frames; a clip directory is ≈2 MB including `sm/` and the sheet, ≈21 MB for the nine clips, committed to the repository. Locally, `node scripts/fetch-artwork.mjs` works after `npm install` because sharp ships with Next.js, and needs ffmpeg for the clips. Each still costs about 2 Higgsfield credits and each clip about 6.25 on the owner's basic plan — generate one at a time, review the contact sheet, never generate video for anything but these nine clips. The paintings and the clips are owned by the site owner's Higgsfield account and depict no real person or place.

## Design language (summary — see STORYBOARD.md for the homepage)

- Palette tokens (`src/app/globals.css`): lapis `lapis` #1b5ad6 · `lapis-2` · `lapis-3` #0f2f7c (deep lapis) · `lapis-4` (near-black blue) · gallery whites `paper` #f5f3ee · `ivory` · `vellum` · `paper-2` · darks `ink` #121418 · `charcoal` · `graphite` · `smoke` · `slate` · `ash` · light text for blue surfaces `parchment` · `bone` · gold leaf `bronze` #b08d3c / `bronze-2` #d9b653 / `bronze-dim` · crimson seal `seal` #b2271f / `seal-2`. Fonts: Cormorant Garamond (display), DM Sans (body), IBM Plex Mono (labels).
- Two surfaces: the page is `paper` by default (white, ink text); `surface-lapis` and `surface-deep` flip a section to blue with light text, gold accents and white hairlines. Every component is written for both; `.paper` re-asserts the light look inside a blue context.
- Type classes: `display-xl` `display-lg` `display-md` `display-sm` (Cormorant), `lede`, `eyebrow` / `eyebrow-muted` (mono, tracked caps), body is DM Sans.
- Components: `btn` — mono pill buttons (+ `btn-solid` `btn-seal` `btn-ghost` `btn-sm`), `chip`, `plate` (raised panel), `rule` / `rule-solid` (hairlines), `reg-mark` (crosshair registration mark) and `eyebrow-mark`, `frame-lines` (hairline page-margin lines), `prose-editorial`, `prose-ugc`, `grain` (film/paper texture on a `relative` parent), `vignette`, `engraved`, `link-underline`, `container-editorial` (max 84rem), `container-prose` (max 46rem).
- Rhythm: generous vertical space (`py-24 md:py-32` for sections), hairline rules between groups, eyebrow → headline → lede → body. Numbered "record" labels (`01`, `02`) in mono are a house motif.
- **Not** allowed: stock photography of gavels/scales/handshakes (the homepage paintings and clips are original generated artwork, not stock), corporate navy-and-grey palettes or gradient blues (the lapis is one flat painted ultramarine), heavy gold gradients, glassmorphism cards, rounded-blob SaaS layouts, emoji, generic icon grids, text baked into images.
- Microcopy (use sparingly): "Objection. That's a bad argument." · "Filed under: things worth reading." · "Counsel may proceed." · "Next issue." · "Back to the record." · "Proceed to the next matter." · "Nothing here yet. Start the argument." · "The next case note is probably being written."
