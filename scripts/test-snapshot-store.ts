import assert from "node:assert/strict";
import { memorySnapshotStore, readOrCreate, snapshotKey, type MorningSnapshot } from "../lib/snapshot-store.ts";

function snap(score: number, wind: number | null, yolo: string | null): MorningSnapshot {
  return {
    v: 1,
    yolo: yolo ? ({ date: yolo } as MorningSnapshot["yolo"]) : null,
    briefing: {
      kind: "today",
      overall: score,
      conditions: { weather: { windMph: wind } },
    } as MorningSnapshot["briefing"],
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const store = memorySnapshotStore();
const [a, b] = await Promise.all([
  readOrCreate(store, "hatteras", async () => {
    await sleep(40);
    return snap(9.6, 10, "2026-10-12");
  }),
  readOrCreate(store, "hatteras", async () => {
    await sleep(10);
    return snap(8.8, 17, "2026-10-06");
  }),
]);
assert.equal(a.briefing.overall, b.briefing.overall);
assert.equal(a.briefing.conditions.weather.windMph, b.briefing.conditions.weather.windMph);
assert.equal(a.yolo?.date, b.yolo?.date);
assert.equal(a.briefing.overall, 8.8);
assert.equal(a.briefing.conditions.weather.windMph, 17);

const again = await readOrCreate(store, "hatteras", async () => snap(1, 1, "2099-01-01"));
assert.equal(again.briefing.overall, 8.8);
assert.equal(again.yolo?.date, a.yolo?.date);

const empty = memorySnapshotStore();
const missed = await readOrCreate(empty, "quiet", async () => snap(8.8, null, "2026-10-06"));
assert.equal(missed.briefing.conditions.weather.windMph, null);
const kept = await readOrCreate(empty, "quiet", async () => snap(9.6, 10, "2026-10-12"));
assert.equal(kept.briefing.overall, 9.6);
assert.equal(kept.yolo?.date, "2026-10-12");
const reread = await readOrCreate(empty, "quiet", async () => snap(1, 99, "2099-01-01"));
assert.equal(reread.briefing.overall, 9.6);
assert.equal(reread.yolo?.date, "2026-10-12");

const race = memorySnapshotStore();
const [good, late] = await Promise.all([
  readOrCreate(race, "san-juan", async () => {
    await sleep(5);
    return snap(8.1, 5, "2026-10-12");
  }),
  readOrCreate(race, "san-juan", async () => {
    await sleep(30);
    return snap(7.4, null, "2026-10-06");
  }),
]);
assert.equal(good.briefing.overall, 8.1);
assert.equal(late.briefing.overall, 8.1);
assert.equal(late.briefing.conditions.weather.windMph, 5);
assert.equal(late.yolo?.date, "2026-10-12");

const previousEnv = process.env.VERCEL_ENV;
process.env.VERCEL_ENV = "production";
const prodKey = snapshotKey("hatteras", "all", "2026-10-06", "08");
process.env.VERCEL_ENV = "preview";
const previewKey = snapshotKey("hatteras", "all", "2026-10-06", "08");
delete process.env.VERCEL_ENV;
const localKey = snapshotKey("hatteras", "all", "2026-10-06", "08");
if (previousEnv === undefined) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = previousEnv;

assert.equal(prodKey, "morning/v1/production/hatteras/all/2026-10-06/08.json");
assert.equal(previewKey, "morning/v1/preview/hatteras/all/2026-10-06/08.json");
assert.equal(localKey, "morning/v1/development/hatteras/all/2026-10-06/08.json");
assert.notEqual(prodKey, previewKey);
assert.equal(snapshotKey("hatteras", "all", "2026-10-06", "08", "preview weird"), "morning/v1/development/hatteras/all/2026-10-06/08.json");

console.log("ok snapshot store");
