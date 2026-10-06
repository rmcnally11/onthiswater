import { USER_AGENT } from "@/lib/brand";

export type OpenMeteoForecast = {
  current: {
    time: string;
    temperature_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    pressure_msl: number;
    precipitation: number;
    weather_code: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    precipitation: number[];
    precipitation_probability: number[];
    weather_code: number[];
    pressure_msl: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
};

const CURRENT =
  "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation,weather_code";
const HOURLY =
  "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,precipitation_probability,weather_code,pressure_msl";
const DAILY = "weather_code,precipitation_sum,precipitation_probability_max,wind_speed_10m_max";

type Point = { lat: number; lon: number };
type Waiter = Point & {
  resolve: (value: OpenMeteoForecast) => void;
  reject: (error: unknown) => void;
};

/**
 * The free forecast API runs one request at a time per IP, and this host
 * shares that IP. A morning page asks for every coast at once; the extras
 * come back empty and the card says "no wind reading". Hold them a beat,
 * then send one call.
 */
const BATCH_MS = 25;
const pending: Waiter[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let batchChain: Promise<void> = Promise.resolve();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isForecast(value: unknown): value is OpenMeteoForecast {
  if (!value || typeof value !== "object") return false;
  const row = value as OpenMeteoForecast;
  return Array.isArray(row.hourly?.time) && row.current != null && typeof row.current === "object";
}

export function forecastsFromBody(body: unknown, count: number): OpenMeteoForecast[] {
  if (Array.isArray(body)) {
    if (body.length !== count || !body.every(isForecast)) {
      throw new Error("Open-Meteo sent an unexpected forecast");
    }
    return body;
  }
  if (count === 1 && isForecast(body)) return [body];
  throw new Error("Open-Meteo sent an unexpected forecast");
}

function forecastUrl(points: Point[]) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", points.map((p) => String(p.lat)).join(","));
  url.searchParams.set("longitude", points.map((p) => String(p.lon)).join(","));
  url.searchParams.set("current", CURRENT);
  url.searchParams.set("hourly", HOURLY);
  url.searchParams.set("daily", DAILY);
  url.searchParams.set("forecast_days", "16");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", "UTC");
  return url;
}

async function requestForecast(points: Point[]): Promise<OpenMeteoForecast[]> {
  const url = forecastUrl(points);
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(700 * attempt);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 429 && attempt < 2) continue;
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
      return forecastsFromBody(await res.json(), points.length);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Open-Meteo quiet");
}

async function runBatch(waiters: Waiter[]) {
  const groups: { lat: number; lon: number; waiters: Waiter[] }[] = [];
  const index = new Map<string, number>();
  for (const waiter of waiters) {
    const key = `${waiter.lat.toFixed(4)},${waiter.lon.toFixed(4)}`;
    const at = index.get(key);
    if (at == null) {
      index.set(key, groups.length);
      groups.push({ lat: waiter.lat, lon: waiter.lon, waiters: [waiter] });
    } else {
      groups[at].waiters.push(waiter);
    }
  }
  try {
    const forecasts = await requestForecast(groups.map(({ lat, lon }) => ({ lat, lon })));
    groups.forEach((group, i) => {
      const forecast = forecasts[i];
      for (const waiter of group.waiters) {
        if (forecast) waiter.resolve(forecast);
        else waiter.reject(new Error("Open-Meteo missing this coast"));
      }
    });
  } catch (error) {
    for (const waiter of waiters) waiter.reject(error);
  }
}

function scheduleBatch() {
  if (batchTimer) return;
  batchTimer = setTimeout(() => {
    batchTimer = null;
    const batch = pending.splice(0, pending.length);
    if (!batch.length) return;
    batchChain = batchChain.then(
      () => runBatch(batch),
      () => runBatch(batch),
    );
  }, BATCH_MS);
}

export function fetchOpenMeteo(lat: number, lon: number) {
  return new Promise<OpenMeteoForecast>((resolve, reject) => {
    pending.push({ lat, lon, resolve, reject });
    scheduleBatch();
  });
}
