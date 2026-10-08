import { UpcomingStrip } from "@/components/viz/upcoming-strip";
import { buildUpcoming } from "@/lib/calendar";
import { ymdInZone } from "@/lib/time";
import type { ActivityId, Area } from "@/lib/types";

export function UpcomingSkeleton() {
  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
      <p className="kicker text-[color:var(--sea)]">Next two weeks</p>
      <p className="mt-2 text-sm text-[color:var(--cream)]/50">Pulling the 14-day strip…</p>
      <div className="mt-3 flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-36 w-[5.6rem] shrink-0 animate-pulse rounded-2xl bg-[color:var(--cream)]/5" />
        ))}
      </div>
    </div>
  );
}

export async function UpcomingLoader({
  area,
  activity,
}: {
  area: Area;
  activity: ActivityId | "all";
}) {
  let days: Awaited<ReturnType<typeof buildUpcoming>> = [];
  try {
    days = await buildUpcoming(area, activity, ymdInZone(new Date(), area.timezone), 14);
  } catch {
    days = [];
  }
  const hrefBase = `/calendar?area=${area.id}&theater=${area.theater}${activity !== "all" ? `&activity=${activity}` : ""}`;
  return (
    <UpcomingStrip
      days={days}
      timezone={area.timezone}
      hrefBase={hrefBase}
      areaId={area.id}
      theater={area.theater}
      activity={activity}
    />
  );
}
