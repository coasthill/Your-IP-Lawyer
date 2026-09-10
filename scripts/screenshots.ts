/**
 * Captures screenshots of key pages at desktop / tablet / mobile sizes for visual review.
 *
 *   npm run screenshots                 (expects the site at http://localhost:3000)
 *   BASE_URL=http://localhost:3001 npm run screenshots
 *
 * Output: ./screenshots/<viewport>/<page>.png (and homepage scroll frames).
 * The homepage frames use `?snap` (no easing) and, for a few beats, `?t=<seconds>` so the clips
 * are captured mid-motion (the strike after the gavel has landed, the sapling grown, the water
 * pouring) instead of on their first frame. Arriving at a bridged beat forward plays the bridge
 * into it first (about four seconds), so the scroll frames wait it out before capturing the beat;
 * one frame (p = 0.11, `t=2`) captures a bridge itself, mid-motion.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.join(process.cwd(), "screenshots");
const EXE = process.env.CHROME_PATH || (fs.existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined);

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, mobile: false },
  tablet: { width: 834, height: 1112, mobile: true },
  mobile: { width: 390, height: 844, mobile: true },
} as const;

const PAGES = ["/", "/about", "/blog", "/forum", "/submission-guidelines", "/contact", "/admin/login", "/does-not-exist"];

async function shoot(browser: Browser, name: keyof typeof VIEWPORTS) {
  const vp = VIEWPORTS[name];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });

  for (const route of PAGES) {
    const file = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "_");
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(route === "/" ? 4000 : 800);
      await page.screenshot({ path: path.join(dir, `${file}.png`), fullPage: route !== "/" });
      console.log(`✔ ${name} ${route}`);
    } catch (err) {
      console.warn(`✖ ${name} ${route}:`, (err as Error).message);
    }
  }

  // Homepage scroll frames (forces the tier appropriate for the viewport)
  const tier = "webgl"; // the painted stage runs in WebGL on every device; ?render=canvas|static exercises the fallbacks
  try {
    // `t` freezes the clips on screen at that second (the bridge from the advocate into the gown, the strike after the impact, the sapling grown, the water pouring).
    const steps: Array<{ p: number; t?: number }> = [
      { p: 0 },
      { p: 0.05 },
      { p: 0.11, t: 2 },
      { p: 0.15 },
      { p: 0.22 },
      { p: 0.3 },
      { p: 0.36, t: 3.9 },
      { p: 0.39 },
      { p: 0.48 },
      { p: 0.6 },
      { p: 0.72 },
      { p: 0.83, t: 4 },
      { p: 0.94 },
      { p: 1.0, t: 3 },
    ];
    const scrollTo = async (p: number) => {
      const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      const stage = await page.evaluate(() => (document.querySelector("[data-tier]") as HTMLElement | null)?.offsetHeight ?? 0);
      const y = Math.round(Math.min(total, (stage - vp.height) * p));
      await page.evaluate((yy) => {
        const w = window as unknown as { __lenis?: { scrollTo: (v: number, o: { immediate: boolean }) => void } };
        if (w.__lenis) w.__lenis.scrollTo(yy, { immediate: true });
        else window.scrollTo({ top: yy, behavior: "instant" as ScrollBehavior });
      }, y);
      await page.waitForTimeout(900);
    };
    /** A forward arrival at a bridged beat shows its bridge first: wait until the beat's own clip has taken over. */
    const pastBridge = () =>
      page
        .waitForFunction(() => !(window as unknown as { __yilFrame?: { video: { bridge: boolean } | null } }).__yilFrame?.video?.bridge, null, { timeout: 10_000 })
        .catch(() => undefined);
    const shot = (p: number) => page.screenshot({ path: path.join(dir, `home_scroll_${String(Math.round(p * 100)).padStart(3, "0")}.png`) });

    await page.goto(`${BASE}/?render=${tier}&snap`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(4500);
    for (const step of steps.filter((s) => s.t === undefined)) {
      await scrollTo(step.p);
      await pastBridge();
      await shot(step.p);
    }
    // Each held frame is its own page load: `t` applies to whatever is on screen once it settles.
    // The hold reports its clip as "ended" on window.__yilFrame once the seek has landed (a deep
    // seek into a 2K clip can take a few seconds without hardware decoding), so wait for that.
    for (const step of steps.filter((s) => s.t !== undefined)) {
      await page.goto(`${BASE}/?render=${tier}&snap&t=${step.t}`, { waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(4500);
      await scrollTo(step.p);
      await page
        .waitForFunction(() => (window as unknown as { __yilFrame?: { video: { state: string } | null } }).__yilFrame?.video?.state === "ended", null, { timeout: 8_000 })
        .catch(() => undefined);
      await page.waitForTimeout(400);
      await shot(step.p);
    }
    console.log(`✔ ${name} homepage scroll frames`);
  } catch (err) {
    console.warn(`✖ ${name} scroll frames:`, (err as Error).message);
  }
  await context.close();
}

async function main() {
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  for (const name of Object.keys(VIEWPORTS) as Array<keyof typeof VIEWPORTS>) await shoot(browser, name);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
