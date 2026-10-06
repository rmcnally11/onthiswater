import assert from "node:assert/strict";
import { fillWind, openMeteoAt } from "../lib/conditions.ts";
import { morningLine } from "../lib/morning.ts";
import { parseUtcStamp, snapshotHour } from "../lib/time.ts";
import type { Briefing, WeatherNow } from "../lib/types.ts";
import { windCompassCaption, windLabel } from "../lib/wind.ts";

const at = new Date("2026-10-06T11:10:00Z");
const snap = snapshotHour(at, "America/Chicago");
assert.equal(snap.ymd, "2026-10-06");
assert.equal(snap.hour, "06");
assert.equal(snap.at.toISOString(), "2026-10-06T11:00:00.000Z");

const later = snapshotHour(new Date("2026-10-06T11:40:00Z"), "America/Chicago");
assert.equal(later.hour, snap.hour);
assert.equal(later.at.toISOString(), snap.at.toISOString());
assert.equal(snapshotHour(new Date("2026-10-06T12:05:00Z"), "America/Chicago").hour, "07");

const mahe = snapshotHour(at, "Indian/Mahe");
assert.equal(mahe.hour, "15");
assert.equal(mahe.at.toISOString(), "2026-10-06T11:00:00.000Z");

assert.equal(parseUtcStamp("2026-10-06T11:00").toISOString(), "2026-10-06T11:00:00.000Z");

const blank = {
  airF: 80,
  windMph: null,
  windGustMph: null,
  windDirDeg: null,
  windCardinal: null,
  pressureMb: 1012,
  pressureTrendMb: null,
  pressureSource: "open-meteo",
  pressureCite: "Open-Meteo modeled",
  precipChance: 2,
  precipIn: 0,
  sky: "Clear",
  wx: "clear",
  source: "open-meteo",
  fetchedAt: "2026-10-06T11:00:00.000Z",
} satisfies WeatherNow;

const om = {
  current: {
    time: "2026-10-06T11:00",
    temperature_2m: 80,
    wind_speed_10m: 16,
    wind_direction_10m: 157,
    wind_gusts_10m: 21,
    pressure_msl: 1012,
    precipitation: 0,
    weather_code: 1,
  },
  hourly: {
    time: ["2026-10-06T11:00"],
    temperature_2m: [80],
    wind_speed_10m: [null as unknown as number],
    wind_direction_10m: [null as unknown as number],
    wind_gusts_10m: [21],
    precipitation: [0],
    precipitation_probability: [2],
    weather_code: [1],
    pressure_msl: [1012],
  },
};

const modeled = openMeteoAt(om, snap.at);
assert.equal(modeled.windMph, 16);
assert.equal(windLabel(modeled.windMph, modeled.windCardinal), "16 mph SSE");
assert.equal(
  windCompassCaption(modeled.windDirDeg, modeled.windMph, modeled.windCardinal, modeled.windGustMph),
  "From SSE · gust 21",
);

const gauge = fillWind(
  { ...blank, windMph: 5, windGustMph: null, source: "noaa" },
  modeled,
);
assert.equal(gauge.windMph, 5, "live speed stays");
assert.equal(gauge.windGustMph, null, "gust is not borrowed onto a live speed");
assert.equal(windLabel(gauge.windMph, gauge.windCardinal), "5 mph SSE");
assert.equal(windCompassCaption(gauge.windDirDeg, gauge.windMph, gauge.windCardinal, gauge.windGustMph), "From SSE");
assert.notEqual(windCompassCaption(null, 16, "SSE", null), "No wind reading");
assert.equal(windCompassCaption(null, null, null, null), "No wind reading");

const briefing = {
  area: { id: "alphonse", shortName: "Alphonse", theater: "seychelles", timezone: "Indian/Mahe" },
  overall: 8.94,
  kind: "today",
  forDate: "2026-10-06",
  conditions: {
    weather: gauge,
    tides: { anomalyFt: 0 },
    alerts: [],
    hab: null,
    river: null,
  },
} as unknown as Briefing;

const line = morningLine(briefing);
const label = windLabel(gauge.windMph, gauge.windCardinal);
assert.equal(label, "5 mph SSE");
assert.ok(line.includes(`Alphonse 8.9 this morning. ${label}.`), line);
assert.equal(briefing.overall.toFixed(1), "8.9");

console.log("ok snapshot");
