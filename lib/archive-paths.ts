import { AREAS } from "@/lib/data/areas";
import { addDaysYmd, isPastYmd, mostRecentSaturday, ymdInZone } from "@/lib/time";

/** Dated mornings kept in the sitemap. Today is omitted: the proxy redirects it. */
export const MORNING_ARCHIVE_DAYS = 14;

/**
 * Passed Saturdays kept in the sitemap. This week's URL redirects to
 * /newsletter, so the count starts at the Saturday before the latest one.
 */
export const LETTER_ARCHIVE_WEEKS = 11;

/** 16:00 UTC on that calendar day. Same instant formatYmdLong already uses. */
export function contentLastMod(ymd: string): Date {
  return new Date(`${ymd}T16:00:00.000Z`);
}

/** Past dated mornings that answer 200. A date that is still today in the area's zone redirects. */
export function indexableMorningArchives(now = new Date()): { area: string; date: string }[] {
  const chicagoToday = ymdInZone(now, "America/Chicago");
  const days = Array.from({ length: MORNING_ARCHIVE_DAYS }, (_, i) => addDaysYmd(chicagoToday, -(i + 1)));
  const pages: { area: string; date: string }[] = [];
  for (const day of days) {
    for (const area of AREAS) {
      if (!isPastYmd(day, ymdInZone(now, area.timezone))) continue;
      pages.push({ area: area.id, date: day });
    }
  }
  return pages;
}

/** Passed Saturday letters. The current Saturday redirects to /newsletter. */
export function indexableLetterArchives(now = new Date()): string[] {
  const latestPast = addDaysYmd(mostRecentSaturday(now), -7);
  return Array.from({ length: LETTER_ARCHIVE_WEEKS }, (_, i) => addDaysYmd(latestPast, -7 * i));
}
