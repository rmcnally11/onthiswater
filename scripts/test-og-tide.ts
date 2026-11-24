import assert from "node:assert/strict";
import { pageMeta } from "@/lib/seo";
import { layoutTideChart } from "@/lib/tide-chart";
import {
  ogTideLabelTop,
  OG_TIDE_CHART_HEIGHT,
  OG_TIDE_CHART_WIDTH,
  OG_TIDE_HEIGHT,
  OG_TIDE_WIDTH,
} from "@/lib/og-tide";
import type { HiLo, HourlyTide } from "@/lib/types";

assert.equal(OG_TIDE_WIDTH, 1200);
assert.equal(OG_TIDE_HEIGHT, 630);
assert.equal(OG_TIDE_CHART_HEIGHT, 450);
assert.ok(OG_TIDE_CHART_HEIGHT > 340);

function shareSize(meta: ReturnType<typeof pageMeta>, slot: "openGraph" | "twitter") {
  const images = meta[slot]?.images;
  assert.ok(Array.isArray(images));
  const image = images[0];
  assert.equal(typeof image, "object");
  assert.ok(image);
  assert.ok("width" in image && "height" in image);
  return { width: image.width, height: image.height };
}

const tideShare = pageMeta({
  title: "Galveston this morning",
  description: "Tide and wind.",
  path: "/morning/galveston",
  image: "/api/og/tide?area=galveston",
});
assert.deepEqual(shareSize(tideShare, "openGraph"), { width: 1200, height: 630 });
assert.deepEqual(shareSize(tideShare, "twitter"), { width: 1200, height: 630 });
assert.equal(tideShare.alternates?.canonical, "https://www.onthiswater.com/morning/galveston");
assert.equal(tideShare.openGraph?.url, "https://www.onthiswater.com/morning/galveston");

const homeShare = pageMeta({
  title: "On This Water",
  description: "This morning.",
  path: "/",
});
assert.deepEqual(shareSize(homeShare, "openGraph"), { width: 1200, height: 630 });
assert.deepEqual(shareSize(homeShare, "twitter"), { width: 1200, height: 630 });
assert.equal(homeShare.alternates?.canonical, "https://www.onthiswater.com/");

const hourly: HourlyTide[] = Array.from({ length: 48 }, (_, i) => ({
  time: new Date(Date.UTC(2026, 0, 4, i)).toISOString(),
  height: Math.sin(i / 3) * 2.4 + 0.2,
}));
const nextHiLo: HiLo[] = [
  { time: hourly[2]!.time, height: hourly[2]!.height, type: "H" },
  { time: hourly[8]!.time, height: hourly[8]!.height, type: "L" },
  { time: hourly[20]!.time, height: Math.max(...hourly.map((h) => h.height)), type: "H" },
  { time: hourly[30]!.time, height: Math.min(...hourly.map((h) => h.height)), type: "L" },
];

const previous = layoutTideChart({
  hourly,
  nextHiLo,
  timezone: "America/Chicago",
  width: OG_TIDE_CHART_WIDTH,
  height: 340,
});
const layout = layoutTideChart({
  hourly,
  nextHiLo,
  timezone: "America/Chicago",
  width: OG_TIDE_CHART_WIDTH,
  height: OG_TIDE_CHART_HEIGHT,
});
assert.equal(previous.ok, true);
assert.equal(layout.ok, true);
assert.equal(layout.width, OG_TIDE_CHART_WIDTH);
assert.equal(layout.height, OG_TIDE_CHART_HEIGHT);
assert.ok(layout.innerH > previous.innerH + 50, `inner plot grew by ${layout.innerH - previous.innerH}`);

function assertInside(kind: "y" | "H" | "L" | "day", y: number | undefined) {
  const top = ogTideLabelTop(kind, {
    y,
    fontSize: layout.fontSize,
    height: layout.height,
    padB: layout.padB,
  });
  const bottom = top + layout.fontSize;
  assert.ok(top >= 0, `${kind} label starts at ${top}`);
  assert.ok(bottom <= layout.height, `${kind} label ends at ${bottom}, chart is ${layout.height}`);
}

for (const tick of layout.yTicks) assertInside("y", tick.y);
for (const mark of layout.marks) assertInside(mark.type, mark.y);
for (const day of layout.dayMarks.filter((_, i) => i % 2 === 0)) assertInside("day", day.x);

const page = layoutTideChart({
  hourly,
  nextHiLo,
  timezone: "America/Chicago",
  width: 720,
  height: 168,
});
assert.equal(page.padT, 16);
assert.equal(page.padB, 22);

console.log("ok og tide");
