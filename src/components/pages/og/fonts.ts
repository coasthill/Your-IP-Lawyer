import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** A face handed to `ImageResponse`. Satori accepts woff, ttf and otf. */
export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" };

/** Family stacks used inside the cards. Satori falls back to the first loaded face (or its built-in sans) for unknown names. */
export const DISPLAY_FAMILY = '"Cormorant Garamond", Georgia, "Times New Roman", serif';
export const MONO_FAMILY = '"IBM Plex Mono", "Courier New", monospace';

async function load(file: string): Promise<ArrayBuffer | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public", "fonts", file));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

/**
 * The self-hosted faces for the social cards and icons. A face that cannot be read is simply
 * omitted, so the card still renders (in Georgia's stead, Satori's default serif-less sans).
 */
export async function loadOgFonts(): Promise<OgFont[]> {
  const [display, mono] = await Promise.all([load("cormorant-latin-600-normal.woff"), load("ibm-plex-mono-latin-400-normal.woff")]);
  const fonts: OgFont[] = [];
  if (display) fonts.push({ name: "Cormorant Garamond", data: display, weight: 600, style: "normal" });
  if (mono) fonts.push({ name: "IBM Plex Mono", data: mono, weight: 400, style: "normal" });
  return fonts;
}
