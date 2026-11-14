import { unstable_cache } from "next/cache";
import { USER_AGENT } from "@/lib/brand";
import {
  DOCK_DIESEL_MAX_AGE_DAYS,
  EIA_GASDIESEL_URL,
  dockDieselAgeDays,
  parseEiaGulfRetail,
  type DockDieselQuote,
} from "@/lib/dock-diesel";
import { fetchExternal } from "@/lib/external-fetch";

/** Weekly series. Keep the page off EIA for at least half a day. */
export const DOCK_DIESEL_REVALIDATE_SECONDS = 60 * 60 * 12;

async function loadEiaGulfRetail(): Promise<DockDieselQuote | null> {
  try {
    const res = await fetchExternal(EIA_GASDIESEL_URL, {
      headers: { Accept: "text/html", "User-Agent": USER_AGENT },
      timeoutMs: 8000,
    });
    if (!res.ok) return null;
    return parseEiaGulfRetail(await res.text());
  } catch {
    return null;
  }
}

const cachedEiaGulfRetail = unstable_cache(loadEiaGulfRetail, ["dock-diesel-gulf-v1"], {
  revalidate: DOCK_DIESEL_REVALIDATE_SECONDS,
});

/** Latest Gulf retail quote, or null when the fetch fails or the week is older than 14 days. */
export async function getDockDiesel(asOf = new Date()): Promise<DockDieselQuote | null> {
  try {
    const quote = await cachedEiaGulfRetail();
    if (!quote) return null;
    const age = dockDieselAgeDays(quote.week, asOf);
    if (age == null || age > DOCK_DIESEL_MAX_AGE_DAYS) return null;
    return quote;
  } catch {
    return null;
  }
}
