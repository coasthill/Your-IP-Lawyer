/**
 * Downloads the artwork listed in content/artwork/manifest.json and writes web-ready versions:
 *   public/art/scenes/<id>.webp             2000px wide (desktop)
 *   public/art/scenes/<id>-sm.webp          1100px wide (phones)
 *   public/art/film/<id>/f001.webp …        frames of a video clip, 1200px wide (desktop)
 *   public/art/film/<id>/sm/f001.webp …     the same frames, 640px wide (phones)
 *   public/art/film/<id>/sheet.jpg          five-frame contact sheet (0 / 25 / 50 / 75 / 100 %) for a quick look
 *   src/components/hero/art-manifest.json   sizes, focal points, frame counts and tiny blurred placeholders
 *
 * `scenes` are stills. `clips` (optional) are mp4 files that ffmpeg slices into frames at `fps` frames
 * per second (default 10), optionally trimmed to `trim: [start, end]` seconds and played backwards with
 * `reverse: true`. A clip is only extracted again when its source, fps, reverse or trim changed or its
 * frames are missing; the directories of clips no longer listed are deleted. Without ffmpeg on PATH the
 * clips are skipped with a message and the stills are still processed.
 *
 * With WITH_CANDIDATES=true it also writes 1000px review copies of content/artwork/candidates.json
 * into public/art/candidates/.
 *
 * It runs inside the "Fetch artwork" GitHub Action (which has internet access and ffmpeg) and also
 * works locally:
 *   node scripts/fetch-artwork.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = process.cwd();
const manifestPath = path.join(root, "content/artwork/manifest.json");
const candidatesPath = path.join(root, "content/artwork/candidates.json");
const outDir = path.join(root, "public/art/scenes");
const filmDir = path.join(root, "public/art/film");
const candDir = path.join(root, "public/art/candidates");
const artManifestPath = path.join(root, "src/components/hero/art-manifest.json");

const DEFAULT_FPS = 10;
const FRAME_WIDTH = 1200; // desktop frames
const FRAME_WIDTH_SM = 640; // phone frames
const SHEET_TILE = 320; // contact-sheet tile width
const SHEET_STOPS = [0, 0.25, 0.5, 0.75, 1];
const CLIP_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function download(url) {
  if (url.startsWith("file:")) return fs.readFileSync(fileURLToPath(url)); // local files, handy for testing
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

/** Runs fn over items with at most `limit` in flight; resolves to the results in order. */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/* ----------------------------------------------------------------------------------------------
 * Stills
 * -------------------------------------------------------------------------------------------- */

async function processScenes(manifest, existing) {
  fs.mkdirSync(outDir, { recursive: true });
  const scenes = {};
  for (const scene of manifest.scenes ?? []) {
    if (!scene.source) continue;
    const prev = existing.scenes?.[scene.id];
    if (prev && prev.source === scene.source && fs.existsSync(path.join(outDir, `${scene.id}.webp`))) {
      console.log(`= ${scene.id} unchanged`);
      scenes[scene.id] = { ...prev, focal: scene.focal ?? prev.focal };
      continue;
    }
    console.log(`↓ ${scene.id}`);
    const buf = await download(scene.source);
    const img = sharp(buf).rotate();
    const meta = await img.metadata();
    await img.clone().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(path.join(outDir, `${scene.id}.webp`));
    await img.clone().resize({ width: 1100, withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toFile(path.join(outDir, `${scene.id}-sm.webp`));
    const lqip = await img.clone().resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
    const { width, height } = await sharp(path.join(outDir, `${scene.id}.webp`)).metadata();
    scenes[scene.id] = {
      source: scene.source,
      width,
      height,
      aspect: +(width / height).toFixed(4),
      focal: scene.focal ?? [0.5, 0.5],
      lqip: `data:image/webp;base64,${lqip.toString("base64")}`,
      sourceWidth: meta.width,
      sourceHeight: meta.height,
    };
  }
  return scenes;
}

/* ----------------------------------------------------------------------------------------------
 * Clips → frame sequences
 * -------------------------------------------------------------------------------------------- */

const frameFile = (i) => `f${String(i + 1).padStart(3, "0")}.webp`;

/** Validates one manifest clip and fills in the defaults the extraction and the change check rely on. */
function normaliseClip(clip) {
  const { id, source } = clip;
  if (typeof id !== "string" || !CLIP_ID.test(id)) throw new Error(`clip id "${id}" must be lower-case letters, digits and hyphens`);
  const fps = clip.fps ?? DEFAULT_FPS;
  if (!Number.isFinite(fps) || fps <= 0) throw new Error(`clip ${id}: fps must be a positive number`);
  let trim = null;
  if (clip.trim != null) {
    const ok = Array.isArray(clip.trim) && clip.trim.length === 2 && clip.trim.every(Number.isFinite) && clip.trim[0] >= 0 && clip.trim[1] > clip.trim[0];
    if (!ok) throw new Error(`clip ${id}: trim must be [start, end] in seconds with end > start`);
    trim = [clip.trim[0], clip.trim[1]];
  }
  return { id, source, fps, reverse: clip.reverse === true, trim };
}

function sameSettings(prev, clip) {
  return (
    Boolean(prev) &&
    prev.source === clip.source &&
    prev.fps === clip.fps &&
    (prev.reverse === true) === clip.reverse &&
    JSON.stringify(prev.trim ?? null) === JSON.stringify(clip.trim)
  );
}

function framesPresent(dir, count) {
  if (!Number.isInteger(count) || count < 1) return false;
  for (let i = 0; i < count; i++) {
    if (!fs.existsSync(path.join(dir, frameFile(i))) || !fs.existsSync(path.join(dir, "sm", frameFile(i)))) return false;
  }
  return true;
}

function ffmpegAvailable() {
  const r = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return !r.error && r.status === 0;
}

/** Extracts the frames of `input` as PNG files into `dir` and returns their paths in playback order. */
function extractFrames(input, clip, dir) {
  const args = ["-hide_banner", "-loglevel", "error", "-nostdin", "-y"];
  // Input-side seeking: -ss starts decoding at `start`, -t stops after `end − start` seconds.
  if (clip.trim) args.push("-ss", String(clip.trim[0]), "-t", String(clip.trim[1] - clip.trim[0]));
  const filters = [`fps=${clip.fps}`, `scale='min(${FRAME_WIDTH},iw)':-1`];
  if (clip.reverse) filters.push("reverse"); // after fps+scale, so only the kept, downscaled frames are buffered
  args.push("-i", input, "-vf", filters.join(","), "-start_number", "1", path.join(dir, "f%03d.png"));
  const r = spawnSync("ffmpeg", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`ffmpeg failed for clip ${clip.id} (exit ${r.status}):\n${r.stderr}`);
  return fs
    .readdirSync(dir)
    .filter((f) => /^f\d+\.png$/.test(f))
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
    .map((f) => path.join(dir, f));
}

async function writeFrames(pngs, dir) {
  fs.mkdirSync(path.join(dir, "sm"), { recursive: true });
  await mapLimit(pngs, 4, async (png, i) => {
    const img = sharp(png);
    await img.clone().webp({ quality: 72 }).toFile(path.join(dir, frameFile(i)));
    await img.clone().resize({ width: FRAME_WIDTH_SM, withoutEnlargement: true }).webp({ quality: 70 }).toFile(path.join(dir, "sm", frameFile(i)));
  });
}

/** Five frames (0 → 100 %) side by side on a white canvas: a quick check that the clip was cut right. */
async function writeSheet(dir, frames) {
  const picks = SHEET_STOPS.map((k) => Math.round((frames - 1) * k));
  const tiles = await Promise.all(picks.map((i) => sharp(path.join(dir, frameFile(i))).resize({ width: SHEET_TILE }).png().toBuffer({ resolveWithObject: true })));
  const height = Math.max(...tiles.map((t) => t.info.height));
  await sharp({ create: { width: SHEET_TILE * picks.length, height, channels: 3, background: "#ffffff" } })
    .composite(tiles.map((t, n) => ({ input: t.data, left: n * SHEET_TILE, top: 0 })))
    .jpeg({ quality: 80 })
    .toFile(path.join(dir, "sheet.jpg"));
}

/** Downloads, slices and converts one clip into public/art/film/<id>; returns its art-manifest record. */
async function processClip(clip, dir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `film-${clip.id}-`));
  const staging = path.join(filmDir, `.${clip.id}.tmp`);
  try {
    const input = path.join(tmp, "source.mp4");
    fs.writeFileSync(input, await download(clip.source));
    const pngs = extractFrames(input, clip, tmp);
    if (!pngs.length) throw new Error(`ffmpeg produced no frames for clip ${clip.id} — check its trim and fps`);
    fs.rmSync(staging, { recursive: true, force: true });
    await writeFrames(pngs, staging);
    await writeSheet(staging, pngs.length);
    const lqip = await sharp(pngs[0]).resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
    const { width, height } = await sharp(path.join(staging, frameFile(0))).metadata();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.renameSync(staging, dir);
    return {
      source: clip.source,
      fps: clip.fps,
      frames: pngs.length,
      width,
      height,
      aspect: +(width / height).toFixed(4),
      reverse: clip.reverse,
      trim: clip.trim,
      lqip: `data:image/webp;base64,${lqip.toString("base64")}`,
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

/** Deletes public/art/film/<id> for every id that is not in `keep` (includes leftovers of failed runs). */
function removeStaleClipDirs(keep) {
  if (!fs.existsSync(filmDir)) return;
  for (const entry of fs.readdirSync(filmDir)) {
    if (keep.has(entry)) continue;
    fs.rmSync(path.join(filmDir, entry), { recursive: true, force: true });
    console.log(`× removed public/art/film/${entry}`);
  }
  if (fs.readdirSync(filmDir).length === 0) fs.rmdirSync(filmDir);
}

/** Returns the `clips` block for art-manifest.json (empty when no clip has frames yet). */
async function processClips(manifest, existing) {
  const haveFfmpeg = ffmpegAvailable();
  if (!haveFfmpeg) console.log("skipping clips: ffmpeg not found on PATH (stills are unaffected; install ffmpeg to extract clip frames)");
  const listed = Array.isArray(manifest.clips) ? manifest.clips.filter((c) => c.source).map(normaliseClip) : null;
  removeStaleClipDirs(new Set((listed ?? []).map((c) => c.id)));

  const seen = new Set();
  const clips = {};
  for (const clip of listed ?? []) {
    if (seen.has(clip.id)) throw new Error(`clip id "${clip.id}" is listed twice`);
    seen.add(clip.id);
    const dir = path.join(filmDir, clip.id);
    const prev = existing.clips?.[clip.id];
    const prevUsable = Boolean(prev) && framesPresent(dir, prev.frames);
    if (prevUsable && sameSettings(prev, clip)) {
      console.log(`= clip ${clip.id} unchanged (${prev.frames} frames)`);
      if (!fs.existsSync(path.join(dir, "sheet.jpg"))) await writeSheet(dir, prev.frames);
      clips[clip.id] = { ...prev, source: clip.source, fps: clip.fps, reverse: clip.reverse, trim: clip.trim };
      continue;
    }
    if (!haveFfmpeg) {
      if (prevUsable) {
        console.log(`  clip ${clip.id}: settings changed, keeping the previous ${prev.frames} frames until ffmpeg runs`);
        clips[clip.id] = prev;
      } else {
        console.log(`  clip ${clip.id}: no frames yet`);
      }
      continue;
    }
    const detail = [`${clip.fps} fps`, clip.reverse && "reversed", clip.trim && `${clip.trim[0]}–${clip.trim[1]} s`].filter(Boolean).join(", ");
    console.log(`↓ clip ${clip.id} (${detail})`);
    fs.mkdirSync(filmDir, { recursive: true });
    const record = await processClip(clip, dir);
    clips[clip.id] = record;
    console.log(`  ${record.frames} frames ${record.width}×${record.height} → public/art/film/${clip.id}`);
  }
  return clips;
}

/* ----------------------------------------------------------------------------------------------
 * Review candidates
 * -------------------------------------------------------------------------------------------- */

async function processCandidates() {
  if (process.env.WITH_CANDIDATES !== "true" || !fs.existsSync(candidatesPath)) return;
  const list = JSON.parse(fs.readFileSync(candidatesPath, "utf8"));
  fs.mkdirSync(candDir, { recursive: true });
  for (const c of list.candidates) {
    console.log(`↓ candidate ${c.name}`);
    const buf = await download(c.source);
    await sharp(buf).resize({ width: 1000, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(path.join(candDir, `${c.name}.jpg`));
  }
}

/* -------------------------------------------------------------------------------------------- */

async function main() {
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const existing = readJson(artManifestPath, { scenes: {} });
    const scenes = await processScenes(manifest, existing);
    const clips = await processClips(manifest, existing);
    // The "clips" key only appears once at least one clip has frames, so art-manifest.json stays
    // byte-identical on machines without ffmpeg.
    const out = Object.keys(clips).length ? { scenes, clips } : { scenes };
    fs.writeFileSync(artManifestPath, JSON.stringify(out, null, 2) + "\n");
    console.log(`wrote ${path.relative(root, artManifestPath)}`);
  }
  await processCandidates();
}

await main();
