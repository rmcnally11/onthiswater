import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/subscribe/route";
import { AIRTABLE_FIELDS, listAirtableSubscribers, upsertAirtableSubscriber } from "@/lib/airtable-list";
import { welcomeDeskIds } from "@/lib/samples";
import { enqueueWelcome, guardWelcome, subscribeNote } from "@/lib/welcome-queue";

delete process.env.RESEND_API_KEY;
delete process.env.AIRTABLE_API_KEY;
delete process.env.AIRTABLE_TOKEN;

const route = readFileSync(new URL("../app/api/subscribe/route.ts", import.meta.url), "utf8");
assert.equal(route.includes("await sendWelcomeEmails"), false);
assert.match(route, /enqueueWelcome\(after/);
assert.match(route, /sentNow: false/);
assert.match(route, /maxDuration = 300/);

assert.deepEqual(
  welcomeDeskIds({ desks: ["galveston", "islamorada", "nope"], coasts: ["texas"] }),
  ["galveston"],
);

const logged: unknown[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  logged.push(args);
};
await guardWelcome(async () => {
  throw new Error("resend quiet");
});
console.error = originalError;
assert.equal(logged.length, 1);
assert.match(String(logged[0]), /Welcome mail did not send/);

let sendStarted = false;
let release!: () => void;
const gate = new Promise<void>((resolve) => {
  release = resolve;
});
let queued: (() => Promise<void>) | undefined;
const started = Date.now();
enqueueWelcome(
  (task) => {
    queued = task;
  },
  async () => {
    sendStarted = true;
    await gate;
  },
);
const body = {
  ok: true as const,
  sentNow: false as const,
  note: subscribeNote(["texas"], "airtable"),
};
const elapsed = Date.now() - started;
assert.equal(body.sentNow, false);
assert.match(body.note, /Welcome notes are on the way/);
assert.equal(sendStarted, false);
assert.equal(typeof queued, "function");
assert.ok(elapsed < 50, `response assembled in ${elapsed}ms`);

const pending = queued!();
await Promise.resolve();
assert.equal(sendStarted, true);
let settled = false;
pending.then(() => {
  settled = true;
});
await Promise.resolve();
assert.equal(settled, false);
release();
await pending;
assert.equal(settled, true);

process.env.AIRTABLE_API_KEY = "pat_test_not_real";
const listed: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  listed.push(url);
  return new Response(JSON.stringify({ records: [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}) as typeof fetch;
const listedRows = await listAirtableSubscribers();
assert.equal(listedRows.length, 0);
const formula = new URL(listed[0] ?? "").searchParams.get("filterByFormula");
assert.equal(formula, 'OR({Status}="Active",{Status}="Paid")');

function airtableRecord(status: string) {
  return {
    records: [
      {
        id: "recExcluded",
        fields: {
          [AIRTABLE_FIELDS.email]: "ada@example.com",
          [AIRTABLE_FIELDS.name]: "Ada",
          [AIRTABLE_FIELDS.zip]: "77550",
          [AIRTABLE_FIELDS.desks]: ["galveston"],
          [AIRTABLE_FIELDS.cadence]: ["Daily"],
          [AIRTABLE_FIELDS.status]: status,
          [AIRTABLE_FIELDS.source]: "Letter",
          [AIRTABLE_FIELDS.joined]: "2026-01-01",
        },
      },
    ],
  };
}

const writes: Array<{ method: string; fields: Record<string, unknown> }> = [];
function installAirtable(status: string | null) {
  writes.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "GET") {
      return new Response(JSON.stringify(status ? airtableRecord(status) : { records: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = JSON.parse(String(init?.body)) as { fields: Record<string, unknown> };
    writes.push({ method, fields: body.fields });
    return new Response(JSON.stringify({ id: "recExcluded" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

installAirtable("Unsubscribed");
const resubscribed = await upsertAirtableSubscriber({
  email: "ada@example.com",
  desks: ["galveston"],
  source: "Letter",
});
assert.equal(resubscribed.excluded, false);
assert.equal(writes[0]?.fields[AIRTABLE_FIELDS.status], "Active");

installAirtable("Paid");
const paid = await upsertAirtableSubscriber({
  email: "ada@example.com",
  desks: ["galveston"],
  source: "Letter",
});
assert.equal(paid.excluded, false);
assert.equal(writes[0]?.fields[AIRTABLE_FIELDS.status], "Paid");

installAirtable(null);
const created = await upsertAirtableSubscriber({
  email: "ada@example.com",
  desks: ["galveston"],
  source: "Letter",
});
assert.equal(created.created, true);
assert.equal(created.excluded, false);
assert.equal(writes[0]?.method, "POST");
assert.equal(writes[0]?.fields[AIRTABLE_FIELDS.status], "Active");

const home = await mkdtemp(path.join(tmpdir(), "otw-excluded-"));
const previousCwd = process.cwd();
process.chdir(home);
let signup: Response;
try {
  installAirtable("Excluded");
  signup = await POST(
    new NextRequest("http://localhost/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ada",
        email: "Ada@Example.com",
        zip: "77550",
        desks: ["galveston"],
        cadence: ["daily", "weekly"],
        source: "Letter",
      }),
    }),
  );
} finally {
  process.chdir(previousCwd);
  await rm(home, { recursive: true, force: true });
}
assert.equal(signup.status, 200);
const signupBody = (await signup.json()) as {
  ok?: boolean;
  sentNow?: boolean;
  via?: string;
  note?: string;
  desks?: string[];
  coasts?: string[];
  error?: string;
};
assert.equal(signupBody.ok, true);
assert.equal(signupBody.sentNow, false);
assert.equal(signupBody.via, "airtable");
assert.equal(signupBody.error, undefined);
assert.deepEqual(signupBody.desks, ["galveston"]);
assert.equal(signupBody.note, subscribeNote(signupBody.coasts ?? [], "airtable"));
assert.equal(writes.length, 1);
assert.equal(writes[0]?.method, "PATCH");
assert.equal(writes[0]?.fields[AIRTABLE_FIELDS.status], "Excluded");
delete process.env.AIRTABLE_API_KEY;

console.log("ok subscribe returns before welcome");
