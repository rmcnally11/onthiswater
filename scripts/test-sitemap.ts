import assert from "node:assert/strict";
import sitemap from "@/app/sitemap";
import { COAST_HUBS } from "@/lib/coast-hubs";
import { AREA_IDS } from "@/lib/data/areas";
import { addDaysYmd, mostRecentSaturday, ymdInZone } from "@/lib/time";

const today = ymdInZone(new Date(), "America/Chicago");
const urls = sitemap().map((row) => row.url);
const paths = urls.map((url) => new URL(url).pathname);

assert.equal(new Set(urls).size, urls.length, "sitemap URLs are unique");

const expected = new Set<string>([
  "/",
  "/morning",
  "/calendar",
  "/join",
  "/method",
  "/species",
  "/fundamentals",
  "/newsletter",
  "/compare",
  "/map",
  ...COAST_HUBS.map((hub) => `/${hub.slug}`),
  ...AREA_IDS.map((areaId) => `/morning/${areaId}`),
]);

for (let i = 1; i <= 14; i++) {
  const day = addDaysYmd(today, -i);
  for (const areaId of AREA_IDS) expected.add(`/morning/${areaId}/${day}`);
}

let saturday = mostRecentSaturday();
for (let i = 0; i < 12; i++) {
  expected.add(`/newsletter/${saturday}`);
  saturday = addDaysYmd(saturday, -7);
}

for (const areaId of AREA_IDS) {
  assert.equal(paths.includes(`/morning/${areaId}/${today}`), false, `/morning/${areaId}/${today}`);
}

for (const path of expected) assert.equal(paths.includes(path), true, path);

assert.equal(paths.length, expected.size);
assert.deepEqual([...paths].sort(), [...expected].sort());

console.log(`ok sitemap ${urls.length}`);
