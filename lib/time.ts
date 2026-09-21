import type { TheaterId } from "@/lib/types";

const CHICAGO = "America/Chicago";
const NEW_YORK = "America/New_York";
const NASSAU = "America/Nassau";

export function timezoneForTheater(theater: TheaterId) {
  if (theater === "texas" || theater === "louisiana") return CHICAGO;
  if (theater === "florida" || theater === "north-carolina" || theater === "south-carolina") return NEW_YORK;
  if (theater === "mexico") return "America/Cancun";
  if (theater === "puerto-rico") return "America/Puerto_Rico";
  if (theater === "seychelles") return "Indian/Mahe";
  if (theater === "azores") return "Atlantic/Azores";
  return NASSAU;
}

export function parseNoaaGmt(stamp: string): Date {
  const [date, time] = stamp.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

export function formatInZone(
  date: Date,
  timeZone: string,
  opts: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    ...opts,
  }).format(date);
}

export function clockParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

export function ymdInZone(date: Date, timeZone: string) {
  const { year, month, day } = clockParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function hourInZone(date: Date, timeZone: string) {
  return clockParts(date, timeZone).hour + clockParts(date, timeZone).minute / 60;
}

export function startOfDayInZone(ymd: string, timeZone: string) {
  // Interpret ymd noon UTC and walk until the zoned date matches, then back to 00:00.
  const [y, m, d] = ymd.split("-").map(Number);
  let guess = new Date(Date.UTC(y, m - 1, d, 12, 0));
  for (let i = 0; i < 48; i++) {
    const p = clockParts(guess, timeZone);
    if (p.year === y && p.month === m && p.day === d && p.hour === 0 && p.minute === 0) {
      return guess;
    }
    const deltaMin =
      ((p.hour * 60 + p.minute) - 0) +
      (p.year !== y || p.month !== m || p.day !== d
        ? (Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(y, m - 1, d)) /
          60000
        : 0);
    guess = new Date(guess.getTime() - deltaMin * 60000);
  }
  return guess;
}

export function noaaDateSpan(start: Date, days: number) {
  const end = new Date(start.getTime() + days * 86400000);
  const fmt = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  };
  return { begin: fmt(start), end: fmt(end) };
}

export function isYmd(raw?: string | null): raw is string {
  return Boolean(raw && /^\d{4}-\d{2}-\d{2}$/.test(raw));
}

/** Now if the date is today in-zone; otherwise 8 a.m. local on that date. */
export function briefInstant(ymd: string | null | undefined, timeZone: string): Date {
  if (!isYmd(ymd)) return new Date();
  const today = ymdInZone(new Date(), timeZone);
  if (ymd === today) return new Date();
  return new Date(startOfDayInZone(ymd, timeZone).getTime() + 8 * 3600000);
}

export function mostRecentSaturday(now = new Date(), timeZone = "America/Chicago") {
  const parts = clockParts(now, timeZone);
  const dow: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const daysSince = ((dow[parts.weekday] ?? 6) + 1) % 7;
  const sat = new Date(now.getTime() - daysSince * 86400000);
  return ymdInZone(sat, timeZone);
}

export function addDaysYmd(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function formatYmdLong(ymd: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${ymd}T16:00:00Z`));
}

export function cardinalFromDeg(deg: number | null) {
  if (deg == null || Number.isNaN(deg)) return null;
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}
