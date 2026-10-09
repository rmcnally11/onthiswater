import { USER_AGENT } from "@/lib/brand";
import { fetchExternal } from "@/lib/external-fetch";
import { buoyForArea, ndbcHref, type BuoyMeta } from "@/lib/data/buoys";
import { cardinalFromDeg } from "@/lib/time";
import type { BuoyNow } from "@/lib/types";

const LATEST = "https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt";

function num(raw: string | undefined) {
  if (!raw || raw === "MM") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function msToMph(ms: number | null) {
  return ms == null ? null : ms * 2.236936;
}

function mToFt(m: number | null) {
  return m == null ? null : m * 3.28084;
}

function cToF(c: number | null) {
  return c == null ? null : (c * 9) / 5 + 32;
}

function pack(
  meta: BuoyMeta,
  fields: {
    wdir: number | null;
    wspd: number | null;
    gst: number | null;
    wvht: number | null;
    wtmp: number | null;
    pres: number | null;
    ptdy: number | null;
    at: Date;
  },
): BuoyNow {
  const windMph = msToMph(fields.wspd);
  return {
    id: meta.id,
    name: meta.name,
    kind: meta.kind,
    href: ndbcHref(meta.id),
    where: meta.where,
    windMph: windMph == null ? null : Number(windMph.toFixed(1)),
    windGustMph: fields.gst == null ? null : Number(msToMph(fields.gst)!.toFixed(1)),
    windDirDeg: fields.wdir,
    windCardinal: cardinalFromDeg(fields.wdir),
    waveFt: fields.wvht == null ? null : Number(mToFt(fields.wvht)!.toFixed(1)),
    waterTempF: fields.wtmp == null ? null : Number(cToF(fields.wtmp)!.toFixed(1)),
    pressureMb: fields.pres,
    pressureTrendMb: fields.ptdy,
    fetchedAt: fields.at.toISOString(),
  };
}

function parseLatestRow(line: string) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 19) return null;
  const [
    id,
    ,
    ,
    year,
    month,
    day,
    hour,
    minute,
    wdir,
    wspd,
    gst,
    wvht,
    ,
    ,
    ,
    pres,
    ptdy,
    ,
    wtmp,
  ] = parts;
  const at = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
  if (!Number.isFinite(at.getTime())) return null;
  return {
    id,
    wdir: num(wdir),
    wspd: num(wspd),
    gst: num(gst),
    wvht: num(wvht),
    wtmp: num(wtmp),
    pres: num(pres),
    ptdy: num(ptdy),
    at,
  };
}

function trendFromRows(
  rows: Array<{ at: Date; pres: number | null; ptdy: number | null }>,
) {
  const latest = rows[0];
  if (!latest) return null;
  if (latest.ptdy != null) return latest.ptdy;
  if (latest.pres == null) return null;
  const target = latest.at.getTime() - 3 * 3600000;
  let prior: (typeof rows)[number] | null = null;
  let best = Infinity;
  for (const row of rows) {
    if (row.pres == null) continue;
    const delta = Math.abs(row.at.getTime() - target);
    if (delta < best) {
      prior = row;
      best = delta;
    }
  }
  if (!prior || prior === latest || best > 50 * 60_000) return null;
  return Number((latest.pres - prior.pres!).toFixed(1));
}

async function fromLatestObs(id: string) {
  const res = await fetchExternal(LATEST, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/plain" },
    timeoutMs: 7000,
  });
  if (!res.ok) return null;
  const text = await res.text();
  const want = id.toUpperCase();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const row = parseLatestRow(line);
    if (row?.id.toUpperCase() === want) return row;
  }
  return null;
}

async function fromRealtime(id: string) {
  const res = await fetchExternal(`https://www.ndbc.noaa.gov/data/realtime2/${encodeURIComponent(id)}.txt`, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/plain" },
    timeoutMs: 7000,
  });
  if (!res.ok) return null;
  const text = await res.text();
  const rows: Array<{
    id: string;
    wdir: number | null;
    wspd: number | null;
    gst: number | null;
    wvht: number | null;
    wtmp: number | null;
    pres: number | null;
    ptdy: number | null;
    at: Date;
  }> = [];
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 15) continue;
    const [year, month, day, hour, minute, wdir, wspd, gst, wvht] = parts;
    const pres = parts[12];
    const wtmp = parts[14];
    const ptdy = parts[17];
    const at = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
    if (!Number.isFinite(at.getTime())) continue;
    rows.push({
      id,
      wdir: num(wdir),
      wspd: num(wspd),
      gst: num(gst),
      wvht: num(wvht),
      wtmp: num(wtmp),
      pres: num(pres),
      ptdy: num(ptdy),
      at,
    });
    if (rows.length >= 40) break;
  }
  const latest = rows[0];
  if (!latest) return null;
  return { ...latest, ptdy: trendFromRows(rows) };
}

export async function fetchNdbc(areaId: string): Promise<BuoyNow | null> {
  const meta = buoyForArea(areaId);
  if (!meta) return null;
  try {
    const row = (await fromRealtime(meta.id)) ?? (await fromLatestObs(meta.id));
    if (!row) return null;
    return pack(meta, row);
  } catch {
    return null;
  }
}
