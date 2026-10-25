// Captures README screenshots from a running Anglerfish (default: the mock-backed server).
//   BASE=http://localhost:3000 node scripts/screenshots.mjs
// Writes docs/screenshots/{home,case,report}.png
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });

// 1. home
await page.goto(BASE);
await page.waitForSelector("textarea");
await page.screenshot({ path: `${OUT}/home.png` });

// 2. create a scam case through the real UI
await page.fill("textarea", "https://quick-loan-approval.co/apply");
await page.click("text=Investigate");
await page.waitForURL(/\/case\//);
await page.waitForSelector("text=View dossier", { timeout: 120_000 });
await page.waitForSelector(".react-flow__node", { timeout: 15_000 }); // graph laid out
await page.waitForTimeout(1200); // thumbnails + fitView settle
await page.screenshot({ path: `${OUT}/case.png`, fullPage: true });

// 3. dossier
await page.click("text=View dossier");
await page.waitForSelector("text=Pre-filled cybercrime.gov.in complaint");
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/report.png`, fullPage: true });

// 4. legit case — shows the verdict gate
await page.goto(BASE);
await page.fill("textarea", "https://example-legit-saas.com/");
await page.click("text=Investigate");
await page.waitForURL(/\/case\//);
await page.waitForSelector("text=View assessment", { timeout: 120_000 });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/legit.png` });

await browser.close();
console.log(`wrote ${OUT}/home.png case.png report.png legit.png`);
