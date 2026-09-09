import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { Category, ForumReply, ForumThread, Tag } from "@/db/schema";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { getRequestMeta } from "@/lib/security/request";
import { cleanLine, cleanText, isValidEmail } from "@/lib/security/sanitize";
import { contentFingerprint, decideStatus, spamScore } from "@/lib/security/spam";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { slugify } from "@/lib/utils";
import { ensureTags } from "./taxonomy";

export type ThreadPublic = Omit<ForumThread, "authorEmail" | "ipHash"> & { category: Category | null; tags: Tag[] };
export type ReplyPublic = Omit<ForumReply, "authorEmail" | "ipHash"> & { replies: ReplyPublic[] };

function stripThread(t: ForumThread) {
  const { authorEmail: _e, ipHash: _i, ...pub } = t;
  void _e;
  void _i;
  return pub;
}

async function hydrateThreads(rows: ForumThread[]): Promise<ThreadPublic[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  const catIds = Array.from(new Set(rows.map((r) => r.categoryId).filter((v): v is string => Boolean(v))));
  const [cats, tagRows] = await Promise.all([
    catIds.length ? db.select().from(schema.categories).where(inArray(schema.categories.id, catIds)) : Promise.resolve([]),
    db
      .select({ threadId: schema.forumThreadTags.threadId, tag: schema.tags })
      .from(schema.forumThreadTags)
      .innerJoin(schema.tags, eq(schema.forumThreadTags.tagId, schema.tags.id))
      .where(inArray(schema.forumThreadTags.threadId, ids)),
  ]);
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const tagMap = new Map<string, Tag[]>();
  for (const r of tagRows) tagMap.set(r.threadId, [...(tagMap.get(r.threadId) ?? []), r.tag]);
  return rows.map((t) => ({ ...stripThread(t), category: t.categoryId ? (catMap.get(t.categoryId) ?? null) : null, tags: tagMap.get(t.id) ?? [] }));
}

export type ThreadSort = "active" | "newest" | "replies";

export async function listThreads(opts: { categorySlug?: string; sort?: ThreadSort; limit?: number; offset?: number } = {}): Promise<ThreadPublic[]> {
  const db = await getDb();
  const conditions = [eq(schema.forumThreads.status, "approved")];
  if (opts.categorySlug) {
    const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.slug, opts.categorySlug)).limit(1);
    if (!cat) return [];
    conditions.push(eq(schema.forumThreads.categoryId, cat.id));
  }
  const order =
    opts.sort === "newest"
      ? [desc(schema.forumThreads.pinned), desc(schema.forumThreads.createdAt)]
      : opts.sort === "replies"
        ? [desc(schema.forumThreads.pinned), desc(schema.forumThreads.replyCount), desc(schema.forumThreads.lastActivityAt)]
        : [desc(schema.forumThreads.pinned), desc(schema.forumThreads.lastActivityAt)];
  const rows = await db
    .select()
    .from(schema.forumThreads)
    .where(and(...conditions))
    .orderBy(...order)
    .limit(opts.limit ?? 40)
    .offset(opts.offset ?? 0);
  return hydrateThreads(rows);
}

export async function countThreads(): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ n: sql<number>`count(*)` }).from(schema.forumThreads).where(eq(schema.forumThreads.status, "approved"));
  return Number(rows[0]?.n ?? 0);
}

export async function getThreadBySlug(slug: string, opts: { includeHidden?: boolean } = {}): Promise<ThreadPublic | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.forumThreads)
    .where(opts.includeHidden ? eq(schema.forumThreads.slug, slug) : and(eq(schema.forumThreads.slug, slug), eq(schema.forumThreads.status, "approved")))
    .limit(1);
  const [t] = await hydrateThreads(rows);
  return t ?? null;
}

export async function incrementThreadViews(id: string): Promise<void> {
  const db = await getDb();
  await db.update(schema.forumThreads).set({ viewCount: sql`${schema.forumThreads.viewCount} + 1` }).where(eq(schema.forumThreads.id, id));
}

export async function listApprovedReplies(threadId: string): Promise<ReplyPublic[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.forumReplies)
    .where(and(eq(schema.forumReplies.threadId, threadId), eq(schema.forumReplies.status, "approved")))
    .orderBy(schema.forumReplies.createdAt);
  const nodes = new Map<string, ReplyPublic>();
  for (const r of rows) {
    const { authorEmail: _e, ipHash: _i, ...pub } = r;
    void _e;
    void _i;
    nodes.set(r.id, { ...pub, replies: [] });
  }
  const roots: ReplyPublic[] = [];
  for (const n of nodes.values()) {
    const parent = n.parentId ? nodes.get(n.parentId) : undefined;
    if (parent) parent.replies.push(n);
    else roots.push(n);
  }
  return roots;
}

async function uniqueThreadSlug(title: string): Promise<string> {
  const db = await getDb();
  const base = slugify(title);
  let slug = base;
  let n = 2;
  for (;;) {
    const rows = await db.select({ id: schema.forumThreads.id }).from(schema.forumThreads).where(eq(schema.forumThreads.slug, slug)).limit(1);
    if (!rows[0]) return slug;
    slug = `${base}-${n++}`;
  }
}

export type CreateResult = { ok: true; status: "approved" | "pending"; slug: string } | { ok: false; error: string };

export async function createThread(input: {
  title: unknown;
  body: unknown;
  categoryId?: unknown;
  tags?: unknown;
  name: unknown;
  email?: unknown;
  honeypot?: unknown;
  turnstileToken?: unknown;
}): Promise<CreateResult> {
  if (typeof input.honeypot === "string" && input.honeypot.trim()) return { ok: true, status: "pending", slug: "" };
  const title = cleanLine(input.title, 140);
  const body = cleanText(input.body, 8000);
  const name = cleanLine(input.name, 60) || "Guest Contributor";
  const email = cleanLine(input.email ?? "", 120);
  if (title.length < 8) return { ok: false, error: "Give the discussion a slightly longer title (at least 8 characters)." };
  if (body.length < 20) return { ok: false, error: "Say a little more — at least 20 characters." };
  if (email && !isValidEmail(email)) return { ok: false, error: "That email address does not look right." };

  const meta = await getRequestMeta();
  if (!(await verifyTurnstile(typeof input.turnstileToken === "string" ? input.turnstileToken : null, meta.ip))) {
    return { ok: false, error: "The anti-spam check failed. Please try again." };
  }
  const rl = await rateLimit(`thread:${meta.ipHash}`, RATE_LIMITS.thread);
  if (!rl.ok) return { ok: false, error: "You have started several discussions recently. Please wait a while." };
  const dup = await rateLimit(`dup:${contentFingerprint(title + body, meta.ipHash)}`, { limit: 1, windowMs: 30 * 60_000 });
  if (!dup.ok) return { ok: false, error: "That looks like a duplicate of a discussion you just created." };

  const db = await getDb();
  let categoryId: string | null = null;
  if (typeof input.categoryId === "string" && input.categoryId) {
    const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.id, input.categoryId)).limit(1);
    if (cat && cat.scope !== "blog") categoryId = cat.id;
  }

  const verdict = spamScore(`${title}\n${body}`, { name, email });
  const status = decideStatus(verdict);
  const slug = await uniqueThreadSlug(title);
  const [thread] = await db
    .insert(schema.forumThreads)
    .values({ slug, title, body, categoryId, authorName: name, authorEmail: email || null, status, ipHash: meta.ipHash })
    .returning();
  const tagRows = await ensureTags(typeof input.tags === "string" ? input.tags : Array.isArray(input.tags) ? (input.tags as string[]) : []);
  if (tagRows.length) {
    await db.insert(schema.forumThreadTags).values(tagRows.map((t) => ({ threadId: thread.id, tagId: t.id }))).onConflictDoNothing();
  }
  if (status === "spam") return { ok: true, status: "pending", slug };
  return { ok: true, status, slug };
}

export async function createReply(input: {
  threadId: string;
  parentId?: string | null;
  body: unknown;
  name: unknown;
  email?: unknown;
  honeypot?: unknown;
  turnstileToken?: unknown;
}): Promise<{ ok: true; status: "approved" | "pending" } | { ok: false; error: string }> {
  if (typeof input.honeypot === "string" && input.honeypot.trim()) return { ok: true, status: "pending" };
  const body = cleanText(input.body, 6000);
  const name = cleanLine(input.name, 60) || "Guest Contributor";
  const email = cleanLine(input.email ?? "", 120);
  if (body.length < 3) return { ok: false, error: "The reply is too short." };
  if (email && !isValidEmail(email)) return { ok: false, error: "That email address does not look right." };

  const meta = await getRequestMeta();
  if (!(await verifyTurnstile(typeof input.turnstileToken === "string" ? input.turnstileToken : null, meta.ip))) {
    return { ok: false, error: "The anti-spam check failed. Please try again." };
  }
  const rl = await rateLimit(`reply:${meta.ipHash}`, RATE_LIMITS.reply);
  if (!rl.ok) return { ok: false, error: "You are replying a little too quickly. Please wait a few minutes." };
  const dup = await rateLimit(`dup:${contentFingerprint(body, meta.ipHash)}`, { limit: 1, windowMs: 10 * 60_000 });
  if (!dup.ok) return { ok: false, error: "That looks like a duplicate of something you just posted." };

  const db = await getDb();
  const [thread] = await db.select().from(schema.forumThreads).where(eq(schema.forumThreads.id, input.threadId)).limit(1);
  if (!thread || thread.status !== "approved") return { ok: false, error: "This discussion is not open." };
  if (thread.locked) return { ok: false, error: "This discussion has been closed." };

  let parentId: string | null = null;
  if (input.parentId) {
    const [parent] = await db.select().from(schema.forumReplies).where(eq(schema.forumReplies.id, input.parentId)).limit(1);
    if (parent && parent.threadId === thread.id && parent.status === "approved") parentId = parent.id;
  }

  const verdict = spamScore(body, { name, email });
  const status = decideStatus(verdict);
  await db.insert(schema.forumReplies).values({ threadId: thread.id, parentId, body, authorName: name, authorEmail: email || null, status, ipHash: meta.ipHash });
  if (status === "approved") {
    await db
      .update(schema.forumThreads)
      .set({ replyCount: sql`${schema.forumThreads.replyCount} + 1`, lastActivityAt: new Date() })
      .where(eq(schema.forumThreads.id, thread.id));
  }
  if (status === "spam") return { ok: true, status: "pending" };
  return { ok: true, status };
}

export async function reportContent(input: { targetType: "comment" | "thread" | "reply"; targetId: string; reason?: unknown }): Promise<{ ok: boolean; error?: string }> {
  const meta = await getRequestMeta();
  const rl = await rateLimit(`report:${meta.ipHash}`, RATE_LIMITS.report);
  if (!rl.ok) return { ok: false, error: "Too many reports from this connection." };
  const once = await rateLimit(`report:${meta.ipHash}:${input.targetId}`, { limit: 1, windowMs: 24 * 3_600_000 });
  if (!once.ok) return { ok: true };
  const db = await getDb();
  await db.insert(schema.reports).values({ targetType: input.targetType, targetId: input.targetId, reason: cleanLine(input.reason ?? "", 300) || null, ipHash: meta.ipHash });
  const table = input.targetType === "comment" ? schema.comments : input.targetType === "thread" ? schema.forumThreads : schema.forumReplies;
  await db.update(table).set({ reportCount: sql`${table.reportCount} + 1` }).where(eq(table.id, input.targetId));
  return { ok: true };
}

/* ---------------------------- Admin ---------------------------- */

export async function listThreadsForAdmin(status?: string): Promise<ForumThread[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.forumThreads)
    .where(status ? eq(schema.forumThreads.status, status) : undefined)
    .orderBy(desc(schema.forumThreads.createdAt))
    .limit(300);
}

export type AdminReply = ForumReply & { threadTitle: string; threadSlug: string };

export async function listRepliesForAdmin(status?: string): Promise<AdminReply[]> {
  const db = await getDb();
  const rows = await db
    .select({ reply: schema.forumReplies, threadTitle: schema.forumThreads.title, threadSlug: schema.forumThreads.slug })
    .from(schema.forumReplies)
    .innerJoin(schema.forumThreads, eq(schema.forumReplies.threadId, schema.forumThreads.id))
    .where(status ? eq(schema.forumReplies.status, status) : undefined)
    .orderBy(desc(schema.forumReplies.createdAt))
    .limit(300);
  return rows.map((r) => ({ ...r.reply, threadTitle: r.threadTitle, threadSlug: r.threadSlug }));
}

export async function countPendingForum(): Promise<{ threads: number; replies: number }> {
  const db = await getDb();
  const [t] = await db.select({ n: sql<number>`count(*)` }).from(schema.forumThreads).where(eq(schema.forumThreads.status, "pending"));
  const [r] = await db.select({ n: sql<number>`count(*)` }).from(schema.forumReplies).where(eq(schema.forumReplies.status, "pending"));
  return { threads: Number(t?.n ?? 0), replies: Number(r?.n ?? 0) };
}

export async function setThreadStatus(id: string, status: "approved" | "pending" | "hidden" | "spam"): Promise<void> {
  const db = await getDb();
  await db.update(schema.forumThreads).set({ status }).where(eq(schema.forumThreads.id, id));
}

export async function setThreadFlags(id: string, flags: { pinned?: boolean; locked?: boolean }): Promise<void> {
  const db = await getDb();
  await db.update(schema.forumThreads).set(flags).where(eq(schema.forumThreads.id, id));
}

export async function deleteThread(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(schema.forumThreads).where(eq(schema.forumThreads.id, id));
}

async function recountReplies(threadId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.forumReplies)
    .where(and(eq(schema.forumReplies.threadId, threadId), eq(schema.forumReplies.status, "approved")));
  await db.update(schema.forumThreads).set({ replyCount: Number(row?.n ?? 0) }).where(eq(schema.forumThreads.id, threadId));
}

export async function setReplyStatus(id: string, status: "approved" | "pending" | "hidden" | "spam"): Promise<void> {
  const db = await getDb();
  const [row] = await db.update(schema.forumReplies).set({ status }).where(eq(schema.forumReplies.id, id)).returning({ threadId: schema.forumReplies.threadId });
  if (row) await recountReplies(row.threadId);
}

export async function deleteReply(id: string): Promise<void> {
  const db = await getDb();
  const [row] = await db.delete(schema.forumReplies).where(eq(schema.forumReplies.id, id)).returning({ threadId: schema.forumReplies.threadId });
  if (row) await recountReplies(row.threadId);
}

export async function listOpenReports() {
  const db = await getDb();
  return db.select().from(schema.reports).where(eq(schema.reports.resolved, false)).orderBy(desc(schema.reports.createdAt)).limit(200);
}

export async function resolveReport(id: string) {
  const db = await getDb();
  await db.update(schema.reports).set({ resolved: true }).where(eq(schema.reports.id, id));
}

/** Admin-created thread (no spam checks; used for seeding and by the dashboard). */
export async function createThreadAsAdmin(input: { title: string; body: string; categoryId?: string | null; tags?: string[]; authorName: string; pinned?: boolean }) {
  const db = await getDb();
  const slug = await uniqueThreadSlug(input.title);
  const [thread] = await db
    .insert(schema.forumThreads)
    .values({ slug, title: input.title, body: input.body, categoryId: input.categoryId ?? null, authorName: input.authorName, status: "approved", pinned: Boolean(input.pinned) })
    .returning();
  const tagRows = await ensureTags(input.tags ?? []);
  if (tagRows.length) await db.insert(schema.forumThreadTags).values(tagRows.map((t) => ({ threadId: thread.id, tagId: t.id }))).onConflictDoNothing();
  return thread;
}
