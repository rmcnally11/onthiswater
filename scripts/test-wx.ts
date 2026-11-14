import assert from "node:assert/strict";
import { getArea } from "@/lib/data/areas";
import { buildBriefing } from "@/lib/engine";
import { openMeteoAt } from "@/lib/conditions";
import type { Conditions, SkyKind, WeatherNow } from "@/lib/types";
import { coerceSky, skyCopy, skyFromWmo, skyPhraseFromWmo } from "@/lib/wx";

const expectKind: Array<[number, SkyKind]> = [
  [0, "clear"],
  [1, "clear"],
  [2, "clouds"],
  [3, "clouds"],
  [45, "clouds"],
  [48, "clouds"],
];

for (let code = 51; code <= 57; code++) expectKind.push([code, "clouds"]);
for (let code = 61; code <= 67; code++) expectKind.push([code, "rain"]);
for (let code = 71; code <= 77; code++) expectKind.push([code, "rain"]);
for (let code = 80; code <= 86; code++) expectKind.push([code, "rain"]);
for (const code of [95, 96, 99]) expectKind.push([code, "storm"]);

for (const [code, kind] of expectKind) {
  assert.equal(skyFromWmo(code), kind, `WMO ${code}`);
}

for (const code of [4, 44, 46, 49, 50, 58, 60, 68, 70, 78, 79, 87, 94, -1]) {
  assert.equal(skyFromWmo(code), null, `unknown WMO ${code}`);
}
assert.equal(skyFromWmo(null), null);
assert.equal(skyFromWmo(undefined), null);
assert.equal(skyFromWmo(Number.NaN), null);

assert.equal(skyFromWmo(1), "clear");
assert.equal(skyFromWmo(51), "clouds");
assert.notEqual(skyFromWmo(51), "rain");
assert.equal(skyFromWmo(61), "rain");
assert.equal(skyFromWmo(95), "storm");

const phrases: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  55: "Drizzle",
  57: "Drizzle",
  61: "Rain",
  71: "Snow",
  80: "Showers",
  85: "Showers",
  95: "Thunderstorms",
};

for (const [code, phrase] of Object.entries(phrases)) {
  assert.equal(skyPhraseFromWmo(Number(code)), phrase, `phrase ${code}`);
}
assert.equal(skyPhraseFromWmo(1), "Mostly clear");

assert.equal(coerceSky(skyFromWmo(51), 34), "clouds");
assert.equal(coerceSky(skyFromWmo(51), 69), "clouds");
assert.equal(coerceSky(skyFromWmo(51), 70), "rain");
assert.equal(coerceSky(skyFromWmo(51), 100), "rain");
assert.equal(coerceSky(skyFromWmo(1), 69), "clear");
assert.equal(coerceSky(skyFromWmo(1), 70), "rain");
assert.equal(coerceSky(skyFromWmo(0), 0), "clear");
assert.equal(coerceSky(skyFromWmo(95), 10), "storm");
assert.equal(coerceSky(null, 70), "rain");

const mainlyClear = skyCopy(skyFromWmo(1), 19, skyPhraseFromWmo(1));
assert.equal(mainlyClear, "Mostly clear · 19%");
assert.equal(/cloudy/i.test(mainlyClear), false);

const drizzleCopy = skyCopy(skyFromWmo(51), 34, skyPhraseFromWmo(51));
assert.equal(drizzleCopy, "Drizzle");
assert.equal(drizzleCopy.includes("Rain"), false);
assert.equal(drizzleCopy.includes("Sight water goes blind"), false);

const heavy = skyCopy(skyFromWmo(61), 34, skyPhraseFromWmo(61));
assert.equal(heavy, "Rain · 34%");
assert.equal(skyCopy(skyFromWmo(95), 40, skyPhraseFromWmo(95)), "Thunderstorms · 40%");

function forecast(code: number, pop: number) {
  const stamp = "2026-11-14T14:00";
  return openMeteoAt(
    {
      current: {
        time: stamp,
        temperature_2m: 82,
        wind_speed_10m: 4,
        wind_direction_10m: 90,
        wind_gusts_10m: 6,
        pressure_msl: 1013,
        precipitation: 0,
        weather_code: code,
      },
      hourly: {
        time: [stamp],
        temperature_2m: [82],
        wind_speed_10m: [4],
        wind_direction_10m: [90],
        wind_gusts_10m: [6],
        precipitation: [0],
        precipitation_probability: [pop],
        weather_code: [code],
        pressure_msl: [1013],
      },
    },
    new Date("2026-11-14T14:00:00Z"),
  );
}

const mainly = forecast(1, 19);
assert.equal(mainly.sky, "Mostly clear");
assert.equal(mainly.wx, "clear");

const drizzle = forecast(51, 34);
assert.equal(drizzle.sky, "Drizzle");
assert.equal(drizzle.wx, "clouds");
assert.notEqual(drizzle.wx, "rain");

const shower = forecast(51, 70);
assert.equal(shower.wx, "rain");
assert.equal(forecast(61, 34).wx, "rain");
assert.equal(forecast(95, 40).wx, "storm");

function weather(code: number, pop: number | null): WeatherNow {
  return {
    airF: 82,
    windMph: 4,
    windGustMph: 6,
    windDirDeg: 90,
    windCardinal: "E",
    pressureMb: 1013,
    pressureTrendMb: null,
    pressureSource: "open-meteo",
    pressureCite: "Open-Meteo modeled",
    precipChance: pop,
    precipIn: 0,
    sky: skyPhraseFromWmo(code),
    wx: coerceSky(skyFromWmo(code), pop),
    source: "open-meteo",
    fetchedAt: "2026-11-14T14:47:08.773Z",
  };
}

function sightWhy(areaId: "ascension" | "alphonse", code: number, pop: number | null) {
  const area = getArea(areaId);
  assert.equal(area.id, areaId);
  assert.equal(area.tideCharacter, "sight-skinny");
  const conditions: Conditions = {
    areaId: area.id,
    waterTempF: null,
    waterTempSource: null,
    tides: {
      stage: "high-slack",
      rising: false,
      predictedNow: 0.2,
      observedNow: null,
      anomalyFt: null,
      anomalySeries: [],
      rangeTodayFt: area.meanRangeFt,
      nextHiLo: [],
      hourly: [],
      source: "modeled",
    },
    weather: weather(code, pop),
    moon: { phase: 0.5, name: "Full", illumination: 0.99, springNeap: "spring" },
    alerts: [],
  };
  const briefing = buildBriefing(area, conditions, "all", new Date("2026-11-14T14:47:08.773Z"));
  const line = briefing.why.find((row) =>
    /Sky is workable|Clouds steal the window|Sight water goes blind|Lightning is a stay-tied|Marsh still fishes/.test(row),
  );
  assert.ok(line, `${areaId} WMO ${code} @ ${pop}% missing sky why`);
  return line;
}

for (const desk of ["ascension", "alphonse"] as const) {
  const clearLine = sightWhy(desk, 1, 19);
  assert.equal(clearLine.includes("Clouds steal the window"), false, clearLine);
  assert.match(clearLine, /Sky is workable/);
  assert.match(clearLine, /Mostly clear/);

  const partly = sightWhy(desk, 2, 10);
  assert.match(partly, /Clouds steal the window/);

  const lightDrizzle = sightWhy(desk, 51, 34);
  assert.equal(lightDrizzle.includes("Sight water goes blind"), false, lightDrizzle);
  assert.equal(lightDrizzle.includes("Rain ·"), false, lightDrizzle);
  assert.match(lightDrizzle, /Drizzle/);
  assert.match(lightDrizzle, /Clouds steal the window/);

  const heavyDrizzle = sightWhy(desk, 51, 70);
  assert.match(heavyDrizzle, /Sight water goes blind/);
  assert.match(heavyDrizzle, /Rain · 70%/);

  const rainLine = sightWhy(desk, 61, 34);
  assert.match(rainLine, /Sight water goes blind/);
  assert.match(rainLine, /Rain · 34%/);

  const stormLine = sightWhy(desk, 95, 40);
  assert.match(stormLine, /Lightning is a stay-tied call/);
  assert.equal(stormLine.includes("Clouds steal the window"), false);
}

console.log(`ok wx ${expectKind.length} codes`);
