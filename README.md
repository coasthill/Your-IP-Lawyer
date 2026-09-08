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
| Homepage animation | **Three.js**, **React Three Fiber**, **GSAP ScrollTrigger**, **Lenis** | 3D graphics on desktop; a lighter 2D version on phones; a still version for people who prefer reduced motion. |
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

The homepage figure is an original, generic advocate drawn in code (no photograph), so there is nothing to license and nothing to leak. If you later want a custom portrait or generated artwork:

- **Desktop (3D):** the figure lives in `src/components/hero/webgl/figure/`. A textured plane or a 3D model can replace the procedural figure there; the gown, lights and camera keep working.
- **Phones / no WebGL:** the 2D version is in `src/components/hero/canvas/`.
- **Reduced motion / no animation:** the still composition is in `src/components/hero/static/`.
- **Text of the story** (captions, order, timing of every scene): `src/components/hero/story.ts` — change the words there and every version updates.
- **Social sharing image:** `src/app/opengraph-image.tsx`.

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

## 17. Troubleshooting

- **"Cannot sign in"** — create an account (section 13). Five wrong attempts pause sign-in for 15 minutes.
- **Uploads fail on Vercel** — set `STORAGE_DRIVER=vercel-blob` and connect a Blob store; the `local` driver cannot write to Vercel's read-only filesystem.
- **Images from another site do not display** — add their hostname to `NEXT_PUBLIC_IMAGE_HOSTS` (comma separated).
- **The homepage shows the 2D version on my laptop** — the site chooses the 3D version only on capable devices; add `?render=webgl` to the address to force it, `?render=canvas` for the 2D version, `?render=static` for the still version. (`&snap` additionally removes the scroll easing, which is useful for screenshots.)
- **Start over locally** — stop the site, delete the `.data` folder, then run `npm run db:migrate && npm run db:seed` again.

---

*The material published on YourIPLawyer is intended for general informational and educational purposes and does not constitute legal advice or create a lawyer–client relationship. Views expressed by forum participants are their own.*
