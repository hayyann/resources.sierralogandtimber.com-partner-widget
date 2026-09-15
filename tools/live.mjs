/* The published widget, framed from a different origin, exactly as a partner
   would have it. This is the only check that proves the whole chain: GitHub
   Pages allows the frame, the snippet's script reaches it, the directory
   answers cross-origin, and the links carry the partner's tag. */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const LIVE = "https://hayyann.github.io/resources.sierralogandtimber.com-partner-widget/";
const snippet = readFileSync(new URL("../partner-snippet.html", import.meta.url), "utf8");
const page = `<!doctype html><meta charset=utf-8><title>Partner</title>
<style>body{font:16px/1.6 system-ui,sans-serif;margin:0;padding:24px;max-width:900px}</style>
<h1>Cedar Ridge Builders</h1>${snippet}<p style="margin-top:32px;color:#888">footer</p>`;
writeFileSync(new URL("live-preview.html", import.meta.url), page);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

/* served from a different origin than the widget, which is the whole point */
await p.goto("http://localhost:4321/tools/live-preview.html", { waitUntil: "networkidle" });

const frame = await p.$("#slt-resources-frame");
console.log("frame src:", await frame.getAttribute("src"));
const f = await frame.contentFrame();
await f.waitForSelector(".slt-input", { timeout: 20000 });
console.log("widget loaded across origins: true");

await f.fill(".slt-input", "flagstaff");
await f.waitForSelector(".slt-item", { timeout: 20000 });
const name = await f.$eval(".slt-item .slt-name", (e) => e.textContent);
const where = await f.$eval(".slt-item .slt-where", (e) => e.textContent);
const href = await f.$eval(".slt-item .slt-link", (e) => e.getAttribute("href"));
console.log(`\nsearch "flagstaff" -> ${name} (${where})`);
console.log("href:", href);

const u = new URL(href);
const ok =
  u.origin === "https://resources.sierralogandtimber.com" &&
  u.searchParams.get("utm_source") === "localhost" &&
  u.searchParams.get("utm_medium") === "partner-widget" &&
  u.searchParams.get("utm_campaign") === "sierra-resources" &&
  u.searchParams.get("utm_content") === "town";
console.log("tagged correctly:", ok);

/* and the destination is a real page, not a 404 */
const res = await p.request.get(href);
console.log("destination answers:", res.status());

await p.waitForTimeout(500);
const h = await p.evaluate(() => document.getElementById("slt-resources-frame").style.height);
console.log("frame height followed content:", h);

console.log("\nerrors:", errs.length ? errs : "none");
await b.close();
process.exit(ok && res.status() === 200 && errs.length === 0 ? 0 : 1);
