import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MorningCard } from "../app/(cards)/card/page.tsx";
import { CalendarCard } from "../app/(cards)/card/calendar/page.tsx";
import { AmazingChip, MonthGrid } from "../components/month-grid.tsx";
import { YoloBanner } from "../components/yolo-banner.tsx";
import { resolveMorningHour } from "../lib/briefing.ts";
import { getArea } from "../lib/data/areas.ts";
import { letterHasScore } from "../lib/letter-copy.ts";
import { morningLine } from "../lib/morning.ts";
import { snapshotKey } from "../lib/snapshot-store.ts";
import { formatYmdLong, parseHourStamp, snapshotHour, snapshotHourStamp } from "../lib/time.ts";
import {
  calendarCardUrl,
  calendarTweetText,
  morningAlt,
  morningCardUrl,
  morningTweetText,
  withHourStamp,
} from "../lib/tweet.ts";
import type { Briefing, CalendarDay } from "../lib/types.ts";

function visibleCard(html: string) {
  const attrs = [...html.matchAll(/\s(?:alt|aria-label|title)="([^"]*)"/gi)].map((match) => match[1] ?? "");
  const text = html.replace(/<[^>]+>/g, " ");
  return `${text}\n${attrs.join("\n")}`;
}

function assertNoPrintedScore(label: string, html: string, scores: string[]) {
  assert.doesNotMatch(html, /of 10|OF 10|Scores are 1/i, `${label} still says of 10`);
  const visible = visibleCard(html);
  assert.equal(letterHasScore(visible), false, `${label}: ${visible.slice(0, 500)}`);
  for (const score of scores) {
    const escaped = score.replace(".", "\\.");
    assert.doesNotMatch(
      visible,
      new RegExp(`(?<![0-9.])${escaped}(?![0-9])`),
      `${label} still prints ${score}`,
    );
  }
}

const area = getArea("galveston");
const yoloDate = "2026-10-18";

function briefing(overall: number): Briefing {
  return {
    area,
    activity: "all",
    generatedAt: "2026-10-17T12:00:00.000Z",
    forDate: "2026-10-17",
    kind: "today",
    confidence: "high",
    overall,
    headline: "Reds today.",
    where: [],
    when: [],
    why: [],
    species: [],
    conditions: {
      areaId: "galveston",
      waterTempF: 78.4,
      waterTempSource: "NOAA",
      tides: {
        stage: "incoming",
        anomalyFt: 0.8,
        source: "noaa",
        hourly: [],
        nextHiLo: [],
        predictedNow: 1.2,
        rangeFt: 1.4,
        station: "8771450",
      },
      weather: {
        airF: 80,
        windMph: 12,
        windGustMph: 16,
        windDirDeg: 140,
        windCardinal: "SE",
        pressureMb: 1016.2,
        pressureTrendMb: 1.4,
        pressureSource: "open-meteo",
        pressureCite: "Open-Meteo modeled",
        precipChance: 20,
        precipIn: 0,
        sky: "Partly cloudy",
        wx: "clouds",
        source: "open-meteo",
        fetchedAt: "2026-10-17T12:00:00.000Z",
      },
      moon: { phase: 0.6, name: "Waxing gibbous", illumination: 0.72, springNeap: "mid" },
    },
    warnings: [],
    access: [],
    legal: [],
  } as Briefing;
}

function day(date: string, score: number, yolo = false): CalendarDay {
  return {
    date,
    score,
    confidence: "forecast",
    drivers: ["waxing gibbous · mid", "tide range ~1.4 ft", "wind to 12 mph"],
    bestWindow: null,
    amazing: score >= 8,
    yolo,
    moon: {
      name: "Waxing gibbous",
      glyph: "☽",
      phase: 0.6,
      illumination: 0.72,
      springNeap: "mid",
    },
    tides: [
      { type: "H", time: "6:12a", height: 1.2 },
      { type: "L", time: "12:40p", height: 0.2 },
    ],
    tideRangeFt: 1.4,
    windMph: 12,
    precipChance: 20,
    wx: "clouds",
  };
}

const today = briefing(7.9);
const yolo = day(yoloDate, 9.3, true);
const dry = formatYmdLong(yoloDate, area.timezone);

const scored = morningLine(today, yolo);
assert.match(scored, /Galveston 7\.9 this morning/);
assert.match(scored, /Scores are 1–10, not a bite/);
assert.match(scored, /Wind versus the table: \+0\.8 ft/);
assert.equal(letterHasScore(scored), true);

const clean = morningLine(today, yolo, { noScore: true });
assert.equal(letterHasScore(clean), false, clean);
assert.match(clean, /Galveston this morning\. 12 mph SE\./);
assert.match(clean, /Partly cloudy/);
assert.match(clean, new RegExp(`Best dry day is ${dry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
assert.doesNotMatch(clean, /7\.9|9\.3|of 10|Scores are 1/);
assert.match(clean, /\+0\.8 ft/);

const forecast = morningLine({ ...today, kind: "forecast", forDate: yoloDate }, yolo, { noScore: true });
assert.equal(letterHasScore(forecast), false, forecast);
assert.match(forecast, /Galveston on /);
assert.match(forecast, /12 mph SE/);
assert.doesNotMatch(forecast, /7\.9|Scores are/);

const astro = morningLine({ ...today, kind: "astronomical", forDate: yoloDate }, null, { noScore: true });
assert.equal(letterHasScore(astro), false, astro);
assert.match(astro, /tide, moon, and season only/);
assert.doesNotMatch(astro, /7\.9|Scores are|Best dry day/);

const morningHtml = renderToStaticMarkup(createElement(MorningCard, { area, briefing: today, yolo }));
assertNoPrintedScore("card", morningHtml, ["7.9", "9.3", "8.6", "9.0"]);
assert.match(morningHtml, /On This Water/);
assert.match(morningHtml, /Galveston/);
assert.match(visibleCard(morningHtml), /12 mph/);
assert.match(visibleCard(morningHtml), /Partly cloudy/);
assert.match(visibleCard(morningHtml), /Best dry day is/);
assert.doesNotMatch(morningHtml, /ScoreRing|score-ring/);

const gridDays = [day("2026-10-02", 8.6), day("2026-10-04", 9)];
const gridProps = {
  year: 2026,
  month: 10,
  days: gridDays,
  timezone: area.timezone,
  areaId: area.id,
  theater: area.theater,
  activity: "all",
};

const hiddenGrid = renderToStaticMarkup(createElement(MonthGrid, { ...gridProps, hideScores: true }));
assertNoPrintedScore("month grid", hiddenGrid, ["8.6", "9.0", "9.3", "7.9"]);
assert.match(hiddenGrid, /title="2026-10-02 · Waxing gibbous ·/);
assert.match(hiddenGrid, /title="2026-10-04 · Waxing gibbous ·/);
assert.doesNotMatch(hiddenGrid, /title="[^"]*· (?:8\.6|9) ·/);
assert.doesNotMatch(hiddenGrid, />8\.6<|>9\.0<|>9</);

const shownGrid = renderToStaticMarkup(createElement(MonthGrid, gridProps));
assert.match(shownGrid, />8\.6</);
assert.match(shownGrid, />9\.0</);
assert.doesNotMatch(shownGrid, />9</);
assert.match(shownGrid, /title="2026-10-02 · 8\.6 ·/);
assert.match(shownGrid, /title="2026-10-04 · 9 ·/);

const hiddenChip = renderToStaticMarkup(
  createElement(AmazingChip, {
    day: gridDays[0]!,
    areaId: area.id,
    theater: area.theater,
    activity: "all",
    timezone: area.timezone,
    hideScores: true,
  }),
);
assertNoPrintedScore("chip", hiddenChip, ["8.6"]);
assert.doesNotMatch(hiddenChip, />8\.6</);

const shownChip = renderToStaticMarkup(
  createElement(AmazingChip, {
    day: gridDays[0]!,
    areaId: area.id,
    theater: area.theater,
    activity: "all",
    timezone: area.timezone,
  }),
);
assert.match(shownChip, />8\.6</);

const hiddenYolo = renderToStaticMarkup(
  createElement(YoloBanner, {
    day: yolo,
    areaId: area.id,
    theater: area.theater,
    activity: "all",
    timezone: area.timezone,
    hideScore: true,
  }),
);
assertNoPrintedScore("yolo", hiddenYolo, ["9.3"]);
assert.match(hiddenYolo, /Best dry day left this month/);
assert.match(visibleCard(hiddenYolo), new RegExp(dry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.doesNotMatch(hiddenYolo, />9\.3</);

const shownYolo = renderToStaticMarkup(
  createElement(YoloBanner, {
    day: yolo,
    areaId: area.id,
    theater: area.theater,
    activity: "all",
    timezone: area.timezone,
  }),
);
assert.match(shownYolo, />9\.3</);

const ascension = getArea("ascension");
const calendarHtml = renderToStaticMarkup(
  createElement(CalendarCard, {
    area: ascension,
    months: [{ year: 2026, month: 10, label: "October", days: gridDays }],
    yolo,
  }),
);
assertNoPrintedScore("card calendar", calendarHtml, ["7.9", "8.6", "9.0", "9.3"]);
assert.match(calendarHtml, /Ascension/);
assert.match(calendarHtml, /On This Water/);
assert.match(visibleCard(calendarHtml), /Best dry day/);
assert.doesNotMatch(calendarHtml, />8\.6<|>9\.0<|>9\.3<|>9</);
assert.doesNotMatch(calendarHtml, /of 10|OF 10/i);

const quietCalendar = renderToStaticMarkup(
  createElement(CalendarCard, { area: ascension, months: null, yolo: null }),
);
assertNoPrintedScore("quiet calendar", quietCalendar, ["7.9", "8.6", "9.0"]);
assert.match(quietCalendar, /Calendar did not set/);

const cardSource = readFileSync(new URL("../app/(cards)/card/page.tsx", import.meta.url), "utf8");
assert.doesNotMatch(cardSource, /ScoreRing|of 10|OF 10|Scores are 1/);
assert.match(cardSource, /noScore:\s*true/);
assert.match(cardSource, /getMorningSnapshot\(area\.id, undefined, undefined, q\.h\)/);

const calendarSource = readFileSync(new URL("../app/(cards)/card/calendar/page.tsx", import.meta.url), "utf8");
assert.match(calendarSource, /hideScores/);
assert.match(calendarSource, /hideScore/);
assert.doesNotMatch(calendarSource, /ScoreRing|of 10|toFixed/);

const gridSource = readFileSync(new URL("../components/month-grid.tsx", import.meta.url), "utf8");
assert.match(gridSource, /score\.toFixed\(1\)/);
assert.doesNotMatch(gridSource, /toFixed\(0\)/);
assert.match(gridSource, /hideScores \? null : <ScoreDot/);

const now = new Date("2026-10-06T11:10:00Z");
const later = new Date("2026-10-07T18:40:00Z");
for (const areaId of ["alphonse", "ascension", "galveston"]) {
  const desk = getArea(areaId);
  const stamp = snapshotHourStamp(now, desk.timezone);
  const image = withHourStamp(morningCardUrl(desk.id, desk.theater), stamp);
  const calendarImage = withHourStamp(calendarCardUrl(desk.id, desk.theater), stamp);
  const h = new URL(image).searchParams.get("h");
  assert.equal(h, stamp, image);
  assert.equal(new URL(calendarImage).searchParams.get("h"), stamp);
  assert.match(image, new RegExp(`/card\\?area=${desk.id}&theater=${desk.theater}&h=${stamp}$`));
  const parsed = parseHourStamp(h);
  assert.ok(parsed);
  const feed = resolveMorningHour(desk.id, undefined, undefined, stamp, now);
  const card = resolveMorningHour(desk.id, undefined, undefined, h, later);
  assert.equal(card.key, feed.key, `${areaId} /card?h= drifted from the tweet snapshot`);
  assert.equal(card.dateYmd, parsed.ymd);
  assert.equal(card.hourKey, parsed.hour);
  assert.equal(card.key, snapshotKey(desk.id, "all", parsed.ymd, parsed.hour));
  const unpinned = resolveMorningHour(desk.id, undefined, undefined, undefined, later);
  assert.notEqual(unpinned.key, feed.key);
}

assert.equal(snapshotHour(now, "America/Chicago").hour, "06");
assert.equal(snapshotHourStamp(now, "Indian/Mahe"), "2026-10-06-15");
assert.equal(parseHourStamp("2026-10-06-24"), null);
assert.equal(parseHourStamp("2026-10-06-8"), null);
assert.deepEqual(parseHourStamp("2026-10-06-06"), { ymd: "2026-10-06", hour: "06" });

const dated = resolveMorningHour("galveston", "all", "2026-11-02", null, now);
assert.equal(dated.dateYmd, "2026-11-02");
assert.equal(dated.hourKey, "08");
const pinnedOverDate = resolveMorningHour("galveston", "all", "2099-01-01", "2026-10-06-06", later);
assert.equal(pinnedOverDate.dateYmd, "2026-10-06");
assert.equal(pinnedOverDate.hourKey, "06");

const tweet = morningTweetText(today, yolo, "Wind is the tide");
assert.match(tweet, /Galveston fishing weather: 7\.9 this morning/);
assert.match(tweet, /1–10, not a bite/);
assert.match(tweet, /Best dry day left is 10-18/);
assert.match(morningAlt(today), /7\.9 of 10/);
assert.match(calendarTweetText("Ascension", "ascension", "mexico", [yolo]), /\(9\.3\)/);

const tweetSource = readFileSync(new URL("../lib/tweet.ts", import.meta.url), "utf8");
assert.match(tweetSource, /getMorningSnapshot\(area\.id, undefined, undefined, stamp\)/);
assert.match(tweetSource, /withHourStamp\(morningCardUrl\(/);
assert.match(tweetSource, /withHourStamp\(calendarCardUrl\(/);
assert.match(tweetSource, /briefing\.overall\.toFixed\(1\)/);

console.log("ok card");
console.log(clean);
