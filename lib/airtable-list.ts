import { fetchExternal } from "@/lib/external-fetch";

/** On This Water list — Costal Cavaliers workspace. IDs are public; the token is not. */
export const AIRTABLE_BASE = "app3GRvkkpJdnVIKy";
export const AIRTABLE_TABLE = "tblqoCAVvAvEFYMe6";
export const AIRTABLE_TABLE_URL = `https://airtable.com/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;

export const AIRTABLE_FIELDS = {
  name: "fld3dNtADK32TeRYD",
  email: "fldxbuLSA1abol1QD",
  zip: "fld5CbrwcpJwkubQ4",
  desks: "fldfp7bhxDuVsvLDs",
  status: "fldNvuox5pwxbDc9i",
  source: "fldCrpEUBV2t9a5oh",
  joined: "fldTQcD4XDpVsdy6f",
  notes: "fldYDuwwxmogAbDvl",
  cadence: "fldedcanNXcoKuOnM",
} as const;

export type ListSource = "Brief" | "Letter" | "Morning" | "Operator";

function token() {
  return process.env.AIRTABLE_API_KEY?.trim() || process.env.AIRTABLE_TOKEN?.trim() || "";
}

export function airtableConfigured() {
  return Boolean(token());
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

async function airtable<T>(path: string, init?: RequestInit): Promise<T> {
  const key = token();
  if (!key) throw new Error("Airtable token is not set.");
  const res = await fetchExternal(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}${path}`, {
    method: init?.method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: typeof init?.body === "string" ? init.body : undefined,
    cache: "no-store",
    timeoutMs: 8000,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${res.status}: ${text.slice(0, 240)}`);
  }
  return res.json() as Promise<T>;
}

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

export async function upsertAirtableSubscriber(input: {
  email: string;
  desks: string[];
  source: ListSource;
  cadence?: string[];
  name?: string;
  zip?: string;
}) {
  const found = await airtable<{ records: AirtableRecord[] }>(
    `?${new URLSearchParams({
      filterByFormula: `LOWER({Email})="${input.email.replaceAll('"', "")}"`,
      maxRecords: "1",
      returnFieldsByFieldId: "true",
    })}`,
  );
  const existing = found.records[0];
  const fields: Record<string, unknown> = {
    [AIRTABLE_FIELDS.email]: input.email,
    [AIRTABLE_FIELDS.desks]: input.desks,
    [AIRTABLE_FIELDS.status]:
      asString(existing?.fields[AIRTABLE_FIELDS.status]) === "Unsubscribed"
        ? "Active"
        : (asString(existing?.fields[AIRTABLE_FIELDS.status]) || "Active"),
    [AIRTABLE_FIELDS.source]: asString(existing?.fields[AIRTABLE_FIELDS.source]) || input.source,
    [AIRTABLE_FIELDS.joined]:
      asString(existing?.fields[AIRTABLE_FIELDS.joined]) || new Date().toISOString().slice(0, 10),
    [AIRTABLE_FIELDS.cadence]: input.cadence?.length
      ? input.cadence
      : asStrings(existing?.fields[AIRTABLE_FIELDS.cadence]).length
        ? asStrings(existing?.fields[AIRTABLE_FIELDS.cadence])
        : ["Daily", "Weekly", "Calendar", "Seasonal"],
  };
  if (input.name?.trim()) fields[AIRTABLE_FIELDS.name] = input.name.trim();
  if (input.zip?.trim()) fields[AIRTABLE_FIELDS.zip] = input.zip.trim();
  if (existing) {
    await airtable(`/${existing.id}`, { method: "PATCH", body: JSON.stringify({ fields, typecast: true }) });
    return { id: existing.id, created: false };
  }
  const created = await airtable<{ id: string }>("", {
    method: "POST",
    body: JSON.stringify({ fields, typecast: true }),
  });
  return { id: created.id, created: true };
}

export async function listAirtableSubscribers() {
  const out: Array<{
    name: string;
    email: string;
    zip: string;
    desks: string[];
    cadence: string[];
    status: string;
    source: string;
    joined: string;
  }> = [];
  let offset: string | undefined;
  do {
    const qs = new URLSearchParams({
      filterByFormula: `OR({Status}="Active",{Status}="Paid")`,
      pageSize: "100",
      returnFieldsByFieldId: "true",
    });
    if (offset) qs.set("offset", offset);
    const page = await airtable<{ records: AirtableRecord[]; offset?: string }>(`?${qs}`);
    for (const rec of page.records) {
      const email = asString(rec.fields[AIRTABLE_FIELDS.email]).trim().toLowerCase();
      if (!email) continue;
      out.push({
        name: asString(rec.fields[AIRTABLE_FIELDS.name]).trim(),
        email,
        zip: asString(rec.fields[AIRTABLE_FIELDS.zip]).trim(),
        desks: asStrings(rec.fields[AIRTABLE_FIELDS.desks]),
        cadence: asStrings(rec.fields[AIRTABLE_FIELDS.cadence]).length
          ? asStrings(rec.fields[AIRTABLE_FIELDS.cadence])
          : ["Daily", "Weekly", "Calendar", "Seasonal"],
        status: asString(rec.fields[AIRTABLE_FIELDS.status]) || "Active",
        source: asString(rec.fields[AIRTABLE_FIELDS.source]),
        joined: asString(rec.fields[AIRTABLE_FIELDS.joined]),
      });
    }
    offset = page.offset;
  } while (offset);
  return out;
}
