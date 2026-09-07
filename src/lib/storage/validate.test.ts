import { describe, expect, it } from "vitest";
import { LIMITS, imageDimensions, safeFilename, sniffMime, validateUpload } from "./validate";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x01, 0x00, 0, 0, 0x00, 0x80, 8, 6, 0, 0, 0]);
const PDF = new TextEncoder().encode("%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n");
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

describe("sniffMime", () => {
  it("detects real types from magic bytes regardless of the declared type", () => {
    expect(sniffMime(PNG)).toBe("image/png");
    expect(sniffMime(PDF)).toBe("application/pdf");
    expect(sniffMime(EXE)).toBeNull();
  });
});

describe("validateUpload", () => {
  it("rejects executables disguised as PDFs", () => {
    const res = validateUpload({ name: "evil.pdf", type: "application/pdf", size: EXE.length }, EXE, ["pdf"]);
    expect("error" in res).toBe(true);
  });
  it("rejects images where only documents are allowed", () => {
    const res = validateUpload({ name: "pic.png", type: "image/png", size: PNG.length }, PNG, ["pdf"]);
    expect("error" in res).toBe(true);
  });
  it("accepts a PDF and produces a safe random storage key", () => {
    const res = validateUpload({ name: "My Brief (FINAL) v2.PDF", type: "application/octet-stream", size: PDF.length }, PDF, ["pdf", "file"]);
    expect("error" in res).toBe(false);
    if ("error" in res) return;
    expect(res.kind).toBe("pdf");
    expect(res.mime).toBe("application/pdf");
    expect(res.safeFilename).toBe("my-brief-final-v2.pdf");
    expect(res.storageKey).toMatch(/^\d{4}-\d{2}\/[0-9a-f]{16}-my-brief-final-v2\.pdf$/);
  });
  it("enforces size limits", () => {
    const big = new Uint8Array(LIMITS.image + 1);
    big.set(PNG);
    const res = validateUpload({ name: "big.png", type: "image/png", size: big.length }, big, ["image"]);
    expect("error" in res && /too large/.test(res.error)).toBe(true);
  });
  it("rejects empty files", () => {
    expect("error" in validateUpload({ name: "x.png", type: "image/png", size: 0 }, new Uint8Array(), ["image"])).toBe(true);
  });
});

describe("helpers", () => {
  it("sanitises filenames and path traversal", () => {
    expect(safeFilename("../../etc/passwd", ".pdf")).toBe("passwd.pdf");
    expect(safeFilename("Résumé — draft?.docx", ".docx")).toBe("resume-draft.docx");
  });
  it("reads PNG dimensions", () => {
    expect(imageDimensions(PNG, "image/png")).toEqual({ width: 256, height: 128 });
  });
});
