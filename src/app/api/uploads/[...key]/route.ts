import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, schema } from "@/db/client";
import { LOCAL_UPLOAD_DIR } from "@/lib/storage";

/**
 * Serves files stored by the `local` storage driver (self-hosted deployments).
 * Only files recorded in the documents table are served; the key is resolved inside the uploads dir only.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/uploads/[...key]">) {
  const { key } = await ctx.params;
  const storageKey = key.map(decodeURIComponent).join("/");
  if (storageKey.includes("..") || storageKey.startsWith("/")) return new Response("Not found", { status: 404 });

  const db = await getDb();
  const [doc] = await db.select().from(schema.documents).where(eq(schema.documents.storageKey, storageKey)).limit(1);
  if (!doc || doc.storageDriver !== "local") return new Response("Not found", { status: 404 });

  const full = path.join(/*turbopackIgnore: true*/ LOCAL_UPLOAD_DIR, storageKey);
  if (!full.startsWith(LOCAL_UPLOAD_DIR)) return new Response("Not found", { status: 404 });
  let stat: fs.Stats;
  try {
    stat = await fsp.stat(full);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const stream = fs.createReadStream(full);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
  const disposition = doc.kind === "image" ? "inline" : `inline; filename="${doc.filename.replace(/"/g, "")}"`;
  return new Response(webStream, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(stat.size),
      "Content-Disposition": disposition,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
