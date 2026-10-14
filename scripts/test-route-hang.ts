import assert from "node:assert/strict";
import { withAbortDeadline } from "@/lib/deadline";
import { DESKS } from "@/lib/desks";
import { setExternalTimeoutScaleForTests } from "@/lib/external-fetch";
import { loadLetterTomorrows, withCoastWaters, type NewsletterIssue } from "@/lib/newsletter";
import { isBlobThrottle } from "@/lib/snapshot-store";
import { buildTweetFeed } from "@/lib/tweet";

delete process.env.RESEND_API_KEY;
delete process.env.AIRTABLE_API_KEY;
delete process.env.AIRTABLE_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL;
delete process.env.SUBSCRIBER_EMAILS;

const urls: string[] = [];
const abortStarted = Date.now();
await withAbortDeadline(80, () => new Promise(() => {})).then(
  () => assert.fail("a hanging blob call should reject"),
  (error: unknown) => {
    assert.equal(isBlobThrottle(error), true);
  },
);
assert.ok(Date.now() - abortStarted < 1000, "blob deadline did not fail fast");

setExternalTimeoutScaleForTests(0.05);
globalThis.fetch = ((input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  urls.push(url);
  return new Promise<Response>(() => {
    /* ignore abort — the deadline has to win on its own */
  });
}) as typeof fetch;

const issue: NewsletterIssue = {
  weekId: "2026-10-10",
  weekLabel: "Week of October 10",
  weekNumber: 41,
  year: 2026,
  month: 10,
  monthName: "October",
  rangeLabel: "October 10 – October 16",
  letter: "The letter still prints when the gauges are quiet.",
  desks: DESKS.map((desk) => ({
    theater: desk.theater,
    areaId: desk.areaId,
    desk: desk.desk,
    kicker: desk.kicker,
    briefing: null,
    error: null,
    seasonal: "",
  })),
  peaks: [],
  closures: [],
  generatedAt: "test",
  frozen: false,
};

const letterStarted = Date.now();
const hydrated = await withCoastWaters(issue, null);
const tomorrows = await loadLetterTomorrows(hydrated);
const letterMs = Date.now() - letterStarted;
assert.equal(hydrated.letter, issue.letter);
assert.equal(hydrated.desks.length, DESKS.length);
assert.equal(Object.keys(tomorrows).length, hydrated.desks.length);
assert.ok(letterMs < 120000, `letter took ${letterMs}ms`);

const tweetsStarted = Date.now();
const body = await buildTweetFeed();
const tweetsMs = Date.now() - tweetsStarted;
assert.equal(body.mornings.length, DESKS.length);
assert.equal(body.calendars.length, DESKS.length);
assert.deepEqual(
  body.mornings.map((row) => row.areaId),
  DESKS.map((desk) => desk.areaId),
);
assert.ok(body.mornings.every((row) => row.skip === true && row.text == null));
assert.ok(body.calendars.every((row) => typeof row.skip === "boolean"));
assert.ok(tweetsMs < 180000, `tweets took ${tweetsMs}ms`);
assert.equal(
  urls.some((url) => /api\.(?:twitter|x)\.com|api\.resend\.com|substack\.com/i.test(url)),
  false,
  "hang check must not post",
);

console.log(
  `ok route hang letter ${letterMs}ms tweets ${tweetsMs}ms blob-abort fetches ${urls.length}`,
);
