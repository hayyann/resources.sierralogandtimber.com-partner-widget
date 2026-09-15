/* The county view: press a result, get a map and real programmes, and a
   tagged link out to the full page. */
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });

await p.goto("http://localhost:4321/tools/preview.html", { waitUntil: "networkidle" });
const f = await (await p.$("#slt-resources-frame")).contentFrame();
await f.waitForSelector(".slt-input");

await f.fill(".slt-input", "flagstaff");
await f.waitForSelector(".slt-item");
console.log("row is a button:", await f.$eval(".slt-link", (e) => e.tagName));

await f.click(".slt-link");
await f.waitForSelector(".slt-county", { timeout: 20000 });

console.log("county:", await f.$eval(".slt-county-name", (e) => e.textContent),
            "|", await f.$eval(".slt-county-state", (e) => e.textContent));
console.log("tally: ", await f.$eval(".slt-tally", (e) => e.textContent));
const paths = await f.$$eval(".slt-map path", (els) => els.length);
const towns = await f.$$eval(".slt-town", (els) => els.length);
console.log("map:   ", paths, "paths,", towns, "towns");
const progs = await f.$$eval(".slt-prog-name", (els) => els.map((e) => e.textContent));
console.log("programmes shown:", progs.length);
progs.forEach((t) => console.log("   -", t));
const href = await f.$eval(".slt-open", (e) => e.getAttribute("href"));
const label = await f.$eval(".slt-open", (e) => e.textContent);
console.log("\nbutton out:", label);
console.log("href:", href);
const u = new URL(href);
const tagged = u.searchParams.get("utm_source") === "localhost" &&
               u.searchParams.get("utm_medium") === "partner-widget";
console.log("tagged:", tagged, "| from:", u.searchParams.get("from"));
const res = await p.request.get(href);
console.log("destination:", res.status());

await f.click(".slt-back");
await f.waitForSelector(".slt-item");
console.log("\nback to results:", (await f.$$(".slt-item")).length, "rows");

await p.waitForTimeout(400);
await p.screenshot({ path: "county-desktop.png" });
await p.setViewportSize({ width: 390, height: 900 });
await f.click(".slt-link");
await f.waitForSelector(".slt-county");
await p.waitForTimeout(600);
await p.screenshot({ path: "county-phone.png" });

console.log("\nerrors:", errs.length ? errs : "none");
await b.close();
process.exit(errs.length === 0 && tagged && res.status() === 200 && progs.length > 0 && paths > 0 ? 0 : 1);
