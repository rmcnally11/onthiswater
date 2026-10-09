import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getBriefing } from "@/lib/briefing";
import { getYoloDay } from "@/lib/calendar";
import { AREA_BY_ID, AREAS } from "@/lib/data/areas";
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
} from "@/lib/mail";
import { listSubscribers } from "@/lib/subscribers";
import { coastsForDesks } from "@/lib/coasts";
import { filterNewsletter, getNewsletter, hydrateLetterDesks } from "@/lib/newsletter";
import { sendResend } from "@/lib/send";
import { buildCalendarRange } from "@/lib/calendar";
import { clockParts } from "@/lib/time";

export function localHour(timeZone: string, at = new Date()) {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone,
  }).format(at);
  const n = Number(hour);
  return n === 24 ? 0 : n;
}

export function desksDue(at = new Date(), forceAll = false) {
  return AREAS.filter((area) => (forceAll ? true : localHour(area.timezone, at) === 5));
}

/** One quiet coast cannot hold the rest of the 5am run. */
const DESK_DEADLINE_MS = 60_000;

function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function writeOutbox(areaId: string, payload: unknown) {
  const dir = path.join(process.cwd(), "data", "outbox");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replaceAll(":", "")}-${areaId}.json`);
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`);
  return file;
}

export async function dispatchMorning(opts?: { forceAll?: boolean; desk?: string; at?: Date }) {
  const hourly = process.env.CRON_HOURLY === "1";
  const forceAll = opts?.forceAll ?? !hourly;
  const due = desksDue(opts?.at, forceAll).filter((d) => !opts?.desk || d.id === opts.desk);
  const dueIds = new Set(due.map((d) => d.id));
  const subscribers = await listSubscribers();
  const daily = subscribers.filter((s) => s.cadence.includes("daily") && s.desks.length);
  const groups = new Map<string, string[]>();
  for (const sub of daily) {
    const desks = [...new Set(sub.desks.filter((id) => dueIds.has(id) && AREA_BY_ID[id]))];
    if (!desks.length) continue;
    const key = desks.sort().join(",");
    groups.set(key, [...(groups.get(key) ?? []), sub.email]);
  }
  const needed = [...new Set([...groups.keys()].flatMap((key) => key.split(",")))];
  const order = AREAS.map((a) => a.id);
  const packs = new Map<string, { briefing: Awaited<ReturnType<typeof getBriefing>>; yolo: Awaited<ReturnType<typeof getYoloDay>> }>();
  await Promise.all(
    needed.map(async (id) => {
      const area = AREA_BY_ID[id];
      if (!area) return;
      try {
        const [briefing, yolo] = await withDeadline(
          Promise.all([getBriefing(id), getYoloDay(area, "all")]),
          DESK_DEADLINE_MS,
          id,
        );
        packs.set(id, { briefing, yolo });
      } catch {
        /* one quiet desk does not kill the digest */
      }
    }),
  );

  const results: Array<{
    desks: string[];
    subject: string;
    recipients: number;
    sent: boolean;
    outbox?: string;
    error?: string;
    why?: string;
  }> = [];

  for (const [key, emails] of groups) {
    const desks = key.split(",");
    const rows = desks
      .map((id) => packs.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort(
        (a, b) =>
          order.indexOf(a.briefing.area.id) - order.indexOf(b.briefing.area.id),
      );
    if (!rows.length) {
      results.push({
        desks,
        subject: `Today · ${desks.join(" · ")}`,
        recipients: emails.length,
        sent: false,
        why: "gauges quiet",
      });
      continue;
    }
    const quiet = desks
      .filter((id) => !packs.has(id))
      .map((id) => AREA_BY_ID[id]?.shortName ?? id);
    const subject = morningDigestSubject(rows, { quiet });
    const html = morningDigestHtml(rows, { quiet });
    const text = morningDigestText(rows, { quiet });
    try {
      const remote = await sendResend(emails, subject, html, text);
      const outbox = remote.sent
        ? undefined
        : await writeOutbox(`am-${desks.join("-")}`, { subject, text, recipients: emails, html }).catch(
            () => undefined,
          );
      results.push({
        desks,
        subject,
        recipients: emails.length,
        sent: remote.sent,
        outbox,
        why: quiet.length
          ? `partial brief — ${quiet.join(", ")} quiet${remote.why ? ` · ${remote.why}` : ""}`
          : remote.why ?? undefined,
      });
    } catch (error) {
      results.push({
        desks,
        subject,
        recipients: emails.length,
        sent: false,
        error: error instanceof Error ? error.message : "Dispatch failed",
      });
    }
  }

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
    at: (opts?.at ?? new Date()).toISOString(),
    mode: hourly && !forceAll ? "local-5am" : "all-water",
    configured: {
      airtable: Boolean(process.env.AIRTABLE_API_KEY?.trim() || process.env.AIRTABLE_TOKEN?.trim()),
      resend: Boolean(process.env.RESEND_API_KEY?.trim()),
      subscribers: Boolean(process.env.SUBSCRIBER_EMAILS?.trim()),
    },
    results,
  };
}

export function chicagoParts(at = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/Chicago" }).format(at);
  const day = Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "America/Chicago" }).format(at));
  return { weekday, day };
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

export async function dispatchWeekly(opts?: { force?: boolean; at?: Date }) {
  const at = opts?.at ?? new Date();
  if (!opts?.force && !isChicagoSaturday(at)) {
    return { skipped: true as const, reason: "not Saturday in Chicago", results: [] as const };
  }
  const subscribers = await listSubscribers();
  const weekly = subscribers.filter((s) => s.cadence.includes("weekly") && s.desks.length);
  if (!weekly.length) {
    return { skipped: false as const, reason: "no weekly addresses", results: [] as const };
  }
  const issue = await hydrateLetterDesks(await getNewsletter());
  const groups = new Map<string, string[]>();
  for (const sub of weekly) {
    const key = [...sub.desks].sort().join(",");
    groups.set(key, [...(groups.get(key) ?? []), sub.email]);
  }
  const results: Array<{
    desks: string[];
    subject: string;
    recipients: number;
    sent: boolean;
    outbox?: string;
    error?: string;
    why?: string;
  }> = [];
  for (const [key, emails] of groups) {
    const desks = key.split(",");
    const coasts = coastsForDesks(desks);
    const filtered = filterNewsletter(issue, coasts);
    const subject = letterSubject(filtered, coasts);
    const html = letterEmailHtml(filtered, coasts);
    const text = letterEmailText(filtered, coasts);
    try {
      const remote = await sendResend(emails, subject, html, text);
      const outbox = remote.sent
        ? undefined
        : await writeOutbox(`letter-${desks.join("-")}`, { subject, text, recipients: emails, html }).catch(
            () => undefined,
          );
      results.push({
        desks,
        subject,
        recipients: emails.length,
        sent: remote.sent,
        outbox,
        why: remote.why ?? undefined,
      });
    } catch (error) {
      results.push({
        desks,
        subject,
        recipients: emails.length,
        sent: false,
        error: error instanceof Error ? error.message : "Weekly letter failed",
      });
    }
  }
  return { skipped: false as const, reason: null, results };
}

export async function dispatchCalendar(opts?: { force?: boolean; desk?: string; at?: Date }) {
  const at = opts?.at ?? new Date();
  if (!opts?.force && !isChicagoSunday(at)) {
    return { skipped: true as const, reason: "not Sunday in Chicago", results: [] as const };
  }
  const subscribers = await listSubscribers();
  const calendar = subscribers.filter((s) => s.cadence.includes("calendar") && s.desks.length);
  const groups = new Map<string, string[]>();
  for (const sub of calendar) {
    const desks = opts?.desk ? sub.desks.filter((d) => d === opts.desk) : sub.desks;
    if (!desks.length) continue;
    const key = [...desks].sort().join(",");
    groups.set(key, [...(groups.get(key) ?? []), sub.email]);
  }
  const results: Array<{
    desks: string[];
    subject: string;
    recipients: number;
    sent: boolean;
    outbox?: string;
    error?: string;
    why?: string;
  }> = [];
  for (const [key, emails] of groups) {
    const desks = key.split(",");
    try {
      const rows = [];
      for (const id of desks) {
        const area = AREA_BY_ID[id];
        if (!area) continue;
        const now = clockParts(at, area.timezone);
        const months = await buildCalendarRange(area, now.year, now.month, "all", 1);
        if (months[0]) rows.push({ area, month: months[0] });
      }
      if (!rows.length) throw new Error("Calendar did not set.");
      const subject = calendarDigestSubject(rows);
      const html = calendarDigestHtml(rows);
      const text = calendarDigestText(rows);
      const remote = await sendResend(emails, subject, html, text);
      const outbox = remote.sent
        ? undefined
        : await writeOutbox(`cal-${desks.join("-")}`, { subject, text, recipients: emails, html }).catch(
            () => undefined,
          );
      results.push({
        desks,
        subject,
        recipients: emails.length,
        sent: remote.sent,
        outbox,
        why: remote.why ?? undefined,
      });
    } catch (error) {
      results.push({
        desks,
        subject: `Calendar · ${desks.join(" · ")}`,
        recipients: emails.length,
        sent: false,
        error: error instanceof Error ? error.message : "Calendar mail failed",
      });
    }
  }
  return { skipped: false as const, reason: groups.size ? null : "no calendar addresses", results };
}

export async function dispatchSeasonal(opts?: { force?: boolean; at?: Date }) {
  const at = opts?.at ?? new Date();
  if (!opts?.force && !isChicagoMonthStart(at)) {
    return { skipped: true as const, reason: "not the 1st in Chicago", results: [] as const };
  }
  const subscribers = await listSubscribers();
  const seasonal = subscribers.filter((s) => s.cadence.includes("seasonal") && s.desks.length);
  if (!seasonal.length) {
    return { skipped: false as const, reason: "no seasonal addresses", results: [] as const };
  }
  const groups = new Map<string, string[]>();
  for (const sub of seasonal) {
    const key = [...sub.desks].sort().join(",");
    groups.set(key, [...(groups.get(key) ?? []), sub.email]);
  }
  const results: Array<{
    desks: string[];
    subject: string;
    recipients: number;
    sent: boolean;
    outbox?: string;
    error?: string;
    why?: string;
  }> = [];
  for (const [key, emails] of groups) {
    const desks = key.split(",");
    const coasts = coastsForDesks(desks);
    const issue = buildSeasonIssue(coasts, at);
    const subject = seasonalSubject(issue);
    const html = seasonalEmailHtml(issue);
    const text = seasonalEmailText(issue);
    try {
      const remote = await sendResend(emails, subject, html, text);
      const outbox = remote.sent
        ? undefined
        : await writeOutbox(`season-${desks.join("-")}`, { subject, text, recipients: emails, html }).catch(
            () => undefined,
          );
      results.push({
        desks,
        subject,
        recipients: emails.length,
        sent: remote.sent,
        outbox,
        why: remote.why ?? undefined,
      });
    } catch (error) {
      results.push({
        desks,
        subject,
        recipients: emails.length,
        sent: false,
        error: error instanceof Error ? error.message : "Seasonal mail failed",
      });
    }
  }
  return { skipped: false as const, reason: null, results };
}

export async function runDispatch(opts?: {
  forceAll?: boolean;
  desk?: string;
  weekly?: boolean;
  calendar?: boolean;
  seasonal?: boolean;
  at?: Date;
}) {
  const morning = await dispatchMorning(opts);
  const weekly = await dispatchWeekly({ force: opts?.weekly, at: opts?.at });
  const calendar = await dispatchCalendar({ force: opts?.calendar, desk: opts?.desk, at: opts?.at });
  const seasonal = await dispatchSeasonal({ force: opts?.seasonal, at: opts?.at });
  return { ...morning, weekly, calendar, seasonal };
}
