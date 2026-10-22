import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AREA_BY_ID } from "../lib/data/areas.ts";
import { MONTH_THEATER, closuresThisMonth } from "../lib/data/fundamentals.ts";
import { SPECIES } from "../lib/data/species.ts";
import {
  describeDesk,
  deskWords,
  forLetter,
  letterChromeLegend,
  letterHasScore,
  letterImageAlt,
  letterIssueFields,
  letterNavCopy,
  letterShareText,
  letterTomorrowLine,
  letterWeekMeta,
  LETTER_DISCLAIMER,
  LETTER_LEGEND,
  LETTER_SEO,
} from "../lib/letter-copy.ts";
import { letterEmailHtml, letterEmailText, morningEmailText } from "../lib/mail.ts";
import type { Briefing } from "../lib/types.ts";

function fieldLetterMonth(month: number) {
  const source = readFileSync(new URL("../lib/newsletter.ts", import.meta.url), "utf8");
  const match = source.match(new RegExp(`^\\s+${month}: "([^"]*)"`, "m"));
  return match?.[1] ?? "";
}

const redfish = SPECIES.find((species) => species.id === "redfish");
assert.ok(redfish);

function briefing(overall: number, wind: number, sky: string): Briefing {
  return {
    area: AREA_BY_ID.galveston,
    activity: "all",
    generatedAt: "2026-10-17T12:00:00.000Z",
    forDate: "2026-10-17",
    kind: "today",
    confidence: "high",
    overall,
    headline: "Reds today. Push West Bay grass as the wind lets water back in.",
    where: [],
    when: [
      {
        start: "2026-10-17T11:00:00Z",
        end: "2026-10-17T13:00:00Z",
        label: "First light · incoming",
        score: 6.2,
        why: "First light on incoming water.",
      },
    ],
    why: [
      "The score is not a safety brief.",
      "Water 78.4°F. Heat is the locator: early, late, deeper.",
      "Tide is incoming from NOAA 8771450 Galveston.",
    ],
    species: [
      {
        species: redfish!,
        score: 8.4,
        inPlay: true,
        closed: false,
        why: "In the grass.",
      },
    ],
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
        windMph: wind,
        windGustMph: wind + 4,
        windDirDeg: 140,
        windCardinal: "SE",
        pressureMb: 1016.2,
        pressureTrendMb: 1.4,
        pressureSource: "open-meteo",
        pressureCite: "Open-Meteo modeled",
        precipChance: 20,
        precipIn: 0,
        sky,
        wx: "clouds",
        source: "open-meteo",
        fetchedAt: "2026-10-17T12:00:00.000Z",
      },
      moon: { phase: 0.6, name: "Waxing gibbous", illumination: 0.72, springNeap: "mid" },
    },
    warnings: ["Small-craft wind. The score is not a safety brief."],
    access: [],
    legal: [],
  } as Briefing;
}

const today = briefing(7.9, 12, "Partly cloudy");
const tomorrow = briefing(4.2, 22, "Thunderstorms");
tomorrow.conditions.weather.wx = "storm";
tomorrow.forDate = "2026-10-18";

assert.equal(letterHasScore("Score 7.9"), true);
assert.equal(letterHasScore("score 7.9 of 10"), true);
assert.equal(letterHasScore("Scores are 1–10"), true);
assert.equal(letterHasScore("Scores are 1-10"), true);
assert.equal(letterHasScore("7.9 / 10"), true);
assert.equal(letterHasScore("Galveston is 7.9 this morning"), true);
assert.equal(letterHasScore("Box score"), true);
assert.equal(letterHasScore("78.4°F water"), false);
assert.equal(letterHasScore("1.20 ft vs the table"), false);
assert.equal(letterHasScore("30.12 inHg"), false);
assert.equal(letterHasScore("A breeze, 12 mph SE"), false);

const words = describeDesk(today);
assert.equal(letterHasScore(words), false);
assert.match(words, /breeze/i);
assert.match(words, /mph SE/);
assert.match(words, /Partly cloudy/);
assert.match(words, /78° water/);
assert.match(words, /incoming tide/i);
assert.doesNotMatch(words, /7\.9/);
assert.equal(letterHasScore(letterTomorrowLine(today, tomorrow)), false);
assert.equal(letterHasScore(letterShareText(today)), false);
assert.equal(letterHasScore(letterImageAlt(today)), false);
assert.doesNotMatch(letterShareText(today), /7\.9|8\.4|6\.2/);

for (let month = 1; month <= 12; month++) {
  const essay = fieldLetterMonth(month);
  assert.ok(essay, `month ${month}`);
  assert.equal(letterHasScore(essay), false, essay);
  assert.equal(letterHasScore(forLetter(essay)), false, essay);
}

const juneFlorida = MONTH_THEATER[6].florida;
assert.equal(letterHasScore(juneFlorida), true);
assert.equal(letterHasScore(forLetter(juneFlorida)), false);
assert.match(forLetter(juneFlorida), /Do not harvest a snook/);

const juneClosures = closuresThisMonth(6, new Date("2026-06-15T16:00:00Z"));
const snook = juneClosures.find((note) => /snook/i.test(note.title));
assert.ok(snook);
assert.equal(letterHasScore(snook.body), true);
assert.equal(letterHasScore(forLetter(snook.body)), false);

assert.equal(letterHasScore(forLetter("The score is not a safety brief. Tide is incoming.")), false);
assert.equal(forLetter("The score is not a safety brief. Tide is incoming."), "Tide is incoming.");

const issue = {
  weekId: "2026-10-17",
  weekLabel: "Week of October 11",
  weekNumber: 42,
  year: 2026,
  month: 6,
  monthName: "June",
  rangeLabel: "October 11 – October 17, 2026",
  letter: `${fieldLetterMonth(4)} ${fieldLetterMonth(7)} Scores are 1–10. They are not bites.`,
  frozen: false,
  generatedAt: "2026-10-17T12:00:00.000Z",
  desks: [
    {
      theater: "texas",
      areaId: "galveston",
      desk: "Texas water",
      kicker: "Wind is the tide",
      briefing: today,
      error: null,
      seasonal: juneFlorida,
    },
  ],
  peaks: [{ name: "Redfish", theaters: "Texas", why: "Do not harvest a snook because the score is an 8. Grass fills in." }],
  closures: [
    {
      title: "SE Florida snook",
      body: snook.body,
      theaters: ["florida"],
    },
  ],
};

function walkStrings(value: unknown, out: string[]) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => walkStrings(item, out));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assert.doesNotMatch(key, /score/i, key);
      walkStrings(item, out);
    }
  }
}

function assertLetterClean(label: string, text: string) {
  assert.equal(letterHasScore(text), false, `${label}: ${text.slice(0, 240)}`);
  assert.doesNotMatch(
    text,
    /(?<![0-9.])(?:7\.9|8\.4|6\.2)(?![0-9])|\/\s*10|1\s*[\u2013\u2014-]\s*10/,
    `${label} still has a desk number`,
  );
}

const payload = letterIssueFields(issue, "https://onthiswater.com");
const payloadStrings: string[] = [];
walkStrings(payload, payloadStrings);
assertLetterClean("json", payloadStrings.join("\n"));
assert.equal(JSON.stringify(payload).includes('"score"'), false);
assert.doesNotMatch(JSON.stringify(payload), /(?<![0-9.])(?:7\.9|8\.4|6\.2)(?![0-9])/);
assert.equal(payload.desks[0]?.inPlay[0], "Redfish");
assert.match(payload.desks[0]?.conditions ?? "", /breeze/i);
assert.match(payload.shareText, /wind, sky, and the water/i);
assert.equal(letterHasScore(payload.disclaimer), false);
assert.equal(payload.title, LETTER_SEO.title);
assert.equal(letterHasScore(payload.subtitle), false);
assert.equal(letterHasScore(payload.description), false);
assert.equal(letterHasScore(payload.imageAlt), false);

function visibleLetter(html: string) {
  const alts = [...html.matchAll(/\salt="([^"]*)"/gi)].map((match) => match[1] ?? "");
  const text = html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  return `${text}\n${alts.join("\n")}`;
}

const mailText = letterEmailText(issue, null);
const mailHtml = letterEmailHtml(issue, null);
assertLetterClean("mail text", mailText);
assertLetterClean("mail html", visibleLetter(mailHtml));
assert.match(mailText, /Texas water/i);
assert.match(mailText, /breeze/i);
assert.match(mailHtml, /breeze/i);
assert.doesNotMatch(mailHtml, /scoreDisc|OF 10/i);

for (const line of [LETTER_LEGEND, LETTER_DISCLAIMER, LETTER_SEO.title, LETTER_SEO.subtitle, LETTER_SEO.description, LETTER_SEO.imageAlt]) {
  assert.equal(letterHasScore(line), false, line);
}
const weekMeta = letterWeekMeta("2026-10-17");
for (const line of Object.values(weekMeta)) assert.equal(letterHasScore(line), false, line);

assert.equal(letterChromeLegend("/"), null);
assert.equal(letterHasScore(letterChromeLegend("/newsletter") ?? ""), false);
assert.equal(letterHasScore(letterChromeLegend("/newsletter/2026-10-17") ?? ""), false);
assert.equal(letterHasScore(letterChromeLegend("/for-the-letter") ?? ""), false);
assert.deepEqual(letterNavCopy("/", "How we score", "What the 1–10 means"), {
  label: "How we score",
  dek: "What the 1–10 means",
});
const letterNav = letterNavCopy("/newsletter", "How we score", "What the 1–10 means");
assert.equal(letterHasScore(`${letterNav.label} ${letterNav.dek}`), false);

const surfaces = [
  "components/letter-issue.tsx",
  "app/api/letter/route.ts",
  "app/(public)/for-the-letter/page.tsx",
  "app/(public)/newsletter/layout.tsx",
  "app/(public)/newsletter/page.tsx",
  "app/(public)/newsletter/[week]/page.tsx",
  "lib/newsletter.ts",
];
for (const file of surfaces) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8").replace(
    /\sclassName=(?:"[^"]*"|\{[^}]*\})/g,
    " ",
  );
  assert.equal(letterHasScore(source), false, file);
}

assert.equal(letterHasScore(deskWords(null, "The gauge did not answer.")), false);

const morning = morningEmailText(today);
assert.equal(letterHasScore(morning), true);
assert.match(morning, /7\.9/);

console.log("ok letter");
console.log("--- sample ---");
console.log(fieldLetterMonth(10));
console.log(describeDesk(today));
console.log(letterTomorrowLine(today, tomorrow));
console.log(payload.disclaimer);
