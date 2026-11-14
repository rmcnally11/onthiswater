import { Suspense } from "react";
import type { Metadata } from "next";
import { getBriefing, parseActivity, parseBriefDate } from "@/lib/briefing";
import { FilterBar } from "@/components/filters";
import { BriefingPanel } from "@/components/briefing-panel";
import { AllWaterLoader, AllWaterSkeleton } from "@/components/all-water-board";
import { UpcomingLoader, UpcomingSkeleton } from "@/components/upcoming-loader";
import { isAllWaterQuery, readWaterPref, resolveDeskForTheater } from "@/lib/prefs";
import { getYoloDay } from "@/lib/calendar";
import { addDaysYmd, ymdInZone } from "@/lib/time";
import { AREA_BY_ID } from "@/lib/data/areas";
import { FieldLetterHeader, PrintSheet, RoomSaltWater } from "@/components/house-art";
import { JsonLd } from "@/components/json-ld";
import {
  faqJsonLd,
  HOME_DESCRIPTION,
  HOME_TITLE,
  ogImageForArea,
  organizationJsonLd,
  pageMeta,
  webAppJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; date?: string }>;
}): Promise<Metadata> {
  const q = await searchParams;
  const area = q.area ? AREA_BY_ID[q.area] : null;
  const date = parseBriefDate(q.date);
  if (area && date) {
    return pageMeta({
      title: `${area.shortName}, ${date} — tide and wind`,
      description: `This morning on ${area.shortName}. Live NOAA tides and wind. Scores are 1–10, not a bite.`,
      path: `/morning/${area.id}/${date}`,
      image: ogImageForArea(area.id),
      imageAlt: `${area.shortName} tide`,
    });
  }
  if (area) {
    return pageMeta({
      title: `${area.shortName} this morning — tide, wind, go or wait`,
      description: `This morning on ${area.shortName}. Live NOAA tides and wind. Scores are 1–10, not a bite.`,
      path: `/morning/${area.id}`,
      image: ogImageForArea(area.id),
      imageAlt: `${area.shortName} tide`,
    });
  }
  return pageMeta({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: "/",
    imageAlt: "A wooden skiff with a small pirate flag on a pastel dawn flat.",
    absoluteTitle: true,
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; activity?: string; theater?: string; date?: string }>;
}) {
  const q = await searchParams;
  const pref = await readWaterPref();
  const date = parseBriefDate(q.date);

  if (isAllWaterQuery(q)) {
    const activity = parseActivity(q.activity);
    return (
      <div className="space-y-6">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={webAppJsonLd()} />
        <JsonLd data={faqJsonLd()} />
        <Suspense>
          <FilterBar areaId={undefined} activity={q.activity ?? activity} theater="all" />
        </Suspense>
        <Suspense fallback={<AllWaterSkeleton />}>
          <AllWaterLoader activity={activity} date={date} />
        </Suspense>
      </div>
    );
  }

  const desk = resolveDeskForTheater(q, pref);
  let briefing;
  let yolo = null;
  let tomorrow = null;
  let error: string | null = null;
  try {
    const todayYmd = date ?? ymdInZone(new Date(), desk.area.timezone);
    const tomorrowYmd = addDaysYmd(todayYmd, 1);
    [briefing, yolo, tomorrow] = await Promise.all([
      getBriefing(desk.area.id, desk.activity, date),
      getYoloDay(desk.area, desk.activity),
      date
        ? Promise.resolve(null)
        : getBriefing(desk.area.id, desk.activity, tomorrowYmd).catch(() => null),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not build the briefing.";
  }

  return (
    <div className="space-y-6">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webAppJsonLd()} />
      <JsonLd data={faqJsonLd()} />
      <Suspense>
        <FilterBar
          areaId={briefing?.area.id ?? desk.area.id}
          activity={q.activity ?? desk.activity}
          theater={q.theater ?? desk.theater}
        />
      </Suspense>
      {error || !briefing ? (
        <div className="space-y-6">
          <PrintSheet />
          <FieldLetterHeader priority />
          <div className="rounded-2xl border border-rose-400/40 bg-rose-50 p-6 text-rose-900">
            <p className="font-heading text-xl">The gauges did not answer.</p>
            <p className="mt-2 text-sm opacity-80">{error}</p>
          </div>
          <RoomSaltWater />
        </div>
      ) : (
        <BriefingPanel
          briefing={briefing}
          yolo={yolo}
          tomorrow={tomorrow}
          upcomingSlot={
            <Suspense fallback={<UpcomingSkeleton />}>
              <UpcomingLoader area={briefing.area} activity={parseActivity(q.activity ?? desk.activity)} />
            </Suspense>
          }
        />
      )}
    </div>
  );
}
