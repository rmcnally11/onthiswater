import assert from "node:assert/strict";
import { clockParts, formatInZone, mostRecentSaturday } from "@/lib/time";

const ZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Cancun",
  "America/Puerto_Rico",
  "America/Nassau",
  "Atlantic/Azores",
  "Indian/Mahe",
];

/** Same options the cached helpers use, built fresh on every call. */
function uncachedFormat(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(date);
}

function uncachedClock(date: Date, timeZone: string) {
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
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

const instants = [
  new Date("2026-01-15T18:00:00Z"),
  new Date("2026-03-08T07:30:00Z"),
  new Date("2026-03-08T08:30:00Z"),
  new Date("2026-03-29T00:30:00Z"),
  new Date("2026-03-29T01:30:00Z"),
  new Date("2026-07-04T17:00:00Z"),
  new Date("2026-10-25T00:30:00Z"),
  new Date("2026-11-01T05:30:00Z"),
  new Date("2026-11-01T06:30:00Z"),
  new Date("2026-12-21T06:00:00Z"),
];

const shapes: Intl.DateTimeFormatOptions[] = [
  {},
  { weekday: "long", month: "long", day: "numeric" },
  { hour: "numeric", minute: "2-digit", hourCycle: "h23" },
];

for (const zone of ZONES) {
  for (const instant of instants) {
    assert.deepEqual(clockParts(instant, zone), uncachedClock(instant, zone), `${zone} ${instant.toISOString()}`);
    assert.deepEqual(clockParts(instant, zone), uncachedClock(instant, zone));
    for (const opts of shapes) {
      const cached = formatInZone(instant, zone, opts);
      assert.equal(cached, uncachedFormat(instant, zone, opts), `${zone} ${instant.toISOString()} ${JSON.stringify(opts)}`);
      assert.equal(formatInZone(instant, zone, opts), cached);
    }
  }
}

// Field Letter weekId is mostRecentSaturday in America/Chicago. It rolls at
// 00:00 Saturday Central Time: not Friday evening, and not 00:00 UTC.
// 2026-11-14 is CST (fall-back was Sun 11/01), so the `0 10 * * *` UTC cron
// is 4:00am CST that morning and 5:00am CDT in summer.
// Sat 2026-03-07 midnight is still CST (spring-forward is Sun 03/08 2:00am).
// Sat 2026-10-31 midnight is still CDT (fall-back is Sun 11/01 2:00am).
const CHICAGO = "America/Chicago";

const weekBoundaries: {
  label: string;
  iso: string;
  ymd: string;
  hour: number;
  minute: number;
  weekday: string;
  weekId: string;
}[] = [
  {
    label: "Fri 2026-11-13 20:35 CST",
    iso: "2026-11-14T02:35:00.000Z",
    ymd: "2026-11-13",
    hour: 20,
    minute: 35,
    weekday: "Fri",
    weekId: "2026-11-07",
  },
  {
    label: "Fri 2026-11-13 23:59:59 CST",
    iso: "2026-11-14T05:59:59.000Z",
    ymd: "2026-11-13",
    hour: 23,
    minute: 59,
    weekday: "Fri",
    weekId: "2026-11-07",
  },
  {
    label: "Sat 2026-11-14 00:00:00 CST",
    iso: "2026-11-14T06:00:00.000Z",
    ymd: "2026-11-14",
    hour: 0,
    minute: 0,
    weekday: "Sat",
    weekId: "2026-11-14",
  },
  {
    label: "Sat 2026-11-14 04:00 CST (10:00 UTC cron)",
    iso: "2026-11-14T10:00:00.000Z",
    ymd: "2026-11-14",
    hour: 4,
    minute: 0,
    weekday: "Sat",
    weekId: "2026-11-14",
  },
  {
    label: "Sat 2026-11-14 06:00 CST",
    iso: "2026-11-14T12:00:00.000Z",
    ymd: "2026-11-14",
    hour: 6,
    minute: 0,
    weekday: "Sat",
    weekId: "2026-11-14",
  },
  {
    label: "2026-11-14 00:00 UTC is Fri 18:00 CST",
    iso: "2026-11-14T00:00:00.000Z",
    ymd: "2026-11-13",
    hour: 18,
    minute: 0,
    weekday: "Fri",
    weekId: "2026-11-07",
  },
  {
    label: "Fri 2026-03-06 23:59:59 CST",
    iso: "2026-03-07T05:59:59.000Z",
    ymd: "2026-03-06",
    hour: 23,
    minute: 59,
    weekday: "Fri",
    weekId: "2026-02-28",
  },
  {
    label: "Sat 2026-03-07 00:00:00 CST",
    iso: "2026-03-07T06:00:00.000Z",
    ymd: "2026-03-07",
    hour: 0,
    minute: 0,
    weekday: "Sat",
    weekId: "2026-03-07",
  },
  {
    label: "2026-03-07 00:00 UTC is Fri 18:00 CST",
    iso: "2026-03-07T00:00:00.000Z",
    ymd: "2026-03-06",
    hour: 18,
    minute: 0,
    weekday: "Fri",
    weekId: "2026-02-28",
  },
  {
    label: "Fri 2026-10-30 23:59:59 CDT",
    iso: "2026-10-31T04:59:59.000Z",
    ymd: "2026-10-30",
    hour: 23,
    minute: 59,
    weekday: "Fri",
    weekId: "2026-10-24",
  },
  {
    label: "Sat 2026-10-31 00:00:00 CDT",
    iso: "2026-10-31T05:00:00.000Z",
    ymd: "2026-10-31",
    hour: 0,
    minute: 0,
    weekday: "Sat",
    weekId: "2026-10-31",
  },
  {
    label: "2026-10-31 00:00 UTC is Fri 19:00 CDT",
    iso: "2026-10-31T00:00:00.000Z",
    ymd: "2026-10-30",
    hour: 19,
    minute: 0,
    weekday: "Fri",
    weekId: "2026-10-24",
  },
];

assert.equal(weekBoundaries.length, 12);

for (const boundary of weekBoundaries) {
  const instant = new Date(boundary.iso);
  assert.equal(instant.toISOString(), boundary.iso, boundary.label);
  const parts = clockParts(instant, CHICAGO);
  const ymd = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  assert.equal(ymd, boundary.ymd, `${boundary.label} Chicago date`);
  assert.equal(parts.hour, boundary.hour, `${boundary.label} Chicago hour`);
  assert.equal(parts.minute, boundary.minute, `${boundary.label} Chicago minute`);
  assert.equal(parts.weekday, boundary.weekday, `${boundary.label} Chicago weekday`);
  const weekId = mostRecentSaturday(instant, CHICAGO);
  assert.equal(weekId, boundary.weekId, boundary.label);
  assert.equal(mostRecentSaturday(instant), boundary.weekId, `${boundary.label} default zone`);
  const [year, month, day] = weekId.split("-").map(Number);
  assert.equal(new Date(Date.UTC(year, month - 1, day)).getUTCDay(), 6, `${boundary.label} weekId is a Saturday`);
}

console.log(`ok time format ${ZONES.length} zones ${instants.length} instants; weekId ${weekBoundaries.length} boundaries`);
