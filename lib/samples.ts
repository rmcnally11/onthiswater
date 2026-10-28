import { getBriefing } from "@/lib/briefing";
import { buildCalendarRange, getYoloDay } from "@/lib/calendar";
import { AREA_BY_ID } from "@/lib/data/areas";
import { filterNewsletter, letterForDesks } from "@/lib/newsletter";
import { clockParts } from "@/lib/time";
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
import { sendResend } from "@/lib/send";
import type { Area, Briefing, CalendarDay, TheaterId } from "@/lib/types";
import { coastsForDesks, isAllCoasts, type Cadence } from "@/lib/coasts";

export type SampleMail = {
  kind: "daily" | "weekly" | "calendar" | "seasonal";
  subject: string;
  html: string;
  text: string;
};

async function loadDeskPack(areaIds: string[]) {
  const unique = [...new Set(areaIds.filter((id) => AREA_BY_ID[id]))];
  const mornings: Array<{ briefing: Briefing; yolo?: CalendarDay | null }> = [];
  const calendars: Array<{ area: Area; month: CalendarMonth }> = [];
  await Promise.all(
    unique.map(async (id) => {
      const area = AREA_BY_ID[id];
      try {
        const [briefing, yolo, months] = await Promise.all([
          getBriefing(area.id),
          getYoloDay(area, "all"),
          buildCalendarRange(
            area,
            clockParts(new Date(), area.timezone).year,
            clockParts(new Date(), area.timezone).month,
            "all",
            1,
          ),
        ]);
        mornings.push({ briefing, yolo });
        if (months[0]) calendars.push({ area, month: months[0] });
      } catch {
        /* one quiet desk does not kill the pack */
      }
    }),
  );
  const order = new Map(unique.map((id, i) => [id, i]));
  mornings.sort((a, b) => (order.get(a.briefing.area.id) ?? 0) - (order.get(b.briefing.area.id) ?? 0));
  calendars.sort((a, b) => (order.get(a.area.id) ?? 0) - (order.get(b.area.id) ?? 0));
  return { mornings, calendars };
}

/** Desks the welcome may fetch. Coast filter happens before any gauge or calendar call. */
export function welcomeDeskIds(opts?: {
  areaId?: string;
  desks?: string[];
  coasts?: TheaterId[] | null;
}) {
  const requested = opts?.desks?.length ? opts.desks : [opts?.areaId ?? "galveston"];
  const unique = [...new Set(requested.map((id) => id.trim()).filter((id) => AREA_BY_ID[id]))];
  if (!opts?.coasts || isAllCoasts(opts.coasts)) return unique;
  const coasts = new Set(opts.coasts);
  return unique.filter((id) => coasts.has(AREA_BY_ID[id].theater));
}

export async function buildSampleEmails(opts?: {
  areaId?: string;
  desks?: string[];
  coasts?: TheaterId[];
  origin?: string;
}): Promise<SampleMail[]> {
  const desks = welcomeDeskIds(opts);
  const coasts = opts?.coasts ?? coastsForDesks(desks);
  const [{ mornings, calendars }, rawLetter] = await Promise.all([
    loadDeskPack(desks),
    letterForDesks(desks),
  ]);
  if (!mornings.length) throw new Error("No desks answered.");
  if (!calendars.length) throw new Error("Calendar did not set.");
  const letter = filterNewsletter(rawLetter, coasts);
  const season = buildSeasonIssue(coasts);

  return [
    {
      kind: "daily",
      subject: morningDigestSubject(mornings),
      html: morningDigestHtml(mornings, { origin: opts?.origin }),
      text: morningDigestText(mornings),
    },
    {
      kind: "weekly",
      subject: letterSubject(letter, coasts),
      html: letterEmailHtml(letter, coasts),
      text: letterEmailText(letter, coasts),
    },
    {
      kind: "calendar",
      subject: calendarDigestSubject(calendars),
      html: calendarDigestHtml(calendars),
      text: calendarDigestText(calendars),
    },
    {
      kind: "seasonal",
      subject: seasonalSubject(season),
      html: seasonalEmailHtml(season),
      text: seasonalEmailText(season),
    },
  ];
}

export async function sendSampleEmails(to: string, opts?: { areaId?: string; desks?: string[]; coasts?: TheaterId[] }) {
  const samples = await buildSampleEmails(opts);
  const results = [];
  for (const sample of samples) {
    const subject = `[SAMPLE] ${sample.subject}`;
    const remote = await sendResend([to], subject, sample.html, sample.text);
    results.push({
      kind: sample.kind,
      subject,
      sent: remote.sent,
      id: remote.id,
      why: remote.why,
    });
  }
  return { to, results };
}

export async function sendWelcomeEmails(
  to: string,
  opts: { desks: string[]; cadence: Cadence[] },
) {
  const coasts = coastsForDesks(opts.desks);
  const wanted = new Set(opts.cadence);
  const samples = (await buildSampleEmails({ desks: opts.desks, coasts })).filter((s) => wanted.has(s.kind));
  const results = [];
  for (const sample of samples) {
    try {
      const remote = await sendResend([to], sample.subject, sample.html, sample.text);
      results.push({
        kind: sample.kind,
        subject: sample.subject,
        sent: remote.sent,
        id: remote.id,
        why: remote.why,
      });
    } catch (error) {
      console.error("Welcome mail did not send.", error);
      results.push({
        kind: sample.kind,
        subject: sample.subject,
        sent: false,
        id: null,
        why: error instanceof Error ? error.message : "Welcome mail did not send.",
      });
    }
  }
  return { to, results };
}
