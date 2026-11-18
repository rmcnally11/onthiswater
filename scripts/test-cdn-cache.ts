import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { cookieValue, documentCookie } from "@/lib/cookie-jar";
import { fetchCacheFields, withHistoricalFetches, HISTORICAL_REVALIDATE } from "@/lib/external-fetch";
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

console.log("ok cdn cache");
