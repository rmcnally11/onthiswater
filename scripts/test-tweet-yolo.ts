import assert from "node:assert/strict";
import { getArea } from "../lib/data/areas.ts";
import { calendarSnapshotYolo, pickYolo, type CalendarSnapshot } from "../lib/snapshot-store.ts";
import { ymdInZone } from "../lib/time.ts";
import { morningTweetText } from "../lib/tweet.ts";
import type { Briefing, CalendarDay } from "../lib/types.ts";

const NOW = new Date("2026-11-14T15:00:00.000Z");

function day(
  date: string,
  opts: { yolo?: boolean; windMph?: number | null; score?: number; amazing?: boolean },
): CalendarDay {
  const windMph = opts.windMph === undefined ? 10 : opts.windMph;
  return {
    date,
    score: opts.score ?? 8,
    confidence: "forecast",
    drivers: [],
    bestWindow: null,
    amazing: Boolean(opts.amazing),
    yolo: Boolean(opts.yolo),
    moon: { name: "Full", glyph: "●", phase: 0.5, illumination: 1, springNeap: "spring" },
    tides: [],
    tideRangeFt: 1.4,
    windMph,
    precipChance: null,
    wx: "clear",
  };
}

function briefing(areaId: string, forDate: string, overall: number): Briefing {
  const area = getArea(areaId);
  return {
    area,
    activity: "all",
    generatedAt: NOW.toISOString(),
    forDate,
    kind: "today",
    confidence: "medium",
    overall,
    headline: "Morning.",
    where: [],
    when: [],
    why: [],
    species: [],
    conditions: {
      areaId,
      waterTempF: null,
      waterTempSource: null,
      tides: {
        stage: "outgoing",
        anomalyFt: null,
        source: "noaa",
        hourly: [],
        nextHiLo: [],
        predictedNow: 1,
        rangeFt: 1.2,
        station: area.noaaStation,
      },
      weather: {
        airF: 72,
        windMph: 12,
        windGustMph: null,
        windDirDeg: 70,
        windCardinal: "ENE",
        pressureMb: null,
        pressureTrendMb: null,
        pressureSource: "open-meteo",
        pressureCite: "Open-Meteo modeled",
        precipChance: 10,
        precipIn: 0,
        sky: "Clear",
        wx: "clear",
        source: "open-meteo",
        fetchedAt: NOW.toISOString(),
      },
      moon: { phase: 0.2, name: "Waxing crescent", illumination: 0.2, springNeap: "mid" },
    },
    warnings: [],
    access: [],
    legal: [],
  } as Briefing;
}

const days = [
  day("2026-11-13", { yolo: true, amazing: true, score: 9.1, windMph: 8 }),
  day("2026-11-18", { score: 8.8, windMph: 9 }),
  day("2026-11-24", { amazing: true, score: 8.2, windMph: 10 }),
];
const month: CalendarSnapshot = {
  v: 1,
  months: [
    { year: 2026, month: 11, label: "November 2026", days },
    { year: 2026, month: 12, label: "December 2026", days: [day("2026-12-02", { yolo: true, score: 9 })] },
  ],
};

const today = ymdInZone(NOW, "America/Chicago");
assert.equal(today, "2026-11-14");
const picked = calendarSnapshotYolo(month, today);
assert.equal(picked?.date, "2026-11-24");
assert.equal(pickYolo(days, "2026-11-13")?.date, "2026-11-13");

const stale = days[0];
for (const [areaId, overall] of [
  ["galveston", 7.2],
  ["venice", 6.4],
] as const) {
  const deskToday = ymdInZone(NOW, getArea(areaId).timezone);
  const text = morningTweetText(briefing(areaId, deskToday, overall), stale, undefined, NOW);
  const line = text.split("\n")[0] ?? "";
  assert.equal(line.includes("Best dry day left is 11-13"), false, line);
  assert.equal(line.includes("11-13"), false, line);
  const repicked = morningTweetText(briefing(areaId, deskToday, overall), picked, undefined, NOW);
  assert.match(repicked, /Best dry day left is 11-24/);
}

const stillToday = morningTweetText(
  briefing("galveston", "2026-11-14", 7.2),
  day("2026-11-14", { yolo: true, score: 8 }),
  undefined,
  NOW,
);
assert.match(stillToday, /Best dry day left is 11-14/);

const eveningBefore = new Date("2026-11-14T04:00:00.000Z");
assert.equal(ymdInZone(eveningBefore, "America/Chicago"), "2026-11-13");
const chicagoStill13 = morningTweetText(
  briefing("galveston", "2026-11-13", 7.2),
  stale,
  undefined,
  eveningBefore,
);
assert.match(chicagoStill13, /Best dry day left is 11-13/);

const cardMorning = morningTweetText(
  briefing("galveston", "2026-10-17", 7.9),
  day("2026-10-18", { yolo: true, score: 9.3 }),
  "Wind is the tide",
  NOW,
);
assert.match(cardMorning, /Best dry day left is 10-18/);

const maheMorning = new Date("2026-11-14T22:00:00.000Z");
assert.equal(ymdInZone(maheMorning, "Indian/Mahe"), "2026-11-15");
const alphonse = morningTweetText(
  briefing("alphonse", "2026-11-15", 6.1),
  day("2026-11-14", { yolo: true, score: 8 }),
  undefined,
  maheMorning,
);
assert.equal(alphonse.includes("Best dry day left is 11-14"), false, alphonse);

console.log("ok tweet yolo");
