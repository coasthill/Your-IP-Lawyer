/**
 * Captures screenshots of key pages at desktop / tablet / mobile sizes for visual review.
 *
 *   npm run screenshots                 (expects the site at http://localhost:3000)
 *   BASE_URL=http://localhost:3001 npm run screenshots
 *
 * Output: ./screenshots/<viewport>/<page>.png (and homepage scroll frames).
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
  const tier = name === "desktop" ? "webgl" : "canvas";
  try {
    await page.goto(`${BASE}/?render=${tier}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(4500);
    const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    const stage = await page.evaluate(() => (document.querySelector("[data-tier]") as HTMLElement | null)?.offsetHeight ?? 0);
    const steps = [0, 0.05, 0.15, 0.22, 0.3, 0.36, 0.39, 0.48, 0.6, 0.72, 0.83, 0.94, 1.0];
    for (const p of steps) {
      const y = Math.round(Math.min(total, (stage - vp.height) * p));
      await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" as ScrollBehavior }), y);
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(dir, `home_scroll_${String(Math.round(p * 100)).padStart(3, "0")}.png`) });
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
