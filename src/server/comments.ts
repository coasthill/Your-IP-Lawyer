import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { Comment } from "@/db/schema";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { getRequestMeta } from "@/lib/security/request";
import { cleanLine, cleanText, isValidEmail } from "@/lib/security/sanitize";
import { contentFingerprint, decideStatus, spamScore } from "@/lib/security/spam";
import { verifyTurnstile } from "@/lib/security/turnstile";

export type CommentNode = Omit<Comment, "authorEmail" | "ipHash" | "userAgent"> & { replies: CommentNode[] };

/** Approved comments for a post as a nested tree (max depth handled by the UI). */
export async function listApprovedComments(postId: string): Promise<CommentNode[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.comments)
    .where(and(eq(schema.comments.postId, postId), eq(schema.comments.status, "approved")))
    .orderBy(schema.comments.createdAt);
  return buildTree(rows);
}

export function buildTree(rows: Comment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  for (const r of rows) {
    // Strip private fields before anything reaches the UI.
    const { authorEmail: _e, ipHash: _i, userAgent: _u, ...pub } = r;
    void _e;
    void _i;
    void _u;
    nodes.set(r.id, { ...pub, replies: [] });
  }
  const roots: CommentNode[] = [];
  for (const n of nodes.values()) {
    const parent = n.parentId ? nodes.get(n.parentId) : undefined;
    if (parent) parent.replies.push(n);
    else roots.push(n);
  }
  return roots;
}

export type CreateCommentResult =
  | { ok: true; status: "approved" | "pending"; id: string }
  | { ok: false; error: string };

export async function createComment(input: {
  postId: string;
  parentId?: string | null;
  name: unknown;
  email?: unknown;
  body: unknown;
  honeypot?: unknown;
  turnstileToken?: unknown;
}): Promise<CreateCommentResult> {
  if (typeof input.honeypot === "string" && input.honeypot.trim()) return { ok: true, status: "pending", id: "" }; // silently swallow bots
  const name = cleanLine(input.name, 60);
  const email = cleanLine(input.email ?? "", 120);
  const body = cleanText(input.body, 4000);
  if (name.length < 2) return { ok: false, error: "Please tell us your name (or a pseudonym)." };
  if (body.length < 3) return { ok: false, error: "The comment is too short." };
  if (email && !isValidEmail(email)) return { ok: false, error: "That email address does not look right." };

  const meta = await getRequestMeta();
  if (!(await verifyTurnstile(typeof input.turnstileToken === "string" ? input.turnstileToken : null, meta.ip))) {
    return { ok: false, error: "The anti-spam check failed. Please try again." };
  }
  const rl = await rateLimit(`comment:${meta.ipHash}`, RATE_LIMITS.comment);
  if (!rl.ok) return { ok: false, error: "You are commenting a little too quickly. Please wait a few minutes." };

  const fingerprint = contentFingerprint(body, meta.ipHash);
  const dup = await rateLimit(`dup:${fingerprint}`, { limit: 1, windowMs: 10 * 60_000 });
  if (!dup.ok) return { ok: false, error: "That looks like a duplicate of something you just posted." };

  const db = await getDb();
  const [post] = await db.select({ id: schema.posts.id, status: schema.posts.status }).from(schema.posts).where(eq(schema.posts.id, input.postId)).limit(1);
  if (!post || post.status !== "published") return { ok: false, error: "This article does not accept comments." };

  let parentId: string | null = null;
  if (input.parentId) {
    const [parent] = await db
      .select({ id: schema.comments.id, postId: schema.comments.postId, status: schema.comments.status })
      .from(schema.comments)
      .where(eq(schema.comments.id, input.parentId))
      .limit(1);
    if (parent && parent.postId === input.postId && parent.status === "approved") parentId = parent.id;
  }

  const verdict = spamScore(body, { name, email });
  const status = decideStatus(verdict);
  const [row] = await db
    .insert(schema.comments)
    .values({ postId: input.postId, parentId, authorName: name, authorEmail: email || null, body, status, ipHash: meta.ipHash, userAgent: meta.userAgent })
    .returning({ id: schema.comments.id });
  if (status === "spam") return { ok: true, status: "pending", id: row.id };
  return { ok: true, status, id: row.id };
}

/* ---------------------------- Admin ---------------------------- */

export type AdminComment = Comment & { postTitle: string; postSlug: string };

export async function listCommentsForAdmin(status?: string): Promise<AdminComment[]> {
  const db = await getDb();
  const rows = await db
    .select({ comment: schema.comments, postTitle: schema.posts.title, postSlug: schema.posts.slug })
    .from(schema.comments)
    .innerJoin(schema.posts, eq(schema.comments.postId, schema.posts.id))
    .where(status ? eq(schema.comments.status, status) : undefined)
    .orderBy(desc(schema.comments.createdAt))
    .limit(300);
  return rows.map((r) => ({ ...r.comment, postTitle: r.postTitle, postSlug: r.postSlug }));
}

export async function countPendingComments(): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ n: sql<number>`count(*)` }).from(schema.comments).where(eq(schema.comments.status, "pending"));
  return Number(rows[0]?.n ?? 0);
}

export async function setCommentStatus(id: string, status: "approved" | "pending" | "hidden" | "spam"): Promise<void> {
  const db = await getDb();
  await db.update(schema.comments).set({ status }).where(eq(schema.comments.id, id));
}

export async function deleteComment(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(schema.comments).where(eq(schema.comments.id, id));
}
