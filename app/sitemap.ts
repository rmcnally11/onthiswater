import type { MetadataRoute } from "next";
import { AREAS } from "@/lib/data/areas";
import { COAST_HUBS } from "@/lib/coast-hubs";
import { SITE_URL } from "@/lib/brand";
import {
  contentLastMod,
  indexableLetterArchives,
  indexableMorningArchives,
} from "@/lib/archive-paths";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = SITE_URL;

  // /morning always redirects to a desk, so it is not listed.
  // Undated pages have no per-entry content date, so they carry no lastmod.
  const staticPages: MetadataRoute.Sitemap = [
    "",
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
    changeFrequency: path === "" ? "hourly" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  const coasts: MetadataRoute.Sitemap = COAST_HUBS.map((hub) => ({
    url: `${origin}/${hub.slug}`,
    changeFrequency: "daily" as const,
    priority: hub.slug === "texas" || hub.slug === "keys" ? 0.9 : 0.8,
  }));

  const waterHubs: MetadataRoute.Sitemap = AREAS.map((area) => ({
    url: `${origin}/morning/${area.id}`,
    changeFrequency: "hourly" as const,
    priority: 0.85,
  }));

  const dated: MetadataRoute.Sitemap = indexableMorningArchives().map(({ area, date }) => ({
    url: `${origin}/morning/${area}/${date}`,
    lastModified: contentLastMod(date),
    changeFrequency: "never" as const,
    priority: 0.4,
  }));

  const letters: MetadataRoute.Sitemap = indexableLetterArchives().map((saturday, i) => ({
    url: `${origin}/newsletter/${saturday}`,
    lastModified: contentLastMod(saturday),
    changeFrequency: "weekly" as const,
    priority: i === 0 ? 0.7 : 0.4,
  }));

  return [...staticPages, ...coasts, ...waterHubs, ...dated, ...letters];
}
