"use client";

import type { CalendarDay } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MoonDisk } from "@/components/viz/moon-disk";
import { scoreHex, scoreInk, sea } from "@/lib/viz";
import { briefHref } from "@/lib/hrefs";
import { skyWord } from "@/lib/wx";
import { formatYmdLong } from "@/lib/time";
import { Waterline } from "@/components/viz/waterline";
import { WindMark } from "@/components/viz/wind-mark";
import { bestRhyme, wroteOn } from "@/lib/book";
import { useBook } from "@/lib/book-store";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function TideSpark({ day }: { day: CalendarDay }) {
  const extrema = day.tides.slice(0, 4).map((t) => t.height);
  const heights =
    extrema.length >= 2
      ? extrema
      : day.tideRangeFt != null
        ? [0, day.tideRangeFt]
        : null;
  if (!heights) return null;

  const min = Math.min(...heights);
  const max = Math.max(...heights);
  const span = Math.max(0.25, max - min);
  const w = 56;
  const h = 18;
  const pad = 1.2;
  const samples = 28;
  const last = heights.length - 1;
  const pts: string[] = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const pos = t * last;
    const i0 = Math.floor(pos);
    const i1 = Math.min(last, i0 + 1);
    const mu = (1 - Math.cos((pos - i0) * Math.PI)) / 2;
    const height = heights[i0] * (1 - mu) + heights[i1] * mu;
    const x = pad + t * (w - pad * 2);
    const y = h - pad - ((height - min) / span) * (h - pad * 2);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  const line = `M${pts[0]} ${pts.slice(1).map((p) => `L${p}`).join(" ")}`;
  const area = `${line} L${(w - pad).toFixed(2)},${h} L${pad.toFixed(2)},${h} Z`;
  const fillId = `spark-${day.date}`;

  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="mt-1.5 block"
      aria-hidden
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sea} stopOpacity="0.32" />
          <stop offset="100%" stopColor={sea} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path d={line} fill="none" stroke={sea} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ScoreDot({ score }: { score: number }) {
  return (
    <span
      className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 font-mono text-[10px] font-semibold sm:h-7 sm:min-w-7 sm:text-[11px]"
      style={{ background: scoreHex(score), color: scoreInk(score) }}
    >
      {score.toFixed(1)}
    </span>
  );
}

export function MonthGrid({
  year,
  month,
  days,
  timezone,
  title,
  areaId,
  theater,
  activity,
  hideScores,
}: {
  year: number;
  month: number;
  days: CalendarDay[];
  timezone: string;
  title?: string;
  areaId: string;
  theater: string;
  activity: string;
  hideScores?: boolean;
}) {
  const { book, ready, unlocked } = useBook();
  const catches = ready && unlocked ? book.catches : [];
  const localFirst = new Date(`${year}-${String(month).padStart(2, "0")}-01T12:00:00`);
  const pad = localFirst.getDay();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const copperDays = days.filter((d) => d.amazing || d.yolo).length;
  const astro = days.filter((d) => d.confidence === "astronomical").length;

  return (
    <section className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-3 sm:p-5">
      {title ? (
        <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-heading text-2xl text-[color:var(--cream)] md:text-3xl">{title}</h2>
            <p className="mt-1 text-xs text-[color:var(--cream)]/45">
              {copperDays
                ? `${copperDays} ${copperDays === 1 ? "day" : "days"} to book`
                : "No book-it dry day in this month yet"}
              {astro ? ` · ${astro} tide + moon only` : ""}
            </p>
          </div>
        </header>
      ) : null}
      {title ? <Waterline className="mb-3" /> : null}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.16em] text-[color:var(--cream)]/40 sm:gap-1.5">
        {DOW.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: pad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const n = Number(day.date.slice(-2));
          const past = day.date < today;
          const sky = skyWord(day.wx);
          const wrote = wroteOn(day, catches, areaId);
          const rhyme = wrote.length ? null : bestRhyme(day, catches, areaId);
          return (
            <a
              key={day.date}
              href={briefHref({ areaId, theater, activity, date: day.date })}
              title={
                hideScores
                  ? `${day.date} · ${day.moon.name} · ${day.drivers.join(" · ")}`
                  : `${day.date} · ${day.score} · ${day.moon.name} · ${day.drivers.join(" · ")}`
              }
              className={cn(
                "flex min-h-[6.8rem] flex-col rounded-2xl border bg-[color:var(--ink)] p-1.5 sm:min-h-[8rem] sm:p-2",
                day.yolo
                  ? "border-[color:var(--copper)] shadow-[0_0_0_1px_var(--copper)]"
                  : day.amazing
                    ? "border-[color:var(--gold)] shadow-[0_0_0_1px_var(--gold)]"
                    : wrote.length
                      ? "border-[color:var(--sea)]"
                      : rhyme
                        ? "border-[color:var(--sea)]/55"
                        : "border-[color:var(--line)]",
                day.date === today && "ring-2 ring-[color:var(--cream)] ring-offset-1 ring-offset-[color:var(--panel)]",
                day.confidence === "astronomical" && !day.yolo && !day.amazing && !wrote.length && !rhyme && "border-dashed",
                past && "opacity-55",
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="font-heading text-sm leading-none text-[color:var(--cream)] sm:text-base">{n}</span>
                {hideScores ? null : <ScoreDot score={day.score} />}
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <MoonDisk
                  phase={day.moon.phase}
                  illumination={day.moon.illumination}
                  size={22}
                  uid={day.date}
                  className="!items-start"
                />
                <WindMark mph={day.windMph} />
              </div>
              {sky ? (
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--copper)]">
                  {sky}
                </p>
              ) : null}
              <TideSpark day={day} />
              <div className="mt-auto pt-1">
                {wrote.length ? (
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--sea)]">Book</p>
                ) : rhyme ? (
                  <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-[color:var(--sea)]">
                    Rhyme
                  </p>
                ) : day.yolo ? (
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--copper)]">Dry</p>
                ) : day.amazing ? (
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--gold)]">Go</p>
                ) : day.confidence === "astronomical" ? (
                  <p className="text-[8px] uppercase tracking-wide text-[color:var(--cream)]/30">Moon</p>
                ) : null}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function AmazingChip({
  day,
  areaId,
  theater,
  activity,
  timezone,
  hideScores,
}: {
  day: CalendarDay;
  areaId: string;
  theater: string;
  activity: string;
  timezone: string;
  hideScores?: boolean;
}) {
  return (
    <li>
      <a
        href={briefHref({ areaId, theater, activity, date: day.date })}
        className={cn(
          "flex items-center gap-3 rounded-2xl border bg-[color:var(--ink)] p-3",
          day.yolo
            ? "border-[color:var(--copper)]/50"
            : "border-[color:var(--gold)]/40",
        )}
      >
        <MoonDisk
          phase={day.moon.phase}
          illumination={day.moon.illumination}
          size={44}
          uid={`chip-${day.date}`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg text-[color:var(--cream)]">
            {formatYmdLong(day.date, timezone)}
          </p>
          <p className="truncate text-xs text-[color:var(--cream)]/55">
            {day.yolo ? "Best dry day · " : "Book it · "}
            {day.moon.name} · {day.moon.springNeap}
            {day.tideRangeFt != null ? ` · Δ ${day.tideRangeFt.toFixed(1)} ft` : ""}
            {day.windMph != null ? ` · ${Math.round(day.windMph)} mph` : ""}
          </p>
        </div>
        {hideScores ? null : <ScoreDot score={day.score} />}
      </a>
    </li>
  );
}
