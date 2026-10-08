import assert from "node:assert/strict";
import { fetchOpenMeteo, forecastsFromBody } from "../lib/openmeteo.ts";

const one = {
  current: { time: "t", temperature_2m: 1, wind_speed_10m: 4, wind_direction_10m: 90, wind_gusts_10m: 6, pressure_msl: 1012, precipitation: 0, weather_code: 1 },
  hourly: { time: ["t"], temperature_2m: [1], wind_speed_10m: [4], wind_direction_10m: [90], wind_gusts_10m: [6], precipitation: [0], precipitation_probability: [0], weather_code: [1], pressure_msl: [1012] },
};

assert.equal(forecastsFromBody(one, 1)[0]?.current.wind_speed_10m, 4);
assert.equal(forecastsFromBody([one, one], 2).length, 2);
assert.throws(() => forecastsFromBody([one], 2));
assert.throws(() => forecastsFromBody({ error: true }, 1));

const points = [
  [24.7, -78],
  [19.78, -87.47],
  [-7.028, 52.737],
  [38.534, -28.628],
  [37.741, -25.668],
] as const;

let calls = 0;
const origFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  calls += 1;
  return origFetch(...args);
};

const started = Date.now();
const forecasts = await Promise.all(points.map(([lat, lon]) => fetchOpenMeteo(lat, lon)));
const elapsed = Date.now() - started;
assert.equal(calls, 1, `expected one Open-Meteo call, saw ${calls}`);

const cachedCalls = calls;
await fetchOpenMeteo(points[0][0], points[0][1]);
assert.equal(calls, cachedCalls, "a fresh forecast should not refetch");
globalThis.fetch = origFetch;

for (const [i, forecast] of forecasts.entries()) {
  const wind = forecast.current.wind_speed_10m;
  assert.equal(typeof wind, "number", `point ${i} wind`);
  assert.ok(Number.isFinite(wind), `point ${i} wind finite`);
}

assert.ok(elapsed < 8000, `batched wind took ${elapsed}ms`);
console.log(`ok openmeteo ${elapsed}ms`);
