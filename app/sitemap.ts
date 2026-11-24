import type { MetadataRoute } from "next";
import { AREA_IDS, AREAS } from "@/lib/data/areas";
import { COAST_HUBS } from "@/lib/coast-hubs";
import { SITE_URL } from "@/lib/brand";
import { addDaysYmd, mostRecentSaturday, ymdInZone } from "@/lib/time";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = SITE_URL;
  const today = ymdInZone(new Date(), "America/Chicago");
  const lastMod = new Date();

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
    lastModified: lastMod,
    changeFrequency: path === "" || path === "/morning" ? "hourly" : "weekly",
    priority: path === "" ? 1 : path === "/morning" ? 0.9 : 0.6,
  }));

  const coasts: MetadataRoute.Sitemap = COAST_HUBS.map((hub) => ({
    url: `${origin}/${hub.slug}`,
    lastModified: lastMod,
    changeFrequency: "daily",
    priority: hub.slug === "texas" || hub.slug === "keys" ? 0.9 : 0.8,
  }));

  const waterHubs: MetadataRoute.Sitemap = AREAS.map((area) => ({
    url: `${origin}/morning/${area.id}`,
    lastModified: lastMod,
    changeFrequency: "hourly",
    priority: 0.85,
  }));

  const dated: MetadataRoute.Sitemap = [];
  for (let i = 1; i <= 14; i++) {
    const day = addDaysYmd(today, -i);
    for (const areaId of AREA_IDS) {
      dated.push({
        url: `${origin}/morning/${areaId}/${day}`,
        lastModified: i === 0 ? lastMod : new Date(`${day}T16:00:00Z`),
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
      lastModified: new Date(`${saturday}T16:00:00Z`),
      changeFrequency: "weekly",
      priority: i === 0 ? 0.7 : 0.4,
    });
    saturday = addDaysYmd(saturday, -7);
  }

  return [...staticPages, ...coasts, ...waterHubs, ...dated, ...letters];
}
