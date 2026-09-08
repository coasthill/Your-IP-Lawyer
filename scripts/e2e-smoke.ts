/**
 * End-to-end smoke test against a running site (default http://localhost:3000).
 * Exercises the real user journeys: guest comment, forum thread + reply, article submission with a PDF,
 * admin sign-in, moderation, document upload and post creation.
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run e2e
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EXE = process.env.CHROME_PATH || (fs.existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome") ? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" : undefined);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "local-dev-password-123";
const stamp = Date.now().toString(36);

const results: Array<{ name: string; ok: boolean; note?: string }> = [];
async function step(name: string, fn: () => Promise<string | void>) {
  try {
    const note = await fn();
    results.push({ name, ok: true, note: note ?? undefined });
    console.log(`✔ ${name}${note ? ` — ${note}` : ""}`);
  } catch (err) {
    results.push({ name, ok: false, note: (err as Error).message.split("\n")[0] });
    console.log(`✖ ${name} — ${(err as Error).message.split("\n")[0]}`);
  }
}

function tmpPdf(): string {
  const p = path.join(process.cwd(), ".data", `smoke-${stamp}.pdf`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  return p;
}

async function main() {
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  let articleUrl = "";
  await step("blog index lists articles", async () => {
    await page.goto(`${BASE}/blog`, { waitUntil: "networkidle" });
    const link = page.locator('a[href^="/blog/"]:not([href*="/category/"]):not([href*="/tag/"])').first();
    articleUrl = (await link.getAttribute("href")) || "";
    if (!articleUrl) throw new Error("no article link found");
    return articleUrl;
  });

  await step("guest comment is accepted", async () => {
    await page.goto(`${BASE}${articleUrl}`, { waitUntil: "networkidle" });
    await page.fill('form input[name="name"]', "Smoke Tester");
    await page.fill('form textarea[name="body"]', `A thoughtful test comment ${stamp}. Objection welcome.`);
    await page.locator('form button[type="submit"]').filter({ hasText: /file|post|comment|submit/i }).first().click();
    await page.waitForTimeout(2500);
    const text = await page.locator("body").innerText();
    if (!/Filed|Received|reviewed/i.test(text)) throw new Error("no success notice after comment");
    return /Filed/.test(text) ? "approved immediately" : "held for moderation";
  });

  let threadUrl = "";
  await step("guest can start a forum discussion", async () => {
    await page.goto(`${BASE}/forum/new`, { waitUntil: "networkidle" });
    await page.fill('input[name="title"]', `Smoke discussion ${stamp} about interim relief`);
    await page.fill('textarea[name="body"]', "How quickly do courts usually list an application for interim relief in a trade mark matter? Asking as a junior who has never filed one. Opinions welcome.");
    const select = page.locator('select[name="categoryId"]');
    if (await select.count()) await select.selectOption({ index: 1 });
    await page.fill('input[name="name"]', "Junior Counsel");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    if (page.url().includes("/forum/") && !page.url().endsWith("/forum/new")) {
      threadUrl = new URL(page.url()).pathname;
      return `live at ${threadUrl}`;
    }
    const text = await page.locator("body").innerText();
    if (/Received|reviewed/i.test(text)) return "held for moderation";
    throw new Error("no redirect or notice after creating a thread");
  });

  if (threadUrl) {
    await step("guest can reply to a discussion", async () => {
      await page.goto(`${BASE}${threadUrl}`, { waitUntil: "networkidle" });
      await page.fill('form textarea[name="body"]', `A reply for the record ${stamp}.`);
      const name = page.locator('form input[name="name"]').last();
      if (await name.count()) await name.fill("Reply Tester");
      await page.locator('form button[type="submit"]').last().click();
      await page.waitForTimeout(2500);
      const text = await page.locator("body").innerText();
      if (!/A reply for the record|Received|reviewed|Filed/i.test(text)) throw new Error("reply not visible and no notice");
    });
  }

  await step("submission form accepts a PDF", async () => {
    await page.goto(`${BASE}/submission-guidelines`, { waitUntil: "networkidle" });
    await page.fill('input[name="name"]', "Smoke Author");
    await page.fill('input[name="email"]', "author@example.com");
    await page.fill('input[name="title"]', `A smoke-test case note ${stamp}`);
    await page.fill('textarea[name="abstract"]', "This is an automated smoke-test submission. It has enough characters to pass validation and describes a hypothetical case note about interim injunctions in design infringement matters.");
    const file = page.locator('input[type="file"]');
    if (await file.count()) await file.setInputFiles(tmpPdf());
    await page.locator('form:has(textarea[name="abstract"]) button[type="submit"]').click();
    await page.waitForTimeout(3000);
    const text = await page.locator("body").innerText();
    if (!/Received|Counsel will revert/i.test(text)) throw new Error("no success notice after submission");
  });

  await step("admin can sign in", async () => {
    await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await Promise.all([page.waitForURL(/\/admin(?!\/login)/, { timeout: 30000 }), page.click('button[type="submit"]')]);
  });

  await step("admin sees the submission", async () => {
    await page.goto(`${BASE}/admin/submissions`, { waitUntil: "networkidle" });
    const text = await page.locator("body").innerText();
    if (!text.includes(`A smoke-test case note ${stamp}`)) throw new Error("submission not listed");
  });

  await step("admin can upload a PDF to the library", async () => {
    await page.goto(`${BASE}/admin/documents`, { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles(tmpPdf());
    const title = page.locator('input[name="title"]').first();
    if (await title.count()) await title.fill(`Smoke PDF ${stamp}`);
    await page.locator('form:has(input[type="file"]) button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    const text = await page.locator("body").innerText();
    if (!/smoke-/.test(text) && !text.includes(`Smoke PDF ${stamp}`)) throw new Error("uploaded file not listed");
  });

  await step("uploaded file is served", async () => {
    await page.goto(`${BASE}/admin/documents`, { waitUntil: "networkidle" });
    const href = await page.locator('a[href*="/api/uploads/"], a[href*="blob.vercel-storage"], a[href*="/uploads/"]').first().getAttribute("href");
    if (!href) throw new Error("no file link found");
    const res = await page.request.get(href.startsWith("http") ? href : `${BASE}${href}`);
    if (res.status() !== 200) throw new Error(`file responded ${res.status()}`);
    const type = res.headers()["content-type"] || "";
    if (!type.includes("pdf")) throw new Error(`unexpected content-type ${type}`);
  });

  await step("admin can create and publish a post", async () => {
    await page.goto(`${BASE}/admin/posts/new`, { waitUntil: "networkidle" });
    await page.fill('input[name="title"]', `Smoke article ${stamp}`);
    await page.fill('textarea[name="bodyMd"]', "## Heading\n\nA paragraph written by the smoke test.\n\n> A quote.\n\n1. One\n2. Two");
    const status = page.locator('select[name="status"]');
    if (await status.count()) await status.selectOption("published");
    await page.locator('button[type="submit"]').filter({ hasText: /save/i }).first().click();
    await page.waitForTimeout(3000);
    await page.goto(`${BASE}/blog`, { waitUntil: "networkidle" });
    const text = await page.locator("body").innerText();
    if (!text.includes(`Smoke article ${stamp}`)) throw new Error("published article not on /blog");
  });

  await step("admin comments queue renders", async () => {
    await page.goto(`${BASE}/admin/comments?status=all`, { waitUntil: "networkidle" });
    const text = await page.locator("body").innerText();
    if (!text.includes("Smoke Tester")) throw new Error("test comment not in the queue");
  });

  await step("sitemap and robots respond", async () => {
    const s = await page.request.get(`${BASE}/sitemap.xml`);
    const r = await page.request.get(`${BASE}/robots.txt`);
    if (s.status() !== 200 || r.status() !== 200) throw new Error(`sitemap ${s.status()} robots ${r.status()}`);
    const xml = await s.text();
    if (!xml.includes("/blog/")) throw new Error("sitemap has no articles");
  });

  await step("404 page has the record microcopy", async () => {
    const res = await page.goto(`${BASE}/this-does-not-exist`, { waitUntil: "networkidle" });
    if (res?.status() !== 404) throw new Error(`status ${res?.status()}`);
    const text = await page.locator("body").innerText();
    if (!/left the record/i.test(text)) throw new Error("wrong 404 copy");
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
  if (consoleErrors.length) console.log("page errors:", consoleErrors.slice(0, 5));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
