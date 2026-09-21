import { unstable_cache } from "next/cache";
import type { Briefing, TheaterId } from "@/lib/types";
import { getBriefing } from "@/lib/briefing";
import { addDaysYmd, clockParts, isYmd, mostRecentSaturday } from "@/lib/time";
import { SPECIES } from "@/lib/data/species";
import {
  MONTH_NAMES,
  MONTH_THEATER,
  closuresForCoasts,
  closuresThisMonth,
  peaksThisMonth,
  theaterLabel,
  type ClosureNote,
} from "@/lib/data/fundamentals";
import { AREAS } from "@/lib/data/areas";
import { DESKS } from "@/lib/desks";
import { isAllCoasts } from "@/lib/coasts";

export { DESKS };

const LETTERS: Record<number, string> = {
  1: "January is a gut month. Texas fish slide to holes and granite; a norther is a plan, not a cancellation. The Keys get the front that was yesterday’s Texas story, then a bluebird day that makes bones look easy. Andros winter is the single-bone season — fewer fish, bigger shoulders, longer leaders. Dress for the wind. Midday sun is legal. The gauges below are this week’s weather, not a promise.",
  2: "February still owes you a coat. Sheep and drum own the Texas rocks. Reds start to show on warm mud in the afternoon if you are patient. Keys permit are a maybe that becomes a fish when the front misses you. Bahamas is the last honest month of winter singles. Fly if the morning is glass. The spoon is what you came for when it is not.",
  3: "March is the coast waking up. Texas reds and trout both peak, water finally in the window, wind still the tax. Islamorada starts talking permit like it means it. Andros mixes winter singles with the first schools. This is the week people should have booked in November. The letter is late on purpose — go look at the desks.",
  4: "April is why the rest of the year exists. Texas grass fills in. Keys tarpon show in the harbor and on the oceanside. Bahamas looks like the photograph. Fly when the day allows it. Carry the spinning rod because April wind has a sense of humor. Scores are 1–10. They are not bites.",
  5: "May is still prime if you beat the heat. Texas first light, then deeper. Keys tarpon peak and the afternoon storm rewrites the flat. Andros west-side permit turn on. This is the grand-slam calendar month if you can stand the glare and the logistics. Jacks will find you. They do not own the headline.",
  6: "June is when the coast tells the truth about heat. Texas trout leave the flat at midday. SE Florida snook typically close for the spawn — catch-and-release is still fishing. Bahamas goes to summer schools of 3-pound bones. Early is not a vibe. It is the method.",
  7: "July is a bathtub with a tide table. Night and first-light reds on the Texas coast. Keys snook still closed; a shower can switch a Key West flat on once it clears. Andros is a heat-management problem as much as a fish problem. If the score is a 9 at 2 p.m., believe the water temperature, not the number.",
  8: "August is the short-day version of July, which is to say: still hot, still honest. Texas reds work the first moving water; trout stay deep. Keys bones at first light, thunder by two. Andros summer schools and west-side permit if it lays down. Flounder are a September story — do not force them. Fly in the morning. Shade at noon. The desks below are this week, live.",
  9: "September is the exhale. Texas reds peak again, trout come back up, jetty bulls start to show. Snook typically reopen on the SE calendar — verify FWC the morning you keep one. Bahamas still has bones and permit. The water loses a few degrees and the coast remembers why you live here.",
  10: "October is the best month many years. Texas reds, trout, and the flounder run to the Gulf — nights at the passes, measure every flatfish, the closure is coming. Keys backcountry gets its color back. Andros permit taper and bones start to look like winter. Book the day that has wind you can actually stand on.",
  11: "November has a rule: Texas flounder are closed the entire month. Do not keep one. Reds still peak. Drum arrive with the first real front. Keys bones like the cooler water. Andros winter singles begin, which is why people book this week in March. Long leaders. Soft landings. Fewer boats.",
  12: "December is granite and guts on the Texas coast. Flounder stay closed through the 14th. Drum and sheep take the jetties. A Christmas cold snap is a plan. Keys bones if the front missed you; sailfish live on the edge, not in this letter. Andros is peak winter bonefishing. You came for the grey ghost. The rest is noise.",
};

export type DeskIssue = {
  theater: TheaterId;
  areaId: string;
  desk: string;
  kicker: string;
  briefing: Briefing | null;
  error: string | null;
  seasonal: string;
};

export type NewsletterIssue = {
  weekId: string;
  weekLabel: string;
  weekNumber: number;
  year: number;
  month: number;
  monthName: string;
  rangeLabel: string;
  letter: string;
  desks: DeskIssue[];
  peaks: { name: string; theaters: string; why: string }[];
  closures: ClosureNote[];
  generatedAt: string;
  frozen: boolean;
};

function mondayOffset(weekday: string) {
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = map[weekday] ?? 1;
  return dow === 0 ? -6 : 1 - dow;
}

function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function letterWeekId(now = new Date(), timeZone = "America/Chicago") {
  return mostRecentSaturday(now, timeZone);
}

export function recentLetterWeeks(now = new Date(), count = 8) {
  const current = letterWeekId(now);
  return Array.from({ length: count }, (_, i) => addDaysYmd(current, -7 * i));
}

export function weekWindow(now = new Date(), timeZone = "America/Chicago") {
  const parts = clockParts(now, timeZone);
  const monday = new Date(now.getTime() + mondayOffset(parts.weekday) * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const start = clockParts(monday, timeZone);
  const end = clockParts(sunday, timeZone);
  const startLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
  }).format(monday);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(sunday);
  return {
    month: start.month,
    year: start.year,
    weekNumber: isoWeek(monday),
    rangeLabel: `${startLabel} – ${endLabel}`,
    weekLabel: `Week of ${startLabel}`,
  };
}

async function computeNewsletter(weekId: string): Promise<NewsletterIssue> {
  const now = isYmd(weekId) ? new Date(`${weekId}T16:00:00Z`) : new Date();
  const week = weekWindow(now);
  const settled = await Promise.allSettled(DESKS.map((desk) => getBriefing(desk.areaId)));

  const desks: DeskIssue[] = DESKS.map((meta, i) => {
    const result = settled[i];
    if (result.status === "fulfilled") {
      return {
        theater: meta.theater,
        areaId: meta.areaId,
        desk: meta.desk,
        kicker: meta.kicker,
        briefing: result.value,
        error: null,
        seasonal: MONTH_THEATER[week.month][meta.theater],
      };
    }
    const reason = result.reason;
    return {
      theater: meta.theater,
      areaId: meta.areaId,
      desk: meta.desk,
      kicker: meta.kicker,
      briefing: null,
      error: reason instanceof Error ? reason.message : "The gauge did not answer.",
      seasonal: MONTH_THEATER[week.month][meta.theater],
    };
  });

  const peaks = peaksThisMonth(week.month).map((s) => ({
    name: s.commonName,
    theaters: s.theaters.map(theaterLabel).join(" · "),
    why: s.why,
  }));

  return {
    weekId,
    weekLabel: week.weekLabel,
    weekNumber: week.weekNumber,
    year: week.year,
    month: week.month,
    monthName: MONTH_NAMES[week.month - 1],
    rangeLabel: week.rangeLabel,
    letter: LETTERS[week.month],
    desks,
    peaks,
    closures: closuresThisMonth(week.month, now),
    generatedAt: new Date().toISOString(),
    frozen: weekId !== letterWeekId(),
  };
}

const cachedNewsletter = unstable_cache(computeNewsletter, ["field-letter-v3"], {
  revalidate: 60 * 60 * 24 * 7,
});

export async function getNewsletter(weekRaw?: string | null): Promise<NewsletterIssue> {
  const weekId = isYmd(weekRaw) ? weekRaw : letterWeekId();
  return cachedNewsletter(weekId);
}

/** This week’s desks use the same live briefings as Today. Frozen Saturday issues stay the snapshot. */
export async function hydrateLetterDesks(issue: NewsletterIssue): Promise<NewsletterIssue> {
  if (issue.frozen) return issue;
  const settled = await Promise.allSettled(issue.desks.map((desk) => getBriefing(desk.areaId)));
  const desks = issue.desks.map((desk, i) => {
    const result = settled[i];
    if (result.status === "fulfilled") {
      return { ...desk, briefing: result.value, error: null };
    }
    const reason = result.reason;
    return {
      ...desk,
      briefing: null,
      error: reason instanceof Error ? reason.message : "The gauge did not answer.",
    };
  });
  return { ...issue, generatedAt: new Date().toISOString(), desks };
}

function deskMetaForArea(areaId: string) {
  const letter = DESKS.find((d) => d.areaId === areaId);
  const area = AREAS.find((a) => a.id === areaId);
  if (letter) return { desk: letter.desk, kicker: letter.kicker };
  return {
    desk: `${theaterLabel(area?.theater ?? "texas")} water`,
    kicker: (area?.summary.split(".")[0] ?? area?.name ?? areaId).trim(),
  };
}

export function filterNewsletter(issue: NewsletterIssue, coasts: TheaterId[] | null): NewsletterIssue {
  if (isAllCoasts(coasts) || !coasts) return issue;
  const desks = issue.desks.filter((d) => coasts.includes(d.theater));
  const letter = coasts
    .map((t) => MONTH_THEATER[issue.month][t])
    .filter(Boolean)
    .join(" ");
  const peaks = peaksThisMonth(issue.month)
    .filter((s) => s.theaters.some((t) => coasts.includes(t)))
    .map((s) => ({
      name: s.commonName,
      theaters: s.theaters.filter((t) => coasts.includes(t)).map(theaterLabel).join(" · "),
      why: s.why,
    }));
  return {
    ...issue,
    letter: letter || issue.letter,
    desks,
    peaks,
    closures: closuresForCoasts(issue.month, coasts),
  };
}

/** Coast chip: every micro-area on those theaters. All coasts stays the letter desks. */
export async function withCoastWaters(
  issue: NewsletterIssue,
  coasts: TheaterId[] | null,
): Promise<NewsletterIssue> {
  const filtered = await hydrateLetterDesks(filterNewsletter(issue, coasts));
  if (isAllCoasts(coasts) || !coasts?.length) return filtered;

  const waters = AREAS.filter((a) => coasts.includes(a.theater));
  const have = new Map(filtered.desks.map((d) => [d.areaId, d]));
  const missing = waters.filter((a) => !have.has(a.id));
  const dateRaw = filtered.frozen ? filtered.weekId : null;
  const settled = await Promise.allSettled(missing.map((a) => getBriefing(a.id, "all", dateRaw)));

  const desks: DeskIssue[] = waters.map((area) => {
    const existing = have.get(area.id);
    if (existing) return existing;
    const i = missing.findIndex((a) => a.id === area.id);
    const result = settled[i];
    const meta = deskMetaForArea(area.id);
    if (result?.status === "fulfilled") {
      return {
        theater: area.theater,
        areaId: area.id,
        desk: meta.desk,
        kicker: meta.kicker,
        briefing: result.value,
        error: null,
        seasonal: MONTH_THEATER[filtered.month][area.theater],
      };
    }
    const reason = result?.status === "rejected" ? result.reason : null;
    return {
      theater: area.theater,
      areaId: area.id,
      desk: meta.desk,
      kicker: meta.kicker,
      briefing: null,
      error: reason instanceof Error ? reason.message : "The gauge did not answer.",
      seasonal: MONTH_THEATER[filtered.month][area.theater],
    };
  });

  return { ...filtered, desks };
}

export async function loadLetterTomorrows(issue: NewsletterIssue) {
  const pairs = await Promise.all(
    issue.desks.map(async (desk) => {
      if (!desk.briefing) return [desk.areaId, null] as const;
      const ymd = addDaysYmd(desk.briefing.forDate, 1);
      const next = await getBriefing(desk.areaId, "all", ymd).catch(() => null);
      return [desk.areaId, next] as const;
    }),
  );
  return Object.fromEntries(pairs) as Record<string, Briefing | null>;
}

export function incidentalNoise(month: number, coasts?: TheaterId[] | null) {
  return SPECIES.filter((s) => {
    if (s.role !== "incidental" || !s.peakMonths.includes(month)) return false;
    if (coasts && !isAllCoasts(coasts) && !s.theaters.some((t) => coasts.includes(t))) return false;
    return true;
  }).map((s) => s.commonName);
}
