import { buildCalendarRange, getCalendarSnapshot } from "@/lib/calendar";
import { AmazingChip, MonthGrid } from "@/components/month-grid";
import { RhymeStrip } from "@/components/rhyme-strip";
import { YoloBanner } from "@/components/yolo-banner";
import { calendarSnapshotYolo } from "@/lib/snapshot-store";
import { clockParts } from "@/lib/time";
import type { ActivityId, Area } from "@/lib/types";

export function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-3xl bg-[color:var(--panel)]" />
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-[color:var(--panel)]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="mb-3 h-8 w-48 animate-pulse rounded bg-[color:var(--cream)]/8" />
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, j) => (
                <div key={j} className="min-h-[6.4rem] animate-pulse rounded-xl bg-[color:var(--panel)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function CalendarBody({
  area,
  activity,
  year,
  month,
}: {
  area: Area;
  activity: ActivityId | "all";
  year: number;
  month: number;
}) {
  const now = clockParts(new Date(), area.timezone);
  const current = year === now.year && month === now.month;
  let months;
  let yolo;
  try {
    if (current) {
      const snap = await getCalendarSnapshot(area, activity);
      months = snap.months;
      yolo = calendarSnapshotYolo(snap);
    } else {
      months = await buildCalendarRange(area, year, month, activity, 2);
      yolo = months.flatMap((m) => m.days).find((d) => d.yolo) ?? null;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Calendar failed.";
    return <p className="text-rose-800">{message}</p>;
  }

  const amazing = months.flatMap((m) => m.days.filter((d) => d.amazing || d.yolo));

  return (
    <>
      {yolo ? (
        <YoloBanner
          day={yolo}
          areaId={area.id}
          theater={area.theater}
          activity={activity}
          timezone={area.timezone}
        />
      ) : null}
      <RhymeStrip
        areaId={area.id}
        theater={area.theater}
        activity={activity}
        days={months.flatMap((m) => m.days)}
        timezone={area.timezone}
      />
      {amazing.length > 0 && (
        <section className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--copper)]">
            Amazing days on {area.shortName}
          </p>
          <p className="mt-1 text-sm text-[color:var(--cream)]/50">
            Gold is a book-it dry day. Copper is the best dry day left this month. Tap a day for that morning.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {amazing.map((d) => (
              <AmazingChip
                key={d.date}
                day={d}
                areaId={area.id}
                theater={area.theater}
                activity={activity}
                timezone={area.timezone}
              />
            ))}
          </ul>
        </section>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        {months.map((m) => (
          <MonthGrid
            key={`${m.year}-${m.month}`}
            year={m.year}
            month={m.month}
            days={m.days}
            timezone={area.timezone}
            title={m.label}
            areaId={area.id}
            theater={area.theater}
            activity={activity}
          />
        ))}
      </div>
    </>
  );
}
