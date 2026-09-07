/**
 * Seeds default categories, demo blog posts (from ./content/demo-posts/*.md) and a few demo forum threads.
 * Safe to run more than once: existing slugs are skipped.
 *
 *   npm run db:seed
 *   npm run db:seed -- --reset-demo   (re-imports demo posts from the markdown files)
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./env";
loadEnv();

type FrontMatter = Record<string, string>;

function parseFrontMatter(raw: string): { data: FrontMatter; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: FrontMatter = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    data[key] = value;
  }
  return { data, body: m[2] };
}

async function main() {
  const reset = process.argv.includes("--reset-demo");
  const { getDb, schema } = await import("../src/db/client");
  const { eq } = await import("drizzle-orm");
  const db = await getDb();

  // Categories -----------------------------------------------------------
  const { DEFAULT_CATEGORIES } = await import("../src/server/taxonomy");
  const existingCats = await db.select().from(schema.categories);
  const have = new Set(existingCats.map((c) => c.slug));
  const missing = DEFAULT_CATEGORIES.filter((c) => !have.has(c.slug));
  if (missing.length) {
    await db.insert(schema.categories).values(missing.map((c) => ({ ...c, sortOrder: DEFAULT_CATEGORIES.findIndex((d) => d.slug === c.slug) })));
  }
  const cats = await db.select().from(schema.categories);
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));
  console.log(`✔ Categories ready (${cats.length})`);

  // Demo posts -----------------------------------------------------------
  const { savePost } = await import("../src/server/posts");
  const dir = path.join(process.cwd(), "content", "demo-posts");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort() : [];
  let imported = 0;
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data, body } = parseFrontMatter(raw);
    const slug = data.slug || file.replace(/\.md$/, "");
    const [existing] = await db.select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.slug, slug)).limit(1);
    if (existing && !reset) continue;
    await savePost({
      id: existing?.id,
      slug,
      title: data.title || slug,
      deck: data.deck || null,
      excerpt: data.excerpt || "",
      bodyMd: body.trim(),
      categoryId: catBySlug.get(data.category || "")?.id ?? null,
      authorName: data.author || "Adv. Rohit Pradhan",
      authorRole: data.authorRole || "IP Litigation Lawyer, Delhi",
      status: "published",
      publishedAt: data.date ? new Date(data.date) : new Date(),
      featured: data.featured === "true",
      isDemo: data.demo !== "false",
      heroImageUrl: data.heroImage || null,
      heroImageAlt: data.heroImageAlt || null,
      tags: data.tags || "",
    });
    imported++;
  }
  console.log(`✔ Demo posts imported: ${imported} (${files.length} files found)`);

  // Demo forum threads ---------------------------------------------------
  const { createThreadAsAdmin } = await import("../src/server/forum");
  const threadsFile = path.join(process.cwd(), "content", "demo-forum.json");
  if (fs.existsSync(threadsFile)) {
    const threads = JSON.parse(fs.readFileSync(threadsFile, "utf8")) as Array<{
      title: string;
      body: string;
      category: string;
      tags?: string[];
      author?: string;
      pinned?: boolean;
      replies?: Array<{ author: string; body: string }>;
    }>;
    let created = 0;
    for (const t of threads) {
      const slugGuess = t.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const [existing] = await db.select({ id: schema.forumThreads.id }).from(schema.forumThreads).where(eq(schema.forumThreads.slug, slugGuess)).limit(1);
      if (existing) continue;
      const thread = await createThreadAsAdmin({
        title: t.title,
        body: t.body,
        categoryId: catBySlug.get(t.category)?.id ?? null,
        tags: t.tags,
        authorName: t.author || "Guest Contributor",
        pinned: t.pinned,
      });
      if (t.replies?.length) {
        await db.insert(schema.forumReplies).values(t.replies.map((r) => ({ threadId: thread.id, authorName: r.author, body: r.body, status: "approved" })));
        await db.update(schema.forumThreads).set({ replyCount: t.replies.length, lastActivityAt: new Date() }).where(eq(schema.forumThreads.id, thread.id));
      }
      created++;
    }
    console.log(`✔ Demo forum threads created: ${created}`);
  }

  console.log("✔ Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("✖ Seed failed:", err);
  process.exit(1);
});
