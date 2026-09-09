# YourIPLawyer — Technical Architecture

This document is the contract every part of the codebase follows. Read it before adding code.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, React 19, TypeScript, Turbopack) | Server components + server actions give us a real backend without a separate API server. |
| Styling | **Tailwind CSS v4** + design tokens in `src/app/globals.css` | Utilities for layout, hand-written component classes for the editorial look. |
| Fonts | Self-hosted via `next/font/local` (`src/app/fonts.ts`) | No runtime request to Google; zero layout shift. Cormorant Garamond (display), DM Sans (body), IBM Plex Mono (labels). |
| Homepage | Eight **painted stills** (`public/art/scenes`) drawn by a **hand-written WebGL shader** (`src/components/hero/painted`), **GSAP ScrollTrigger**, **Lenis** | Scroll-driven cinematic homepage without a 3D library: one fragment shader dissolves one painting into the next. A 2D canvas cross-fade and a static composition are the fallbacks. |
| Artwork pipeline | `content/artwork/*.json` → `scripts/fetch-artwork.mjs` (**sharp**) → the **Fetch artwork** GitHub Action (`.github/workflows/artwork.yml`) | The stills are generated in Higgsfield (GPT Image 2); the repository only ever stores URLs and the converted WebP files the Action commits. |
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
      story.ts                 the timeline: SCENES, ART, TRANSITIONS, ANNOTATIONS, GAVEL_STRIKE_AT, STAGE_HEIGHT_VH
      art.ts art-manifest.json paintings resolved to files (the manifest is written by scripts/fetch-artwork.mjs)
      capabilities.ts          renderer tier detection (webgl | canvas | static), DPR cap, small-art switch
      progress-store.ts        scroll progress shared by every layer
      CinematicHome.tsx        the pinned stage: ScrollTrigger → progress, surface switching, layer composition
      painted/                 PaintedStory.tsx (WebGL), CanvasStory.tsx (2D fallback), shaders.ts, gl.ts, paintings.ts
      static/                  StaticStory.tsx — reduced-motion editorial composition
      TextOverlay Annotations MapOverlay Loader SoundToggle sound.ts india-outline.ts   DOM layers
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
content/artwork/               manifest.json (scene id, source URL, focal point), prompts.json, candidates.json
public/art/scenes/             <id>.webp (2000px) and <id>-sm.webp (1100px) — written by the Fetch artwork workflow
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

The homepage is eight painted stills — neoclassical oil-painting-style images generated with Higgsfield (GPT Image 2, 3:2, 2K) — dissolving into one another under scroll. There is no 3D, no model file and no scene graph; the whole picture is one fragment shader sampling two textures. STORYBOARD.md describes what is on screen; this section describes the machinery.

**Data flow.** `CinematicHome.tsx` pins a full-viewport stage inside a tall scroll container (`STAGE_HEIGHT_VH`) and a GSAP ScrollTrigger (`scrub: 0.6`) writes 0–1 progress into `progress-store.ts`. Nothing scroll-jacks. Every consumer — the renderer, captions, annotations, the map, the frame marks, the surface switch, the sound engine — subscribes to that store and updates the DOM directly; no React state changes per frame. `story.ts` is the single source of truth: `SCENES` (ranges and captions), `ART` (asset id, drift and tone per scene), `TRANSITIONS` (where and how one painting becomes the next: `dissolve` or `curtain`), `ANNOTATIONS`, `GAVEL_STRIKE_AT` and `STAGE_HEIGHT_VH`. `frameAt(p)` resolves progress into `{ a, b, mix, kind, driftA, driftB }` and every renderer draws exactly that.

**Renderers** (`capabilities.ts` picks one; `?render=webgl|canvas|static` forces it, `?snap` disables the per-frame easing for screenshots):

- `webgl` — `painted/PaintedStory.tsx`. Default wherever WebGL is available and hardware-rendered, phones included. One program (`painted/shaders.ts`), one full-screen triangle (`painted/gl.ts`), two textures. The fragment shader cover-fits each painting to the viewport around its focal point, applies the scene's drift (a small zoom and pan), and blends A into B: the *pigment dissolve* (noise-field reveal, vertical streaks whose amplitude follows scroll velocity, coarse blocks at the edge, gold motes, a chromatic split) or the *curtain* (a dark cloth with a gold rim drawn across the frame; the gavel flash is applied under it). DPR is capped at 1.5; the loop eases progress toward the target (`dt/90`), idles at ~20fps when at rest and sleeps when the stage is off screen. A compile or context failure calls `onFail` and the stage falls back to `canvas`.
- `canvas` — `painted/CanvasStory.tsx`. Used when WebGL is missing or software-rendered (SwiftShader/llvmpipe) or `navigator.connection.saveData` is on. Same paintings, same `frameAt`, drawn with `drawImage` as a cross-fade with a light vertical smear; the curtain is a wavy-edged dark shape with a gold stroke.
- `static` — `static/StaticStory.tsx`. `prefers-reduced-motion`. A plain editorial sequence: the paintings as `<img>` elements with the eight captions, the map inline as SVG. Nothing moves, nothing runs per frame, no loader.

**Paintings in the browser.** `art.ts` maps `ART` to files using `art-manifest.json` (width, height, focal point, LQIP data URI per asset); a scene without artwork gets a painted placeholder so the site always runs. `painted/paintings.ts` loads progressively — placeholder first, then the first painting, then the rest in story order — and reports `version` bumps so textures are re-uploaded only when something changed. `wantsSmallArt()` (viewport × DPR ≤ 1400) selects the 1100px files.

**DOM layers** (`CinematicHome` composes them over the renderer): `TextOverlay.tsx` — every caption is always in the DOM, opacity/transform driven from the store, `aria-hidden` when faded; `Annotations.tsx` — registration marks, leader lines and mono labels pinned to points on the paintings (`ANNOTATIONS`), desktop only; `MapOverlay.tsx` — the vector map of India for the GI scene, drawn from `india-outline.ts`, which follows the Survey of India boundary (the whole of Jammu & Kashmir and Ladakh, Arunachal Pradesh, both island groups; derived from Natural Earth's India point-of-view file and simplified) and must not be replaced by a generic atlas outline; frame marks and the `01 / 08` scene counter; `Loader.tsx` (≈2.2s sequence, never blocks past 3.5s); `SoundToggle.tsx` + `sound.ts` (procedural Web Audio, nothing autoplays, one gavel impact fired once from the ScrollTrigger callback). The stage element toggles `surface-lapis` / `paper` according to the tone of the painting on screen (`ART[].tone`, switching at the midpoint of a transition) so every layer inherits the right colours; on phones a scrim in the surface colour sits under the captions.

**Artwork pipeline.** The repository stores URLs, not originals. `content/artwork/manifest.json` lists each scene's `id`, `source` URL and `focal` point (0–1 from the top-left; the point that must stay in frame when cover-fitting on phones); `content/artwork/prompts.json` keeps every prompt plus the shared style sentence so a still can be regenerated; `content/artwork/candidates.json` holds review-only URLs. `scripts/fetch-artwork.mjs` downloads each `source`, converts it with sharp to `public/art/scenes/<id>.webp` (2000px, q82) and `<id>-sm.webp` (1100px, q78), writes `src/components/hero/art-manifest.json` (sizes, aspect, focal point, a 24px LQIP), and skips scenes whose `source` is unchanged (a `focal`-only edit just rewrites the manifest). `.github/workflows/artwork.yml` ("Fetch artwork") runs it on every push that touches the manifests, on any branch, and can be dispatched by hand once it is on the default branch; it installs only sharp (the site is not built there) and commits `public/art` and `art-manifest.json` back to the same branch. Locally, `node scripts/fetch-artwork.mjs` works after `npm install` because sharp ships with Next.js. Each still costs about 2 Higgsfield credits on the owner's basic plan — generate one at a time, never video. The generated paintings are owned by the site owner's Higgsfield account and depict no real person or place.

## Design language (summary — see STORYBOARD.md for the homepage)

- Palette tokens (`src/app/globals.css`): lapis `lapis` #1b5ad6 · `lapis-2` · `lapis-3` #0f2f7c (deep lapis) · `lapis-4` (near-black blue) · gallery whites `paper` #f5f3ee · `ivory` · `vellum` · `paper-2` · darks `ink` #121418 · `charcoal` · `graphite` · `smoke` · `slate` · `ash` · light text for blue surfaces `parchment` · `bone` · gold leaf `bronze` #b08d3c / `bronze-2` #d9b653 / `bronze-dim` · crimson seal `seal` #b2271f / `seal-2`. Fonts: Cormorant Garamond (display), DM Sans (body), IBM Plex Mono (labels).
- Two surfaces: the page is `paper` by default (white, ink text); `surface-lapis` and `surface-deep` flip a section to blue with light text, gold accents and white hairlines. Every component is written for both; `.paper` re-asserts the light look inside a blue context.
- Type classes: `display-xl` `display-lg` `display-md` `display-sm` (Cormorant), `lede`, `eyebrow` / `eyebrow-muted` (mono, tracked caps), body is DM Sans.
- Components: `btn` — mono pill buttons (+ `btn-solid` `btn-seal` `btn-ghost` `btn-sm`), `chip`, `plate` (raised panel), `rule` / `rule-solid` (hairlines), `reg-mark` (crosshair registration mark) and `eyebrow-mark`, `frame-lines` (hairline page-margin lines), `prose-editorial`, `prose-ugc`, `grain` (film/paper texture on a `relative` parent), `vignette`, `engraved`, `link-underline`, `container-editorial` (max 84rem), `container-prose` (max 46rem).
- Rhythm: generous vertical space (`py-24 md:py-32` for sections), hairline rules between groups, eyebrow → headline → lede → body. Numbered "record" labels (`01`, `02`) in mono are a house motif.
- **Not** allowed: stock photography of gavels/scales/handshakes (the homepage paintings are original generated artwork, not stock), corporate navy-and-grey palettes or gradient blues (the lapis is one flat painted ultramarine), heavy gold gradients, glassmorphism cards, rounded-blob SaaS layouts, emoji, generic icon grids, text baked into images.
- Microcopy (use sparingly): "Objection. That's a bad argument." · "Filed under: things worth reading." · "Counsel may proceed." · "Next issue." · "Back to the record." · "Proceed to the next matter." · "Nothing here yet. Start the argument." · "The next case note is probably being written."
