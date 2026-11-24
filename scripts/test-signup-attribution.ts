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
  LANDING_STORAGE_KEY,
  SIGNUP_PATH_FIELD,
  UTM_CAMPAIGN_FIELD,
  UTM_MEDIUM_FIELD,
  UTM_SOURCE_FIELD,
  captureLanding,
  signupAttributionFields,
} from "@/lib/signup-attribution";

delete process.env.RESEND_API_KEY;
delete process.env.AIRTABLE_API_KEY;
delete process.env.AIRTABLE_TOKEN;

assert.equal(SIGNUP_PATH_FIELD, "signup_path");
assert.equal(UTM_SOURCE_FIELD, "utm_source");
assert.equal(UTM_MEDIUM_FIELD, "utm_medium");
assert.equal(UTM_CAMPAIGN_FIELD, "utm_campaign");

assert.deepEqual(
  signupAttributionFields({
    signup_path: "  ",
    utm_source: "unknown",
    utm_medium: " Unknown ",
    utm_campaign: "",
  }),
  {},
);
assert.deepEqual(
  signupAttributionFields({
    signup_path: null,
    utm_source: undefined,
    utm_medium: "UNKNOWN",
    utm_campaign: "   ",
  }),
  {},
);

const tagged = signupAttributionFields({
  signup_path: "/newsletter/2026-11-14?utm_source=ig&email=ada@example.com",
  utm_source: " ig ",
  utm_medium: "social",
  utm_campaign: "nov",
});
assert.deepEqual(tagged, {
  signup_path: "/newsletter/2026-11-14",
  utm_source: "ig",
  utm_medium: "social",
  utm_campaign: "nov",
});
assert.equal(JSON.stringify(tagged).includes("?"), false);
assert.equal(JSON.stringify(tagged).includes("@"), false);
assert.equal(JSON.stringify(tagged).includes("ada@example.com"), false);

assert.equal(
  signupAttributionFields({
    signup_path: "https://example.com/newsletter/2026-11-14?utm_source=ig&email=ada@example.com",
  }).signup_path,
  "/newsletter/2026-11-14",
);
assert.equal(
  signupAttributionFields({
    signup_path: "/newsletter/2026-11-14%3Femail=ada@example.com",
  }).signup_path,
  "/newsletter/2026-11-14",
);
assert.equal(
  signupAttributionFields({ signup_path: "/desk/ada@example.com/galveston" }).signup_path,
  "/desk/galveston",
);
assert.equal("signup_path" in signupAttributionFields({ signup_path: "/ada@example.com" }), false);
assert.equal(signupAttributionFields({ signup_path: "/unknown" }).signup_path, "/unknown");
assert.equal(signupAttributionFields({ utm_campaign: "unknown-campaign" }).utm_campaign, "unknown-campaign");

const longPath = `/${"p".repeat(250)}?email=ada@example.com`;
const longSource = ` ${"s".repeat(250)} `;
const capped = signupAttributionFields({
  signup_path: longPath,
  utm_source: longSource,
  utm_medium: "unknown",
  utm_campaign: "",
});
assert.equal(capped.signup_path?.length, 200);
assert.equal(capped.signup_path?.startsWith("/ppp"), true);
assert.equal(capped.signup_path?.includes("?"), false);
assert.equal(capped.signup_path?.includes("@"), false);
assert.equal(capped.utm_source?.length, 200);
assert.equal(capped.utm_source, "s".repeat(200));
assert.equal("utm_medium" in capped, false);
assert.equal("utm_campaign" in capped, false);
assert.equal(signupAttributionFields({ utm_source: "s".repeat(200) }).utm_source?.length, 200);

function memoryStorage() {
  const bag = new Map<string, string>();
  return {
    getItem(key: string) {
      return bag.has(key) ? (bag.get(key) ?? null) : null;
    },
    setItem(key: string, value: string) {
      bag.set(key, value);
    },
    bag,
  };
}

const storage = memoryStorage();
const landing = captureLanding(
  storage,
  "/newsletter/2026-11-14",
  "?utm_source=ig&utm_medium=social&utm_campaign=nov&email=ada@example.com",
);
assert.equal(landing.signup_path, "/newsletter/2026-11-14");
assert.equal(landing.utm_source, "ig");
assert.equal(landing.utm_medium, "social");
assert.equal(landing.utm_campaign, "nov");
const storedRaw = storage.bag.get(LANDING_STORAGE_KEY) ?? "";
assert.equal(storedRaw.includes("ada@example.com"), false);
assert.equal(storedRaw.includes("?"), false);
const carried = captureLanding(storage, "/join", "?utm_source=other&utm_medium=cpc&utm_campaign=later");
assert.deepEqual(carried, landing);
assert.equal(storage.bag.size, 1);

const attributionSource = readFileSync(new URL("../lib/signup-attribution.ts", import.meta.url), "utf8");
const rememberSource = readFileSync(new URL("../components/remember-landing.tsx", import.meta.url), "utf8");
const formSource = readFileSync(new URL("../components/morning-mail.tsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
assert.equal(attributionSource.includes("document.cookie"), false);
assert.equal(attributionSource.includes("cookies("), false);
assert.equal(rememberSource.includes("document.cookie"), false);
assert.equal(rememberSource.includes("cookies("), false);
assert.equal(formSource.includes("document.cookie"), false);
assert.equal(formSource.includes("cookies("), false);
assert.match(attributionSource, /sessionStorage/);
assert.match(rememberSource, /captureBrowserLanding/);
assert.match(layoutSource, /RememberLanding/);
assert.match(formSource, /name="signup_path"/);
assert.match(formSource, /name="utm_source"/);
assert.match(formSource, /name="utm_medium"/);
assert.match(formSource, /name="utm_campaign"/);
assert.match(formSource, /type="hidden"/);

const ATTRIBUTION_FIELDS = [SIGNUP_PATH_FIELD, UTM_SOURCE_FIELD, UTM_MEDIUM_FIELD, UTM_CAMPAIGN_FIELD];

type Write = { method: string; url: string; fields: Record<string, unknown> };

function airtableRecord(fields: Record<string, unknown>) {
  return { records: [{ id: "recAda", fields }] };
}

function installAirtable(opts: { existing?: Record<string, unknown> | null; rejectAttribution?: boolean }) {
  const writes: Write[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    assert.equal(url.startsWith("https://api.airtable.com/"), true);
    const method = init?.method ?? "GET";
    if (method === "GET") {
      return new Response(JSON.stringify(opts.existing ? airtableRecord(opts.existing) : { records: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = JSON.parse(String(init?.body)) as { fields: Record<string, unknown> };
    if (opts.rejectAttribution && method === "POST" && SIGNUP_PATH_FIELD in body.fields) {
      return new Response(
        JSON.stringify({
          error: { type: "UNKNOWN_FIELD_NAME", message: 'Unknown field name: "signup_path"' },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      );
    }
    writes.push({ method, url, fields: body.fields });
    return new Response(JSON.stringify({ id: "recAda" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return writes;
}

function assertAttributionAbsent(fields: Record<string, unknown> | undefined) {
  for (const name of ATTRIBUTION_FIELDS) {
    assert.equal(name in (fields ?? {}), false, name);
  }
  assert.equal(AIRTABLE_ENTRY_FIELD in (fields ?? {}), false);
}

process.env.AIRTABLE_API_KEY = "pat_test_not_real";

const dirty = {
  email: "ada@example.com",
  desks: ["galveston"],
  source: "Letter" as const,
  ref: "desk-galveston",
  signup_path: "/newsletter/2026-11-14?utm_source=ig&email=ada@example.com",
  utm_source: ` ${"s".repeat(250)} `,
  utm_medium: " social ",
  utm_campaign: "unknown",
};

const createdWrites = installAirtable({ existing: null });
const created = await upsertAirtableSubscriber(dirty);
assert.equal(created.created, true);
assert.equal(createdWrites.length, 1);
assert.equal(createdWrites[0]?.method, "POST");
assert.equal(createdWrites[0]?.fields[SIGNUP_PATH_FIELD], "/newsletter/2026-11-14");
assert.equal(createdWrites[0]?.fields[UTM_SOURCE_FIELD], "s".repeat(200));
assert.equal(createdWrites[0]?.fields[UTM_MEDIUM_FIELD], "social");
assert.equal(UTM_CAMPAIGN_FIELD in (createdWrites[0]?.fields ?? {}), false);
assert.equal(createdWrites[0]?.fields[AIRTABLE_ENTRY_FIELD], "desk-galveston");
assert.equal(JSON.stringify(createdWrites[0]?.fields).includes("ada@example.com"), true);
assert.equal(String(createdWrites[0]?.fields[SIGNUP_PATH_FIELD]).includes("@"), false);
assert.equal(String(createdWrites[0]?.fields[SIGNUP_PATH_FIELD]).includes("?"), false);

const blankWrites = installAirtable({ existing: null });
const blank = await upsertAirtableSubscriber({
  email: "ada@example.com",
  desks: ["galveston"],
  source: "Brief",
  signup_path: "",
  utm_source: "unknown",
  utm_medium: " ",
  utm_campaign: undefined,
});
assert.equal(blank.created, true);
assert.equal(blankWrites[0]?.method, "POST");
assertAttributionAbsent(blankWrites[0]?.fields);

const activeWrites = installAirtable({
  existing: {
    [AIRTABLE_FIELDS.email]: "ada@example.com",
    [AIRTABLE_FIELDS.status]: "Active",
    [AIRTABLE_FIELDS.source]: "Operator",
    [AIRTABLE_FIELDS.joined]: "2026-01-01",
  },
});
const active = await upsertAirtableSubscriber(dirty);
assert.equal(active.created, false);
assert.equal(active.excluded, false);
assert.equal(activeWrites.length, 1);
assert.equal(activeWrites[0]?.method, "PATCH");
assertAttributionAbsent(activeWrites[0]?.fields);
assert.equal(activeWrites[0]?.fields[AIRTABLE_FIELDS.status], "Active");
assert.equal(activeWrites[0]?.fields[AIRTABLE_FIELDS.source], "Operator");

const excludedWrites = installAirtable({
  existing: {
    [AIRTABLE_FIELDS.email]: "ada@example.com",
    [AIRTABLE_FIELDS.status]: "Excluded",
    [AIRTABLE_FIELDS.source]: "Operator",
    [AIRTABLE_FIELDS.joined]: "2026-01-01",
  },
});
const excluded = await upsertAirtableSubscriber(dirty);
assert.equal(excluded.created, false);
assert.equal(excluded.excluded, true);
assert.equal(excludedWrites[0]?.method, "PATCH");
assertAttributionAbsent(excludedWrites[0]?.fields);
assert.equal(excludedWrites[0]?.fields[AIRTABLE_FIELDS.status], "Excluded");

const missingWrites = installAirtable({ existing: null, rejectAttribution: true });
const missing = await upsertAirtableSubscriber(dirty);
assert.equal(missing.created, true);
assert.equal(missingWrites.length, 1);
assert.equal(missingWrites[0]?.method, "POST");
assertAttributionAbsent(missingWrites[0]?.fields);
assert.equal(missingWrites[0]?.fields[AIRTABLE_FIELDS.status], "Active");

const home = await mkdtemp(path.join(tmpdir(), "otw-signup-attr-"));
const previousCwd = process.cwd();
process.chdir(home);

const person = {
  name: "Ada",
  email: "ada@example.com",
  zip: "77550",
  desks: ["galveston"],
  cadence: ["daily"] as Cadence[],
  source: "Letter" as const,
};

try {
  const savedWrites = installAirtable({ existing: null });
  const saved = await addSubscriber(person.email, person.desks, "Letter", person.cadence, {
    name: person.name,
    zip: person.zip,
    ref: "newsletter",
    signup_path: "/morning/galveston?ref=desk-galveston",
    utm_source: "ig",
    utm_medium: "",
    utm_campaign: "unknown",
  });
  assert.equal(saved.via, "airtable");
  assert.equal(savedWrites.at(-1)?.method, "POST");
  assert.equal(savedWrites.at(-1)?.fields[SIGNUP_PATH_FIELD], "/morning/galveston");
  assert.equal(savedWrites.at(-1)?.fields[UTM_SOURCE_FIELD], "ig");
  assert.equal(UTM_MEDIUM_FIELD in (savedWrites.at(-1)?.fields ?? {}), false);
  assert.equal(UTM_CAMPAIGN_FIELD in (savedWrites.at(-1)?.fields ?? {}), false);
  assert.equal(savedWrites.at(-1)?.fields[AIRTABLE_ENTRY_FIELD], "newsletter");

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
  const resubscribe = await POST(
    new NextRequest("http://127.0.0.1/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...person,
        ref: "desk-galveston",
        signup_path: "/newsletter/2026-11-14?email=ada@example.com",
        utm_source: "ig",
        utm_medium: "social",
        utm_campaign: "nov",
      }),
    }),
  );
  assert.equal(resubscribe.status, 200);
  const resubscribeBody = (await resubscribe.json()) as { ok?: boolean; via?: string };
  assert.equal(resubscribeBody.ok, true);
  assert.equal(resubscribeBody.via, "airtable");
  assert.equal(routeWrites.at(-1)?.method, "PATCH");
  assertAttributionAbsent(routeWrites.at(-1)?.fields);
  assert.equal(routeWrites.at(-1)?.fields[AIRTABLE_FIELDS.status], "Excluded");
  assert.equal(routeWrites.at(-1)?.fields[AIRTABLE_FIELDS.source], "Operator");
} finally {
  process.chdir(previousCwd);
  await rm(home, { recursive: true, force: true });
  await rm(path.join(previousCwd, "data", "subscribers.json"), { force: true });
  delete process.env.AIRTABLE_API_KEY;
  delete process.env.AIRTABLE_TOKEN;
}

console.log("ok signup attribution");
