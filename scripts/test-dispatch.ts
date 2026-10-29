import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/dispatch/route";
import { AREAS } from "@/lib/data/areas";
import { runWithinDeadline, throwIfDeadlinePassed, withDeadline, yieldToEventLoop } from "@/lib/deadline";
import {
  DISPATCH_BUDGET_MS,
  DispatchError,
  dispatchMorning,
  dispatchSeasonal,
  redact,
  runDispatch,
} from "@/lib/dispatch";
import { setExternalTimeoutScaleForTests } from "@/lib/external-fetch";
import {
  RESEND_BATCH_LIMIT,
  dispatchIdempotencyKey,
  sendResend,
  sendResendBatch,
  subscriberHash,
} from "@/lib/send";
import type { Subscriber } from "@/lib/subscribers";

delete process.env.RESEND_API_KEY;
delete process.env.AIRTABLE_API_KEY;
delete process.env.AIRTABLE_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.VERCEL;
delete process.env.CRON_SECRET;
delete process.env.CRON_HOURLY;
delete process.env.SUBSCRIBER_EMAILS;

const logs: string[] = [];
const originalLog = console.log;
console.log = (...args: unknown[]) => {
  logs.push(args.map((arg) => String(arg)).join(" "));
};

function assertLogsHaveNoAddress() {
  const hit = logs.find((line) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line));
  assert.equal(hit, undefined, hit ? "log contained an address" : "");
}

type Call = { url: string; idempotencyKey: string | null; body: unknown };
const calls: Call[] = [];

function installFetch(opts?: { airtableStatus?: number }) {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers);
    let body: unknown = null;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    calls.push({ url, idempotencyKey: headers.get("Idempotency-Key"), body });
    if (url.includes("api.airtable.com")) {
      return new Response("airtable unavailable", { status: opts?.airtableStatus ?? 500 });
    }
    if (url.includes("api.resend.com/emails/batch")) {
      return new Response(JSON.stringify({ data: [{ id: `email_${calls.length}` }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("{}", { status: 500, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
}

assert.equal(redact("mail owner@example.com now"), "mail [redacted] now");
assert.equal(DISPATCH_BUDGET_MS <= 200_000, true);
assert.equal(
  dispatchIdempotencyKey("daily", "2026-10-28", "Owner@Example.com"),
  dispatchIdempotencyKey("daily", "2026-10-28", "owner@example.com"),
);
assert.notEqual(
  dispatchIdempotencyKey("daily", "2026-10-28", "owner@example.com"),
  dispatchIdempotencyKey("weekly", "2026-10-28", "owner@example.com"),
);
assert.equal(dispatchIdempotencyKey("seasonal", "2026-10-01", "owner@example.com").includes("@"), false);
assert.equal(subscriberHash("owner@example.com"), subscriberHash("Owner@Example.com"));

const deadlineStarted = Date.now();
await withDeadline(new Promise(() => {}), 80, "desk").then(
  () => assert.fail("a hanging desk should miss its deadline"),
  () => {},
);
assert.ok(Date.now() - deadlineStarted < 1000, "deadline did not fire");

async function busyThenYield() {
  const end = Date.now() + 600;
  while (Date.now() < end) {
    const slice = Date.now() + 25;
    while (Date.now() < slice) {
      /* synchronous stretch, then yield so the deadline can run */
    }
    await yieldToEventLoop();
  }
}
const yielded = Date.now();
await withDeadline(busyThenYield(), 90, "desk").then(
  () => assert.fail("yielded work should still hit the deadline"),
  () => {},
);
assert.ok(Date.now() - yielded < 400, `yielded deadline took ${Date.now() - yielded}ms`);

const stopped = Date.now();
await assert.rejects(
  runWithinDeadline(40, "desk", async () => {
    for (let i = 0; i < 40; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      throwIfDeadlinePassed();
    }
  }),
  (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /desk timed out/);
    return true;
  },
);
assert.ok(Date.now() - stopped < 500, `cooperative deadline took ${Date.now() - stopped}ms`);

installFetch();
await assert.rejects(() => sendResend(["one@example.com", "two@example.com"], "Subject", "<p>Hi</p>", "Hi"), /more than one recipient/);
assert.equal(
  calls.some((call) => call.url.includes("api.resend.com")),
  false,
  "multi-recipient send must not reach Resend",
);

const batchMessages = Array.from({ length: RESEND_BATCH_LIMIT + 1 }, (_, index) => {
  const email = `person${index}@example.com`;
  return {
    to: email,
    subject: "Season",
    html: "<p>Season</p>",
    text: "Season",
    idempotencyKey: dispatchIdempotencyKey("seasonal", "2026-10-01", email),
  };
});
process.env.RESEND_API_KEY = "re_test_not_real";
installFetch();
const batchSent = await sendResendBatch(batchMessages);
delete process.env.RESEND_API_KEY;
const batchCalls = calls.filter((call) => call.url.includes("api.resend.com/emails/batch"));
assert.equal(batchCalls.length, batchMessages.length);
assert.equal(batchSent.length, batchMessages.length);
const seen = new Set<string>();
for (const call of batchCalls) {
  assert.equal(Array.isArray(call.body), true);
  const body = call.body as Array<{ to: string[]; cc?: string[]; bcc?: string[] }>;
  assert.ok(body.length >= 1 && body.length <= RESEND_BATCH_LIMIT);
  assert.equal(body.length, 1);
  assert.deepEqual(body[0].cc, undefined);
  assert.deepEqual(body[0].bcc, undefined);
  assert.equal(body[0].to.length, 1);
  assert.equal(typeof call.idempotencyKey, "string");
  seen.add(call.idempotencyKey ?? "");
}
assert.equal(seen.size, batchMessages.length);
assert.deepEqual(
  [...seen].sort(),
  batchMessages.map((message) => message.idempotencyKey).sort(),
);

process.env.AIRTABLE_API_KEY = "pat_test_not_real";
process.env.RESEND_API_KEY = "re_test_not_real";
process.env.SUBSCRIBER_EMAILS = "owner@example.com";
installFetch({ airtableStatus: 500 });
await assert.rejects(() => runDispatch({ at: new Date("2026-10-08T15:00:00Z") }), (error: unknown) => {
  assert.ok(error instanceof DispatchError);
  assert.equal(error.stage, "subscribers");
  assert.match(error.message, /No mail was sent/);
  return true;
});
assert.equal(
  calls.some((call) => call.url.includes("api.resend.com")),
  false,
  "an Airtable read failure must not send",
);
const routeResponse = await GET(new NextRequest("http://localhost/api/cron/dispatch"));
assert.equal(routeResponse.status, 502);
const routeBody = (await routeResponse.json()) as { error?: string; stage?: string };
assert.equal(routeBody.stage, "subscribers");
assert.match(routeBody.error ?? "", /No mail was sent/);
assert.equal(routeBody.error?.includes("@"), false);
assert.equal(
  calls.some((call) => call.url.includes("api.resend.com")),
  false,
  "the route must not send after a failed subscriber read",
);
delete process.env.AIRTABLE_API_KEY;
delete process.env.AIRTABLE_TOKEN;
delete process.env.SUBSCRIBER_EMAILS;

const subscribers: Subscriber[] = [
  {
    name: "Ada",
    email: "ada@example.com",
    zip: "77550",
    desks: ["galveston"],
    cadence: ["seasonal"],
    createdAt: "test",
  },
  {
    name: "Bea",
    email: "bea@example.com",
    zip: "77550",
    desks: ["galveston", "venice"],
    cadence: ["seasonal"],
    createdAt: "test",
  },
  {
    name: "Cy",
    email: "cy@example.com",
    zip: "77550",
    desks: ["venice"],
    cadence: ["seasonal"],
    createdAt: "test",
  },
];
process.env.RESEND_API_KEY = "re_test_not_real";
installFetch();
const seasonal = await dispatchSeasonal({
  at: new Date("2026-10-01T15:00:00Z"),
  subscribers,
});
delete process.env.RESEND_API_KEY;
assert.equal(seasonal.skipped, false);
assert.equal(seasonal.results.length, subscribers.length);
const mailCalls = calls.filter((call) => call.url.includes("api.resend.com/emails/batch"));
assert.equal(mailCalls.length, subscribers.length);
const mailKeys = seasonal.results.map((row) => row.idempotencyKey);
assert.equal(new Set(mailKeys).size, subscribers.length);
for (const row of seasonal.results) {
  assert.equal(row.recipients, 1);
  assert.equal(row.sent, true);
  assert.match(row.idempotencyKey ?? "", /^seasonal\/2026-10-01\/[0-9a-f]{16}$/);
}
for (const call of mailCalls) {
  const body = call.body as Array<{ to: string[]; cc?: unknown; bcc?: unknown }>;
  assert.equal(body.length, 1);
  assert.equal(body[0].to.length, 1);
  assert.equal(body[0].cc, undefined);
  assert.equal(body[0].bcc, undefined);
  assert.equal(call.idempotencyKey, dispatchIdempotencyKey("seasonal", "2026-10-01", body[0].to[0]));
}
assert.deepEqual(
  mailCalls.map((call) => (call.body as Array<{ to: string[] }>)[0].to[0]).sort(),
  subscribers.map((sub) => sub.email).sort(),
);

setExternalTimeoutScaleForTests(0.05);
installFetch();
const outbox = await mkdtemp(path.join(tmpdir(), "otw-outbox-"));
const previousCwd = process.cwd();
process.chdir(outbox);
const morningStarted = Date.now();
const morning = await dispatchMorning({
  at: new Date("2026-10-08T15:00:00Z"),
  forceAll: true,
  subscribers: [
    {
      name: "Timer",
      email: "timer@example.com",
      zip: "77550",
      desks: AREAS.map((area) => area.id),
      cadence: ["daily"],
      createdAt: "test",
    },
  ],
});
const morningMs = Date.now() - morningStarted;
process.chdir(previousCwd);
await rm(outbox, { recursive: true, force: true });
assert.equal(
  calls.some((call) => call.url.includes("api.resend.com")),
  false,
  "morning timing must not send",
);
assert.ok(morning.results.length > 0);
assert.ok(morning.results.every((row) => row.sent === false));
assert.ok(morningMs < DISPATCH_BUDGET_MS, `morning build took ${morningMs}ms`);
assert.ok(morningMs < 120_000, `morning build took ${morningMs}ms`);

assertLogsHaveNoAddress();
console.log = originalLog;
console.log(`ok dispatch budget ${DISPATCH_BUDGET_MS}ms morning-build ${morningMs}ms batch ${batchCalls.length}`);
