/**
 * Storage abstraction for uploaded files.
 *
 *   STORAGE_DRIVER=local        → files saved in ./uploads and served by /api/uploads/[...key] (self-hosting)
 *   STORAGE_DRIVER=vercel-blob  → Vercel Blob (needs BLOB_READ_WRITE_TOKEN) — simplest on Vercel
 *   STORAGE_DRIVER=s3           → any S3-compatible bucket (AWS S3, Cloudflare R2, Supabase Storage, MinIO)
 *
 * Large files never go into the Git repository.
 */
import fs from "node:fs/promises";
import path from "node:path";

export type StorageDriverName = "local" | "vercel-blob" | "s3";

export type StoredFile = {
  driver: StorageDriverName;
  key: string;
  url: string;
};

export interface StorageDriver {
  name: StorageDriverName;
  put(key: string, bytes: Uint8Array, contentType: string, filename: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

export const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR?.trim() || path.join(process.cwd(), "uploads");

const localDriver: StorageDriver = {
  name: "local",
  async put(key, bytes) {
    const full = path.join(/*turbopackIgnore: true*/ LOCAL_UPLOAD_DIR, key);
    if (!full.startsWith(LOCAL_UPLOAD_DIR)) throw new Error("Invalid key");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, bytes);
    return { driver: "local", key, url: `/api/uploads/${key}` };
  },
  async delete(key) {
    const full = path.join(/*turbopackIgnore: true*/ LOCAL_UPLOAD_DIR, key);
    if (!full.startsWith(LOCAL_UPLOAD_DIR)) throw new Error("Invalid key");
    await fs.rm(full, { force: true });
  },
};

const vercelBlobDriver: StorageDriver = {
  name: "vercel-blob",
  async put(key, bytes, contentType) {
    const { put } = await import("@vercel/blob");
    const res = await put(key, Buffer.from(bytes), { access: "public", contentType, addRandomSuffix: false });
    return { driver: "vercel-blob", key: res.url, url: res.url };
  },
  async delete(key) {
    const { del } = await import("@vercel/blob");
    await del(key);
  },
};

const s3Driver: StorageDriver = {
  name: "s3",
  async put(key, bytes, contentType) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = s3Client(S3Client);
    const bucket = required("S3_BUCKET");
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: contentType }));
    const base = (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");
    const url = base ? `${base}/${key}` : `https://${bucket}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${key}`;
    return { driver: "s3", key, url };
  },
  async delete(key) {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = s3Client(S3Client);
    await client.send(new DeleteObjectCommand({ Bucket: required("S3_BUCKET"), Key: key }));
  },
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function s3Client(S3Client: any) {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    },
  });
}

export function getStorage(): StorageDriver {
  const name = (process.env.STORAGE_DRIVER || (process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob" : "local")) as StorageDriverName;
  switch (name) {
    case "vercel-blob":
      return vercelBlobDriver;
    case "s3":
      return s3Driver;
    default:
      return localDriver;
  }
}
