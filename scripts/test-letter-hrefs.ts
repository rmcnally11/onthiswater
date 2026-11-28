import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ForTheLetterPage from "../app/(public)/for-the-letter/page.tsx";
import { LetterIssue } from "../components/letter-issue.tsx";
import { siteOrigin } from "../lib/brand.ts";
import { AREA_BY_ID } from "../lib/data/areas.ts";
import { texasRecordBays } from "../lib/data/long-record.ts";
import { DESKS } from "../lib/desks.ts";
import type { NewsletterIssue } from "../lib/newsletter.ts";
import type { Briefing } from "../lib/types.ts";

const html = renderToStaticMarkup(createElement(ForTheLetterPage));

const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) =>
  (match[1] ?? "").replaceAll("&amp;", "&"),
);

function has(href: string) {
  assert.ok(
    hrefs.includes(href),
    `missing ${href}\n${hrefs.filter((h) => h.includes("area=") || h.startsWith("/")).join("\n")}`,
  );
}

// PR #30 removed the Twitter card links from this page. The desk links
// still carry a query, which is where an encoded amp used to land.
const origin = siteOrigin();
has("/for-the-letter");
has("/api/letter");
has("/newsletter");
for (const desk of DESKS) {
  has(`${origin}/?area=${desk.areaId}&theater=${desk.theater}`);
}

for (const href of hrefs) {
  assert.equal(href.includes("amp;"), false, `encoded amp in href: ${href}`);
}

assert.match(html, /<h1[\s>]/);
assert.doesNotMatch(html, /<h3[\s>]/);
const h2 = html.indexOf("<h2");
const h1 = html.indexOf("<h1");
assert.ok(h1 !== -1 && h2 !== -1 && h1 < h2, "heading order should be h1 then h2");

function flyBriefing(): Briefing {
  return {
    area: AREA_BY_ID.islamorada,
    activity: "fly",
    generatedAt: "2026-11-28T12:00:00.000Z",
    forDate: "2026-11-28",
    kind: "today",
    confidence: "high",
    overall: 6,
    headline: "Bones on the first of the flood.",
    where: [],
    when: [],
    why: ["The wind is the story."],
    species: [],
    conditions: {
      areaId: "islamorada",
      waterTempF: 78,
      waterTempSource: "NOAA",
      tides: {
        stage: "incoming",
        anomalyFt: 0.2,
        source: "noaa",
        hourly: [],
        nextHiLo: [],
        predictedNow: 1,
        rangeFt: 1.2,
        station: "8723962",
      },
      weather: {
        airF: 80,
        windMph: 8,
        windGustMph: 12,
        windDirDeg: 90,
        windCardinal: "E",
        pressureMb: 1016,
        pressureTrendMb: 0.4,
        pressureSource: "open-meteo",
        pressureCite: "Open-Meteo modeled",
        precipChance: 10,
        precipIn: 0,
        sky: "Partly cloudy",
        wx: "clouds",
        source: "open-meteo",
        fetchedAt: "2026-11-28T12:00:00.000Z",
      },
      moon: { phase: 0.5, name: "Full", illumination: 1, springNeap: "spring" },
    },
    warnings: [],
    access: [],
    legal: [],
  } as Briefing;
}

const letter: NewsletterIssue = {
  weekId: "2026-11-21",
  weekLabel: "Week of November 21",
  weekNumber: 47,
  year: 2026,
  month: 11,
  monthName: "November",
  rangeLabel: "November 21 – November 27",
  letter: "The letter still names the water.",
  desks: DESKS.map((desk) => ({
    theater: desk.theater,
    areaId: desk.areaId,
    desk: desk.desk,
    kicker: desk.kicker,
    briefing: desk.areaId === "islamorada" ? flyBriefing() : null,
    error: null,
    seasonal: "November on this coast.",
  })),
  peaks: [],
  closures: [],
  generatedAt: "test",
  frozen: true,
};

const letterHtml = renderToStaticMarkup(createElement(LetterIssue, { issue: letter, coasts: null }));
const letterHrefs = [...letterHtml.matchAll(/href="([^"]+)"/g)].map((match) =>
  (match[1] ?? "").replaceAll("&amp;", "&"),
);

assert.equal(
  letterHtml.includes('href="/?area='),
  false,
  `letter still links a query-string desk\n${letterHrefs.filter((href) => href.includes("area=")).join("\n")}`,
);

const morningHrefs = letterHrefs.filter((href) => href.startsWith("/morning/"));
for (const desk of DESKS) {
  const hits = morningHrefs.filter((href) => href === `/morning/${desk.areaId}` || href.startsWith(`/morning/${desk.areaId}?`));
  assert.ok(hits.length >= 1, `missing /morning/${desk.areaId}\n${morningHrefs.join("\n")}`);
}

assert.ok(letterHrefs.includes("/morning/islamorada?activity=fly"), "fly desk should keep activity");
assert.ok(letterHrefs.includes("/morning/islamorada"), "fly desk strip stays the canonical path");
assert.equal(
  letterHrefs.some((href) => href.startsWith("/morning/") && href.includes("theater=")),
  false,
  "morning desk does not read theater",
);
assert.equal(
  letterHrefs.some((href) => href.startsWith("/morning/") && href.includes("date=")),
  false,
  "a dated morning is a path, not a query",
);

for (const bay of texasRecordBays()) {
  assert.ok(
    letterHrefs.includes(`/morning/${bay.id}`),
    `long-record bay ${bay.id} should be /morning/${bay.id}`,
  );
}

const uniqueMorning = new Set(morningHrefs.map((href) => href.split("?")[0]));
assert.ok(uniqueMorning.size >= 21, `expected at least 21 morning desks, got ${uniqueMorning.size}`);
