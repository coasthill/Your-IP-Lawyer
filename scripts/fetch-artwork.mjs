/**
 * Downloads the artwork listed in content/artwork/manifest.json and writes web-ready versions:
 *   public/art/scenes/<id>.webp             2000px wide (desktop)
 *   public/art/scenes/<id>-sm.webp          1100px wide (phones)
 *   src/components/hero/art-manifest.json   sizes, focal points and tiny blurred placeholders
 *
 * With WITH_CANDIDATES=true it also writes 1000px review copies of content/artwork/candidates.json
 * into public/art/candidates/.
 *
 * It runs inside the "Fetch artwork" GitHub Action (which has internet access) and also works locally:
 *   NODE_PATH=node_modules node scripts/fetch-artwork.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const manifestPath = path.join(root, "content/artwork/manifest.json");
const candidatesPath = path.join(root, "content/artwork/candidates.json");
const outDir = path.join(root, "public/art/scenes");
const candDir = path.join(root, "public/art/candidates");
const artManifestPath = path.join(root, "src/components/hero/art-manifest.json");

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function processScenes() {
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  fs.mkdirSync(outDir, { recursive: true });
  const existing = fs.existsSync(artManifestPath) ? JSON.parse(fs.readFileSync(artManifestPath, "utf8")) : { scenes: {} };
  const out = { scenes: {} };
  for (const scene of manifest.scenes) {
    if (!scene.source) continue;
    const prev = existing.scenes?.[scene.id];
    if (prev && prev.source === scene.source && fs.existsSync(path.join(outDir, `${scene.id}.webp`))) {
      console.log(`= ${scene.id} unchanged`);
      out.scenes[scene.id] = { ...prev, focal: scene.focal ?? prev.focal };
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
    out.scenes[scene.id] = {
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
  fs.writeFileSync(artManifestPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${path.relative(root, artManifestPath)}`);
}

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

await processScenes();
await processCandidates();
