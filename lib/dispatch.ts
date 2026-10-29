import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getMorningSnapshot } from "@/lib/briefing";
import { getCalendarSnapshot } from "@/lib/calendar";
import { AREA_BY_ID, AREAS } from "@/lib/data/areas";
import { COAST_DEADLINE_MS, runWithinDeadline, withDeadline, yieldToEventLoop } from "@/lib/deadline";
import {
  buildSeasonIssue,
  calendarDigestHtml,
  calendarDigestSubject,
  calendarDigestText,
  letterEmailHtml,
  letterEmailText,
  letterSubject,
  morningDigestHtml,
  morningDigestSubject,
  morningDigestText,
  seasonalEmailHtml,
  seasonalEmailText,
  seasonalSubject,
  type CalendarMonth,
} from "@/lib/mail";
import { listSubscribers, type Subscriber } from "@/lib/subscribers";
import { airtableConfigured } from "@/lib/airtable-list";
import { coastsForDesks, type Cadence } from "@/lib/coasts";
import { filterNewsletter, getNewsletter, hydrateLetterDesks } from "@/lib/newsletter";
import {
  dispatchIdempotencyKey,
  sendResendBatch,
  subscriberHash,
  RESEND_BATCH_LIMIT,
  type BatchMessage,
} from "@/lib/send";
import { clockParts, ymdInZone } from "@/lib/time";
import type { Area, Briefing, CalendarDay } from "@/lib/types";

/** Whole cron, including Sunday's calendar, stays inside the 300s limit. */
export const DISPATCH_BUDGET_MS = 200_000;

const ZONE = "America/Chicago";
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export class DispatchError extends Error {
  readonly stage = "subscribers" as const;
  constructor(message: string) {
    super(message);
    this.name = "DispatchError";
  }
}

export type DispatchBudget = {
  remaining: () => number;
  expired: () => boolean;
};

export function createDispatchBudget(ms = DISPATCH_BUDGET_MS, now = Date.now()): DispatchBudget {
  const ends = now + ms;
  return {
    remaining: () => Math.max(0, ends - Date.now()),
    expired: () => Date.now() >= ends,
  };
}

export function redact(raw: string) {
  return raw.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]");
}

function logDispatch(event: Record<string, unknown>) {
  const line = JSON.stringify({ scope: "dispatch", ...event });
  if (EMAIL_RE.test(line)) {
    console.log(JSON.stringify({ scope: "dispatch", stage: event.stage ?? "log", error: "redacted" }));
    return;
  }
  console.log(line);
}

export function localHour(timeZone: string, at = new Date()) {
  return clockParts(at, timeZone).hour;
}

export function desksDue(at = new Date(), forceAll = false) {
  return AREAS.filter((area) => (forceAll ? true : localHour(area.timezone, at) === 5));
}

export function chicagoParts(at = new Date()) {
  const parts = clockParts(at, ZONE);
  return { weekday: parts.weekday, day: parts.day };
}

export function isChicagoSaturday(at = new Date()) {
  return chicagoParts(at).weekday === "Sat";
}

export function isChicagoSunday(at = new Date()) {
  return chicagoParts(at).weekday === "Sun";
}

export function isChicagoMonthStart(at = new Date()) {
  return chicagoParts(at).day === 1;
}

export function dispatchYmd(at = new Date()) {
  return ymdInZone(at, ZONE);
}

type DispatchRow = {
  desks: string[];
  subject: string;
  recipients: number;
  sent: boolean;
  outbox?: string;
  error?: string;
  why?: string;
  idempotencyKey?: string;
};

type Piece = {
  email: string;
  desks: string[];
  subject: string;
  html: string;
  text: string;
};

async function writeOutbox(name: string, payload: unknown) {
  const dir = path.join(process.cwd(), "data", "outbox");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replaceAll(":", "")}-${name}.json`);
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`);
  return file;
}

async function loadDispatchSubscribers(given?: Subscriber[]) {
  if (given) return given;
  const started = Date.now();
  try {
    const subscribers = await listSubscribers({ strict: true });
    logDispatch({
      stage: "subscribers",
      ok: true,
      count: subscribers.length,
      ms: Date.now() - started,
      airtable: airtableConfigured(),
    });
    return subscribers;
  } catch (error) {
    logDispatch({
      stage: "subscribers",
      ok: false,
      count: 0,
      ms: Date.now() - started,
      airtable: true,
      error: redact(error instanceof Error ? error.message : "Subscriber read failed"),
    });
    throw new DispatchError("Subscriber list could not be read. No mail was sent.");
  }
}

async function deliver(cadence: Cadence, at: Date, pieces: Piece[]): Promise<DispatchRow[]> {
  const ymd = dispatchYmd(at);
  const messages: BatchMessage[] = pieces.map((piece) => ({
    to: piece.email,
    subject: piece.subject,
    html: piece.html,
    text: piece.text,
    idempotencyKey: dispatchIdempotencyKey(cadence, ymd, piece.email),
  }));
  const keys = new Set(messages.map((message) => message.idempotencyKey));
  if (keys.size !== messages.length) {
    throw new Error(`Duplicate ${cadence} idempotency key.`);
  }
  logDispatch({
    stage: "send",
    cadence,
    count: messages.length,
    chunks: Math.ceil(messages.length / RESEND_BATCH_LIMIT) || 0,
  });
  const sent = await sendResendBatch(messages);
  const rows: DispatchRow[] = [];
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    const remote = sent[i];
    if (!remote) continue;
    let outbox: string | undefined;
    if (!remote.sent && remote.why === "missing RESEND_API_KEY") {
      outbox = await writeOutbox(`${cadence}-${piece.desks.join("-")}-${subscriberHash(piece.email)}`, {
        subject: piece.subject,
        text: piece.text,
        html: piece.html,
        idempotencyKey: remote.idempotencyKey,
        recipientHash: subscriberHash(piece.email),
      }).catch(() => undefined);
    }
    if (remote.sent) ok += 1;
    else failed += 1;
    if (!remote.sent && remote.why && remote.why !== "missing RESEND_API_KEY") {
      logDispatch({
        stage: "send-message",
        cadence,
        subscriber: subscriberHash(piece.email),
        sent: false,
        error: redact(remote.why),
      });
    }
    rows.push({
      desks: piece.desks,
      subject: piece.subject,
      recipients: 1,
      sent: remote.sent,
      outbox,
      why: remote.why ? redact(remote.why) : undefined,
      idempotencyKey: remote.idempotencyKey,
    });
  }
  logDispatch({ stage: "send-result", cadence, count: messages.length, sent: ok, failed });
  return rows;
}

type MorningPack = { briefing: Briefing; yolo: CalendarDay | null };

async function buildMorningPacks(ids: string[], budget: DispatchBudget) {
  const packs = new Map<string, MorningPack>();
  const tasks = ids.map(async (id) => {
    await yieldToEventLoop();
    if (!AREA_BY_ID[id]) return;
    if (budget.expired()) {
      logDispatch({ stage: "desk-build-end", kind: "morning", desk: id, ms: 0, ok: false, error: "morning budget" });
      return;
    }
    const started = Date.now();
    const ms = Math.min(COAST_DEADLINE_MS, Math.max(1, budget.remaining()));
    logDispatch({ stage: "desk-build-start", kind: "morning", desk: id });
    try {
      const snap = await withDeadline(
        runWithinDeadline(ms, id, () => getMorningSnapshot(id)),
        ms,
        id,
      );
      packs.set(id, { briefing: snap.briefing, yolo: snap.yolo });
      logDispatch({ stage: "desk-build-end", kind: "morning", desk: id, ms: Date.now() - started, ok: true });
    } catch (error) {
      logDispatch({
        stage: "desk-build-end",
        kind: "morning",
        desk: id,
        ms: Date.now() - started,
        ok: false,
        error: redact(error instanceof Error ? error.message : "desk missed"),
      });
    }
  });
  const wait = Math.max(1, budget.remaining());
  try {
    await withDeadline(Promise.all(tasks), wait, "morning build");
  } catch (error) {
    logDispatch({
      stage: "desk-build-end",
      kind: "morning",
      desk: "*",
      ok: false,
      error: redact(error instanceof Error ? error.message : "morning budget"),
    });
  }
  return packs;
}

export async function dispatchMorning(opts?: {
  forceAll?: boolean;
  desk?: string;
  at?: Date;
  subscribers?: Subscriber[];
  budget?: DispatchBudget;
}) {
  const at = opts?.at ?? new Date();
  const budget = opts?.budget ?? createDispatchBudget();
  const hourly = process.env.CRON_HOURLY === "1";
  const forceAll = opts?.forceAll ?? !hourly;
  const due = desksDue(at, forceAll).filter((d) => !opts?.desk || d.id === opts.desk);
  const dueIds = new Set(due.map((d) => d.id));
  const subscribers = await loadDispatchSubscribers(opts?.subscribers);
  const daily = subscribers.filter((s) => s.cadence.includes("daily") && s.desks.length);
  const groups = new Map<string, Subscriber[]>();
  for (const sub of daily) {
    const desks = [...new Set(sub.desks.filter((id) => dueIds.has(id) && AREA_BY_ID[id]))].sort();
    if (!desks.length) continue;
    const key = desks.join(",");
    groups.set(key, [...(groups.get(key) ?? []), sub]);
  }
  const needed = [...new Set([...groups.keys()].flatMap((key) => key.split(",")))];
  const order = AREAS.map((a) => a.id);
  const packs = needed.length ? await buildMorningPacks(needed, budget) : new Map<string, MorningPack>();
  const pieces: Piece[] = [];
  const quietRows: DispatchRow[] = [];
  for (const [key, subs] of groups) {
    const desks = key.split(",");
    const rows = desks
      .map((id) => packs.get(id))
      .filter((row): row is MorningPack => Boolean(row))
      .sort((a, b) => order.indexOf(a.briefing.area.id) - order.indexOf(b.briefing.area.id));
    if (!rows.length) {
      quietRows.push({
        desks,
        subject: `Today · ${desks.join(" · ")}`,
        recipients: subs.length,
        sent: false,
        why: "gauges quiet",
      });
      continue;
    }
    const quiet = desks.filter((id) => !packs.has(id)).map((id) => AREA_BY_ID[id]?.shortName ?? id);
    const subject = morningDigestSubject(rows, { quiet });
    const html = morningDigestHtml(rows, { quiet });
    const text = morningDigestText(rows, { quiet });
    for (const sub of subs) {
      pieces.push({ email: sub.email, desks, subject, html, text });
    }
  }
  const results = [...quietRows, ...(pieces.length ? await deliver("daily", at, pieces) : [])];
  if (!groups.size) {
    results.push({
      desks: due.map((d) => d.id),
      subject: "Today",
      recipients: 0,
      sent: false,
      why: "no address on the list",
    });
  }
  return {
    at: at.toISOString(),
    mode: hourly && !forceAll ? "local-5am" : "all-water",
    configured: {
      airtable: airtableConfigured(),
      resend: Boolean(process.env.RESEND_API_KEY?.trim()),
      subscribers: Boolean(process.env.SUBSCRIBER_EMAILS?.trim()),
    },
    results,
  };
}

export async function dispatchWeekly(opts?: {
  force?: boolean;
  at?: Date;
  subscribers?: Subscriber[];
  budget?: DispatchBudget;
}) {
  const at = opts?.at ?? new Date();
  const budget = opts?.budget ?? createDispatchBudget();
  if (!opts?.force && !isChicagoSaturday(at)) {
    return { skipped: true as const, reason: "not Saturday in Chicago", results: [] as const };
  }
  if (budget.expired()) {
    logDispatch({ stage: "desk-build-end", kind: "weekly", desk: "*", ok: false, error: "dispatch budget" });
    return { skipped: true as const, reason: "dispatch budget", results: [] as const };
  }
  const subscribers = await loadDispatchSubscribers(opts?.subscribers);
  const weekly = subscribers.filter((s) => s.cadence.includes("weekly") && s.desks.length);
  if (!weekly.length) {
    return { skipped: false as const, reason: "no weekly addresses", results: [] as const };
  }
  const started = Date.now();
  logDispatch({ stage: "desk-build-start", kind: "weekly", desk: "letter" });
  let issue;
  try {
    issue = await withDeadline(
      getNewsletter().then((draft) => hydrateLetterDesks(draft)),
      Math.max(1, budget.remaining()),
      "weekly letter",
    );
    logDispatch({ stage: "desk-build-end", kind: "weekly", desk: "letter", ms: Date.now() - started, ok: true });
  } catch (error) {
    logDispatch({
      stage: "desk-build-end",
      kind: "weekly",
      desk: "letter",
      ms: Date.now() - started,
      ok: false,
      error: redact(error instanceof Error ? error.message : "letter missed"),
    });
    return {
      skipped: false as const,
      reason: "letter missed",
      results: [
        {
          desks: [],
          subject: "Field Letter",
          recipients: weekly.length,
          sent: false,
          error: redact(error instanceof Error ? error.message : "letter missed"),
        },
      ],
    };
  }
  const groups = new Map<string, Subscriber[]>();
  for (const sub of weekly) {
    const key = [...sub.desks].sort().join(",");
    groups.set(key, [...(groups.get(key) ?? []), sub]);
  }
  const pieces: Piece[] = [];
  for (const [key, subs] of groups) {
    const desks = key.split(",");
    const coasts = coastsForDesks(desks);
    const filtered = filterNewsletter(issue, coasts);
    const subject = letterSubject(filtered, coasts);
    const html = letterEmailHtml(filtered, coasts);
    const text = letterEmailText(filtered, coasts);
    for (const sub of subs) pieces.push({ email: sub.email, desks, subject, html, text });
  }
  const results = await deliver("weekly", at, pieces);
  return { skipped: false as const, reason: null, results };
}

async function buildCalendarPacks(ids: string[], budget: DispatchBudget) {
  const packs = new Map<string, { area: Area; month: CalendarMonth }>();
  const tasks = ids.map(async (id) => {
    await yieldToEventLoop();
    const area = AREA_BY_ID[id];
    if (!area) return;
    if (budget.expired()) {
      logDispatch({ stage: "desk-build-end", kind: "calendar", desk: id, ms: 0, ok: false, error: "dispatch budget" });
      return;
    }
    const started = Date.now();
    const ms = Math.min(COAST_DEADLINE_MS, Math.max(1, budget.remaining()));
    logDispatch({ stage: "desk-build-start", kind: "calendar", desk: id });
    try {
      const snap = await withDeadline(
        runWithinDeadline(ms, `${id} calendar`, () => getCalendarSnapshot(area, "all")),
        ms,
        `${id} calendar`,
      );
      const month = snap.months[0];
      if (month) packs.set(id, { area, month });
      logDispatch({
        stage: "desk-build-end",
        kind: "calendar",
        desk: id,
        ms: Date.now() - started,
        ok: Boolean(month),
        error: month ? undefined : "calendar did not set",
      });
    } catch (error) {
      logDispatch({
        stage: "desk-build-end",
        kind: "calendar",
        desk: id,
        ms: Date.now() - started,
        ok: false,
        error: redact(error instanceof Error ? error.message : "calendar missed"),
      });
    }
  });
  try {
    await withDeadline(Promise.all(tasks), Math.max(1, budget.remaining()), "calendar build");
  } catch (error) {
    logDispatch({
      stage: "desk-build-end",
      kind: "calendar",
      desk: "*",
      ok: false,
      error: redact(error instanceof Error ? error.message : "dispatch budget"),
    });
  }
  return packs;
}

export async function dispatchCalendar(opts?: {
  force?: boolean;
  desk?: string;
  at?: Date;
  subscribers?: Subscriber[];
  budget?: DispatchBudget;
}) {
  const at = opts?.at ?? new Date();
  const budget = opts?.budget ?? createDispatchBudget();
  if (!opts?.force && !isChicagoSunday(at)) {
    return { skipped: true as const, reason: "not Sunday in Chicago", results: [] as const };
  }
  const subscribers = await loadDispatchSubscribers(opts?.subscribers);
  const calendar = subscribers.filter((s) => s.cadence.includes("calendar") && s.desks.length);
  const groups = new Map<string, Subscriber[]>();
  for (const sub of calendar) {
    const desks = (opts?.desk ? sub.desks.filter((d) => d === opts.desk) : sub.desks).filter((id) => AREA_BY_ID[id]);
    if (!desks.length) continue;
    const key = [...new Set(desks)].sort().join(",");
    groups.set(key, [...(groups.get(key) ?? []), sub]);
  }
  if (!groups.size) {
    return { skipped: false as const, reason: "no calendar addresses", results: [] as const };
  }
  const needed = [...new Set([...groups.keys()].flatMap((key) => key.split(",")))];
  const packs = await buildCalendarPacks(needed, budget);
  const order = AREAS.map((a) => a.id);
  const pieces: Piece[] = [];
  const missed: DispatchRow[] = [];
  for (const [key, subs] of groups) {
    const desks = key.split(",");
    const rows = desks
      .map((id) => packs.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => order.indexOf(a.area.id) - order.indexOf(b.area.id));
    if (!rows.length) {
      missed.push({
        desks,
        subject: `Calendar · ${desks.join(" · ")}`,
        recipients: subs.length,
        sent: false,
        error: "Calendar did not set.",
      });
      continue;
    }
    const subject = calendarDigestSubject(rows);
    const html = calendarDigestHtml(rows);
    const text = calendarDigestText(rows);
    for (const sub of subs) pieces.push({ email: sub.email, desks, subject, html, text });
  }
  const results = [...missed, ...(pieces.length ? await deliver("calendar", at, pieces) : [])];
  return { skipped: false as const, reason: null, results };
}

export async function dispatchSeasonal(opts?: {
  force?: boolean;
  at?: Date;
  subscribers?: Subscriber[];
  budget?: DispatchBudget;
}) {
  const at = opts?.at ?? new Date();
  const budget = opts?.budget ?? createDispatchBudget();
  if (!opts?.force && !isChicagoMonthStart(at)) {
    return { skipped: true as const, reason: "not the 1st in Chicago", results: [] as const };
  }
  if (budget.expired()) {
    logDispatch({ stage: "send-result", cadence: "seasonal", count: 0, sent: 0, failed: 0, error: "dispatch budget" });
    return { skipped: true as const, reason: "dispatch budget", results: [] as const };
  }
  const subscribers = await loadDispatchSubscribers(opts?.subscribers);
  const seasonal = subscribers.filter((s) => s.cadence.includes("seasonal") && s.desks.length);
  if (!seasonal.length) {
    return { skipped: false as const, reason: "no seasonal addresses", results: [] as const };
  }
  const groups = new Map<string, Subscriber[]>();
  for (const sub of seasonal) {
    const key = [...sub.desks].sort().join(",");
    groups.set(key, [...(groups.get(key) ?? []), sub]);
  }
  const pieces: Piece[] = [];
  for (const [key, subs] of groups) {
    const desks = key.split(",");
    const coasts = coastsForDesks(desks);
    const issue = buildSeasonIssue(coasts, at);
    const subject = seasonalSubject(issue);
    const html = seasonalEmailHtml(issue);
    const text = seasonalEmailText(issue);
    for (const sub of subs) pieces.push({ email: sub.email, desks, subject, html, text });
  }
  const results = await deliver("seasonal", at, pieces);
  return { skipped: false as const, reason: null, results };
}

export async function runDispatch(opts?: {
  forceAll?: boolean;
  desk?: string;
  weekly?: boolean;
  calendar?: boolean;
  seasonal?: boolean;
  at?: Date;
  subscribers?: Subscriber[];
  budget?: DispatchBudget;
}) {
  const started = Date.now();
  const at = opts?.at ?? new Date();
  const budget = opts?.budget ?? createDispatchBudget();
  logDispatch({
    stage: "start",
    at: at.toISOString(),
    desk: opts?.desk ?? null,
    weekly: Boolean(opts?.weekly),
    calendar: Boolean(opts?.calendar),
    seasonal: Boolean(opts?.seasonal),
    budgetMs: DISPATCH_BUDGET_MS,
  });
  try {
    const subscribers = await loadDispatchSubscribers(opts?.subscribers);
    const morning = await dispatchMorning({ ...opts, at, subscribers, budget });
    const weekly = await dispatchWeekly({ force: opts?.weekly, at, subscribers, budget });
    const calendar = await dispatchCalendar({ force: opts?.calendar, desk: opts?.desk, at, subscribers, budget });
    const seasonal = await dispatchSeasonal({ force: opts?.seasonal, at, subscribers, budget });
    logDispatch({ stage: "end", ms: Date.now() - started, ok: true });
    return { ...morning, weekly, calendar, seasonal };
  } catch (error) {
    logDispatch({
      stage: "end",
      ms: Date.now() - started,
      ok: false,
      error: redact(error instanceof Error ? error.message : "Dispatch failed"),
    });
    throw error;
  }
}
