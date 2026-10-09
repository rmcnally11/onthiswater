import { USER_AGENT } from "@/lib/brand";
import { fetchExternal } from "@/lib/external-fetch";
import type { Area, SargassumNow } from "@/lib/types";

const SIR = "https://cwcgom.aoml.noaa.gov/SIR/";
const SAWS = "https://optics.marine.usf.edu/projects/SaWS/";
const AFAI =
  "https://cwcgom.aoml.noaa.gov/erddap/griddap/noaa_aoml_atlantic_oceanwatch_AFAI_1D.json";

function ymdUtc(offsetDays: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function latestSirDate() {
  const checks = await Promise.all(
    [0, -1, -2, -3, -4].map(async (off) => {
      const ymd = ymdUtc(off);
      try {
        const res = await fetchExternal(`https://cwcgom.aoml.noaa.gov/SIR/KMZ/sargassum_risk_${ymd}.kmz`, {
          method: "HEAD",
          headers: { "User-Agent": USER_AGENT },
          timeoutMs: 4000,
        });
        return res.ok ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : null;
      } catch {
        return null;
      }
    }),
  );
  return checks.find((day) => day) ?? null;
}

async function afaiAt(lat: number, lon: number) {
  const url = `${AFAI}?AFAI[(last)][(${lat.toFixed(3)})][(${lon.toFixed(3)})]`;
  const res = await fetchExternal(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    timeoutMs: 6000,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { table?: { rows?: Array<[string, number, number, number | null]> } };
  const row = json.table?.rows?.[0];
  if (!row) return null;
  const value = row[3];
  if (value == null || !Number.isFinite(value)) return null;
  return { at: row[0], value };
}

function offshoreOffsets(area: Area): Array<[number, number]> {
  const lat = area.lat;
  const lon = area.lon;
  if (area.theater === "texas" || area.theater === "louisiana") {
    return [
      [lat - 0.25, lon + 0.15],
      [lat - 0.35, lon],
      [lat - 0.2, lon + 0.35],
    ];
  }
  if (area.theater === "florida") {
    return [
      [lat, lon + 0.28],
      [lat - 0.15, lon + 0.2],
      [lat + 0.1, lon + 0.22],
    ];
  }
  return [
    [lat, lon + 0.25],
    [lat - 0.2, lon + 0.15],
    [lat + 0.15, lon - 0.15],
  ];
}

export function sargassumCovers(area: Area) {
  return area.theater !== "seychelles";
}

export async function fetchSargassum(area: Area): Promise<SargassumNow | null> {
  if (area.theater === "seychelles") return null;
  try {
    const [sirDate, samples] = await Promise.all([
      latestSirDate().catch(() => null),
      Promise.all(offshoreOffsets(area).map(([la, lo]) => afaiAt(la, lo).catch(() => null))),
    ]);
    const hits = samples.filter((s): s is NonNullable<typeof s> => Boolean(s));
    const best = hits.sort((a, b) => b.value - a.value)[0] ?? null;
    const elevated = best != null && best.value >= 0.004;
    const high = best != null && best.value >= 0.012;
    const pixel =
      best == null
        ? "No clear USF AFAI pixel near this coast today (cloud or glint)."
        : best.value < 0.001
          ? `USF AFAI ${best.at.slice(0, 10)} is background off this coast (${best.value.toFixed(4)}).`
          : `USF AFAI ${best.at.slice(0, 10)} is ${best.value.toFixed(4)} in the neighborhood.`;
    return {
      elevated,
      level: high ? "high" : elevated ? "elevated" : best ? "background" : "no pixel",
      note: `${pixel} NOAA SIR is a 50–100 km inundation risk — not weed at this GPS.${sirDate ? ` Latest SIR field ${sirDate}.` : ""}`,
      source: "NOAA SIR / USF SaWS",
      href: SIR,
      bulletinHref: SAWS,
    };
  } catch {
    return null;
  }
}
