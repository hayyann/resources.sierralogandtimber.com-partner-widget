/* Runs the widget's own ranking and URL building outside a browser, against
   the live index, so the two things a partner actually depends on are proved
   before anything ships: that a search finds what the directory would find,
   and that every outbound link carries the partner's tag. */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../widget.js", import.meta.url), "utf8");

/* Pull the pure pieces out of the IIFE without a bundler. */
const grab = (name) => {
  const i = src.indexOf(`function ${name}(`);
  if (i === -1) throw new Error(`no ${name}`);
  let d = 0, j = src.indexOf("{", i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}" && --d === 0) return src.slice(i, k + 1);
  }
  throw new Error(`unterminated ${name}`);
};

const consts = `
  var TIER_EXACT=400, TIER_PREFIX=300, TIER_WORD_START=200, TIER_SUBSTRING=100, STATE_BOOST=50;
  var MAX_RESULTS=12;
  var SITE="https://resources.sierralogandtimber.com";
  var UTM={source:"summitrealty.com",medium:"partner-widget",campaign:"sierra-resources"};
`;
const mod = new Function(
  consts + [grab("slugify"), grab("tierFor"), grab("candidatesFor"), grab("rank"), grab("resourceUrl")].join("\n") +
  "\nreturn { slugify, rank, resourceUrl };"
)();

const rows = await (await fetch("https://resources.sierralogandtimber.com/search-index.json")).json();
console.log("index entries:", rows.length);

let fails = 0;
const is = (label, got, want) => {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}\n       got  ${got}\n       want ${want}`);
};
const top = (q) => {
  const r = mod.rank(q, rows, 5)[0];
  return r ? (r.place ? `${r.place} / ${r.name}, ${r.stateName}` : `${r.name}, ${r.stateName}`) : "(nothing)";
};

console.log("\n— ranking —");
is('"ada county" finds it exactly',      top("ada county"), "Ada County, Idaho");
is('"bend" finds the town',              top("bend").startsWith("Bend /"), true);
is('a county beats its towns on a tie',  mod.rank("nevada", rows, 1)[0].place, undefined);
is('empty query returns nothing',        mod.rank("   ", rows, 5).length, 0);
is('nonsense returns nothing',           mod.rank("zzzzqqq", rows, 5).length, 0);

console.log("\n— every outbound link is tagged —");
const county = rows.find((r) => !r.place);
const town = rows.find((r) => r.place);
for (const [label, entry, content] of [["county", county, "county"], ["town", town, "town"]]) {
  const u = new URL(mod.resourceUrl(entry.url, content));
  const p = u.searchParams;
  is(`${label}: utm_source`,   p.get("utm_source"), "summitrealty.com");
  is(`${label}: utm_medium`,   p.get("utm_medium"), "partner-widget");
  is(`${label}: utm_campaign`, p.get("utm_campaign"), "sierra-resources");
  is(`${label}: utm_content`,  p.get("utm_content"), content);
  is(`${label}: right origin`, u.origin, "https://resources.sierralogandtimber.com");
}

console.log("\n— the town query string survives tagging —");
const t = new URL(mod.resourceUrl(town.url, "town"));
is("keeps ?from=", t.searchParams.get("from"), town.url.split("from=")[1]);
is("one ? only", (t.toString().match(/\?/g) || []).length, 1);

console.log("\n— every link in the index builds —");
let bad = 0;
for (const r of rows) {
  try {
    const u = new URL(mod.resourceUrl(r.url, r.place ? "town" : "county"));
    if (u.origin !== "https://resources.sierralogandtimber.com") bad++;
    if (!u.searchParams.get("utm_source")) bad++;
  } catch { bad++; }
}
is(`all ${rows.length} entries produce a tagged URL`, bad, 0);

console.log(fails === 0 ? "\nALL CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
