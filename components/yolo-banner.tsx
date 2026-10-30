import type { CalendarDay } from "@/lib/types";
import { formatYmdLong } from "@/lib/time";
import { briefHref } from "@/lib/hrefs";
import { MoonDisk } from "@/components/viz/moon-disk";
import { scoreHex, scoreInk } from "@/lib/viz";

export function YoloBanner({
  day,
  areaId,
  theater,
  activity,
  timezone,
  hideScore,
}: {
  day: CalendarDay;
  areaId: string;
  theater: string;
  activity: string;
  timezone: string;
  hideScore?: boolean;
}) {
  return (
    <a
      href={briefHref({ areaId, theater, activity, date: day.date })}
      className="flex items-center gap-4 rounded-3xl border border-[color:var(--copper)] bg-[color:var(--ink)] px-5 py-4"
    >
      <MoonDisk
        phase={day.moon.phase}
        illumination={day.moon.illumination}
        size={56}
        uid={`yolo-${day.date}`}
      />
      <div className="min-w-0 flex-1">
        <p className="kicker text-[color:var(--copper)]">Best dry day left this month</p>
        <p className="mt-1 font-heading text-2xl text-[color:var(--cream)]">
          {formatYmdLong(day.date, timezone)}
        </p>
        <p className="mt-1 text-sm text-[color:var(--cream)]/65">
          Best remaining dry day this month with a real wind forecast
          {day.amazing ? " — and it is a book-it dry day." : "."} {day.drivers.join(" · ")}
        </p>
      </div>
      {hideScore ? null : (
        <span
          className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full font-mono text-lg font-semibold sm:flex"
          style={{ background: scoreHex(day.score), color: scoreInk(day.score) }}
        >
          {day.score.toFixed(1)}
        </span>
      )}
    </a>
  );
}
