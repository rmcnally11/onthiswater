import type { MetadataRoute } from "next";
import { AREA_IDS, AREAS } from "@/lib/data/areas";
import { COAST_HUBS } from "@/lib/coast-hubs";
import { SITE_URL } from "@/lib/brand";
import { addDaysYmd, mostRecentSaturday, ymdInZone } from "@/lib/time";

export const revalidate = 3600;

/**
 * 16:00 UTC on the entry's own calendar day. Dated briefs and Saturday
 * letters are chosen on the America/Chicago calendar, and formatYmdLong
 * already uses this instant. It is the data's date, not the request clock.
 */
function contentLastMod(ymd: string): Date {
  return new Date(`${ymd}T16:00:00.000Z`);
}

/**
 * Static pages, coast hubs, and undated /morning/{area} hubs have no
 * per-entry revision in source and no stored snapshot time. This sitemap
 * does not fetch live gauges. Their lastmod is the deploy build time,
 * captured once when next.config.ts loads and inlined as SITE_BUILD_TIME,
 * so an hourly regeneration does not stamp a new Date on every entry.
 */
function deployBuildTime(): Date {
  const raw = process.env.SITE_BUILD_TIME;
  const parsed = raw ? new Date(raw) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  throw new Error("SITE_BUILD_TIME is missing. next.config.ts must inline the deploy build time.");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = SITE_URL;
  const today = ymdInZone(new Date(), "America/Chicago");
  const built = deployBuildTime();

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/morning",
    "/calendar",
    "/join",
    "/method",
    "/species",
    "/fundamentals",
    "/newsletter",
    "/compare",
    "/map",
  ].map((path) => ({
    url: `${origin}${path || "/"}`,
    lastModified: built,
    changeFrequency: path === "" || path === "/morning" ? "hourly" : "weekly",
    priority: path === "" ? 1 : path === "/morning" ? 0.9 : 0.6,
  }));

  const coasts: MetadataRoute.Sitemap = COAST_HUBS.map((hub) => ({
    url: `${origin}/${hub.slug}`,
    lastModified: built,
    changeFrequency: "daily",
    priority: hub.slug === "texas" || hub.slug === "keys" ? 0.9 : 0.8,
  }));

  const waterHubs: MetadataRoute.Sitemap = AREAS.map((area) => ({
    url: `${origin}/morning/${area.id}`,
    lastModified: built,
    changeFrequency: "hourly",
    priority: 0.85,
  }));

  const dated: MetadataRoute.Sitemap = [];
  for (let i = 0; i <= 14; i++) {
    const day = addDaysYmd(today, -i);
    for (const areaId of AREA_IDS) {
      dated.push({
        url: `${origin}/morning/${areaId}/${day}`,
        lastModified: contentLastMod(day),
        changeFrequency: "never",
        priority: i === 0 ? 0.8 : 0.4,
      });
    }
  }

  const letters: MetadataRoute.Sitemap = [];
  let saturday = mostRecentSaturday();
  for (let i = 0; i < 12; i++) {
    letters.push({
      url: `${origin}/newsletter/${saturday}`,
      lastModified: contentLastMod(saturday),
      changeFrequency: "weekly",
      priority: i === 0 ? 0.7 : 0.4,
    });
    saturday = addDaysYmd(saturday, -7);
  }

  return [...staticPages, ...coasts, ...waterHubs, ...dated, ...letters];
}
