import assert from "node:assert/strict";
import { monthsForCalendarSnapshot } from "../lib/calendar-budget.ts";
import {
  calendarSnapshotKey,
  calendarSnapshotYolo,
  memorySnapshotStore,
  readOrCreateCalendar,
  snapshotKey,
  type CalendarSnapshot,
} from "../lib/snapshot-store.ts";
import { calendarAlt, calendarTweetText } from "../lib/tweet.ts";
import type { CalendarDay } from "../lib/types.ts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function day(
  date: string,
  opts: { yolo?: boolean; windMph?: number | null; score?: number },
): CalendarDay {
  const windMph = opts.windMph === undefined ? 10 : opts.windMph;
  return {
    date,
    score: opts.score ?? 8,
    confidence: windMph == null ? "astronomical" : "forecast",
    drivers: [],
    bestWindow: null,
    amazing: false,
    yolo: Boolean(opts.yolo),
    moon: { name: "Full", glyph: "●", phase: 0.5, illumination: 1, springNeap: "spring" },
    tides: [],
    tideRangeFt: 1.4,
    windMph,
    precipChance: null,
    wx: "clear",
  };
}

function snapshot(yoloDate: string, score: number, wind: number | null): CalendarSnapshot {
  return {
    v: 1,
    months: [
      {
        year: 2026,
        month: 10,
        label: "October 2026",
        days: [
          day("2026-10-06", { windMph: wind, score: 5 }),
          day(yoloDate, { yolo: wind != null, windMph: wind, score }),
          day("2026-10-20", { windMph: wind, score: 6 }),
        ],
      },
      {
        year: 2026,
        month: 11,
        label: "November 2026",
        days: [day("2026-11-02", { yolo: wind != null, windMph: wind, score: 7 })],
      },
    ],
  };
}

const store = memorySnapshotStore<CalendarSnapshot>();
const key = calendarSnapshotKey("galveston", "all", "2026-10-06", "10", "production");
const [page, card, feed] = await Promise.all([
  readOrCreateCalendar(store, key, async () => {
    await sleep(25);
    return snapshot("2026-10-15", 9.1, 8);
  }),
  readOrCreateCalendar(store, key, async () => {
    await sleep(5);
    return snapshot("2026-10-18", 8.2, 11);
  }),
  readOrCreateCalendar(store, key, async () => {
    await sleep(45);
    return snapshot("2026-10-13", 7.4, 14);
  }),
]);

const pageYolo = calendarSnapshotYolo(page);
const cardYolo = calendarSnapshotYolo(card);
const days = feed.months[0]?.days ?? [];
const text = calendarTweetText("Galveston", "galveston", "texas", days);
const alt = calendarAlt("Galveston", days, "galveston");
const feedYolo = days.find((d) => d.yolo);

assert.equal(pageYolo?.date, "2026-10-18");
assert.equal(cardYolo?.date, pageYolo?.date);
assert.equal(cardYolo?.score, pageYolo?.score);
assert.equal(feedYolo?.date, pageYolo?.date);
assert.equal(feedYolo?.score, pageYolo?.score);
assert.ok(text.includes("Best remaining dry day is 10-18 (8.2)."), text);
assert.ok(alt.includes("Best dry day 2026-10-18."), alt);
assert.equal(text.includes("10-15"), false);
assert.equal(text.includes("10-13"), false);
assert.equal(pageYolo?.date === "2026-11-02", false);

const again = await readOrCreateCalendar(store, key, async () => snapshot("2099-01-01", 1, 99));
assert.equal(calendarSnapshotYolo(again)?.date, pageYolo?.date);
assert.equal(again.months[0]?.days.find((d) => d.yolo)?.score, 8.2);

const quiet = memorySnapshotStore<CalendarSnapshot>();
const quietKey = calendarSnapshotKey("ascension", "all", "2026-10-06", "10");
const missed = await readOrCreateCalendar(quiet, quietKey, async () => snapshot("2026-10-18", 8.2, null));
assert.equal(calendarSnapshotYolo(missed), null);
assert.equal(
  missed.months[0]?.days.every((d) => d.windMph == null),
  true,
);
assert.equal(await quiet.read(quietKey), null);
const kept = await readOrCreateCalendar(quiet, quietKey, async () => snapshot("2026-10-15", 9.1, 8));
assert.equal(calendarSnapshotYolo(kept)?.date, "2026-10-15");
const reread = await readOrCreateCalendar(quiet, quietKey, async () => snapshot("2026-10-13", 7.4, 14));
assert.equal(calendarSnapshotYolo(reread)?.date, "2026-10-15");
assert.equal((await quiet.read(quietKey))?.months[0]?.days.find((d) => d.yolo)?.date, "2026-10-15");

const calm = memorySnapshotStore<CalendarSnapshot>();
const calmKey = calendarSnapshotKey("alphonse", "all", "2026-10-06", "15");
const zero = await readOrCreateCalendar(calm, calmKey, async () => snapshot("2026-10-18", 8, 0));
assert.equal(calendarSnapshotYolo(zero)?.date, "2026-10-18");
assert.ok(await calm.read(calmKey));

const race = memorySnapshotStore<CalendarSnapshot>();
const raceKey = calendarSnapshotKey("hatteras", "all", "2026-10-06", "11");
const [good, late] = await Promise.all([
  readOrCreateCalendar(race, raceKey, async () => {
    await sleep(5);
    return snapshot("2026-10-12", 8.1, 5);
  }),
  readOrCreateCalendar(race, raceKey, async () => {
    await sleep(30);
    return snapshot("2026-10-06", 7.4, null);
  }),
]);
assert.equal(calendarSnapshotYolo(good)?.date, "2026-10-12");
assert.equal(calendarSnapshotYolo(late)?.date, "2026-10-12");
assert.equal(late.months[0]?.days.find((d) => d.windMph != null)?.windMph, 5);

const budgets: number[] = [];
const retried = await monthsForCalendarSnapshot(async (budget) => {
  budgets.push(budget.openMeteoMs);
  if (budgets.length === 1) return snapshot("2026-10-18", 8.2, null).months;
  assert.ok(budget.openMeteoMs > 2500);
  assert.ok(budget.fallbackMs > 2500);
  assert.ok(budget.nwsMs > 2800);
  assert.ok(budget.noaaMs > 2800);
  return snapshot("2026-10-15", 9.1, 8).months;
});
assert.equal(budgets.length, 2);
assert.equal(budgets[0], 2500);
assert.ok(budgets[1] > budgets[0]);
assert.equal(retried[0]?.days.find((d) => d.yolo)?.date, "2026-10-15");

let loads = 0;
const once = await monthsForCalendarSnapshot(async (budget) => {
  loads += 1;
  assert.equal(budget.openMeteoMs, 2500);
  return snapshot("2026-10-13", 7.4, 14).months;
});
assert.equal(loads, 1);
assert.equal(once[0]?.days.find((d) => d.yolo)?.date, "2026-10-13");

const previousEnv = process.env.VERCEL_ENV;
process.env.VERCEL_ENV = "production";
const prodKey = calendarSnapshotKey("galveston", "all", "2026-10-06", "10");
process.env.VERCEL_ENV = "preview";
const previewKey = calendarSnapshotKey("galveston", "all", "2026-10-06", "10");
delete process.env.VERCEL_ENV;
const localKey = calendarSnapshotKey("galveston", "all", "2026-10-06", "10");
if (previousEnv === undefined) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = previousEnv;

assert.equal(prodKey, "calendar/v1/production/galveston/all/2026-10-06/10.json");
assert.equal(previewKey, "calendar/v1/preview/galveston/all/2026-10-06/10.json");
assert.equal(localKey, "calendar/v1/development/galveston/all/2026-10-06/10.json");
assert.notEqual(prodKey, previewKey);
assert.equal(
  calendarSnapshotKey("galveston", "all", "2026-10-06", "10", "preview weird"),
  "calendar/v1/development/galveston/all/2026-10-06/10.json",
);
assert.equal(snapshotKey("galveston", "all", "2026-10-06", "10", "production"), "morning/v1/production/galveston/all/2026-10-06/10.json");

console.log("ok calendar snapshot");
