import { USER_AGENT } from "@/lib/brand";
import { noaaDateSpan, parseNoaaGmt } from "@/lib/time";

const APP = USER_AGENT;
const BASE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";

async function getJson(url: string, timeoutMs = 2800) {
  const res = await fetch(url, {
    headers: { "User-Agent": APP },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`NOAA ${res.status}`);
  return res.json();
}

function qs(params: Record<string, string>) {
  const u = new URL(BASE);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

export async function fetchHiLo(station: string, start: Date, days = 3, timeoutMs = 2800) {
  const { begin, end } = noaaDateSpan(new Date(start.getTime() - 86400000), days + 1);
  const json = await getJson(
    qs({
      product: "predictions",
      application: APP,
      begin_date: begin,
      end_date: end,
      datum: "MLLW",
      station,
      time_zone: "gmt",
      units: "english",
      interval: "hilo",
      format: "json",
    }),
    timeoutMs,
  );
  const rows = (json.predictions ?? []) as { t: string; v: string; type: "H" | "L" }[];
  return rows.map((r) => ({
    time: r.t,
    height: Number(r.v),
    type: r.type,
    at: parseNoaaGmt(r.t),
  }));
}

export async function fetchHourly(station: string, start: Date, days = 3) {
  const { begin, end } = noaaDateSpan(new Date(start.getTime() - 6 * 3600000), days);
  const json = await getJson(
    qs({
      product: "predictions",
      application: APP,
      begin_date: begin,
      end_date: end,
      datum: "MLLW",
      station,
      time_zone: "gmt",
      units: "english",
      interval: "h",
      format: "json",
    }),
  );
  const rows = (json.predictions ?? []) as { t: string; v: string }[];
  return rows.map((r) => ({
    time: r.t,
    height: Number(r.v),
    at: parseNoaaGmt(r.t),
  }));
}

export async function fetchHourlyObserved(station: string, start: Date, days = 1) {
  const { begin, end } = noaaDateSpan(new Date(start.getTime() - 6 * 3600000), days);
  const json = await getJson(
    qs({
      product: "water_level",
      application: APP,
      begin_date: begin,
      end_date: end,
      datum: "MLLW",
      station,
      time_zone: "gmt",
      units: "english",
      interval: "h",
      format: "json",
    }),
  );
  const rows = (json.data ?? []) as { t: string; v: string }[];
  return rows
    .map((r) => ({
      time: r.t,
      height: Number(r.v),
      at: parseNoaaGmt(r.t),
    }))
    .filter((r) => Number.isFinite(r.height));
}

export async function fetchAirPressure(station: string, at = new Date()) {
  try {
    const { begin, end } = noaaDateSpan(new Date(at.getTime() - 5 * 3600000), 1);
    const json = await getJson(
      qs({
        product: "air_pressure",
        application: APP,
        begin_date: begin,
        end_date: end,
        station,
        time_zone: "gmt",
        units: "metric",
        interval: "h",
        format: "json",
      }),
    );
    const rows = (json.data ?? []) as { t: string; v: string }[];
    const pts = rows
      .map((r) => ({ at: parseNoaaGmt(r.t), mb: Number(r.v) }))
      .filter((p) => Number.isFinite(p.mb));
    if (!pts.length) return null;
    const latest = pts[pts.length - 1];
    const target = latest.at.getTime() - 3 * 3600000;
    let prior: (typeof pts)[number] | null = null;
    let best = Infinity;
    for (const p of pts) {
      const delta = Math.abs(p.at.getTime() - target);
      if (delta < best) {
        prior = p;
        best = delta;
      }
    }
    const name = typeof json.metadata?.name === "string" ? json.metadata.name : null;
    return {
      mb: latest.mb,
      trendMb: prior && best < 50 * 60_000 ? Number((latest.mb - prior.mb).toFixed(1)) : null,
      station,
      name,
      fetchedAt: latest.at.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function fetchLatest(station: string, product: string) {
  try {
    const json = await getJson(
      qs({
        date: "latest",
        station,
        product,
        datum: "MLLW",
        time_zone: "gmt",
        units: "english",
        format: "json",
        application: APP,
      }),
    );
    const row = json.data?.[0];
    if (!row) return null;
    return {
      time: row.t as string,
      value: row.v != null ? Number(row.v) : null,
      speed: row.s != null ? Number(row.s) : null,
      dir: row.d != null ? Number(row.d) : null,
      gust: row.g != null ? Number(row.g) : null,
      at: parseNoaaGmt(row.t),
    };
  } catch {
    return null;
  }
}
