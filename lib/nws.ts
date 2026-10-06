import { USER_AGENT } from "@/lib/brand";
import { cardinalFromDeg } from "@/lib/time";
import { coerceSky, skyFromText } from "@/lib/wx";

const UA = USER_AGENT;

export async function fetchNwsPoint(lat: number, lon: number) {
  const res = await fetch(`https://api.weather.gov/points/${lat.toFixed(3)},${lon.toFixed(3)}`, {
    headers: { "User-Agent": UA, Accept: "application/geo+json" },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(3500),
  });
  if (!res.ok) throw new Error(`NWS points ${res.status}`);
  return res.json();
}

export type NwsPeriod = {
  startTime: string;
  temperature: number;
  windSpeed: string;
  windDirection: string;
  shortForecast?: string;
  probabilityOfPrecipitation?: { value: number | null };
};

async function fetchNwsPeriods(url: string | undefined, label: string) {
  if (!url) return { periods: [] as NwsPeriod[], office: null as string | null };
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/geo+json" },
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(3500),
  });
  if (!res.ok) throw new Error(`NWS ${label} ${res.status}`);
  const json = await res.json();
  return {
    periods: (json.properties?.periods ?? []) as NwsPeriod[],
    office: null as string | null,
  };
}

export async function fetchNwsForecast(lat: number, lon: number) {
  const point = await fetchNwsPoint(lat, lon);
  const result = await fetchNwsPeriods(point.properties?.forecastHourly as string | undefined, "hourly");
  return { ...result, office: point.properties?.cwa ?? null };
}

/** 12-hour grid forecast — enough for a calendar day’s max wind, much smaller than hourly. */
export async function fetchNwsDayWinds(lat: number, lon: number) {
  const point = await fetchNwsPoint(lat, lon);
  const result = await fetchNwsPeriods(point.properties?.forecast as string | undefined, "forecast");
  return { ...result, office: point.properties?.cwa ?? null };
}

function parseWindMph(text: string | undefined) {
  if (!text) return null;
  const nums = [...text.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
  if (!nums.length) return null;
  return Math.max(...nums);
}

function nwsSky(period: NwsPeriod) {
  const precipChance = period.probabilityOfPrecipitation?.value ?? null;
  const sky = period.shortForecast ?? null;
  return {
    precipChance,
    sky,
    wx: coerceSky(skyFromText(sky), precipChance),
  };
}

function nwsDir(period: NwsPeriod) {
  const dirMap: Record<string, number> = {
    N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135, SSE: 157,
    S: 180, SSW: 202, SW: 225, WSW: 247, W: 270, WNW: 292, NW: 315, NNW: 337,
  };
  const deg = dirMap[period.windDirection] ?? null;
  return {
    windMph: parseWindMph(period.windSpeed),
    windDirDeg: deg,
    windCardinal: period.windDirection || cardinalFromDeg(deg),
    airF: period.temperature,
    ...nwsSky(period),
  };
}

export function nwsWindAt(periods: NwsPeriod[], at: Date) {
  if (!periods.length) return null;
  let best = periods[0];
  let bestDelta = Math.abs(new Date(best.startTime).getTime() - at.getTime());
  for (const p of periods) {
    const delta = Math.abs(new Date(p.startTime).getTime() - at.getTime());
    if (delta < bestDelta) {
      best = p;
      bestDelta = delta;
    }
  }
  if (bestDelta > 18 * 3600000) return null;
  return nwsDir(best);
}

export function nwsWindNow(periods: NwsPeriod[], at = new Date()) {
  const now = at.getTime();
  const p =
    periods.find((x) => new Date(x.startTime).getTime() >= now - 30 * 60000) ?? periods[0];
  if (!p) return null;
  return nwsDir(p);
}

export type NwsAlert = {
  event: string;
  headline: string;
  severity: string;
};

const MARINE_OR_FLOOD =
  /small craft|gale|storm warning|hurricane|tropical|special marine|severe thunder|tornado|flood|coastal flood|rip current|extreme wind|storm surge/i;

export async function fetchNwsAlerts(lat: number, lon: number): Promise<NwsAlert[]> {
  const res = await fetch(
    `https://api.weather.gov/alerts/active?point=${lat.toFixed(3)},${lon.toFixed(3)}`,
    {
      headers: { "User-Agent": UA, Accept: "application/geo+json" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3500),
    },
  );
  if (!res.ok) throw new Error(`NWS alerts ${res.status}`);
  const json = (await res.json()) as {
    features?: Array<{
      properties?: { event?: string; headline?: string; severity?: string };
    }>;
  };
  const out: NwsAlert[] = [];
  for (const feature of json.features ?? []) {
    const event = feature.properties?.event ?? "";
    if (!MARINE_OR_FLOOD.test(event)) continue;
    out.push({
      event,
      headline: feature.properties?.headline ?? event,
      severity: feature.properties?.severity ?? "Unknown",
    });
    if (out.length >= 4) break;
  }
  return out;
}
