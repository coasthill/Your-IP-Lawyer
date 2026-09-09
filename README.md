# YourIPLawyer

The website of **Adv. Rohit Pradhan** — IP Litigation Lawyer, Delhi — at [youriplawyer.in](https://youriplawyer.in).

A cinematic, scroll-driven homepage; an editorial blog; a community forum with guest posting and moderation; article submissions; and a simple admin dashboard so that everything can be managed without touching code.

This README is written for a non-technical owner. Technical readers should also see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/STORYBOARD.md`](docs/STORYBOARD.md).

---

## Contents

1. [What the website is built with](#1-what-the-website-is-built-with)
2. [How to run it on your computer](#2-how-to-run-it-on-your-computer)
3. [How to deploy it (put it on the internet)](#3-how-to-deploy-it)
4. [How to add a blog post](#4-how-to-add-a-blog-post)
5. [How to edit an article](#5-how-to-edit-an-article)
6. [How to upload a PDF](#6-how-to-upload-a-pdf)
7. [How to moderate comments](#7-how-to-moderate-comments)
8. [How to create and manage forums](#8-how-to-create-and-manage-forums)
9. [How to change the contact email](#9-how-to-change-the-contact-email)
10. [How to change the About page](#10-how-to-change-the-about-page)
11. [How to replace the homepage artwork](#11-how-to-replace-the-homepage-artwork)
12. [How to update the domain](#12-how-to-update-the-domain)
13. [How to create an admin account](#13-how-to-create-an-admin-account)
14. [How to back up the database](#14-how-to-back-up-the-database)
15. [Anti-spam, moderation and security](#15-anti-spam-moderation-and-security)
16. [Demo content](#16-demo-content)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. What the website is built with

| Part | Technology | In plain words |
| --- | --- | --- |
| The website itself | **Next.js 16** (React, TypeScript) | A modern framework that renders pages fast and securely. |
| Look and feel | **Tailwind CSS** + custom design tokens | Colours, typography and spacing are defined in one place. |
| Homepage artwork | **A short painted film**: **nine Kling 3.0 clips** and **thirteen painted stills**, all generated with **Higgsfield**, prepared by a **GitHub Action** | Oil-painting scenes that move — the advocate assembling out of gold dust, the gown, the gavel, an orchard of rights, an idea splitting open, sculptors carving a column, a seal, a sapling, a constellation, water. A small robot on GitHub converts the stills to web sizes and cuts the clips into frames (section 11). |
| Homepage animation | One **WebGL shader**, **GSAP ScrollTrigger**, **Lenis** | The scroll scrubs the film: clips play frame by frame, paintings drift like a slow camera, and each scene ripples or dissolves into the next. There is no video player and no 3D library. Phones use the same shader and always see the whole picture, never a crop; a simpler cross-fade stands in where WebGL is missing; a still version is shown to people who prefer reduced motion. |
| Database | **PostgreSQL** (via Drizzle ORM) | Stores posts, comments, forum threads, submissions and uploaded-file records. For local use it runs an embedded copy automatically — nothing to install. |
| File storage | Local disk, **Vercel Blob**, or any **S3-compatible** bucket | Feature images and PDFs are stored here, never in the code repository. |
| Admin dashboard | Built in, at `/admin` | Password-protected. This is where you manage everything. |
| Anti-spam | Honeypot, rate limiting, duplicate detection, spam heuristics, optional Cloudflare Turnstile, moderation queue | Lets visitors comment and post without accounts, safely. |

Fonts (Cormorant Garamond, DM Sans, IBM Plex Mono) are bundled with the site; no external font service is used.

## 2. How to run it on your computer

You need **Node.js 20 or newer** (download from nodejs.org — choose the "LTS" version). Then open a terminal in the project folder and run:

```bash
npm install          # downloads the software the site depends on (first time only)
cp .env.example .env # creates your settings file (on Windows: copy .env.example .env)
npm run db:migrate   # prepares the database (an embedded one is created in ./.data — no setup needed)
npm run db:seed      # loads default categories and the demo articles/forum threads
npm run dev          # starts the site
```

Open **http://localhost:3000** for the website and **http://localhost:3000/admin** for the dashboard. The first time, `/admin/login` shows a one-time **Create the first admin account** form; fill it in and you are signed in (section 13 has the terminal alternative).

> **Note for local use:** the embedded database can only be opened by one program at a time. Stop the site (Ctrl+C) before running `npm run db:seed` or `npm run admin:create`, then start it again. (This does not apply when `DATABASE_URL` points at a real Postgres server.)

Other useful commands:

```bash
npm run build        # checks everything and builds the production version
npm start            # runs the production build
npm run typecheck    # checks the code for type errors
npm run lint         # checks the code for style problems
npm test             # runs the automated tests
npm run screenshots  # takes screenshots of key pages at desktop/tablet/mobile sizes (site must be running)
npm run e2e          # end-to-end smoke test of the real user journeys (site must be running; ADMIN_EMAIL / ADMIN_PASSWORD env vars)
```

## 3. How to deploy it

The simplest route is **Vercel** (the company behind Next.js) with a free **Neon** or **Supabase** Postgres database and **Vercel Blob** for uploads. All have free tiers suitable for a personal site.

1. Push this repository to GitHub.
2. Create a Postgres database at [neon.tech](https://neon.tech) (or Supabase). Copy its connection string (starts with `postgres://` or `postgresql://`).
3. On [vercel.com](https://vercel.com), click **Add New → Project**, import the GitHub repository. Framework is detected automatically.
4. In the project's **Settings → Environment Variables**, add (see `.env.example` for the full list):
   - `DATABASE_URL` — the Postgres connection string
   - `SESSION_SECRET` — a long random string (at least 32 characters; e.g. run `openssl rand -base64 48` or mash the keyboard)
   - `NEXT_PUBLIC_SITE_URL` — `https://youriplawyer.in`
   - `NEXT_PUBLIC_CONTACT_EMAIL` — your public email
   - `STORAGE_DRIVER` — `vercel-blob`
   - `BLOB_READ_WRITE_TOKEN` — create it under **Storage → Blob** in the Vercel project (Vercel adds it automatically when you connect a Blob store)
   - optionally `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (see section 15)
5. Click **Deploy**. The build runs the database migration automatically (`npm run build` = migrate + build).
6. Create your admin account (section 13) and load the default categories by running these once from your computer, pointed at the production database:
   ```bash
   DATABASE_URL="postgres://..." npm run db:seed
   DATABASE_URL="postgres://..." npm run admin:create -- --email you@example.com --name "Rohit Pradhan" --password "a-long-password"
   ```
   (`db:seed` also imports the demo articles — delete them from the dashboard when you no longer want them.)
7. Add your domain under **Settings → Domains** and follow Vercel's instructions at your domain registrar.

**Self-hosting (a VPS)** also works: set `DATABASE_URL` to your Postgres server, keep `STORAGE_DRIVER=local` (files go to `./uploads`), run `npm run build` then `npm start` behind a reverse proxy such as Caddy or Nginx with HTTPS.

## 4. How to add a blog post

1. Go to `/admin` and sign in.
2. Click **Posts → New post**.
3. Fill in:
   - **Title** — the headline. The web address (slug) is created from it automatically; you can edit it.
   - **Deck** — the one-sentence subtitle under the title (optional but recommended).
   - **Excerpt** — the short summary shown on cards. If left empty it is generated from the article.
   - **Category** — e.g. Trade Marks, Patents, Copyright, Designs, GI, IP Litigation, Arbitration, Dispute Resolution, Career, General.
   - **Tags** — comma-separated, e.g. `passing off, interim injunction`.
   - **Author** and **Author role**.
   - **Date** — the publication date shown to readers (defaults to now).
   - **Featured** — ticks this post as the lead article on the blog and homepage (only one at a time).
   - **Feature image** — upload a JPG/PNG/WebP, pick one from the Documents library, or paste an image URL. Always add **alt text** (a short description for screen readers and search engines).
   - **Body** — written in **Markdown**, a simple text format:
     ```
     ## A heading
     Some text with *italics* and **bold**.

     > A block quote.

     1. A numbered point
     2. Another

     A footnote reference[^1].

     [^1]: The footnote text.

     | Column A | Column B |
     | -------- | -------- |
     | cell     | cell     |
     ```
     Use the **Preview** button to see how it will look.
4. Choose **Status**: *Draft* (only you can see it) or *Published*.
5. Click **Save**. Published articles appear at `/blog/<slug>` immediately.

## 5. How to edit an article

`/admin → Posts → click the title → change anything → Save`. Use **Unpublish** to take an article offline without deleting it, and **Delete** to remove it permanently (comments are deleted with it).

## 6. How to upload a PDF

**To attach a PDF to an article:** open the article in `/admin → Posts`, scroll to **Attached documents**, choose the file, give it a label (e.g. "Full case note (PDF)") and click **Upload**. Readers get a preview, a download link and file details at the end of the article.

**To upload a PDF on its own** (to link from anywhere): `/admin → Documents → Upload`, then use **Copy URL**.

Accepted: PDF, Word (.doc/.docx) up to 25 MB; images (JPG, PNG, WebP, AVIF, GIF) up to 6 MB. Files are checked by their actual content, not just their name, and stored with safe random names. Where they are stored depends on `STORAGE_DRIVER` in your settings (section 3).

## 7. How to moderate comments

`/admin → Comments`. Tabs show **Pending**, **Approved**, **Hidden**, **Spam** and **All**. For each comment you can **Approve**, **Hide**, mark as **Spam** or **Delete**. Readers can also **Report** a comment; reports appear in `/admin → Forum → Reports` and raise the comment's report count.

Which comments wait for approval is controlled by `MODERATION_MODE` in your settings:

- `auto` (default) — clean comments appear immediately; anything with links, profanity, shouting or spam-like phrases waits for you.
- `manual` — every comment waits for you.

## 8. How to create and manage forums

**Visitors** create discussions at `/forum/new` (no account needed; they may post as "Guest Contributor"). New discussions follow the same moderation rules as comments.

**You** manage them at `/admin → Forum`:

- **Threads** tab — approve, hide, mark spam, delete, **pin** (keeps it at the top) or **lock** (no new replies).
- **Replies** tab — the same actions for replies.
- **Reports** — what visitors flagged; click **Resolve** when handled.
- **New discussion** — start a thread yourself (for example a welcome thread or a question of the week).

Forum categories are the same as blog categories (`/admin → Categories`); a category's **scope** decides whether it appears in the blog, the forum, or both.

## 9. How to change the contact email

The email address appears in the footer, the Contact page, the mobile menu and the submission guidelines. It is set in **one place**: the environment variable `NEXT_PUBLIC_CONTACT_EMAIL` (in `.env` locally, or in Vercel → Settings → Environment Variables). Change it and redeploy. Optionally set `NEXT_PUBLIC_SUBMISSIONS_EMAIL` for a separate submissions inbox.

Never write the email address directly into the code — it comes from `src/config/site.ts`, which reads that variable.

## 10. How to change the About page

Open `src/app/(site)/about/page.tsx` and edit the text between the tags (it is ordinary prose inside the page). The name, title and location shown across the site come from `src/config/site.ts` (`author.name`, `author.title`, `author.location`, `author.bio`). Keep it factual — the site deliberately makes no claims about awards, rankings, clients or cases.

## 11. How to replace the homepage artwork

The homepage is a short **film** in the style of an oil painting — ten scenes, or *beats*, that the visitor scrubs through by scrolling. Seven beats are **clips** (five-second videos made with Kling on Higgsfield, cut into frames by the robot and played by the scroll), three are **paintings** under a slow camera drift, and each beat ripples or dissolves into the next. Every clip was generated *from* one of the paintings, so the two sets match. Each painting and each clip has a short name (its `id`) that is used everywhere:

| # | Beat | What you see | Clip `id` | Painting `id` |
| --- | --- | --- | --- | --- |
| 1 | Assembly | the advocate assembles out of gold dust in front of the blue wall | `assembly` — made as "dissolves into dust" and played backwards | `advocate` |
| 2 | The gown fills | the black silk billows; gold emblems surface in the folds and sink back | `gown-fills` | `gown` |
| 3 | The strike | the gavel hangs a beat too long, then strikes | `strike` | `gavel` |
| 4 | The orchard | a tree whose fruit are the emblems of IP (a painting with camera drift) | — | `orchard` |
| 5 | The disclosure | a glowing idea in cupped hands splits open to reveal a drawing | `disclosure` | `idea` |
| 6 | The structure | sculptors carve a column crowned with the scales of justice (a painting with camera drift) | — | `structure` |
| 7 | The certificate | the seal is lifted, hesitates, and is stamped a second time | `certificate` | `trademark` |
| 8 | The sapling | the advocate stands like a statue while a sapling grows beside him | `sapling` | `statue` |
| 9 | The constellation | the advocate walks toward the window while nine gold stars form the scales of justice and fold into a tree (drawn by the site, not painted) | — | `legal-world` |
| 10 | Water | a second figure waters the tree; the film ends on the YourIPLawyer wordmark | `water` | `water-still` |

Three older paintings — `patent` (the brass mechanism), `design` (the vase) and `gi` (the still life) — stay in the set as **stand-ins**: if a clip's frames are ever missing (the robot has not run yet, or its run failed) the site shows a painting in that beat instead, so the homepage never breaks. The stand-ins are `advocate` for the assembly, `gown` for the gown, `gavel` for the strike, `patent` for the disclosure, `trademark` for the certificate, `gi` for the sapling and `water-still` for the water. Two more clips, `orchard` and `structure`, are cut and committed but not played yet — those beats show their paintings for now (switching a beat to its clip is a one-line change in `story.ts`; ask for it when you want it).

**Where things live**

- `content/artwork/manifest.json` — the list of the thirteen paintings (`scenes`: `id`, `source`, `focal`) and the nine clips (`clips`: `id`, `source` — the web address of the video — `fps`, always 10, and `reverse`). **This is the only file you edit to change a painting or a clip.**
- `content/artwork/prompts.json` — the exact prompt used for every painting and every clip, the shared *style sentence* that makes the paintings look like one set, and a `clips_note` with the video settings.
- `public/art/scenes/` — the converted paintings the site shows (`<id>.webp` for desktops, `<id>-sm.webp` for phones). Never edit these by hand; a robot makes them.
- `public/art/film/<id>/` — one folder per clip: its frames (`f001.webp` … `f050.webp`), a `sm/` folder with phone-sized copies, and `sheet.jpg`, a strip of five frames for checking the clip at a glance. Also made by the robot.
- `src/components/hero/art-manifest.json` — sizes, focal points, frame counts and tiny blurred placeholders. Also written by the robot.
- `src/components/hero/story.ts` — the words and the timing: captions, the order of beats, which clip or painting each beat shows, which transition plays between them, and when the gavel lands. Change the text there and every version of the homepage updates.
- `src/app/opengraph-image.tsx` — the social sharing image (separate from the artwork).

**A word about credits before you generate anything.** The account is on the basic Higgsfield plan. A painting costs about **2 credits** (GPT Image 2, 3:2, 2K, medium quality). A clip costs about **6.25 credits** (Kling 3.0, model `kling3_0`, *std* mode, sound off, 5 seconds, 16:9) — three paintings' worth — and the *pro* mode needs a Plus plan. Generate **one thing at a time**, look at it, and only then decide whether to try again. **Never generate video for anything other than these nine clips** — no other page uses video, and a few unnecessary clips can empty the account.

**To replace one painting**

1. Open `content/artwork/prompts.json`, find the painting under `scenes` and copy its prompt. Keep the style sentence and the "no text" sentence exactly as they are — they are what keep the paintings matching. If you write a new prompt, paste it back into `prompts.json` so the picture can be made again later.
2. In Higgsfield choose **Image → GPT Image 2**, aspect ratio **3:2**, resolution **2K**, medium quality, paste the prompt and generate **one** still. The paintings that show the advocate again (`legal-world`, `statue`, `water-still`) were made with the `advocate` painting attached as an *image reference* so the same man appears in all of them — do the same if you redo one of them, and if you replace `advocate`, redo those three afterwards.
3. When you are happy with a picture, open it in your Higgsfield **library** and **copy the image URL** (a long address ending in `.png`).
4. On GitHub, open `content/artwork/manifest.json`, click the pencil to edit (the web editor is enough — nothing needs to be installed), and paste the address as the `source` of that painting. Leave the `id` alone.
   - Optionally change `focal`: two numbers between 0 and 1, measured from the **top-left** corner (`[0, 0]` is top-left, `[1, 1]` bottom-right, `[0.5, 0.5]` the centre). It marks the point that must stay in frame when the picture is cropped on wide screens — the figure's shoulders, the gavel head, the seal. (Phones show the whole picture and never crop it.) Changing only `focal` is free: nothing is downloaded again.
5. Click **Commit changes**.
6. Open the **Actions** tab. The workflow **"Fetch artwork"** starts by itself whenever `manifest.json` changes, on any branch. Wait for the green tick (a minute or two). It downloads the picture, converts it to the two web sizes, updates `art-manifest.json` and **commits the result on the same branch** with the message "Artwork: fetch and convert scene stills". You do not need to commit anything else.
7. The site shows the new painting on the next deploy. Vercel deploys the robot's commit automatically; if it does not, redeploy from the Vercel dashboard.
8. If the painting is the start image of a clip (the last column of the table), the clip still shows the old picture. Regenerate the clip from the new painting too (next list), or the beat will jump from one picture to another.

**To replace one clip**

1. Open `content/artwork/prompts.json`, find the clip under `clips` and copy its prompt. Every clip prompt begins with *"Oil painting come to life, the painterly texture preserved throughout."* and ends with *"Static camera, no zoom, no text."* — keep both sentences; they keep the clips looking like the paintings. Its `from` field names the painting the clip starts from.
2. In Higgsfield choose **Video → Kling 3.0** (`kling3_0`), mode **std**, **5 seconds**, **16:9**, sound **off**, and make it an *image-to-video* job with that painting as the **start image** (`start_image`) — that is how the clip matches the painting. Paste the prompt and generate **one** clip. If Higgsfield answers with a *preset recommendation* instead of starting the job, resubmit with the preset declined (`declined_preset_id`).
3. Watch the result. The strike clip must show the gavel clearly coming down; the certificate clip must stamp twice; the assembly clip should show the advocate **dissolving into dust** — the site plays it backwards so that he assembles.
4. In your Higgsfield **library**, **copy the video URL** (a long address ending in `.mp4`).
5. On GitHub, open `content/artwork/manifest.json`, find the clip under `clips` and paste the address as its `source`. Leave the `id` alone and keep `"fps": 10`. Set `"reverse": true` **only** on the assembly clip (that is the backwards trick); every other clip has `"reverse": false`.
6. **Commit changes** and wait for the **Fetch artwork** run (cutting a clip takes a few minutes longer than converting a painting). The robot downloads the video, cuts it into 50 frames plus phone-sized copies, writes the contact sheet, updates `art-manifest.json` and commits the lot on the same branch.
7. Look at the contact sheet: open `public/art/film/<id>/sheet.jpg` on GitHub. It shows five frames of the clip *as the site will play it* — start, quarter, half, three-quarters, end. For the assembly clip the sheet should read left to right as dust → advocate. If it reads wrong, fix the prompt or the `reverse` flag and go again.
8. Redeploy (or wait for Vercel's automatic deploy of the robot's commit).

**The gavel's timing.** The film pins the moment of impact to a fixed point of the scroll (`GAVEL_STRIKE_AT` in `story.ts` — the flash and the sound happen there, and the caption reads just after it). For that to work the strike beat records *where in the clip* the gavel lands: the `keyframes` on the `strike` beat in `story.ts`, currently `0.68` (68 % of the way through the clip). A new strike clip will land at a different moment. Find the frame where the gavel hits (in `public/art/film/strike/` — 50 frames make 5 seconds, ten per second), divide its number by 50, and ask for that number to be put into the keyframe. Everything else about a clip needs no code change.

**If the workflow fails** (a red cross in the Actions tab): open the run and read the log. Nine times out of ten the cause is a bad URL — a `404` or `403` in the log means the address was copied incompletely or has expired. Fix the `source` in `manifest.json` and commit again. A message about `ffmpeg` means the video could not be cut — usually the address is not a direct link to the `.mp4`. Nothing is broken on the live site in the meantime: the old pictures and frames stay until a run succeeds. If the log complains about `sharp` or Node rather than a URL, something else changed in the repository — ask for help rather than re-running.

**Other things worth knowing**

- **Running the workflow by hand:** Actions tab → **Fetch artwork** → **Run workflow** (the button appears once the workflow file is on the default branch). Its "candidates" box also converts the addresses in `content/artwork/candidates.json` into small review copies under `public/art/candidates/` — a way to compare a few tries side by side without touching the live scenes. Delete candidates once you have chosen.
- **Running it on your computer:** after `npm install`, run `node scripts/fetch-artwork.mjs` (the image tool it needs, `sharp`, is already installed with the site). Paintings need nothing else; cutting clips needs **ffmpeg** installed on your computer — without it the clips are skipped with a message and only the paintings are converted. It writes the same files; commit them yourself.
- **Size:** the frames are committed to the repository by the workflow — about **2 MB per clip** (50 frames, the phone copies and the sheet), about 21 MB for all nine — and every replacement adds another copy to the repository's history. That is fine at this scale; it is one more reason not to generate clips you do not need.
- **Going back:** everything is versioned. Revert the robot's commit (or your manifest change) and the previous painting or clip returns.
- **Ownership:** the paintings and the clips are AI-generated artwork owned by the site owner's Higgsfield account. They depict no real person and no real place.

## 12. How to update the domain

Set `NEXT_PUBLIC_SITE_URL` to the new address (e.g. `https://youriplawyer.in`) in your environment variables and redeploy. This updates canonical links, the sitemap, robots.txt, Open Graph tags and structured data everywhere. Then point the domain at your host (Vercel → Settings → Domains).

## 13. How to create an admin account

**The easy way:** when no admin account exists yet, `/admin/login` shows a one-time **"Create the first admin account"** form. Fill in your name, email and a password (at least 12 characters with a letter and a number) and you are signed in. The form disappears as soon as an account exists.

**From a terminal** in the project folder:

```bash
npm run admin:create -- --email you@example.com --name "Rohit Pradhan" --password "at-least-12-characters-with-a-number-1"
```

Running it again with the same email **resets the password**. For the live site, run the same command with `DATABASE_URL="postgres://..."` in front of it so it reaches the production database, or add another admin from `/admin → Users` once you are signed in.

Passwords are stored as scrypt hashes (never in plain text). Sign-in is rate-limited. Sessions live in a secure httpOnly cookie and expire after 30 days; **Sign out** ends them immediately.

## 14. How to back up the database

- **Neon / Supabase:** both keep automatic backups; you can also download a copy from their dashboards.
- **Any Postgres:** `pg_dump "$DATABASE_URL" > backup-$(date +%F).sql` and restore with `psql "$DATABASE_URL" < backup.sql`.
- **Local embedded database:** copy the folder `./.data/pglite` somewhere safe (stop the site first).
- **Uploaded files:** with `STORAGE_DRIVER=local`, back up the `./uploads` folder too. Vercel Blob / S3 keep files independently of the database.

## 15. Anti-spam, moderation and security

- Guest comments, forum posts and submissions pass through: an invisible honeypot field (bots fill it, humans do not), per-visitor rate limits, duplicate detection, a spam score (links, blocked phrases, profanity, shouting), optional **Cloudflare Turnstile** (a privacy-friendly CAPTCHA — free at dash.cloudflare.com → Turnstile; put the site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the secret in `TURNSTILE_SECRET_KEY`), and the moderation queue.
- Visitor email addresses are never shown publicly. IP addresses are stored only as one-way hashes.
- Visitors cannot post HTML; text is rendered safely (paragraphs, links marked `nofollow ugc`, **bold**, _italic_, quotes).
- Uploads are validated by content (magic bytes), size-limited, renamed, and served with safe headers.
- The admin area requires sign-in for every page and every action; forms are protected against cross-site request forgery.
- Security headers (no framing, no MIME sniffing, strict referrer policy, HSTS) are sent on every page.

## 16. Demo content

`npm run db:seed` imports the articles in `content/demo-posts/*.md` and the threads in `content/demo-forum.json`. They are labelled **Demo content** on the site and are not legal advice. Delete them from `/admin` whenever you like. You can also drop your own `.md` files into `content/demo-posts` and re-run the seed to import them (existing slugs are skipped; use `npm run db:seed -- --reset-demo` to re-import).

**The homepage paintings and clips are not demo content.** The thirteen stills in `public/art/scenes/` and the nine clips cut into frames under `public/art/film/` are AI-generated artwork made with Higgsfield (GPT Image 2 for the stills, Kling 3.0 for the clips) from the prompts in `content/artwork/prompts.json`, and they belong to the site owner's Higgsfield account. They show a generic advocate seen from behind, a second generic figure who waters the tree, and sculptors at work — no likeness of any real person — and no real place. Section 11 explains how to replace them.

## 17. Troubleshooting

- **"Cannot sign in"** — create an account (section 13). Five wrong attempts pause sign-in for 15 minutes.
- **Uploads fail on Vercel** — set `STORAGE_DRIVER=vercel-blob` and connect a Blob store; the `local` driver cannot write to Vercel's read-only filesystem.
- **Images from another site do not display** — add their hostname to `NEXT_PUBLIC_IMAGE_HOSTS` (comma separated).
- **The homepage shows a plain cross-fade (or the still version) on my laptop** — the site uses the WebGL version wherever WebGL works and is not software-rendered; add `?render=webgl` to the address to force it, `?render=canvas` for the 2D cross-fade, `?render=static` for the still version. (`&snap` additionally removes the scroll easing, which is useful for screenshots.)
- **Start over locally** — stop the site, delete the `.data` folder, then run `npm run db:migrate && npm run db:seed` again.

---

*The material published on YourIPLawyer is intended for general informational and educational purposes and does not constitute legal advice or create a lawyer–client relationship. Views expressed by forum participants are their own.*
