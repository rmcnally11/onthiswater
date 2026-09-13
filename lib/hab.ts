import { USER_AGENT } from "@/lib/brand";
import type { Area, HabNow } from "@/lib/types";
import {
  NCCOS_GULF_FORECAST,
  TPWD_RED_TIDE_STATUS,
  citedTexasHab,
  habFromTpwdBlock,
  parseTpwdLatestBlock,
  texasHabBulletinWindow,
} from "@/lib/data/texas-hab";

const FWC_QUERY =
  "https://gis.myfwc.com/mapping/rest/services/Projects_FWC/HAB_forDEP_Dashboard/MapServer/0/query";
const FWC_STATUS = "https://myfwc.com/research/redtide/statewide/";
const TPWD_STATUS = TPWD_RED_TIDE_STATUS;
const NCCOS = NCCOS_GULF_FORECAST;

const RANK: Array<{ match: string; rank: number; label: string }> = [
  { match: "high", rank: 4, label: "high" },
  { match: "medium", rank: 3, label: "medium" },
  { match: "low (>", rank: 2, label: "low" },
  { match: "very low", rank: 1, label: "very low" },
  { match: "background", rank: 0, label: "background" },
  { match: "not present", rank: 0, label: "not present" },
];

function rankOf(abundance: string) {
  const a = abundance.toLowerCase();
  return RANK.find((r) => a.includes(r.match)) ?? { rank: 0, label: abundance };
}

function kmBetween(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(s)));
}

type FwcRow = {
  abundance: string;
  lat: number;
  lon: number;
  location: string;
  when: string;
};

async function fwcSamples(): Promise<FwcRow[]> {
  const url = new URL(FWC_QUERY);
  url.searchParams.set("where", "1=1");
  url.searchParams.set("outFields", "Abundance,LATITUDE,LONGITUDE,LOCATION,SampleDate_t");
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("resultRecordCount", "2000");
  url.searchParams.set("f", "pjson");
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`FWC HAB ${res.status}`);
  const json = (await res.json()) as {
    features?: Array<{
      attributes?: {
        Abundance?: string;
        LATITUDE?: number;
        LONGITUDE?: number;
        LOCATION?: string;
        SampleDate_t?: string;
      };
    }>;
  };
  return (json.features ?? [])
    .map((f) => f.attributes)
    .filter((a): a is NonNullable<typeof a> => Boolean(a?.LATITUDE != null && a.LONGITUDE != null))
    .map((a) => ({
      abundance: a.Abundance ?? "unknown",
      lat: Number(a.LATITUDE),
      lon: Number(a.LONGITUDE),
      location: (a.LOCATION ?? "sample").trim(),
      when: (a.SampleDate_t ?? "").trim(),
    }));
}

function fromFwc(area: Area, rows: FwcRow[]): HabNow {
  const near = rows
    .map((r) => ({ ...r, km: kmBetween(area.lat, area.lon, r.lat, r.lon), ...rankOf(r.abundance) }))
    .filter((r) => r.km <= 90)
    .sort((a, b) => b.rank - a.rank || a.km - b.km);
  const hot = near.filter((r) => r.rank >= 1);
  if (!hot.length) {
    return {
      hot: false,
      level: "background",
      where: `No FWC K. brevis above background within 90 km of ${area.shortName} in the last eight days.`,
      when: null,
      source: "FWC-FWRI",
      href: FWC_STATUS,
    };
  }
  const top = hot[0];
  return {
    hot: true,
    level: top.label,
    where: `${top.location} · ${Math.round(top.km)} km from this desk`,
    when: top.when || null,
    source: "FWC-FWRI",
    href: FWC_STATUS,
  };
}

async function fromTpwd(area: Area): Promise<HabNow> {
  const nowYear = new Date().getUTCFullYear();
  try {
    const res = await fetch(TPWD_STATUS, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`TPWD HAB ${res.status}`);
    const html = await res.text();
    const block = parseTpwdLatestBlock(html);
    if (!block) throw new Error("TPWD HAB: no status heading");
    return habFromTpwdBlock(area.id, block, nowYear);
  } catch {
    // Live page failed. Do not invent water — only the cited September 2026 bulletin.
    if (texasHabBulletinWindow(new Date())) {
      const cited = citedTexasHab(area.id);
      if (cited) return cited;
    }
    throw new Error("TPWD HAB quiet");
  }
}

export function habCovers(area: Area) {
  return area.theater === "florida" || area.theater === "texas" || area.theater === "louisiana";
}

export async function fetchHab(area: Area): Promise<HabNow | null> {
  try {
    if (area.theater === "florida") return fromFwc(area, await fwcSamples());
    if (area.theater === "texas") return fromTpwd(area);
    if (area.theater === "louisiana") {
      return {
        hot: false,
        level: "see NOAA",
        where: "Louisiana has no FWC-style daily K. brevis grid. NOAA NCCOS gulf forecast is the cite.",
        when: null,
        source: "NOAA NCCOS",
        href: NCCOS,
      };
    }
    return null;
  } catch {
    return null;
  }
}
