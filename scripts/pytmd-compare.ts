/**
 * Build the internal GOT4.10c comparison. Not part of the page, the build, or the cron.
 *
 *   PYTMD_PYTHON=/tmp/pytmd-venv/bin/python \
 *   PYTMD_MODEL_DIR=/tmp/pytmd-models \
 *   PYTMD_MODEL_TAR=/tmp/pytmd-models/got4.10c.tar.gz \
 *   node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/pytmd-compare.ts
 *
 * The Python side needs pyTMD and the extracted NASA GSFC GOT4.10c grids.
 * See scripts/pytmd-predict.py. Nothing here is fetched from a registry that
 * asks for an account.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { USER_AGENT } from "@/lib/brand";
import { getArea } from "@/lib/data/areas";
import { modeledHourlyTide } from "@/lib/moon";
import { fetchHiLo } from "@/lib/noaa";

const HOURS = 48;
const MATCH_WITHIN_MS = 6 * 3600 * 1000;

type Kind = "H" | "L";

type TideEvent = {
  time: string;
  type: Kind;
  heightFt: number;
};

type PyEvent = TideEvent & { heightM: number };

type PyDesk = {
  id: string;
  lat: number;
  lon: number;
  extrapolated: boolean;
  extrapolateCutoffKm: number;
  grid: {
    gridDegrees: number;
    pointCellMasked: boolean;
    nearestWet: { lat: number; lon: number; km: number; m2AmpCm: number };
    constituentsCm: Record<string, { ampCm: number; phaseDeg: number }>;
  };
  seriesMeters: { samples: number; min: number; max: number };
  hilo: PyEvent[];
};

type PyPayload = {
  pyTmdVersion: string;
  model: string;
  modelName: string;
  importSeconds: number;
  predictSeconds: number;
  modelTarSha256: string | null;
  desks: PyDesk[];
};

const DESK_IDS = ["galveston", "key-west", "charleston", "andros"] as const;

function iso(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function localLabel(time: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(time));
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Same neighbor test as hiloFromHourly in lib/tides.ts. */
function hiloFromHourly(hourly: { time: string; height: number }[]): TideEvent[] {
  const out: TideEvent[] = [];
  for (let i = 1; i < hourly.length - 1; i++) {
    const prev = hourly[i - 1].height;
    const cur = hourly[i].height;
    const next = hourly[i + 1].height;
    const time = hourly[i].time.includes("T")
      ? new Date(hourly[i].time).toISOString()
      : `${hourly[i].time.replace(" ", "T")}:00Z`;
    if (cur >= prev && cur > next) out.push({ time, heightFt: cur, type: "H" });
    if (cur <= prev && cur < next) out.push({ time, heightFt: cur, type: "L" });
  }
  return out;
}

function inWindow(time: string, start: Date, end: Date) {
  const at = new Date(time).getTime();
  return at >= start.getTime() && at < end.getTime();
}

function meanSwing(events: TideEvent[]) {
  const swings: number[] = [];
  for (let i = 1; i < events.length; i++) {
    if (events[i].type === events[i - 1].type) continue;
    swings.push(Math.abs(events[i].heightFt - events[i - 1].heightFt));
  }
  if (!swings.length) return null;
  return round3(swings.reduce((sum, value) => sum + value, 0) / swings.length);
}

async function gaugePoint(station: string) {
  const url = `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/${station}.json`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`NOAA station ${station} metadata ${response.status}`);
  const json = (await response.json()) as {
    stations?: { name?: string; lat?: number; lng?: number }[];
  };
  const stationRow = json.stations?.[0];
  if (!stationRow || stationRow.lat == null || stationRow.lng == null) {
    throw new Error(`NOAA station ${station} has no coordinates`);
  }
  return { name: stationRow.name ?? station, lat: stationRow.lat, lon: stationRow.lng };
}

function pageEventsNoaa(rows: { at: Date; type: Kind; height: number }[], start: Date) {
  return rows
    .filter((row) => row.at.getTime() >= start.getTime() - 2 * 3600000)
    .slice(0, 8)
    .map((row) => iso(row.at));
}

function matchEvents(site: TideEvent[], model: TideEvent[]) {
  const used = new Set<number>();
  const pairs = [];
  for (const event of site) {
    const at = new Date(event.time).getTime();
    let best = -1;
    let bestGap = Infinity;
    model.forEach((candidate, index) => {
      if (used.has(index) || candidate.type !== event.type) return;
      const gap = Math.abs(new Date(candidate.time).getTime() - at);
      if (gap < bestGap) {
        bestGap = gap;
        best = index;
      }
    });
    if (best < 0 || bestGap > MATCH_WITHIN_MS) {
      pairs.push({
        type: event.type,
        siteTime: event.time,
        pytmdTime: null,
        deltaMinutes: null,
        siteHeightFt: event.heightFt,
        pytmdHeightFt: null,
        deltaHeightFt: null,
      });
      continue;
    }
    used.add(best);
    const other = model[best];
    const deltaMinutes = Math.round((new Date(other.time).getTime() - at) / 60000);
    pairs.push({
      type: event.type,
      siteTime: event.time,
      pytmdTime: other.time,
      deltaMinutes,
      siteHeightFt: event.heightFt,
      pytmdHeightFt: other.heightFt,
      deltaHeightFt: round3(other.heightFt - event.heightFt),
    });
  }
  const extras = model
    .filter((_, index) => !used.has(index))
    .map((event) => ({ time: event.time, type: event.type, heightFt: event.heightFt }));
  return { pairs, extras };
}

async function main() {
  const python = process.env.PYTMD_PYTHON;
  const modelDir = process.env.PYTMD_MODEL_DIR;
  const modelTar = process.env.PYTMD_MODEL_TAR ?? "";
  if (!python || !modelDir) {
    console.error("Set PYTMD_PYTHON and PYTMD_MODEL_DIR. This scout does not download a model by itself.");
    process.exit(1);
  }

  const start = new Date();
  const end = new Date(start.getTime() + HOURS * 3600000);
  const points = [];
  for (const id of DESK_IDS) {
    const area = getArea(id);
    if (area.id !== id) throw new Error(`Missing desk ${id}`);
    if (area.noaaStation) {
      const gauge = await gaugePoint(area.noaaStation);
      points.push({ id, lat: gauge.lat, lon: gauge.lon, gaugeName: gauge.name, area });
    } else {
      points.push({ id, lat: area.lat, lon: area.lon, gaugeName: null, area });
    }
  }

  const child = spawnSync(
    python,
    [fileURLToPath(new URL("./pytmd-predict.py", import.meta.url))],
    {
      input: JSON.stringify({
        start: iso(start),
        hours: HOURS,
        modelDir,
        modelTar: modelTar || null,
        desks: points.map((point) => ({ id: point.id, lat: point.lat, lon: point.lon })),
      }),
      encoding: "utf8",
      maxBuffer: 20_000_000,
    },
  );
  if (child.status !== 0) {
    console.error(child.stderr || child.stdout);
    process.exit(child.status ?? 1);
  }
  const predicted = JSON.parse(child.stdout) as PyPayload;
  const byId = new Map(predicted.desks.map((desk) => [desk.id, desk]));

  const desks = [];
  for (const point of points) {
    const model = byId.get(point.id);
    if (!model) throw new Error(`pyTMD returned no desk ${point.id}`);
    const area = point.area;
    let site: TideEvent[];
    let siteSource: "noaa" | "modeled";
    let pageTimes: string[];
    if (area.noaaStation) {
      const rows = await fetchHiLo(area.noaaStation, start, 3, 20000);
      siteSource = "noaa";
      site = rows
        .filter((row) => row.at >= start && row.at < end)
        .map((row) => ({ time: iso(row.at), type: row.type, heightFt: row.height }));
      pageTimes = pageEventsNoaa(rows, start);
    } else {
      siteSource = "modeled";
      const hourly = modeledHourlyTide(
        new Date(start.getTime() - 6 * 3600000),
        96,
        area.meanRangeFt,
        area.modeledTideOffsetHours ?? 0,
      );
      const hilo = hiloFromHourly(hourly);
      site = hilo.filter((event) => inWindow(event.time, start, end));
      pageTimes = hilo.slice(0, 8).map((event) => event.time);
    }

    const { pairs, extras } = matchEvents(site, model.hilo);
    const matched = pairs.filter((pair) => pair.deltaMinutes != null && pair.deltaHeightFt != null);
    const timeErrors = matched.map((pair) => pair.deltaMinutes as number);
    const heightErrors = matched.map((pair) => pair.deltaHeightFt as number);
    const datumOffsetFt = median(heightErrors);
    const adjusted = datumOffsetFt == null ? [] : heightErrors.map((error) => error - datumOffsetFt);
    const siteSwing = meanSwing(site);
    const modelSwing = meanSwing(model.hilo);
    const absTimes = timeErrors.map((value) => Math.abs(value));

    desks.push({
      id: area.id,
      name: area.name,
      timezone: area.timezone,
      predictLat: point.lat,
      predictLon: point.lon,
      deskLat: area.lat,
      deskLon: area.lon,
      noaaStation: area.noaaStation,
      gaugeName: point.gaugeName,
      siteSource,
      siteDatum: siteSource === "noaa" ? "MLLW feet" : "modeled feet around 0",
      pytmdDatum: "GOT ocean tide, meters converted to feet, model zero (about mean sea level, not MLLW)",
      grid: model.grid,
      extrapolated: model.extrapolated,
      extrapolateCutoffKm: model.extrapolateCutoffKm,
      siteSwingFt: siteSwing,
      pytmdSwingFt: modelSwing,
      swingDeltaFt: siteSwing != null && modelSwing != null ? round3(modelSwing - siteSwing) : null,
      matched: matched.length,
      unmatchedSite: pairs.length - matched.length,
      medianAbsMinutes: median(absTimes.map((value) => value)),
      medianSignedMinutes: median(timeErrors),
      maxAbsMinutes: absTimes.length ? Math.max(...absTimes) : null,
      datumOffsetFt: datumOffsetFt == null ? null : round3(datumOffsetFt),
      medianAbsHeightFtAfterDatum: adjusted.length ? round3(median(adjusted.map((value) => Math.abs(value))) ?? 0) : null,
      pairs: pairs.map((pair) => ({
        ...pair,
        siteLocal: localLabel(pair.siteTime, area.timezone),
        pytmdLocal: pair.pytmdTime ? localLabel(pair.pytmdTime, area.timezone) : null,
        onThePage: pageTimes.includes(pair.siteTime),
        deltaHeightFtAfterDatum:
          pair.deltaHeightFt == null || datumOffsetFt == null
            ? null
            : round3(pair.deltaHeightFt - datumOffsetFt),
      })),
      pytmdUnmatched: extras.map((event) => ({
        ...event,
        local: localLabel(event.time, area.timezone),
      })),
    });
  }

  const scout = {
    kind: "pytmd-scout",
    publicPagesUnchanged: true,
    recommendation: "drop",
    generatedAt: iso(start),
    windowHours: HOURS,
    windowStart: iso(start),
    windowEnd: iso(end),
    model: {
      software: "pyTMD",
      softwareVersion: predicted.pyTmdVersion,
      softwareLicense: "MIT",
      softwareUrl: "https://github.com/pyTMD/pyTMD",
      name: "GOT4.10c",
      id: predicted.model,
      provider: "Richard D. Ray, NASA Goddard Space Flight Center",
      downloadedFrom: "https://earth.gsfc.nasa.gov/sites/default/files/2023-12/got4.10c.tar.gz",
      catalog: "https://earth.gsfc.nasa.gov/geo/data/ocean-tide-models",
      sha256: predicted.modelTarSha256,
      registration: "none",
      paywall: "none",
      license:
        "US Government work distributed by NASA GSFC with no click-through and no fee. Ray's README (July 2014) forbids coastal navigation and any use that risks life or property. Not a substitute for a NOAA tide table.",
      citation:
        "Ray, R. D. (2013), J. Geophys. Res. Oceans, 118, 4570-4584. GOT4.10c geocenter revision: Desai and Ray (2014), Geophys. Res. Lett., 41, 2454.",
      rejectedModels: [
        "TPXO atlas models need an Oregon State access request and a Box token.",
        "FES2014 and FES2022 need an AVISO+ registration and an approval wait.",
      ],
    },
    runtime: {
      importSeconds: predicted.importSeconds,
      predictSeconds: predicted.predictSeconds,
      sampleStepMinutes: 6,
      note: "importSeconds is pyTMD and its numeric stack loading inside an already-installed virtualenv on this machine. It is not a Vercel cold start.",
    },
    desks,
  };

  const out = fileURLToPath(new URL("../data/pytmd-scout.json", import.meta.url));
  writeFileSync(out, `${JSON.stringify(scout, null, 2)}\n`);
  console.log(`wrote ${out}`);
  for (const desk of desks) {
    console.log(
      `${desk.id} swing site ${desk.siteSwingFt} pytmd ${desk.pytmdSwingFt} median |min| ${desk.medianAbsMinutes} datum ${desk.datumOffsetFt} masked ${desk.grid.pointCellMasked} wet ${desk.grid.nearestWet.km}km`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
