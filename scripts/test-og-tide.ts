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

function imageHeight(meta: ReturnType<typeof pageMeta>) {
  const images = meta.openGraph?.images;
  assert.ok(Array.isArray(images));
  const image = images[0];
  assert.equal(typeof image, "object");
  assert.ok(image);
  assert.ok("height" in image);
  return image.height;
}

assert.equal(
  imageHeight(
    pageMeta({
      title: "Galveston this morning",
      description: "Tide and wind.",
      path: "/morning/galveston",
      image: "/api/og/tide?area=galveston",
    }),
  ),
  630,
);
assert.equal(
  imageHeight(
    pageMeta({
      title: "On This Water",
      description: "This morning.",
      path: "/",
    }),
  ),
  630,
);

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
