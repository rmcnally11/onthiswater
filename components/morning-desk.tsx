import { getBriefing, parseActivity, parseBriefDate } from "@/lib/briefing";
import { GoWhen } from "@/components/go-when";
import { addDaysYmd, ymdInZone } from "@/lib/time";
import { getYoloDay } from "@/lib/calendar";
import { morningLine } from "@/lib/morning";
import { siteOrigin } from "@/lib/brand";
import { CopyLine } from "@/components/copy-line";
import { YoloBanner } from "@/components/yolo-banner";
import { DockPostedHandoff } from "@/components/dock-posted-handoff";
import { CavalierHandoff } from "@/components/cavalier-handoff";
import { Waterline } from "@/components/viz/waterline";
import { ScoreRing } from "@/components/viz/score-ring";
import { JsonLd } from "@/components/json-ld";
import { briefHref, calendarHref, morningHref } from "@/lib/hrefs";
import { DESKS } from "@/lib/desks";
import { AREA_BY_ID, areasInTheater } from "@/lib/data/areas";
import { theaterLabel, THEATER_META } from "@/lib/data/theaters";
import { cn } from "@/lib/utils";
import { breadcrumbJsonLd, reportJsonLd } from "@/lib/seo";
import type { Briefing } from "@/lib/types";
import { notFound } from "next/navigation";

export async function MorningDesk({
  areaId,
  activity: activityRaw,
  date: dateRaw,
}: {
  areaId: string;
  activity?: string;
  date?: string | null;
}) {
  const area = AREA_BY_ID[areaId];
  if (!area) notFound();

  const activity = parseActivity(activityRaw);
  const date = parseBriefDate(dateRaw);
  const coast = areasInTheater(area.theater);
  const todayYmd = date ?? ymdInZone(new Date(), area.timezone);
  const tomorrowYmd = addDaysYmd(todayYmd, 1);
  let briefing: Briefing | null = null;
  let yolo = null;
  let tomorrow: Briefing | null = null;
  let coastBriefs: PromiseSettledResult<Briefing>[] = [];
  let error: string | null = null;
  try {
    const loaded = await Promise.all([
      getBriefing(area.id, activity, date),
      getYoloDay(area, activity),
      date
        ? Promise.resolve(null)
        : getBriefing(area.id, activity, tomorrowYmd).catch(() => null),
      Promise.allSettled(
        coast.filter((a) => a.id !== area.id).map((a) => getBriefing(a.id, activity, date)),
      ),
    ]);
    briefing = loaded[0];
    yolo = loaded[1];
    tomorrow = loaded[2];
    coastBriefs = loaded[3];
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not build the briefing.";
  }

  if (error || !briefing) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-rose-400/40 bg-rose-50 p-6 text-rose-900">
          <p className="font-heading text-xl">The gauges did not answer.</p>
          <p className="mt-2 text-sm opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  const line = morningLine(briefing, yolo);
  const neighbors = coast
    .filter((a) => a.id !== area.id)
    .map((neighbor, i) => {
      const result = coastBriefs[i];
      return {
        area: neighbor,
        briefing: result.status === "fulfilled" ? result.value : null,
      };
    });
  const path = date ? `/morning/${area.id}/${date}` : `/morning/${area.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <JsonLd
        data={reportJsonLd({
          headline: `This morning on ${briefing.area.shortName}`,
          description: line,
          path,
          date: todayYmd,
          placeName: briefing.area.name,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "On This Water", path: "/" },
          { name: theaterLabel(briefing.area.theater), path: `/${briefing.area.theater}` },
          { name: briefing.area.shortName, path },
        ])}
      />
      <div>
        <p className="kicker text-[color:var(--copper)]">
          {theaterLabel(briefing.area.theater)} · {briefing.area.shortName}
        </p>
        <h1 className="page-title mt-3 text-[color:var(--cream)]">
          This morning on {briefing.area.shortName}.
        </h1>
        <p className="mt-2 text-sm text-[color:var(--cream)]/65">
          Copy it. Send it. The rest of that coast is named underneath.
        </p>
        <Waterline className="mt-3" />
        <DockPostedHandoff theater={briefing.area.theater} areaId={briefing.area.id} />
      </div>

      <nav className="flex flex-wrap gap-1.5">
        {THEATER_META.map((t) => {
          const lead = DESKS.find((d) => d.theater === t.id)?.areaId ?? briefing.area.id;
          const on = briefing.area.theater === t.id;
          return (
            <a
              key={t.id}
              href={morningHref({
                areaId: on ? briefing.area.id : lead,
                theater: t.id,
                activity: briefing.activity,
              })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em]",
                on
                  ? "border-[color:var(--sea)] bg-[color:var(--sea)]/20 text-[color:var(--cream)]"
                  : "border-[color:var(--line)] text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]",
              )}
            >
              {t.short}
            </a>
          );
        })}
      </nav>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {coast.map((a) => (
          <a
            key={a.id}
            href={morningHref({
              areaId: a.id,
              theater: a.theater,
              activity: briefing.activity,
              date,
            })}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-sm",
              a.id === briefing.area.id
                ? "bg-[color:var(--cream)] text-[color:var(--ink)]"
                : "bg-[color:var(--cream)]/5 text-[color:var(--cream)]/70 hover:bg-[color:var(--cream)]/10",
            )}
          >
            {a.shortName}
          </a>
        ))}
      </div>

      <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--copper)]">
              {briefing.area.name}
            </p>
            <p className="mt-2 font-heading text-3xl leading-snug text-[color:var(--cream)]">{line}</p>
          </div>
          <ScoreRing score={briefing.overall} size={88} label={briefing.kind === "today" ? "Today" : "Day"} />
        </div>
        <div className="mt-5">
          <CopyLine
            text={line}
            url={`${siteOrigin()}${morningHref({
              areaId: briefing.area.id,
              theater: briefing.area.theater,
              activity: briefing.activity,
              date,
            })}`}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <a
            href={briefHref({
              areaId: briefing.area.id,
              theater: briefing.area.theater,
              activity: briefing.activity,
              date,
            })}
            className="text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40"
          >
            The gauges
          </a>
          <a
            href={calendarHref({
              areaId: briefing.area.id,
              theater: briefing.area.theater,
              activity: briefing.activity,
            })}
            className="text-[color:var(--cream)]/60 underline"
          >
            Best dry day
          </a>
        </div>
      </article>

      {tomorrow && briefing.kind === "today" ? (
        <>
          <GoWhen today={briefing} tomorrow={tomorrow} />
          <CavalierHandoff theater={briefing.area.theater} />
        </>
      ) : (
        <CavalierHandoff theater={briefing.area.theater} />
      )}

      {yolo ? (
        <YoloBanner
          day={yolo}
          areaId={briefing.area.id}
          theater={briefing.area.theater}
          activity={briefing.activity}
          timezone={briefing.area.timezone}
        />
      ) : null}

      {neighbors.length > 0 ? (
        <section>
          <p className="kicker text-[color:var(--copper)]">
            {theaterLabel(briefing.area.theater)}
          </p>
          <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)]">Also this morning</h2>
          <ul className="mt-4 space-y-3">
            {neighbors.map(({ area: neighbor, briefing: other }) => (
              <li key={neighbor.id}>
                <a
                  href={morningHref({
                    areaId: neighbor.id,
                    theater: neighbor.theater,
                    activity: briefing.activity,
                    date,
                  })}
                  className="block rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--cream)]/45">
                    {neighbor.shortName}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--cream)]/80">
                    {other ? morningLine(other) : `${neighbor.shortName} is quiet. The gauge did not answer.`}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
