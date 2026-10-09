import { USER_AGENT } from "@/lib/brand";
import { fetchExternal } from "@/lib/external-fetch";
import type { RiverNow } from "@/lib/types";

/** USGS IV sites that actually drain into these desks. Names come from the gauge. */
export const RIVER_SITES: Record<
  string,
  { site: string; river: string; highCfs: number }
> = {
  sabine: { site: "08030500", river: "Sabine River", highCfs: 15000 },
  galveston: { site: "08066500", river: "Trinity River", highCfs: 20000 },
  matagorda: { site: "08162500", river: "Colorado River", highCfs: 8000 },
  corpus: { site: "08211000", river: "Nueces River", highCfs: 2000 },
  venice: { site: "07374525", river: "Mississippi River", highCfs: 400000 },
  calcasieu: { site: "08015500", river: "Calcasieu River", highCfs: 3000 },
};

export function riverSiteFor(areaId: string) {
  return RIVER_SITES[areaId] ?? null;
}

export async function fetchUsgsDischarge(areaId: string): Promise<RiverNow | null> {
  const meta = riverSiteFor(areaId);
  if (!meta) return null;
  const url = new URL("https://waterservices.usgs.gov/nwis/iv/");
  url.searchParams.set("format", "json");
  url.searchParams.set("sites", meta.site);
  url.searchParams.set("parameterCd", "00060");
  const res = await fetchExternal(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    timeoutMs: 3500,
  });
  if (!res.ok) throw new Error(`USGS IV ${res.status}`);
  const json = (await res.json()) as {
    value?: {
      timeSeries?: Array<{
        sourceInfo?: { siteName?: string };
        values?: Array<{ value?: Array<{ value?: string; dateTime?: string }> }>;
      }>;
    };
  };
  const series = json.value?.timeSeries?.[0];
  const last = series?.values?.[0]?.value?.at(-1);
  const cfs = last?.value != null ? Number(last.value) : NaN;
  if (!Number.isFinite(cfs)) return null;
  return {
    site: meta.site,
    name: series?.sourceInfo?.siteName ?? `${meta.river} (USGS ${meta.site})`,
    cfs,
    high: cfs >= meta.highCfs,
    fetchedAt: last?.dateTime ?? new Date().toISOString(),
  };
}
