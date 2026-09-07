import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { Document } from "@/db/schema";
import { getStorage } from "@/lib/storage";
import { imageDimensions, validateUpload, type UploadKind } from "@/lib/storage/validate";
import { cleanLine } from "@/lib/security/sanitize";

export type StoreUploadResult = { ok: true; document: Document } | { ok: false; error: string };

/**
 * Validates and stores a browser `File` (from FormData), recording it in the documents table.
 */
export async function storeUpload(
  file: File | null | undefined,
  allowed: UploadKind[],
  meta: { uploadedBy?: string | null; title?: string | null; description?: string | null; altText?: string | null } = {},
): Promise<StoreUploadResult> {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return { ok: false, error: "No file was provided." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validated = validateUpload({ name: file.name, type: file.type, size: file.size }, bytes, allowed);
  if ("error" in validated) return { ok: false, error: validated.error };

  const storage = getStorage();
  const stored = await storage.put(validated.storageKey, bytes, validated.mime, validated.safeFilename);
  const dims = validated.kind === "image" ? imageDimensions(bytes, validated.mime) : null;

  const db = await getDb();
  const [document] = await db
    .insert(schema.documents)
    .values({
      kind: validated.kind,
      storageDriver: stored.driver,
      storageKey: stored.key,
      url: stored.url,
      filename: validated.safeFilename,
      mimeType: validated.mime,
      sizeBytes: validated.size,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      title: cleanLine(meta.title ?? "", 200) || null,
      description: cleanLine(meta.description ?? "", 500) || null,
      altText: cleanLine(meta.altText ?? "", 300) || null,
      uploadedBy: meta.uploadedBy ?? null,
    })
    .returning();
  return { ok: true, document };
}

export async function listDocuments(kind?: UploadKind): Promise<Document[]> {
  const db = await getDb();
  const q = db.select().from(schema.documents).orderBy(desc(schema.documents.createdAt));
  const rows = await q;
  return kind ? rows.filter((d) => d.kind === kind) : rows;
}

export async function getDocument(id: string): Promise<Document | null> {
  const db = await getDb();
  const rows = await db.select().from(schema.documents).where(eq(schema.documents.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateDocumentMeta(id: string, meta: { title?: string | null; description?: string | null; altText?: string | null }) {
  const db = await getDb();
  await db
    .update(schema.documents)
    .set({
      title: cleanLine(meta.title ?? "", 200) || null,
      description: cleanLine(meta.description ?? "", 500) || null,
      altText: cleanLine(meta.altText ?? "", 300) || null,
    })
    .where(eq(schema.documents.id, id));
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb();
  const doc = await getDocument(id);
  if (!doc) return;
  try {
    const storage = getStorage();
    if (storage.name === doc.storageDriver) await storage.delete(doc.storageKey);
  } catch (err) {
    console.warn("Could not delete stored file", err);
  }
  await db.delete(schema.documents).where(eq(schema.documents.id, id));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
