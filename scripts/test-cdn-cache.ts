import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { cookieValue, documentCookie } from "@/lib/cookie-jar";
import { fetchCacheFields, withFetchRevalidate, withHistoricalFetches, HISTORICAL_REVALIDATE } from "@/lib/external-fetch";
import {
  loadLetterTomorrows,
  setLetterBriefingForTests,
  withCoastWaters,
  type NewsletterIssue,
} from "@/lib/newsletter";
import type { Briefing } from "@/lib/types";
import { fundamentalsSelection } from "@/lib/fundamentals-query";
import { joinDesks } from "@/lib/join-desks";
import { isPastYmd, mostRecentSaturday, ymdInZone } from "@/lib/time";

function cookieHeader(res: Response) {
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return list.join("\n");
}

const future = proxy(new NextRequest("https://onthiswater.com/morning/galveston/2099-01-01?activity=fly"));
assert.equal(future.status, 200, "a future morning stays on the dated page");
assert.equal(cookieHeader(future), "");

const galvestonToday = ymdInZone(new Date(), "America/Chicago");
const live = proxy(new NextRequest(`https://onthiswater.com/morning/galveston/${galvestonToday}?activity=fly`));
assert.equal(live.status, 307);
assert.match(live.headers.get("location") ?? "", /\/morning\/galveston\?activity=fly$/);
assert.equal(cookieHeader(live), "");

const pastMorning = proxy(new NextRequest("https://onthiswater.com/morning/galveston/2026-01-04"));
assert.equal(pastMorning.status, 200);
assert.equal(cookieHeader(pastMorning), "");

const hub = proxy(new NextRequest("https://onthiswater.com/texas"));
assert.equal(hub.status, 200);
assert.equal(cookieHeader(hub), "");

const currentLetter = proxy(new NextRequest(`https://onthiswater.com/newsletter/${mostRecentSaturday()}?coasts=texas`));
assert.equal(currentLetter.status, 307);
assert.match(currentLetter.headers.get("location") ?? "", /\/newsletter\?coasts=texas$/);
assert.equal(cookieHeader(currentLetter), "");

const pastLetter = proxy(new NextRequest("https://onthiswater.com/newsletter/2026-01-03"));
assert.equal(pastLetter.status, 200);
assert.equal(cookieHeader(pastLetter), "");

const join = proxy(new NextRequest("https://onthiswater.com/join"));
assert.equal(cookieHeader(join), "");

const redirect = proxy(new NextRequest("https://onthiswater.com/morning?area=galveston&activity=fly"));
assert.equal(redirect.status, 308);
assert.match(redirect.headers.get("location") ?? "", /\/morning\/galveston\?activity=fly$/);
assert.match(cookieHeader(redirect), /fb_water=/);

const coastsRedirect = proxy(new NextRequest("https://onthiswater.com/subscribers?coasts=texas"));
assert.equal(coastsRedirect.status, 307);
assert.match(cookieHeader(coastsRedirect), /fb_coasts=/);

assert.equal(isPastYmd("2026-11-16", "2026-11-17"), true);
assert.equal(isPastYmd("2026-11-17", "2026-11-17"), false);
assert.equal(isPastYmd("2026-11-18", "2026-11-17"), false);

assert.deepEqual(fetchCacheFields(), { cache: "no-store" });
assert.deepEqual(fetchCacheFields("force-cache"), { cache: "force-cache" });
const historical = await withHistoricalFetches(async () => fetchCacheFields("no-store"));
assert.deepEqual(historical, { revalidate: HISTORICAL_REVALIDATE });
assert.equal(historical.revalidate, 2592000);

const written = documentCookie("fb_water", "galveston|texas|fly", 100);
assert.equal(cookieValue(written, "fb_water"), "galveston|texas|fly");
assert.equal(cookieValue(`a=1; ${written}; b=2`, "fb_water"), "galveston|texas|fly");

assert.deepEqual(joinDesks({}), ["galveston"]);
assert.deepEqual(joinDesks({ waterAreaId: "islamorada" }), ["islamorada"]);
assert.ok(joinDesks({ coastsCookie: "texas" }).includes("galveston"));
assert.equal(joinDesks({ coastsCookie: "texas" }).includes("andros"), false);

const all = fundamentalsSelection({ nowMonth: 11 });
assert.equal(all.theater, "all");
assert.equal(all.month, 11);
assert.ok(all.regionIds.includes("texas"));
assert.ok(all.regionIds.includes("seychelles"));

const elected = fundamentalsSelection({ nowMonth: 11, coastsCookie: "texas" });
assert.equal(elected.theater, "texas");
assert.deepEqual(elected.regionIds, ["texas"]);

const queried = fundamentalsSelection({ nowMonth: 11, coastsCookie: "texas", theater: "florida", month: "4" });
assert.equal(queried.theater, "florida");
assert.equal(queried.month, 4);
assert.deepEqual(queried.regionIds, ["florida"]);

const letterArchive = readFileSync(new URL("../app/(public)/newsletter/[week]/page.tsx", import.meta.url), "utf8");
assert.match(letterArchive, /generateStaticParams/);
assert.match(letterArchive, /indexableLetterArchives/);
assert.match(letterArchive, /revalidate = 2592000/);
assert.doesNotMatch(letterArchive, /force-dynamic/);

const morningArchive = readFileSync(new URL("../app/(app)/morning/[area]/[date]/page.tsx", import.meta.url), "utf8");
assert.match(morningArchive, /generateStaticParams/);
assert.match(morningArchive, /indexableMorningArchives/);
assert.match(morningArchive, /revalidate = 2592000/);
assert.doesNotMatch(morningArchive, /force-dynamic/);

const liveMorning = readFileSync(new URL("../app/(app)/morning/[area]/page.tsx", import.meta.url), "utf8");
assert.match(liveMorning, /force-dynamic/);
assert.doesNotMatch(liveMorning, /generateStaticParams/);

const liveLetter = readFileSync(new URL("../app/(public)/newsletter/page.tsx", import.meta.url), "utf8");
assert.match(liveLetter, /force-dynamic/);
assert.doesNotMatch(liveLetter, /generateStaticParams/);
assert.match(liveLetter, /withFetchRevalidate\(300/);
assert.match(liveLetter, /chainTomorrows:\s*true/);

const sharedGauge = await withFetchRevalidate(300, async () => fetchCacheFields("no-store"));
assert.deepEqual(sharedGauge, { revalidate: 300 });

type GaugeCall = { areaId: string; date: string | null };

function blankIssue(desks: { areaId: string; theater: NewsletterIssue["desks"][number]["theater"]; desk: string }[]): NewsletterIssue {
  return {
    weekId: "2026-11-28",
    weekLabel: "Week of November 28",
    weekNumber: 48,
    year: 2026,
    month: 11,
    monthName: "November",
    rangeLabel: "November 23 – November 29",
    letter: "The letter still prints.",
    desks: desks.map((desk) => ({
      theater: desk.theater,
      areaId: desk.areaId,
      desk: desk.desk,
      kicker: "kicker",
      briefing: null,
      error: null,
      seasonal: "",
    })),
    peaks: [],
    closures: [],
    generatedAt: "test",
    frozen: false,
  };
}

function fakeBriefing(forDate: string): Briefing {
  return { forDate } as Briefing;
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

const calls: GaugeCall[] = [];
const waiting = new Map<string, Array<() => void>>();

function gaugeKey(areaId: string, date: string | null) {
  return `${areaId}|${date ?? ""}`;
}

function releaseGauge(areaId: string, date: string | null) {
  const queued = waiting.get(gaugeKey(areaId, date));
  const resolve = queued?.shift();
  assert.ok(resolve, `nothing waiting for ${areaId} ${date ?? "today"}`);
  resolve?.();
}

setLetterBriefingForTests(async (areaId, _activity, date) => {
  const id = areaId ?? "";
  const when = date ?? null;
  calls.push({ areaId: id, date: when });
  await new Promise<void>((resolve) => {
    const key = gaugeKey(id, when);
    const queued = waiting.get(key) ?? [];
    queued.push(resolve);
    waiting.set(key, queued);
  });
  return fakeBriefing(when ?? "2026-11-28");
});

try {
  const chained = withCoastWaters(
    blankIssue([
      { areaId: "galveston", theater: "texas", desk: "Texas water" },
      { areaId: "venice", theater: "louisiana", desk: "Louisiana water" },
    ]),
    null,
    { chainTomorrows: true },
  );
  await settle();
  assert.deepEqual(
    calls.map((call) => `${call.areaId}:${call.date ?? "today"}`),
    ["galveston:today", "venice:today"],
  );
  releaseGauge("galveston", null);
  await settle();
  assert.ok(calls.some((call) => call.areaId === "galveston" && call.date === "2026-11-29"));
  assert.equal(
    calls.some((call) => call.areaId === "venice" && call.date != null),
    false,
    "venice tomorrow waits for the venice briefing",
  );
  releaseGauge("venice", null);
  await settle();
  releaseGauge("galveston", "2026-11-29");
  releaseGauge("venice", "2026-11-29");
  const chainedIssue = await chained;
  const chainedTomorrow = await loadLetterTomorrows(chainedIssue);
  assert.equal(chainedTomorrow.galveston?.forDate, "2026-11-29");
  assert.equal(chainedTomorrow.venice?.forDate, "2026-11-29");
  assert.equal(calls.length, 4, "a chained tomorrow is not fetched a second time");

  calls.length = 0;
  const plain = withCoastWaters(blankIssue([{ areaId: "galveston", theater: "texas", desk: "Texas water" }]), null);
  await settle();
  assert.deepEqual(
    calls.map((call) => call.date),
    [null],
  );
  releaseGauge("galveston", null);
  const plainIssue = await plain;
  await settle();
  assert.equal(calls.length, 1, "without chaining, tomorrow stays parked until the issue resolves");
  const plainTomorrow = loadLetterTomorrows(plainIssue);
  await settle();
  assert.deepEqual(
    calls.map((call) => `${call.areaId}:${call.date ?? "today"}`),
    ["galveston:today", "galveston:2026-11-29"],
  );
  releaseGauge("galveston", "2026-11-29");
  assert.equal((await plainTomorrow).galveston?.forDate, "2026-11-29");

  calls.length = 0;
  setLetterBriefingForTests(async (areaId, _activity, date) => {
    calls.push({ areaId: areaId ?? "", date: date ?? null });
    if (!date && areaId === "galveston") throw new Error("gauge quiet");
    return fakeBriefing(date ?? "2026-11-28");
  });
  const quietIssue = await withCoastWaters(
    blankIssue([{ areaId: "galveston", theater: "texas", desk: "Texas water" }]),
    null,
    { chainTomorrows: true },
  );
  assert.equal(quietIssue.desks[0]?.briefing, null);
  assert.equal(quietIssue.desks[0]?.error, "gauge quiet");
  const quietTomorrow = await loadLetterTomorrows(quietIssue);
  assert.equal(quietTomorrow.galveston, null);
  assert.deepEqual(calls, [{ areaId: "galveston", date: null }]);

  calls.length = 0;
  const held = new Map<string, () => void>();
  setLetterBriefingForTests(async (areaId, _activity, date) => {
    const id = areaId ?? "";
    const when = date ?? null;
    calls.push({ areaId: id, date: when });
    await new Promise<void>((resolve) => held.set(gaugeKey(id, when), resolve));
    return fakeBriefing(when ?? "2026-11-28");
  });
  const seychelles = withCoastWaters(
    blankIssue([
      { areaId: "alphonse", theater: "seychelles", desk: "Seychelles water" },
      { areaId: "galveston", theater: "texas", desk: "Texas water" },
    ]),
    ["seychelles"],
    { chainTomorrows: true },
  );
  await settle();
  assert.deepEqual(
    calls.map((call) => call.areaId),
    ["alphonse"],
  );
  held.get(gaugeKey("alphonse", null))?.();
  await settle();
  const names = calls.map((call) => `${call.areaId}:${call.date ?? "today"}`);
  assert.ok(names.includes("alphonse:2026-11-29"));
  assert.ok(names.includes("farquhar:today"));
  assert.ok(names.includes("mahe:today"));
  assert.equal(names.includes("farquhar:2026-11-29"), false);
  assert.equal(names.includes("galveston:today"), false);
  held.get(gaugeKey("farquhar", null))?.();
  held.get(gaugeKey("mahe", null))?.();
  await settle();
  held.get(gaugeKey("alphonse", "2026-11-29"))?.();
  held.get(gaugeKey("farquhar", "2026-11-29"))?.();
  held.get(gaugeKey("mahe", "2026-11-29"))?.();
  const seychellesIssue = await seychelles;
  const seychellesTomorrow = await loadLetterTomorrows(seychellesIssue);
  assert.deepEqual(
    seychellesIssue.desks.map((desk) => desk.areaId),
    ["alphonse", "farquhar", "mahe"],
  );
  assert.equal(seychellesTomorrow.farquhar?.forDate, "2026-11-29");
  assert.equal(seychellesTomorrow.mahe?.forDate, "2026-11-29");
  const farquharTomorrowReads = calls.filter((call) => call.areaId === "farquhar" && call.date === "2026-11-29");
  assert.equal(farquharTomorrowReads.length, 1);
} finally {
  setLetterBriefingForTests(null);
}

console.log("ok cdn cache");
