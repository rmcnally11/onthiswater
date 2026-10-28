import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, unstable_rethrow } from "next/navigation";
import { BookPortal } from "@/components/book-portal";
import { FilterBar } from "@/components/filters";
import { parseActivity } from "@/lib/briefing";
import { readWaterPref, resolveDeskForTheater } from "@/lib/prefs";
import { decodeBookField } from "@/lib/safe-decode";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Your book",
  description: "Write the fish. The wind and the tide stay with it.",
  path: "/book",
  index: false,
});

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; activity?: string; theater?: string }>;
}) {
  try {
    const q = await searchParams;
    const area = decodeBookField(q.area);
    const activityParam = decodeBookField(q.activity);
    const theater = decodeBookField(q.theater);
    if (area === null || activityParam === null || theater === null) notFound();
    const pref = await readWaterPref();
    const desk = resolveDeskForTheater({ area, activity: activityParam, theater }, pref);
    const activity = parseActivity(activityParam ?? desk.activity);

    return (
      <div className="space-y-6">
        <Suspense>
          <FilterBar areaId={desk.area.id} activity={activity} theater={theater ?? desk.theater} />
        </Suspense>
        <BookPortal areaId={desk.area.id} theater={desk.theater} activity={activity} />
      </div>
    );
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof URIError) notFound();
    throw error;
  }
}
