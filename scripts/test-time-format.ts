import assert from "node:assert/strict";
import { clockParts, formatInZone } from "@/lib/time";

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

console.log(`ok time format ${ZONES.length} zones ${instants.length} instants`);
