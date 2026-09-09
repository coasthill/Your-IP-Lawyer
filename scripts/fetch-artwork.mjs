/**
 * Downloads the artwork listed in content/artwork/manifest.json and writes web-ready versions:
 *   public/art/scenes/<id>.webp             2000px wide (desktop)
 *   public/art/scenes/<id>-sm.webp          1100px wide (phones)
 *   public/art/film/<id>/clip.webm          the clip as VP9 video, up to 2560px wide (desktop)
 *   public/art/film/<id>/clip.mp4           the same as H.264 (Safari and older browsers)
 *   public/art/film/<id>/clip-sm.webm       up to 1280px wide (phones)
 *   public/art/film/<id>/clip-sm.mp4
 *   public/art/film/<id>/poster.webp        the clip's first frame, 1200px wide (shown until the video plays)
 *   public/art/film/<id>/poster-sm.webp     the same, 640px wide
 *   public/art/film/<id>/sheet.jpg          five-frame contact sheet (0 / 25 / 50 / 75 / 100 %) for a quick look
 *   src/components/hero/art-manifest.json   sizes, focal points, durations, video paths and tiny blurred placeholders
 *
 * `scenes` are stills. `clips` (optional) are mp4 files that ffmpeg re-encodes at the source's frame rate:
 * optionally trimmed to `trim: [start, end]` seconds, played backwards with `reverse: true`, and turned
 * into a seamless ping-pong loop (forward, then backwards) with `loop: true`. `impactAt` names a moment
 * of the source in seconds (forward, untrimmed) that the engine needs — the gavel meeting the block — and
 * is mapped into the output's timeline. The old `fps` field is ignored. Trim, reverse and loop run once
 * into a near-lossless intermediate in a temp dir; the four videos, the posters and the sheet are made
 * from that. A clip is only encoded again when its source, reverse, trim or loop changed or one of its
 * six outputs is missing (REENCODE=true forces it); the frame sequences of the old pipeline (f001.webp …
 * and sm/) and the directories of clips no longer listed are always deleted. Without ffmpeg (on PATH or
 * via FFMPEG=) the clips are left as they are with a message and the stills are still processed.
 *
 * Environment: FFMPEG and FFPROBE point at the binaries (without ffprobe the output is probed by parsing
 * `ffmpeg -i`); MANIFEST= reads another manifest and ART_OUT= writes everything (scenes/, film/,
 * candidates/ and art-manifest.json) under another directory — both for testing without touching
 * public/art. Sources are https URLs (downloaded with retries) or, for tests, absolute paths and file://
 * URLs. With WITH_CANDIDATES=true it also writes 1000px review copies of content/artwork/candidates.json
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
const manifestPath = process.env.MANIFEST ? path.resolve(process.env.MANIFEST) : path.join(root, "content/artwork/manifest.json");
const candidatesPath = path.join(root, "content/artwork/candidates.json");
const artOut = process.env.ART_OUT ? path.resolve(process.env.ART_OUT) : path.join(root, "public/art");
const outDir = path.join(artOut, "scenes");
const filmDir = path.join(artOut, "film");
const candDir = path.join(artOut, "candidates");
const artManifestPath = process.env.ART_OUT ? path.join(artOut, "art-manifest.json") : path.join(root, "src/components/hero/art-manifest.json");

const FFMPEG = process.env.FFMPEG || "ffmpeg";
// With FFMPEG pointing at a file, look for ffprobe next to it; otherwise on PATH.
const FFPROBE = process.env.FFPROBE || (FFMPEG.includes(path.sep) ? path.join(path.dirname(FFMPEG), "ffprobe") : "ffprobe");
const REENCODE = process.env.REENCODE === "true";

const MAX_WIDTH = 2560; // desktop videos
const MAX_WIDTH_SM = 1280; // phone videos
const POSTER_WIDTH = 1200;
const POSTER_WIDTH_SM = 640;
const SHEET_TILE = 320; // contact-sheet tile width
const SHEET_STOPS = [0, 0.25, 0.5, 0.75, 1];
const CLIP_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOWNLOAD_ATTEMPTS = 3;
const LEGACY_FRAME = /^f\d+\.(?:webp|png)$/;

/** The six files every encoded clip must have; the manifest record points at them by URL path. */
const OUTPUTS = ["clip.webm", "clip.mp4", "clip-sm.webm", "clip-sm.mp4", "poster.webp", "poster-sm.webp"];

const VP9 = ["-c:v", "libvpx-vp9", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2"];
const H264 = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-movflags", "+faststart"];
const VIDEOS = [
  { file: "clip.webm", width: MAX_WIDTH, codec: () => [...VP9, "-crf", "31"] },
  { file: "clip.mp4", width: MAX_WIDTH, codec: (level) => [...H264, "-crf", "20", "-level", level] },
  { file: "clip-sm.webm", width: MAX_WIDTH_SM, codec: () => [...VP9, "-crf", "32"] },
  { file: "clip-sm.mp4", width: MAX_WIDTH_SM, codec: (level) => [...H264, "-crf", "21", "-level", level] },
];

const isLocal = (source) => source.startsWith("/") || source.startsWith("file:");
const localPath = (source) => (source.startsWith("file:") ? fileURLToPath(source) : source);
const fmtBytes = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} kB`);
const round = (n, digits) => +Number(n).toFixed(digits);
const rel = (file) => (path.relative(root, file).startsWith("..") ? file : path.relative(root, file)); // for logs
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads a source into memory: a local file straight away, an https URL with retries (not on 4xx). */
async function download(url) {
  if (isLocal(url)) return fs.readFileSync(localPath(url));
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(300_000) });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      const err = new Error(`${res.status} ${res.statusText} for ${url}`);
      if (res.status >= 400 && res.status < 500) throw Object.assign(err, { final: true });
      throw err;
    } catch (err) {
      if (err.final || attempt === DOWNLOAD_ATTEMPTS) throw err;
      console.log(`  download failed (${err.cause?.code ?? err.message}), retrying in ${attempt * 2} s`);
      await sleep(attempt * 2000);
    }
  }
}

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
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
 * ffmpeg helpers
 * -------------------------------------------------------------------------------------------- */

function binaryWorks(bin) {
  const r = spawnSync(bin, ["-version"], { stdio: "ignore" });
  return !r.error && r.status === 0;
}

function run(bin, args, { allowFailure = false } = {}) {
  const r = spawnSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status !== 0 && !allowFailure) throw new Error(`${path.basename(bin)} ${args.join(" ")} failed (exit ${r.status}):\n${r.stderr}`);
  return r;
}

const ffmpeg = (args, opts) => run(FFMPEG, ["-hide_banner", "-nostdin", "-loglevel", "error", ...args], opts);

const fraction = (s) => {
  const [n, d] = String(s ?? "").split("/").map(Number);
  return d === undefined ? n : n / d;
};

let haveFfprobe = false;

/** Width, height, frame rate and duration of a video: ffprobe when present, else the summary `ffmpeg -i` prints. */
function probe(file) {
  let width, height, fps, duration;
  if (haveFfprobe) {
    const entries = "stream=width,height,r_frame_rate,avg_frame_rate,duration:format=duration";
    const r = run(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_entries", entries, "-of", "json", file]);
    const info = JSON.parse(r.stdout);
    const s = info.streams?.[0] ?? {};
    ({ width, height } = s);
    fps = fraction(s.avg_frame_rate) || fraction(s.r_frame_rate);
    duration = Number(s.duration ?? info.format?.duration);
  } else {
    // Without an output, ffmpeg prints the stream summary to stderr and exits 1 — that is the probe.
    const r = ffmpeg(["-loglevel", "info", "-i", file], { allowFailure: true });
    const text = r.stderr ?? "";
    const video = /Stream #\d+:\d+.*?: Video: .*/.exec(text)?.[0] ?? "";
    const size = /[, ](\d{2,5})x(\d{2,5})[ ,[]/.exec(video);
    const rate = /([\d.]+) fps/.exec(video) ?? /([\d.]+) tbr/.exec(video);
    const dur = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
    if (size) [width, height] = [Number(size[1]), Number(size[2])];
    if (rate) fps = Number(rate[1]);
    if (dur) duration = Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]);
  }
  if (!(width > 0 && height > 0 && fps > 0 && duration >= 0)) throw new Error(`could not read the size, frame rate and duration of ${file}`);
  return { width, height, fps: round(fps, 3), duration: round(duration, 3) };
}

/**
 * The lowest H.264 level that holds the output (4.2 up to 2048×1080@60, else 5.1); a stream tagged
 * below its real level makes some hardware decoders refuse it.
 */
function h264Level(width, height, fps) {
  const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
  return macroblocks <= 8704 && macroblocks * fps <= 522240 ? "4.2" : "5.1";
}

/* ----------------------------------------------------------------------------------------------
 * Clips → video
 * -------------------------------------------------------------------------------------------- */

/** Validates one manifest clip and fills in the defaults the encode and the change check rely on. */
function normaliseClip(clip) {
  const { id, source } = clip;
  if (typeof id !== "string" || !CLIP_ID.test(id)) throw new Error(`clip id "${id}" must be lower-case letters, digits and hyphens`);
  if (typeof source !== "string") throw new Error(`clip ${id}: source must be a URL or an absolute path`);
  let trim = null;
  if (clip.trim != null) {
    const ok = Array.isArray(clip.trim) && clip.trim.length === 2 && clip.trim.every(Number.isFinite) && clip.trim[0] >= 0 && clip.trim[1] > clip.trim[0];
    if (!ok) throw new Error(`clip ${id}: trim must be [start, end] in seconds with end > start`);
    trim = [clip.trim[0], clip.trim[1]];
  }
  let impactAt = null;
  if (clip.impactAt != null) {
    if (!Number.isFinite(clip.impactAt) || clip.impactAt < 0) throw new Error(`clip ${id}: impactAt must be a number of seconds ≥ 0`);
    impactAt = clip.impactAt;
  }
  // `fps` of old manifests is ignored: the videos keep the source's frame rate.
  return { id, source, reverse: clip.reverse === true, trim, loop: clip.loop === true, impactAt };
}

/** True when the previous record was made from the same source with the same cut. */
function sameSettings(prev, clip) {
  return prev.source === clip.source && (prev.reverse === true) === clip.reverse && (prev.loop === true) === clip.loop && JSON.stringify(prev.trim ?? null) === JSON.stringify(clip.trim);
}

/** A record of the video shape (Contract 2), as opposed to a frame-sequence record of the old pipeline. */
function usableRecord(prev) {
  return Boolean(prev) && typeof prev.video?.webm === "string" && [prev.width, prev.height, prev.duration, prev.fps].every(Number.isFinite) && typeof prev.lqip === "string";
}

function outputsPresent(dir) {
  return OUTPUTS.every((f) => {
    const file = path.join(dir, f);
    return fs.existsSync(file) && fs.statSync(file).size > 0;
  });
}

/**
 * Maps `impactAt` (seconds on the forward, untrimmed source) into the output timeline: trim moves the
 * origin, reverse mirrors it within the forward pass, a loop keeps the forward-half time. Null when it
 * falls outside the output.
 */
function mapImpact(clip, duration) {
  if (clip.impactAt == null) return null;
  const forward = clip.loop ? duration / 2 : duration;
  let t = clip.impactAt - (clip.trim ? clip.trim[0] : 0);
  if (clip.reverse) t = forward - t;
  return t >= 0 && t <= duration ? round(t, 3) : null;
}

/** The art-manifest record of a clip (Contract 2) from its settings and the measured output. */
function record(clip, out, impactAt) {
  const base = `/art/film/${clip.id}`;
  return {
    source: clip.source,
    width: out.width,
    height: out.height,
    aspect: +(out.width / out.height).toFixed(4),
    duration: out.duration,
    fps: out.fps,
    reverse: clip.reverse,
    trim: clip.trim,
    loop: clip.loop,
    impactAt,
    video: { webm: `${base}/clip.webm`, mp4: `${base}/clip.mp4`, webmSmall: `${base}/clip-sm.webm`, mp4Small: `${base}/clip-sm.mp4` },
    poster: `${base}/poster.webp`,
    posterSmall: `${base}/poster-sm.webp`,
    lqip: out.lqip,
  };
}

/** The previous record again, in the current shape, with the settings its files were made with (so a later run still re-encodes). */
function keepPrevious(id, prev) {
  const settings = { id, source: prev.source, reverse: prev.reverse === true, trim: prev.trim ?? null, loop: prev.loop === true };
  return record(settings, prev, prev.impactAt ?? null);
}

/** Puts the source next to the temp files: local files are used in place, URLs are downloaded. */
async function fetchSource(source, tmp) {
  if (isLocal(source)) {
    const file = localPath(source);
    if (!fs.existsSync(file)) throw new Error(`source not found: ${file}`);
    return file;
  }
  const file = path.join(tmp, "source.mp4");
  fs.writeFileSync(file, await download(source));
  return file;
}

/**
 * Trim → reverse → ping-pong loop → even size → yuv420p, once, into a near-lossless H.264 file at the
 * source's resolution and frame rate. Returns the number of frames written.
 */
function encodeIntermediate(input, clip, out) {
  const args = ["-y"];
  // Input-side seeking: -ss starts decoding at `start`, -t stops after `end − start` seconds.
  if (clip.trim) args.push("-ss", String(clip.trim[0]), "-t", String(clip.trim[1] - clip.trim[0]));
  const chain = [];
  if (clip.reverse) chain.push("reverse");
  if (clip.loop) chain.push("split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0");
  chain.push("scale=trunc(iw/2)*2:trunc(ih/2)*2", "format=yuv420p"); // libx264 needs even sizes; sources are, but be sure
  args.push("-i", input, "-filter_complex", `[0:v]${chain.join(",")}[v]`, "-map", "[v]");
  args.push("-c:v", "libx264", "-preset", "fast", "-crf", "8", "-pix_fmt", "yuv420p", "-an", "-nostats", "-progress", "pipe:1", out);
  const r = ffmpeg(args);
  const frames = [...r.stdout.matchAll(/^frame=\s*(\d+)/gm)].pop();
  return frames ? Number(frames[1]) : 0;
}

/** One deliverable from the intermediate: scale to the variant's width (never up), yuv420p, no audio. */
function encodeVideo(inter, spec, master, out) {
  const width = Math.min(spec.width, master.width);
  const level = h264Level(width, Math.round((master.height * width) / master.width), master.fps);
  ffmpeg(["-y", "-i", inter, "-vf", `scale='min(${spec.width},iw)':-2,format=yuv420p`, ...spec.codec(level), "-pix_fmt", "yuv420p", "-an", out]);
}

/** "Write every selected frame as it comes" is -fps_mode passthrough since ffmpeg 5.1; older builds only know -vsync 0. */
let passthrough = ["-fps_mode", "passthrough"];

/**
 * Extracts the frames with the given indices (0-based, ascending) of `video` as PNG files into `dir`;
 * returns index → path. Without passthrough the image muxer would pad the gaps between picks with
 * duplicates.
 */
function extractFrames(video, indices, dir) {
  const picks = [...new Set(indices)].sort((a, b) => a - b);
  const select = picks.map((n) => `eq(n,${n})`).join("+");
  const args = ["-y", "-i", video, "-vf", `select='${select}'`, ...passthrough, "-frames:v", String(picks.length), path.join(dir, "pick%d.png")];
  const r = ffmpeg(args, { allowFailure: passthrough[0] === "-fps_mode" });
  if (r.status !== 0) {
    if (!/fps_mode/.test(r.stderr)) throw new Error(`ffmpeg failed to read frames of ${video} (exit ${r.status}):\n${r.stderr}`);
    passthrough = ["-vsync", "0"];
    return extractFrames(video, indices, dir);
  }
  const frames = new Map();
  picks.forEach((n, k) => {
    const file = path.join(dir, `pick${k + 1}.png`);
    if (fs.existsSync(file)) frames.set(n, file);
  });
  if (!frames.size) throw new Error(`no frames could be read from ${video}`);
  return frames;
}

/** The five stops (0 → 100 %) of a video with `frames` frames as PNG files; a stop past the end uses the last frame found. */
function sheetFrames(video, frames, dir) {
  const picks = SHEET_STOPS.map((k) => Math.round(Math.max(frames - 1, 0) * k));
  const found = extractFrames(video, picks, dir);
  const last = [...found.keys()].pop();
  return picks.map((n) => found.get(n) ?? found.get(last));
}

/** poster.webp, poster-sm.webp and the tiny placeholder, all from the first output frame. */
async function writePosters(png, dir) {
  const img = sharp(png);
  await img.clone().resize({ width: POSTER_WIDTH, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toFile(path.join(dir, "poster.webp"));
  await img.clone().resize({ width: POSTER_WIDTH_SM, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toFile(path.join(dir, "poster-sm.webp"));
  const lqip = await img.clone().resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${lqip.toString("base64")}`;
}

/** Five frames (0 → 100 %) side by side on a white canvas: a quick check that the clip was cut right. */
async function writeSheet(pngs, dir) {
  const tiles = await Promise.all(pngs.map((png) => sharp(png).resize({ width: SHEET_TILE }).png().toBuffer({ resolveWithObject: true })));
  const height = Math.max(...tiles.map((t) => t.info.height));
  await sharp({ create: { width: SHEET_TILE * tiles.length, height, channels: 3, background: "#ffffff" } })
    .composite(tiles.map((t, n) => ({ input: t.data, left: n * SHEET_TILE, top: 0 })))
    .jpeg({ quality: 80 })
    .toFile(path.join(dir, "sheet.jpg"));
}

/** Rebuilds sheet.jpg of an already encoded clip from its clip.mp4. */
async function rebuildSheet(dir, prev) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "film-sheet-"));
  try {
    await writeSheet(sheetFrames(path.join(dir, "clip.mp4"), Math.round(prev.duration * prev.fps), tmp), dir);
    console.log(`  wrote ${rel(path.join(dir, "sheet.jpg"))}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** Downloads, cuts and encodes one clip into public/art/film/<id>; returns its art-manifest record. */
async function processClip(clip, dir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `film-${clip.id}-`));
  const staging = path.join(filmDir, `.${clip.id}.tmp`);
  try {
    const input = await fetchSource(clip.source, tmp);
    const src = probe(input);
    console.log(`  source ${src.width}×${src.height}, ${src.fps} fps, ${src.duration} s, ${fmtBytes(fs.statSync(input).size)}`);
    const inter = path.join(tmp, "master.mp4");
    const frames = encodeIntermediate(input, clip, inter);
    if (!frames) throw new Error(`ffmpeg produced no frames for clip ${clip.id} — check its trim`);
    const master = probe(inter);

    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });
    for (const spec of VIDEOS) encodeVideo(inter, spec, master, path.join(staging, spec.file));
    const stops = sheetFrames(inter, frames, tmp);
    const lqip = await writePosters(stops[0], staging);
    await writeSheet(stops, staging);

    const out = probe(path.join(staging, "clip.mp4"));
    const duration = round(frames / out.fps, 3); // exact, where the container's duration is rounded
    const sizes = OUTPUTS.map((f) => `${f} ${fmtBytes(fs.statSync(path.join(staging, f)).size)}`).join(" · ");
    fs.rmSync(dir, { recursive: true, force: true });
    fs.renameSync(staging, dir);
    console.log(`  ${sizes}`);
    console.log(`  output ${out.width}×${out.height}, ${out.fps} fps, ${duration} s (${frames} frames) → ${rel(dir)}`);
    return record(clip, { ...out, duration, lqip }, mapImpact(clip, duration));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

/** Deletes the frame sequence of the old pipeline (f001.webp … and sm/) that the engine no longer reads. */
function removeLegacyFrames(dir) {
  if (!fs.existsSync(dir)) return;
  let frames = 0;
  for (const entry of fs.readdirSync(dir)) {
    if (LEGACY_FRAME.test(entry)) {
      fs.unlinkSync(path.join(dir, entry));
      frames++;
    }
  }
  const sm = path.join(dir, "sm");
  const hadSm = fs.existsSync(sm);
  if (hadSm) fs.rmSync(sm, { recursive: true, force: true });
  if (frames || hadSm) console.log(`× removed ${frames} old frames${hadSm ? " and sm/" : ""} from ${rel(dir)}`);
}

/** Deletes public/art/film/<id> for every id that is not in `keep` (includes leftovers of failed runs). */
function removeStaleClipDirs(keep) {
  if (!fs.existsSync(filmDir)) return;
  for (const entry of fs.readdirSync(filmDir)) {
    if (keep.has(entry)) continue;
    fs.rmSync(path.join(filmDir, entry), { recursive: true, force: true });
    console.log(`× removed ${rel(path.join(filmDir, entry))}`);
  }
  if (fs.readdirSync(filmDir).length === 0) fs.rmdirSync(filmDir);
}

/** Returns the `clips` block for art-manifest.json (empty when no clip has a video yet) and the ids that failed. */
async function processClips(manifest, existing) {
  const haveFfmpeg = binaryWorks(FFMPEG);
  if (!haveFfmpeg) console.log(`skipping clips: ${FFMPEG} not found (stills are unaffected; install ffmpeg or set FFMPEG= to encode the clips)`);
  haveFfprobe = haveFfmpeg && binaryWorks(FFPROBE);
  if (haveFfmpeg && !haveFfprobe) console.log("ffprobe not found: reading video sizes from ffmpeg's own summary instead");
  const listed = Array.isArray(manifest.clips) ? manifest.clips.filter((c) => c.source).map(normaliseClip) : null;
  removeStaleClipDirs(new Set((listed ?? []).map((c) => c.id)));

  const seen = new Set();
  const clips = {};
  const failed = [];
  for (const clip of listed ?? []) {
    if (seen.has(clip.id)) throw new Error(`clip id "${clip.id}" is listed twice`);
    seen.add(clip.id);
    const dir = path.join(filmDir, clip.id);
    removeLegacyFrames(dir);
    const prev = existing.clips?.[clip.id];
    const prevUsable = usableRecord(prev) && outputsPresent(dir);
    if (prevUsable && !REENCODE && sameSettings(prev, clip)) {
      console.log(`= clip ${clip.id} unchanged (${prev.width}×${prev.height}, ${prev.duration} s)`);
      if (haveFfmpeg && !fs.existsSync(path.join(dir, "sheet.jpg"))) await rebuildSheet(dir, prev);
      clips[clip.id] = record(clip, prev, mapImpact(clip, prev.duration));
      continue;
    }
    if (!haveFfmpeg) {
      if (prevUsable) {
        console.log(`  clip ${clip.id}: settings changed, keeping the previous video until ffmpeg runs`);
        clips[clip.id] = keepPrevious(clip.id, prev);
      } else {
        console.log(`  clip ${clip.id}: no video yet`);
      }
      continue;
    }
    const detail = [clip.reverse && "reversed", clip.trim && `${clip.trim[0]}–${clip.trim[1]} s`, clip.loop && "ping-pong loop", clip.impactAt != null && `impact at ${clip.impactAt} s`]
      .filter(Boolean)
      .join(", ");
    console.log(`↓ clip ${clip.id}${detail ? ` (${detail})` : ""}`);
    fs.mkdirSync(filmDir, { recursive: true });
    try {
      clips[clip.id] = await processClip(clip, dir);
    } catch (err) {
      failed.push(clip.id);
      console.error(`! clip ${clip.id}: ${err.message}${err.cause?.code ? ` (${err.cause.code})` : ""}`);
      if (prevUsable) {
        console.log(`  keeping the previous video of ${clip.id}`);
        clips[clip.id] = keepPrevious(clip.id, prev);
      }
    }
  }
  return { clips, failed };
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
  if (!fs.existsSync(manifestPath)) {
    console.log(`no manifest at ${manifestPath}`);
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const existing = readJson(artManifestPath, { scenes: {} });
    const scenes = await processScenes(manifest, existing);
    const { clips, failed } = await processClips(manifest, existing);
    // The "clips" key only appears once at least one clip has a video, so art-manifest.json stays
    // byte-identical on machines without ffmpeg.
    const out = Object.keys(clips).length ? { scenes, clips } : { scenes };
    if (fs.existsSync(artManifestPath) && JSON.stringify(existing) === JSON.stringify(out)) {
      console.log(`${rel(artManifestPath)} unchanged`);
    } else {
      fs.mkdirSync(path.dirname(artManifestPath), { recursive: true });
      fs.writeFileSync(artManifestPath, JSON.stringify(out, null, 2) + "\n");
      console.log(`wrote ${rel(artManifestPath)}`);
    }
    if (failed.length) {
      console.error(`${failed.length} clip(s) could not be encoded: ${failed.join(", ")} — previous videos were kept where they existed`);
      process.exitCode = 1;
    }
  }
  await processCandidates();
}

await main();
