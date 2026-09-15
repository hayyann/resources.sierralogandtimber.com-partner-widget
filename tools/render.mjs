/* Drives the real widget in a real browser: types a query, presses a state,
   clicks a result, and reads the height message the parent receives. */
import { chromium } from "playwright";

const base = "http://localhost:4321";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
const problems = [];
page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") problems.push("console: " + m.text()); });

await page.goto(base + "/tools/preview.html", { waitUntil: "networkidle" });

const frameEl = await page.$("#slt-resources-frame");
const src = await frameEl.getAttribute("src");
console.log("iframe src:", src);
console.log("  carries source:", /source=localhost/.test(src));

const f = await frameEl.contentFrame();
await f.waitForSelector(".slt-input");

const h0 = await page.evaluate(() => document.getElementById("slt-resources-frame").style.height);
console.log("height after load:", h0 || "(not set yet)");

/* a search */
await f.fill(".slt-input", "grass valley");
await f.waitForSelector(".slt-item", { timeout: 15000 });
const first = await f.$eval(".slt-item .slt-name", (e) => e.textContent);
const href = await f.$eval(".slt-item .slt-link", (e) => e.getAttribute("href"));
const status = await f.$eval(".slt-status", (e) => e.textContent);
console.log("\nsearch 'grass valley' ->", first);
console.log("  status:", status);
console.log("  href:  ", href);
console.log("  tagged:", /utm_source=localhost/.test(href) && /utm_medium=partner-widget/.test(href));

/* a state */
await f.click('.slt-state[data-state="CA"]');
await f.waitForFunction(() => document.querySelectorAll(".slt-item").length > 5, null, { timeout: 15000 });
const n = await f.$$eval(".slt-item", (els) => els.length);
const st = await f.$eval(".slt-status", (e) => e.textContent);
console.log("\nbrowse California ->", n, "rows |", st);

/* the frame followed the content */
await page.waitForTimeout(400);
const h1 = await page.evaluate(() => document.getElementById("slt-resources-frame").style.height);
console.log("\nframe height after browsing:", h1);
const grew = parseInt(h1) > parseInt(h0 || "0");
console.log("  grew to fit:", grew);

/* no inner scrollbar, no sideways page */
const inner = await f.evaluate(() => ({
  scroll: document.documentElement.scrollHeight,
  client: document.documentElement.clientHeight
}));
const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
console.log("  parent scrolls sideways:", sideways);

await page.screenshot({ path: ".dev/desktop.png", fullPage: false });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.screenshot({ path: ".dev/phone.png", fullPage: false });

/* ── the self-hosted install, which has no frame and reads its configuration
   off the script tag instead of off the page address ── */
const sh = await browser.newPage({ viewport: { width: 1000, height: 900 } });
const shProblems = [];
sh.on("pageerror", (e) => shProblems.push("pageerror: " + e.message));
sh.on("console", (m) => { if (m.type() === "error") shProblems.push("console: " + m.text()); });
await sh.goto(base + "/tools/preview-selfhosted.html", { waitUntil: "networkidle" });
await sh.waitForSelector("#slt-resources .slt-input");
await sh.fill(".slt-input", "bend");
await sh.waitForSelector(".slt-item");
const shHref = await sh.$eval(".slt-item .slt-link", (e) => e.getAttribute("href"));
console.log("\nself-hosted href:", shHref);
const shTagged = /utm_source=cedarridge\.example/.test(shHref);
console.log("  tagged from the script tag:", shTagged);
console.log("  self-hosted problems:", shProblems.length ? shProblems : "none");
await sh.close();

console.log("\nproblems:", problems.length ? problems : "none");
await browser.close();
process.exit(problems.length === 0 && shProblems.length === 0 && shTagged && grew && !sideways ? 0 : 1);
