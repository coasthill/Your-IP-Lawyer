/**
 * Upload validation: allow-listed types, magic-byte sniffing, size limits, safe filenames.
 */
import path from "node:path";
import { randomBytes } from "node:crypto";

export type UploadKind = "image" | "pdf" | "file";

export const LIMITS = {
  image: 6 * 1024 * 1024, // 6 MB
  pdf: 25 * 1024 * 1024, // 25 MB
  file: 25 * 1024 * 1024,
} as const;

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};

const DOC_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function startsWith(buf: Uint8Array, bytes: number[], offset = 0): boolean {
  return bytes.every((b, i) => buf[offset + i] === b);
}

/** Detects the real MIME type from the first bytes of the file. Returns null when unknown. */
export function sniffMime(buf: Uint8Array): string | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (buf.length > 12 && startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = String.fromCharCode(...buf.slice(8, 12));
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
  }
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0])) return "application/msword";
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    // zip container — docx is a zip; we only accept it when the declared type says docx
    return "application/zip";
  }
  return null;
}

export type ValidatedUpload = {
  kind: UploadKind;
  mime: string;
  extension: string;
  safeFilename: string;
  storageKey: string;
  size: number;
};

export type ValidationError = { error: string };

/** Turns "My Brief (final).PDF" into "my-brief-final.pdf". */
export function safeFilename(original: string, extension: string): string {
  const base = path
    .basename(original || "file", path.extname(original || ""))
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .slice(0, 80);
  return `${base || "file"}${extension}`;
}

export function validateUpload(
  file: { name: string; type: string; size: number },
  bytes: Uint8Array,
  allowed: UploadKind[],
): ValidatedUpload | ValidationError {
  if (bytes.length === 0) return { error: "The file is empty." };
  const sniffed = sniffMime(bytes);
  const declared = file.type;

  let mime: string | null = null;
  let kind: UploadKind | null = null;

  if (sniffed && IMAGE_TYPES[sniffed]) {
    mime = sniffed;
    kind = "image";
  } else if (sniffed === "application/pdf") {
    mime = sniffed;
    kind = "pdf";
  } else if (sniffed === "application/msword") {
    mime = sniffed;
    kind = "file";
  } else if (sniffed === "application/zip" && declared === DOC_TYPES_DOCX) {
    mime = declared;
    kind = "file";
  }

  if (!mime || !kind) return { error: "Unsupported file type. Allowed: JPG, PNG, WebP, AVIF, GIF images, PDF and Word documents." };
  if (!allowed.includes(kind)) return { error: `A ${kind === "image" ? "image" : "document"} is not allowed here.` };
  if (bytes.length > LIMITS[kind]) return { error: `The file is too large (max ${Math.round(LIMITS[kind] / 1024 / 1024)} MB).` };

  const extension = IMAGE_TYPES[mime] ?? DOC_TYPES[mime] ?? ".bin";
  const name = safeFilename(file.name, extension);
  const key = `${new Date().toISOString().slice(0, 7)}/${randomBytes(8).toString("hex")}-${name}`;
  return { kind, mime, extension, safeFilename: name, storageKey: key, size: bytes.length };
}

const DOC_TYPES_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Reads PNG/JPEG/WebP/GIF dimensions from the header where cheap to do so. */
export function imageDimensions(buf: Uint8Array, mime: string): { width: number; height: number } | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  try {
    if (mime === "image/png" && buf.length >= 24) return { width: dv.getUint32(16), height: dv.getUint32(20) };
    if (mime === "image/gif" && buf.length >= 10) return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) };
    if (mime === "image/jpeg") {
      let i = 2;
      while (i < buf.length) {
        if (buf[i] !== 0xff) return null;
        const marker = buf[i + 1];
        const len = dv.getUint16(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
        }
        i += 2 + len;
      }
    }
    if (mime === "image/webp" && buf.length >= 30) {
      const chunk = String.fromCharCode(...buf.slice(12, 16));
      if (chunk === "VP8 ") return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
      if (chunk === "VP8L") {
        const b = dv.getUint32(21, true);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
      if (chunk === "VP8X") {
        return {
          width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
          height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}
