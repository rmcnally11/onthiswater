import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { setExternalTimeoutScaleForTests } from "@/lib/external-fetch";
import { getBriefing } from "@/lib/briefing";
import { runDispatch } from "@/lib/dispatch";

delete process.env.RESEND_API_KEY;
delete process.env.AIRTABLE_API_KEY;
delete process.env.AIRTABLE_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL;
delete process.env.CRON_HOURLY;
delete process.env.SUBSCRIBER_EMAILS;

const listPath = path.join(process.cwd(), "data", "subscribers.json");
await mkdir(path.dirname(listPath), { recursive: true });
await writeFile(
  listPath,
  `${JSON.stringify([
    {
      name: "Timeout Check",
      email: "timeout-check@example.com",
      zip: "77550",
      desks: ["galveston"],
      cadence: ["daily"],
      createdAt: "test",
    },
  ])}\n`,
);

setExternalTimeoutScaleForTests(0.05);

const urls: string[] = [];
globalThis.fetch = ((input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  urls.push(url);
  return new Promise<Response>(() => {
    /* ignore abort — the deadline has to win on its own */
  });
}) as typeof fetch;

const pageStarted = Date.now();
const briefing = await getBriefing("galveston");
const pageMs = Date.now() - pageStarted;
assert.equal(briefing.area.id, "galveston");
assert.equal(Number.isFinite(briefing.overall), true);
assert.equal(briefing.conditions.weather.windMph, null);
assert.ok(pageMs < 35000, `page data took ${pageMs}ms`);

const cronStarted = Date.now();
const result = await runDispatch({ at: new Date("2026-10-08T15:00:00Z") });
const cronMs = Date.now() - cronStarted;
assert.ok(cronMs < 45000, `cron took ${cronMs}ms`);
assert.ok(result.results.length > 0);
assert.ok(result.results.every((row) => row.sent === false));
assert.equal(
  urls.some((url) => url.includes("api.resend.com")),
  false,
  "timeout check must not send mail",
);

await rm(path.join(process.cwd(), "data", "outbox"), { recursive: true, force: true });
await rm(listPath, { force: true });

console.log(`ok upstream timeout page ${pageMs}ms cron ${cronMs}ms fetches ${urls.length}`);
