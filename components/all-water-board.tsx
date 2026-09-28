import type { Briefing } from "@/lib/types";
import { DESKS } from "@/lib/desks";
import { theaterLabel } from "@/lib/data/theaters";
import { DockPostedHandoff } from "@/components/dock-posted-handoff";
import { JoinStrip } from "@/components/join-strip";
import { ScoreRing } from "@/components/viz/score-ring";
import { Waterline } from "@/components/viz/waterline";
import { briefHref, morningHref } from "@/lib/hrefs";
import { getBriefing } from "@/lib/briefing";
import { skyCopy } from "@/lib/wx";

type DeskMeta = (typeof DESKS)[number];

export type AllWaterDesk = {
  desk: DeskMeta;
  briefing: Briefing | null;
  error: string | null;
};

export function AllWaterSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <p className="kicker text-[color:var(--copper)]">All water</p>
        <h1 className="home-line mt-3 text-[color:var(--cream)]">This morning on your water.</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--cream)]/65">
          Texas through the Seychelles. Reading the gauges.
        </p>
        <Waterline className="mt-3" />
      </div>
      <JoinStrip />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DESKS.map((desk) => (
          <div
            key={desk.areaId}
            className="h-52 animate-pulse rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)]"
          />
        ))}
      </div>
    </div>
  );
}

export async function AllWaterLoader({
  activity,
  date,
}: {
  activity: string;
  date?: string | null;
}) {
  const desks: AllWaterDesk[] = await Promise.all(
    DESKS.map(async (desk) => {
      try {
        return {
          desk,
          briefing: await getBriefing(desk.areaId, activity, date),
          error: null,
        };
      } catch (e) {
        return {
          desk,
          briefing: null,
          error: e instanceof Error ? e.message : "Gauge quiet.",
        };
      }
    }),
  );
  return <AllWaterBoard desks={desks} activity={activity} date={date} />;
}

function windLine(briefing: Briefing) {
  const w = briefing.conditions.weather;
  const wind =
    w.windMph != null
      ? `${Math.round(w.windMph)} mph${w.windCardinal ? ` ${w.windCardinal}` : ""}`
      : "no wind reading";
  const wet = w.wx === "storm" || w.wx === "rain" || (w.precipChance != null && w.precipChance >= 30);
  const sky = wet ? skyCopy(w.wx, w.precipChance, w.sky) : null;
  const stage = briefing.conditions.tides.stage?.replace("-", " ");
  return [wind, sky, stage].filter(Boolean).join(" · ");
}

export function AllWaterBoard({
  desks,
  activity,
  date,
}: {
  desks: AllWaterDesk[];
  activity: string;
  date?: string | null;
}) {
  const live = desks.filter((d) => d.briefing).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker text-[color:var(--copper)]">
          Seven coasts this morning · {live} of {desks.length} live
        </p>
        <h1 className="home-line mt-3 text-[color:var(--cream)]">This morning on your water.</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--cream)]/65">
          Texas through the Seychelles. Same 1–10. Not a bite. Pick a water. This page is the whole morning.
        </p>
        <Waterline className="mt-3" />
        <DockPostedHandoff compact />
      </div>

      <JoinStrip />

      {live === 0 ? (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-50 p-6 text-rose-900">
          <p className="font-heading text-xl">The gauges did not answer.</p>
          <p className="mt-2 text-sm opacity-80">
            Every coast is quiet. Try a water, or come back in a few minutes.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {desks.map(({ desk, briefing, error }) => {
            const href = briefHref({
              areaId: desk.areaId,
              theater: desk.theater,
              activity,
              date,
            });
            const name = briefing?.area.shortName ?? theaterLabel(desk.theater);
            return (
              <article
                key={desk.areaId}
                className="flex flex-col rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="kicker text-[color:var(--copper)]">{desk.desk}</p>
                    <h2 className="mt-1 font-heading text-lg leading-[1.15] text-[color:var(--cream)] md:text-xl">
                      {name}
                    </h2>
                    <p className="text-xs text-[color:var(--cream)]/45">{desk.kicker}</p>
                  </div>
                  {briefing ? (
                    <ScoreRing
                      score={briefing.overall}
                      size={84}
                      label="Today"
                      sub={briefing.confidence}
                    />
                  ) : null}
                </div>
                {briefing ? (
                  <>
                    <p className="mt-4 font-heading text-lg leading-snug text-[color:var(--cream)]">
                      {briefing.headline}
                    </p>
                    <p className="mt-3 text-sm text-[color:var(--cream)]/65">{windLine(briefing)}</p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-rose-900">{error ?? "Gauge quiet."}</p>
                )}
                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  <a
                    href={href}
                    className="text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40"
                  >
                    Open {name}
                  </a>
                  <a
                    href={morningHref({
                      areaId: desk.areaId,
                      theater: desk.theater,
                      activity,
                    })}
                    className="text-[color:var(--cream)]/55 underline"
                  >
                    The line
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
