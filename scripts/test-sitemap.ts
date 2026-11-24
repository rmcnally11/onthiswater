import assert from "node:assert/strict";
import sitemap from "@/app/sitemap";
import { COAST_HUBS } from "@/lib/coast-hubs";
import { AREAS, AREA_IDS } from "@/lib/data/areas";
import { contentLastMod } from "@/lib/archive-paths";
import { addDaysYmd, isPastYmd, mostRecentSaturday, ymdInZone } from "@/lib/time";

const now = new Date();
const today = ymdInZone(now, "America/Chicago");
const rows = sitemap();
const urls = rows.map((row) => row.url);
const paths = urls.map((url) => new URL(url).pathname);

assert.equal(new Set(urls).size, urls.length, "sitemap URLs are unique");
assert.ok(urls.every((url) => url.startsWith("https://www.onthiswater.com/")));
assert.ok(urls.every((url) => !url.startsWith("https://onthiswater.com/")));

const expected = new Set<string>([
  "/",
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
  for (const area of AREAS) {
    if (!isPastYmd(day, ymdInZone(now, area.timezone))) continue;
    expected.add(`/morning/${area.id}/${day}`);
  }
}

const latestPast = addDaysYmd(mostRecentSaturday(now), -7);
for (let i = 0; i < 11; i++) expected.add(`/newsletter/${addDaysYmd(latestPast, -7 * i)}`);

assert.equal(paths.includes("/morning"), false);
assert.equal(paths.includes(`/newsletter/${mostRecentSaturday(now)}`), false);

for (const areaId of AREA_IDS) {
  assert.equal(paths.includes(`/morning/${areaId}/${today}`), false, `/morning/${areaId}/${today}`);
}

for (const path of expected) assert.equal(paths.includes(path), true, path);

assert.equal(paths.length, expected.size);
assert.deepEqual([...paths].sort(), [...expected].sort());

for (const row of rows) {
  const path = new URL(row.url).pathname;
  const dated = path.match(/^\/(?:morning\/[^/]+|newsletter)\/(\d{4}-\d{2}-\d{2})$/);
  if (dated) {
    assert.equal(row.lastModified instanceof Date, true, path);
    assert.equal((row.lastModified as Date).toISOString(), contentLastMod(dated[1]).toISOString(), path);
  } else {
    assert.equal(row.lastModified, undefined, path);
  }
}

console.log(`ok sitemap ${urls.length}`);
