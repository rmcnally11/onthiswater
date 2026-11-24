import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MorningDesk } from "@/components/morning-desk";
import { getBriefing, parseBriefDate } from "@/lib/briefing";
import { AREA_BY_ID } from "@/lib/data/areas";
import { withFetchRevalidate, withHistoricalFetches } from "@/lib/external-fetch";
import { morningLine } from "@/lib/morning";
import { indexableMorningArchives } from "@/lib/archive-paths";
import { ogImageForArea, pageMeta } from "@/lib/seo";
import { formatYmdLong, isPastYmd, ymdInZone } from "@/lib/time";

// Dynamic segments otherwise render per request and send `private, no-store`.
// `dynamic = "error"` keeps this route static. `force-cache` stops the gauge
// fetches from opting out. Past dates last 30 days. A future date lasts 5 minutes.
// Today is redirected to /morning/<desk> before this renders.
export const revalidate = 2592000;
export const fetchCache = "force-cache";
export const dynamic = "error";

function pastMorning(areaId: string, date: string) {
  const area = AREA_BY_ID[areaId];
  if (!area) return false;
  return isPastYmd(date, ymdInZone(new Date(), area.timezone));
}

export function generateStaticParams() {
  return indexableMorningArchives();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string; date: string }>;
}): Promise<Metadata> {
  const { area: areaId, date: dateRaw } = await params;
  const area = AREA_BY_ID[areaId];
  const date = parseBriefDate(dateRaw);
  if (!area || !date) {
    return pageMeta({ title: "This morning", description: "Gauge quiet.", path: "/morning" });
  }
  const path = `/morning/${area.id}/${date}`;
  const when = formatYmdLong(date, area.timezone);
  const title = `${area.shortName}, ${when} — tide and wind`;
  const fallback = pageMeta({
    title,
    description: `This morning on ${area.shortName}, ${when}. Live NOAA tides and wind. Scores are 1–10, not a bite.`,
    path,
    image: ogImageForArea(area.id),
    imageAlt: `${area.shortName} tide ${date}`,
  });
  if (!pastMorning(area.id, date)) {
    return withFetchRevalidate(300, async () => {
      try {
        const briefing = await getBriefing(area.id, "all", date);
        return pageMeta({
          title,
          description: morningLine(briefing).slice(0, 160),
          path,
          image: ogImageForArea(area.id),
          imageAlt: `${area.shortName} tide ${date}`,
        });
      } catch {
        return fallback;
      }
    });
  }
  return withHistoricalFetches(async () => {
    try {
      const briefing = await getBriefing(area.id, "all", date);
      return pageMeta({
        title,
        description: morningLine(briefing).slice(0, 160),
        path,
        image: ogImageForArea(area.id),
        imageAlt: `${area.shortName} tide ${date}`,
      });
    } catch {
      return fallback;
    }
  });
}

export default async function MorningDatedPage({
  params,
}: {
  params: Promise<{ area: string; date: string }>;
}) {
  const { area, date: dateRaw } = await params;
  const date = parseBriefDate(dateRaw);
  if (!AREA_BY_ID[area] || !date) notFound();
  // A future date is a forecast. Keep it for five minutes. Today never reaches here.
  if (!pastMorning(area, date)) return withFetchRevalidate(300, () => MorningDesk({ areaId: area, date }));
  return withHistoricalFetches(() => MorningDesk({ areaId: area, date }));
}
