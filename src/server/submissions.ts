import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { Document, Submission } from "@/db/schema";
import { RATE_LIMITS, rateLimit } from "@/lib/security/rate-limit";
import { getRequestMeta } from "@/lib/security/request";
import { cleanLine, cleanText, isValidEmail } from "@/lib/security/sanitize";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { storeUpload } from "./documents";

export type CreateSubmissionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createSubmission(input: {
  name: unknown;
  email: unknown;
  affiliation?: unknown;
  title: unknown;
  kind?: unknown;
  abstract: unknown;
  file?: File | null;
  honeypot?: unknown;
  turnstileToken?: unknown;
}): Promise<CreateSubmissionResult> {
  if (typeof input.honeypot === "string" && input.honeypot.trim()) return { ok: true, id: "" };
  const name = cleanLine(input.name, 80);
  const email = cleanLine(input.email, 120);
  const affiliation = cleanLine(input.affiliation ?? "", 120);
  const title = cleanLine(input.title, 200);
  const abstract = cleanText(input.abstract, 3000);
  const kind = typeof input.kind === "string" && ["article", "case-note", "commentary", "other"].includes(input.kind) ? input.kind : "article";
  if (name.length < 2) return { ok: false, error: "Please tell us your name." };
  if (!isValidEmail(email)) return { ok: false, error: "Please provide a valid email address so we can reply." };
  if (title.length < 5) return { ok: false, error: "Please give your piece a title." };
  if (abstract.length < 50) return { ok: false, error: "Please describe your piece in at least a few sentences (50+ characters)." };

  const meta = await getRequestMeta();
  if (!(await verifyTurnstile(typeof input.turnstileToken === "string" ? input.turnstileToken : null, meta.ip))) {
    return { ok: false, error: "The anti-spam check failed. Please try again." };
  }
  const rl = await rateLimit(`submission:${meta.ipHash}`, RATE_LIMITS.submission);
  if (!rl.ok) return { ok: false, error: "You have sent several submissions recently. Please try again later." };

  let documentId: string | null = null;
  if (input.file && input.file.size > 0) {
    const stored = await storeUpload(input.file, ["pdf", "file"], { title: `Submission: ${title}` });
    if (!stored.ok) return { ok: false, error: stored.error };
    documentId = stored.document.id;
  }

  const db = await getDb();
  const [row] = await db
    .insert(schema.submissions)
    .values({ name, email, affiliation: affiliation || null, title, kind, abstract, documentId, ipHash: meta.ipHash })
    .returning({ id: schema.submissions.id });
  return { ok: true, id: row.id };
}

/* ---------------------------- Admin ---------------------------- */

export type SubmissionWithDoc = Submission & { document: Document | null };

export async function listSubmissions(status?: string): Promise<SubmissionWithDoc[]> {
  const db = await getDb();
  const rows = await db
    .select({ submission: schema.submissions, document: schema.documents })
    .from(schema.submissions)
    .leftJoin(schema.documents, eq(schema.submissions.documentId, schema.documents.id))
    .where(status ? eq(schema.submissions.status, status) : undefined)
    .orderBy(desc(schema.submissions.createdAt))
    .limit(300);
  return rows.map((r) => ({ ...r.submission, document: r.document }));
}

export async function getSubmission(id: string): Promise<SubmissionWithDoc | null> {
  const db = await getDb();
  const rows = await db
    .select({ submission: schema.submissions, document: schema.documents })
    .from(schema.submissions)
    .leftJoin(schema.documents, eq(schema.submissions.documentId, schema.documents.id))
    .where(eq(schema.submissions.id, id))
    .limit(1);
  return rows[0] ? { ...rows[0].submission, document: rows[0].document } : null;
}

export async function countNewSubmissions(): Promise<number> {
  const db = await getDb();
  const rows = await db.select({ n: sql<number>`count(*)` }).from(schema.submissions).where(eq(schema.submissions.status, "new"));
  return Number(rows[0]?.n ?? 0);
}

export async function updateSubmission(id: string, data: { status?: "new" | "reviewing" | "accepted" | "declined"; adminNotes?: string | null }): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.submissions)
    .set({ ...data, adminNotes: data.adminNotes === undefined ? undefined : cleanText(data.adminNotes ?? "", 4000) || null, updatedAt: new Date() })
    .where(eq(schema.submissions.id, id));
}

export async function deleteSubmission(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(schema.submissions).where(eq(schema.submissions.id, id));
}
