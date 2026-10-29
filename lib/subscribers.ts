import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AREA_IDS } from "@/lib/data/areas";
import { DESKS } from "@/lib/desks";
import {
  cadenceLabels,
  parseCadence,
  type Cadence,
  CADENCES,
} from "@/lib/coasts";
import {
  airtableConfigured,
  listAirtableSubscribers,
  upsertAirtableSubscriber,
  type ListSource,
} from "@/lib/airtable-list";

export const DESK_IDS: string[] = DESKS.map((d) => d.areaId);
export const WATER_IDS: string[] = AREA_IDS;

export type Subscriber = {
  name: string;
  email: string;
  zip: string;
  desks: string[];
  cadence: Cadence[];
  createdAt: string;
};

const FILE = path.join(process.cwd(), "data", "subscribers.json");

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export function validEmail(raw: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export function validName(raw: string) {
  const name = raw.trim();
  return name.length >= 2 && name.length <= 80;
}

export function validPostal(raw: string) {
  const zip = raw.trim();
  if (/^\d{5}(-\d{4})?$/.test(zip)) return true;
  return /^[A-Za-z0-9][A-Za-z0-9 \-]{1,11}$/.test(zip);
}

export function parseDesks(raw: unknown): string[] {
  const wanted = new Set(WATER_IDS);
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  return [...new Set(list.map((d) => String(d).trim()).filter((d) => wanted.has(d)))];
}

async function readLocal(): Promise<Subscriber[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Array<Partial<Subscriber> & { cadence?: Cadence[] }>;
    return Array.isArray(parsed)
      ? parsed.map((s) => ({
          name: s.name?.trim() ?? "",
          email: s.email ?? "",
          zip: s.zip?.trim() ?? "",
          desks: Array.isArray(s.desks) ? s.desks : [],
          cadence: parseCadence(s.cadence),
          createdAt: s.createdAt ?? "",
        }))
      : [];
  } catch {
    return [];
  }
}

async function writeLocal(list: Subscriber[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, `${JSON.stringify(list, null, 2)}\n`);
}

function envSubscribers(): Subscriber[] {
  const raw = process.env.SUBSCRIBER_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((email) => email.trim())
    .filter(validEmail)
    .map((email) => ({
      name: "",
      email: normalizeEmail(email),
      zip: "",
      desks: [...DESK_IDS],
      cadence: [...CADENCES],
      createdAt: "env",
    }));
}

export async function addSubscriber(
  email: string,
  desks: string[],
  source: ListSource = "Brief",
  cadence: Cadence[] = [...CADENCES],
  profile?: { name?: string; zip?: string },
) {
  const sub: Subscriber = {
    name: profile?.name?.trim() ?? "",
    email: normalizeEmail(email),
    zip: profile?.zip?.trim() ?? "",
    desks: parseDesks(desks),
    cadence: parseCadence(cadence),
    createdAt: new Date().toISOString(),
  };
  if (!validName(sub.name)) throw new Error("Leave the name you go by.");
  if (!validEmail(sub.email)) throw new Error("That is not an email.");
  if (!validPostal(sub.zip)) throw new Error("Leave a home ZIP or postal code.");
  if (!sub.desks.length) throw new Error("Pick at least one piece of water.");
  const local = await readLocal();
  const next = [...local.filter((s) => s.email !== sub.email), sub];
  try {
    await writeLocal(next);
  } catch {
    // Vercel filesystem is ephemeral — Airtable is the list that survives.
  }
  if (airtableConfigured()) {
    await upsertAirtableSubscriber({
      email: sub.email,
      desks: sub.desks,
      source,
      cadence: cadenceLabels(sub.cadence),
      name: sub.name,
      zip: sub.zip,
    });
    return { subscriber: sub, persisted: true, via: "airtable" as const };
  }
  return {
    subscriber: sub,
    persisted: Boolean(process.env.SUBSCRIBER_EMAILS),
    via: "local" as const,
  };
}

function mergeSubscriber(prev: Subscriber | undefined, next: Subscriber): Subscriber {
  return {
    name: next.name || prev?.name || "",
    email: next.email,
    zip: next.zip || prev?.zip || "",
    desks: [...new Set([...(prev?.desks ?? []), ...next.desks])],
    cadence: [...new Set([...(prev?.cadence ?? []), ...next.cadence])],
    createdAt: prev?.createdAt ?? next.createdAt,
  };
}

export async function listSubscribers(opts?: { strict?: boolean }): Promise<Subscriber[]> {
  const byEmail = new Map<string, Subscriber>();
  let airtable: Subscriber[] = [];
  if (airtableConfigured()) {
    try {
      airtable = (await listAirtableSubscribers()).map((s) => ({
        name: s.name,
        email: s.email,
        zip: s.zip,
        desks: parseDesks(s.desks),
        cadence: parseCadence(s.cadence),
        createdAt: s.joined || "airtable",
      }));
    } catch (error) {
      if (opts?.strict) throw error;
      airtable = [];
    }
  }
  for (const sub of [...envSubscribers(), ...airtable, ...(await readLocal())]) {
    byEmail.set(sub.email, mergeSubscriber(byEmail.get(sub.email), sub));
  }
  return [...byEmail.values()];
}

export function subscribersForDesk(list: Subscriber[], areaId: string, cadence?: Cadence) {
  return list
    .filter((s) => s.desks.includes(areaId) && (!cadence || s.cadence.includes(cadence)))
    .map((s) => s.email);
}

export async function findSubscriber(email: string) {
  const wanted = normalizeEmail(email);
  return (await listSubscribers()).find((s) => s.email === wanted) ?? null;
}
