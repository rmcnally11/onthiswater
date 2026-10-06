import { getCalendarSnapshot } from "@/lib/calendar";
import { getArea } from "@/lib/data/areas";
import { theaterLabel } from "@/lib/data/theaters";
import { calendarSnapshotYolo } from "@/lib/snapshot-store";
import { MonthGrid } from "@/components/month-grid";
import { YoloBanner } from "@/components/yolo-banner";
import { Waterline } from "@/components/viz/waterline";

export const dynamic = "force-dynamic";

export default async function CalendarCardPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; theater?: string }>;
}) {
  const q = await searchParams;
  const area = getArea(q.area);
  let snap;
  try {
    snap = await getCalendarSnapshot(area, "all");
  } catch {
    snap = null;
  }

  const months = snap?.months ?? null;
  const days = months?.[0]?.days ?? [];
  const yolo = snap ? calendarSnapshotYolo(snap) : null;

  return (
    <article className="box-border w-[1200px] bg-[color:var(--ink)] p-8 text-[color:var(--cream)]">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker text-[color:var(--copper)]">
            On This Water · {theaterLabel(area.theater)} calendar
          </p>
          <h1 className="mt-1 font-heading text-5xl">{area.shortName}</h1>
          <p className="mt-2 text-sm text-[color:var(--cream)]/60">
            This month. Gold outline = amazing dry day. The outline is the best dry day left. Rain
            and t-storm labels are live from this site.
          </p>
        </div>
        <p className="font-heading text-3xl text-[color:var(--cream)]/50">{months?.[0]?.label}</p>
      </header>
      <Waterline className="my-4" />
      {yolo ? (
        <div className="mb-4">
          <YoloBanner
            day={yolo}
            areaId={area.id}
            theater={area.theater}
            activity="all"
            timezone={area.timezone}
          />
        </div>
      ) : null}
      {months ? (
        <MonthGrid
          year={months[0].year}
          month={months[0].month}
          days={days}
          timezone={area.timezone}
          areaId={area.id}
          theater={area.theater}
          activity="all"
        />
      ) : (
        <p className="py-16 text-center font-heading text-2xl text-rose-900">Calendar did not set.</p>
      )}
    </article>
  );
}
