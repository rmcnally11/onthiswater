import { USER_AGENT } from "@/lib/brand";
import { fetchExternal } from "@/lib/external-fetch";
import type { SalinityNow, TheaterId } from "@/lib/types";

/** Live USGS 00480 wells that actually sit on these desks. River zeros are labeled as river. */
const SITES: Record<string, { site: string; name: string; kind: "bay" | "river" }> = {
  galveston: { site: "08067252", name: "Trinity River at Wallisville", kind: "river" },
  venice: { site: "07374526", name: "Black Bay near Pointe-à-la-Hache", kind: "bay" },
  "grand-isle": { site: "073802516", name: "Barataria Pass at Grand Isle", kind: "bay" },
  calcasieu: { site: "08017095", name: "North Calcasieu Lake near Hackberry", kind: "bay" },
};

export function salinitySiteFor(areaId: string) {
  return SITES[areaId] ?? null;
}

export function salinityCoast(theater: TheaterId) {
  return theater === "texas" || theater === "louisiana";
}

function colorOf(ppt: number, kind: "bay" | "river") {
  if (kind === "river" && ppt < 3) return "river-fresh — coffee if the river is up";
  if (ppt < 5) return "fresh / coffee";
  if (ppt < 15) return "brackish";
  if (ppt < 25) return "bay";
  return "near-gulf";
}

export async function fetchSalinity(areaId: string): Promise<SalinityNow | null> {
  const meta = SITES[areaId];
  if (!meta) return null;
  const url = new URL("https://waterservices.usgs.gov/nwis/iv/");
  url.searchParams.set("format", "json");
  url.searchParams.set("sites", meta.site);
  url.searchParams.set("parameterCd", "00480");
  const res = await fetchExternal(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    timeoutMs: 4000,
  });
  if (!res.ok) return null;
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
  const ppt = last?.value != null ? Number(last.value) : NaN;
  const at = last?.dateTime ? new Date(last.dateTime) : null;
  if (!Number.isFinite(ppt) || !at || Date.now() - at.getTime() > 10 * 86400000) return null;
  return {
    ppt,
    color: colorOf(ppt, meta.kind),
    site: meta.site,
    name: series?.sourceInfo?.siteName ?? meta.name,
    kind: meta.kind,
    href: `https://waterdata.usgs.gov/nwis/uv?site_no=${meta.site}`,
    fetchedAt: last?.dateTime ?? at.toISOString(),
  };
}
