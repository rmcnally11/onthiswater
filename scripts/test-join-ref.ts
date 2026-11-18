import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/subscribe/route";
import { AIRTABLE_ENTRY_FIELD, AIRTABLE_FIELDS, upsertAirtableSubscriber } from "@/lib/airtable-list";
import type { Cadence } from "@/lib/coasts";
import { addSubscriber } from "@/lib/subscribers";
import {
  joinHref,
  joinRefForPath,
  joinRefFromSearch,
  subscribePayload,
} from "@/lib/join-ref";

delete process.env.RESEND_API_KEY;
delete process.env.AIRTABLE_API_KEY;
delete process.env.AIRTABLE_TOKEN;

assert.equal(joinRefFromSearch("?ref=desk-galveston"), "desk-galveston");
assert.equal(joinRefFromSearch("ref=desk-galveston"), "desk-galveston");
assert.equal(joinRefFromSearch("?utm_source=newsletter"), "newsletter");
assert.equal(joinRefFromSearch("?ref=desk-galveston&utm_source=other"), "desk-galveston");
assert.equal(joinRefFromSearch(""), "");
assert.equal(joinRefFromSearch("?ref="), "");
assert.equal(joinRefFromSearch("?utm_source=bad ref"), "");
assert.equal(joinRefFromSearch("?ref=../admin"), "");

assert.equal(joinHref("desk-galveston"), "/join?ref=desk-galveston");
assert.equal(joinHref(joinRefForPath("/morning/galveston")), "/join?ref=desk-galveston");
assert.equal(joinHref(joinRefForPath("/morning/galveston/2026-01-04")), "/join?ref=desk-galveston");
assert.equal(joinHref(joinRefForPath("/morning/key-west")), "/join?ref=desk-key-west");
assert.equal(joinHref(joinRefForPath("/newsletter")), "/join?ref=newsletter");
assert.equal(joinHref(joinRefForPath("/newsletter/2026-01-03")), "/join?ref=newsletter");
assert.equal(joinHref(joinRefForPath("/")), "/join?ref=home");
assert.equal(joinHref(joinRefForPath("/texas")), "/join?ref=coast-texas");
assert.equal(joinHref(joinRefForPath("/calendar")), "/join?ref=calendar");
assert.equal(joinHref(joinRefForPath("/join")), "/join");
assert.equal(joinHref(""), "/join");
assert.equal(joinHref(null), "/join");

const tagged = subscribePayload({
  name: "Ada",
  email: "ada@example.com",
  zip: "77550",
  desks: ["galveston"],
  cadence: ["daily"],
  source: "Letter",
  ref: joinRefFromSearch("?ref=desk-galveston"),
});
assert.equal(tagged.ref, "desk-galveston");
assert.match(JSON.stringify(tagged), /"ref":"desk-galveston"/);

const barePayload = subscribePayload({
  name: "Ada",
  email: "ada@example.com",
  zip: "77550",
  desks: ["galveston"],
  cadence: ["daily"],
  source: "Letter",
  ref: joinRefFromSearch(""),
});
assert.equal("ref" in barePayload, false);

const subscribeRoute = readFileSync(new URL("../app/api/subscribe/route.ts", import.meta.url), "utf8");
assert.match(subscribeRoute, /normalizeJoinRef\(body\.ref\)/);
assert.match(subscribeRoute, /ref \}/);
const joinPage = readFileSync(new URL("../app/(public)/join/page.tsx", import.meta.url), "utf8");
const joinMail = readFileSync(new URL("../components/join-mail.tsx", import.meta.url), "utf8");
assert.equal(joinPage.includes("searchParams"), false);
assert.equal(joinPage.includes("cookies("), false);
assert.match(joinMail, /window\.location\.search/);
assert.equal(joinMail.includes("useSearchParams"), false);
assert.match(readFileSync(new URL("../components/briefing-panel.tsx", import.meta.url), "utf8"), /desk-\$\{area\.id\}/);
assert.match(readFileSync(new URL("../components/letter-issue.tsx", import.meta.url), "utf8"), /place="newsletter"/);
assert.match(readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8"), /joinRefForPath/);
assert.match(readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8"), /joinRefForPath/);

type Write = { method: string; fields: Record<string, unknown> };

function airtableRecord(fields: Record<string, unknown>) {
  return {
    records: [
      {
        id: "recAda",
        fields,
      },
    ],
  };
}

function installAirtable(opts: {
  existing?: Record<string, unknown> | null;
  rejectEntry?: boolean;
}) {
  const writes: Write[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "GET") {
      return new Response(JSON.stringify(opts.existing ? airtableRecord(opts.existing) : { records: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = JSON.parse(String(init?.body)) as { fields: Record<string, unknown> };
    if (opts.rejectEntry && method === "POST" && AIRTABLE_ENTRY_FIELD in body.fields) {
      return new Response(
        JSON.stringify({
          error: { type: "UNKNOWN_FIELD_NAME", message: 'Unknown field name: "Entry"' },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }
    writes.push({ method, fields: body.fields });
    return new Response(JSON.stringify({ id: "recAda" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return writes;
}

process.env.AIRTABLE_API_KEY = "pat_test_not_real";

const createdWrites = installAirtable({ existing: null });
const created = await upsertAirtableSubscriber({
  email: "ada@example.com",
  desks: ["galveston"],
  source: "Letter",
  ref: "desk-galveston",
});
assert.equal(created.created, true);
assert.equal(createdWrites.length, 1);
assert.equal(createdWrites[0]?.method, "POST");
assert.equal(createdWrites[0]?.fields[AIRTABLE_ENTRY_FIELD], "desk-galveston");
assert.equal(createdWrites[0]?.fields[AIRTABLE_FIELDS.source], "Letter");

const keptWrites = installAirtable({
  existing: {
    [AIRTABLE_FIELDS.email]: "ada@example.com",
    [AIRTABLE_FIELDS.status]: "Active",
    [AIRTABLE_FIELDS.source]: "Operator",
    [AIRTABLE_FIELDS.joined]: "2026-01-01",
  },
});
const kept = await upsertAirtableSubscriber({
  email: "ada@example.com",
  desks: ["galveston"],
  source: "Letter",
  ref: "desk-galveston",
});
assert.equal(kept.created, false);
assert.equal(keptWrites.length, 1);
assert.equal(keptWrites[0]?.method, "PATCH");
assert.equal(AIRTABLE_ENTRY_FIELD in (keptWrites[0]?.fields ?? {}), false);
assert.equal(keptWrites[0]?.fields[AIRTABLE_FIELDS.source], "Operator");

const missingWrites = installAirtable({ existing: null, rejectEntry: true });
const missing = await upsertAirtableSubscriber({
  email: "ada@example.com",
  desks: ["galveston"],
  source: "Letter",
  ref: "newsletter",
});
assert.equal(missing.created, true);
assert.equal(missingWrites.length, 1);
assert.equal(missingWrites[0]?.method, "POST");
assert.equal(AIRTABLE_ENTRY_FIELD in (missingWrites[0]?.fields ?? {}), false);
assert.equal(missingWrites[0]?.fields[AIRTABLE_FIELDS.status], "Active");

const home = await mkdtemp(path.join(tmpdir(), "otw-join-ref-"));
const previousCwd = process.cwd();
process.chdir(home);

async function post(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://127.0.0.1/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const person = {
  name: "Ada",
  email: "ada@example.com",
  zip: "77550",
  desks: ["galveston"],
  cadence: ["daily"],
  source: "Letter",
};

try {
  const fromQuery = subscribePayload({
    ...person,
    ref: joinRefFromSearch("?ref=desk-galveston"),
  });
  const createdFromForm = installAirtable({ existing: null });
  const saved = await addSubscriber(fromQuery.email, fromQuery.desks, "Letter", fromQuery.cadence as Cadence[], {
    name: fromQuery.name,
    zip: fromQuery.zip,
    ref: fromQuery.ref,
  });
  assert.equal(saved.via, "airtable");
  assert.equal(saved.excluded, false);
  assert.equal(createdFromForm.at(-1)?.method, "POST");
  assert.equal(createdFromForm.at(-1)?.fields[AIRTABLE_ENTRY_FIELD], "desk-galveston");

  const bareFromForm = subscribePayload({ ...person, ref: joinRefFromSearch("") });
  assert.equal("ref" in bareFromForm, false);
  const bareCreate = installAirtable({ existing: null });
  const bareSaved = await addSubscriber(
    bareFromForm.email,
    bareFromForm.desks,
    "Letter",
    bareFromForm.cadence as Cadence[],
    { name: bareFromForm.name, zip: bareFromForm.zip, ref: bareFromForm.ref },
  );
  assert.equal(bareSaved.via, "airtable");
  assert.equal(AIRTABLE_ENTRY_FIELD in (bareCreate.at(-1)?.fields ?? {}), false);

  const routeWrites = installAirtable({
    existing: {
      [AIRTABLE_FIELDS.email]: "ada@example.com",
      [AIRTABLE_FIELDS.name]: "Ada",
      [AIRTABLE_FIELDS.zip]: "77550",
      [AIRTABLE_FIELDS.desks]: ["galveston"],
      [AIRTABLE_FIELDS.cadence]: ["Daily"],
      [AIRTABLE_FIELDS.status]: "Excluded",
      [AIRTABLE_FIELDS.source]: "Operator",
      [AIRTABLE_FIELDS.joined]: "2026-01-01",
    },
  });
  const resubscribe = await post({ ...person, ref: "desk-galveston" });
  assert.equal(resubscribe.status, 200);
  const resubscribeBody = (await resubscribe.json()) as { ok?: boolean; via?: string; sentNow?: boolean };
  assert.equal(resubscribeBody.ok, true);
  assert.equal(resubscribeBody.via, "airtable");
  assert.equal(resubscribeBody.sentNow, false);
  assert.equal(routeWrites.at(-1)?.method, "PATCH");
  assert.equal(AIRTABLE_ENTRY_FIELD in (routeWrites.at(-1)?.fields ?? {}), false);
  assert.equal(routeWrites.at(-1)?.fields[AIRTABLE_FIELDS.source], "Operator");
  assert.equal(routeWrites.at(-1)?.fields[AIRTABLE_FIELDS.status], "Excluded");

  delete process.env.AIRTABLE_API_KEY;
  delete process.env.AIRTABLE_TOKEN;
  const local = await addSubscriber(person.email, person.desks, "Letter", ["daily"], {
    name: person.name,
    zip: person.zip,
  });
  assert.equal(local.via, "local");
  assert.equal(local.excluded, false);
} finally {
  process.chdir(previousCwd);
  await rm(home, { recursive: true, force: true });
  await rm(path.join(previousCwd, "data", "subscribers.json"), { force: true });
  delete process.env.AIRTABLE_API_KEY;
  delete process.env.AIRTABLE_TOKEN;
}

console.log("ok join ref");
