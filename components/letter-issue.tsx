import { incidentalNoise, recentLetterWeeks, type NewsletterIssue } from "@/lib/newsletter";
import { theaterLabel } from "@/lib/data/fundamentals";
import { ScorePip } from "@/components/score-pip";
import { ScoreRing } from "@/components/viz/score-ring";
import { Waterline } from "@/components/viz/waterline";
import { Badge } from "@/components/ui/badge";
import { RegsStamp } from "@/components/regs-stamp";
import { FeedNotes } from "@/components/feed-notes";
import { GoWhen } from "@/components/go-when";
import { TideCurve } from "@/components/viz/tide-curve";
import { MoonDisk } from "@/components/viz/moon-disk";
import { WindCompass } from "@/components/viz/wind-compass";
import { WindMark } from "@/components/viz/wind-mark";
import type { DeskIssue } from "@/lib/newsletter";
import type { Briefing, TheaterId } from "@/lib/types";
import { THEATER_IDS, THEATER_META } from "@/lib/data/theaters";
import { AREA_BY_ID, waterChipLabel } from "@/lib/data/areas";
import { DESKS } from "@/lib/desks";
import { coastEditionLabel, isAllCoasts } from "@/lib/coasts";
import { scoreHex, scoreInk } from "@/lib/viz";
import { pressureLine } from "@/lib/pressure";
import { LongRecord } from "@/components/long-record";
import { longRecordBay } from "@/lib/data/long-record";

function tideLabel(desk: DeskIssue) {
  const tides = desk.briefing?.conditions.tides;
  if (!tides) return desk.seasonal;
  const stage = tides.stage.replace("-", " ");
  const anomaly =
    tides.anomalyFt != null
      ? `${tides.anomalyFt >= 0 ? "+" : ""}${tides.anomalyFt.toFixed(1)} ft vs the table`
      : null;
  return [stage, anomaly].filter(Boolean).join(" · ");
}

function weatherLine(desk: DeskIssue) {
  const w = desk.briefing?.conditions.weather;
  const water = desk.briefing?.conditions.waterTempF;
  if (!w && water == null) return null;
  const wind =
    w?.windMph != null
      ? `${Math.round(w.windMph)} mph${w.windCardinal ? ` ${w.windCardinal}` : ""}`
      : "wind quiet";
  const temp = water != null ? `${Math.round(water)}°F water` : null;
  const sky =
    w?.wx === "storm"
      ? "thunderstorms"
      : w?.wx === "rain"
        ? w.precipChance != null
          ? `${Math.round(w.precipChance)}% rain`
          : "rain"
        : w?.precipChance != null
          ? `${Math.round(w.precipChance)}% rain`
          : null;
  const glass = w ? pressureLine(w) : null;
  return [wind, sky, temp, glass].filter(Boolean).join(" · ");
}

function DeskCard({ desk, tomorrow }: { desk: DeskIssue; tomorrow?: Briefing | null }) {
  const briefing = desk.briefing;
  const inPlay =
    briefing?.species.filter((s) => s.inPlay && s.species.role === "primary").slice(0, 4) ?? [];
  const window = briefing?.when[0];
  const href = `/?area=${desk.areaId}&theater=${desk.theater}${briefing?.activity && briefing.activity !== "all" ? `&activity=${briefing.activity}` : ""}`;
  const c = briefing?.conditions;

  return (
    <article className="flex flex-col rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="kicker text-[color:var(--copper)]">{desk.desk}</p>
          <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)]">
            {briefing?.area ? waterChipLabel(briefing.area) : theaterLabel(desk.theater)}
          </h2>
          <p className="text-xs text-[color:var(--cream)]/45">{desk.kicker}</p>
        </div>
        {briefing ? (
          <ScoreRing score={briefing.overall} size={88} label="Today" sub={briefing.confidence} />
        ) : (
          <Badge variant="secondary" className="bg-rose-50 text-rose-900">
            Gauge quiet
          </Badge>
        )}
      </div>
      {briefing ? (
        <p className="mt-4 font-heading text-lg leading-snug text-[color:var(--cream)]">{briefing.headline}</p>
      ) : (
        <p className="mt-4 text-sm text-rose-900">{desk.error}</p>
      )}
      <p className="mt-3 text-sm text-[color:var(--cream)]/70">{desk.seasonal}</p>
      {briefing && c ? (
        <>
          <div className="mt-4">
            <FeedNotes area={briefing.area} conditions={c} />
          </div>
          <p className="mt-3 text-sm text-[color:var(--cream)]/65">
            {weatherLine(desk) ?? "Waiting on the station."} · {tideLabel(desk)}
          </p>
          {window ? (
            <p className="mt-2 text-sm text-[color:var(--cream)]/70">
              <span className="text-[color:var(--copper)]">Window. </span>
              {window.label}
              {window.why ? ` — ${window.why}` : ""}
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <WindCompass
              degrees={c.weather.windDirDeg}
              mph={c.weather.windMph}
              gust={c.weather.windGustMph}
              cardinal={c.weather.windCardinal}
              size={110}
            />
            <MoonDisk
              phase={c.moon.phase}
              illumination={c.moon.illumination}
              name={c.moon.name}
              springNeap={c.moon.springNeap}
              size={88}
              uid={`letter-${desk.areaId}`}
            />
          </div>
          <div className="mt-3">
            <TideCurve
              hourly={c.tides.hourly}
              nextHiLo={c.tides.nextHiLo}
              timezone={briefing.area.timezone}
              nowHeight={c.tides.predictedNow}
              stage={c.tides.stage}
              source={c.tides.source}
              station={briefing.area.noaaStation}
              windows={briefing.when}
              height={140}
            />
          </div>
          {tomorrow && briefing.kind === "today" ? (
            <div className="mt-4">
              <GoWhen today={briefing} tomorrow={tomorrow} />
            </div>
          ) : null}
        </>
      ) : null}
      {inPlay.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {inPlay.map((s) => (
            <span key={s.species.id} className="inline-flex items-center gap-1.5">
              <ScorePip score={s.score} />
              <span className="text-xs text-[color:var(--cream)]/70">{s.species.commonName}</span>
            </span>
          ))}
        </div>
      )}
      {c?.hab?.hot ? (
        <p className="mt-3 text-sm text-amber-900">
          <span className="text-[color:var(--copper)]">Red tide. </span>
          {c.hab.level}
          {c.hab.when ? ` · ${c.hab.when}` : ""}. {c.hab.where} Not a bite.
        </p>
      ) : null}
      {(c?.hab?.hot
        ? (briefing?.why.filter((line) => !/K\. brevis|red tide|Karenia/i.test(line)) ?? [])
        : (briefing?.why ?? [])
      )
        .slice(0, 2)
        .map((line) => (
        <p key={line} className="mt-3 text-sm text-[color:var(--cream)]/60">
          — {line}
        </p>
      ))}
      <a
        href={href}
        className="mt-5 text-sm text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40 underline-offset-4"
      >
        Open {briefing?.area ? waterChipLabel(briefing.area) : "this water"}
      </a>
    </article>
  );
}

function letterHref(weekId: string | null, coasts: string) {
  const base = weekId ? `/newsletter/${weekId}` : "/newsletter";
  return `${base}?coasts=${coasts}`;
}

export function LetterIssue({
  issue,
  coasts = null,
  weekPath = false,
  tomorrows = {},
}: {
  issue: NewsletterIssue;
  coasts?: TheaterId[] | null;
  weekPath?: boolean;
  tomorrows?: Record<string, Briefing | null>;
}) {
  const noise = incidentalNoise(issue.month, coasts);
  const liveDesks = issue.desks.filter((d) => d.briefing).length;
  const weeks = recentLetterWeeks();
  const edition = coastEditionLabel(coasts);
  const all = isAllCoasts(coasts);
  const weekBase = weekPath ? issue.weekId : null;
  const seasonHref = all || !coasts?.length ? "/fundamentals" : `/fundamentals?theater=${coasts[0]}`;
  const waterNames = issue.desks
    .map((d) => {
      const area = AREA_BY_ID[d.areaId];
      return area ? waterChipLabel(area) : d.desk.replace(" desk", "");
    })
    .join(", ");
  const letterDeskNames = (coasts ?? [])
    .map((t) => {
      const desk = DESKS.find((d) => d.theater === t);
      const area = desk ? AREA_BY_ID[desk.areaId] : undefined;
      return area ? waterChipLabel(area) : null;
    })
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-10">
      <header className="mx-auto max-w-3xl text-center">
        <p className="kicker text-[color:var(--copper)]">
          Saturday on your water · Vol. 1 · No. {issue.weekNumber}
        </p>
        <h1 className="page-title mt-3 text-[color:var(--cream)]">Saturday on your water.</h1>
        <p className="mt-3 text-sm text-[color:var(--cream)]/55">
          {issue.rangeLabel} · {issue.monthName} fundamentals · {edition} · {liveDesks} of{" "}
          {issue.desks.length} {issue.desks.length === 1 ? "water" : "waters"}
          {issue.frozen ? " · frozen Saturday" : " · this week’s waters"}
        </p>
        <p className="mt-2 text-xs text-[color:var(--cream)]/45">
          Permalink:{" "}
          <a
            className="underline decoration-[color:var(--copper)]/40"
            href={letterHref(issue.weekId, all ? "all" : (coasts ?? THEATER_IDS).join(","))}
          >
            /newsletter/{issue.weekId}
          </a>
        </p>
        <Waterline className="mx-auto mt-4 max-w-xl" />
      </header>

      <nav className="flex flex-wrap justify-center gap-2 text-xs">
        <a
          href={letterHref(weekBase, "all")}
          className={`rounded-full border px-3 py-1 ${
            all
              ? "border-[color:var(--cream)] text-[color:var(--cream)]"
              : "border-[color:var(--line)] text-[color:var(--cream)]/55"
          }`}
        >
          All coasts
        </a>
        {THEATER_META.map((t) => {
          const on = !all && Boolean(coasts?.includes(t.id));
          return (
            <a
              key={t.id}
              href={letterHref(weekBase, t.id)}
              className={`rounded-full border px-3 py-1 ${
                on
                  ? "border-[color:var(--cream)] text-[color:var(--cream)]"
                  : "border-[color:var(--line)] text-[color:var(--cream)]/55"
              }`}
            >
              {t.short}
            </a>
          );
        })}
      </nav>

      <nav className="flex flex-wrap justify-center gap-2 text-xs">
        {weeks.map((week) => (
          <a
            key={week}
            href={letterHref(week, all ? "all" : (coasts ?? THEATER_IDS).join(","))}
            className={`rounded-full border px-3 py-1 ${
              week === issue.weekId
                ? "border-[color:var(--cream)] text-[color:var(--cream)]"
                : "border-[color:var(--line)] text-[color:var(--cream)]/55"
            }`}
          >
            {week}
          </a>
        ))}
      </nav>

      {issue.desks.length > 0 ? (
        <section>
          <p className="kicker text-center text-[color:var(--copper)]">
            This week on your coast
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {issue.desks.map((desk) => {
              const score = desk.briefing?.overall;
              const name = desk.briefing?.area
                ? waterChipLabel(desk.briefing.area)
                : theaterLabel(desk.theater);
              return (
                <a
                  key={`strip-${desk.areaId}`}
                  href={`/?area=${desk.areaId}&theater=${desk.theater}`}
                  className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-heading text-xl text-[color:var(--cream)]">{name}</p>
                    <span className="inline-flex items-center gap-2">
                      <WindMark mph={desk.briefing?.conditions.weather.windMph ?? null} />
                      {score != null ? (
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-semibold"
                          style={{ background: scoreHex(score), color: scoreInk(score) }}
                        >
                          {score.toFixed(0)}
                        </span>
                      ) : (
                        <p className="text-xs text-[color:var(--cream)]/40">quiet</p>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-[color:var(--cream)]/65">
                    {desk.briefing?.headline ?? desk.error ?? desk.kicker}
                  </p>
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      <article className="mx-auto max-w-3xl">
        <p className="font-heading text-2xl leading-snug text-[color:var(--cream)] md:text-3xl">{issue.letter}</p>
        <p className="mt-4 text-sm text-[color:var(--cream)]/50">
          {all
            ? "Drawn from Galveston, Venice, Islamorada, Andros, Ascension, San Juan, and Alphonse — one water per coast. Open a coast chip for every water on that coast — Texas is Sabine through Lower Laguna, not Galveston only."
            : `This edition is ${edition} only — ${waterNames}. Saturday still writes from ${letterDeskNames || "those waters"}. Coasts you did not ask for stay off this letter.`}{" "}
          Scores are 1–10. They are not bite guarantees.{" "}
          <a href={seasonHref} className="text-[color:var(--sea)] underline underline-offset-4">
            The season this month
          </a>
          .
        </p>
      </article>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="kicker text-[color:var(--copper)]">
              {all
                ? "Seven coasts"
                : `${issue.desks.length} ${issue.desks.length === 1 ? "water" : "waters"} · ${edition}`}
            </p>
            <h2 className="font-heading text-3xl text-[color:var(--cream)]">
              {issue.frozen ? "That Saturday" : "This week"}
            </h2>
          </div>
        </div>
        {issue.desks.length === 0 ? (
          <p className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5 text-sm text-[color:var(--cream)]/65">
            No water is on for that coast this week.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {issue.desks.map((desk) => (
              <DeskCard key={desk.areaId} desk={desk} tomorrow={tomorrows[desk.areaId]} />
            ))}
          </div>
        )}
      </section>

      {issue.desks.some((d) => longRecordBay(d.areaId)) ? (
        <LongRecord
          areaId={issue.desks.find((d) => longRecordBay(d.areaId))?.areaId}
          month={issue.month}
          compact
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="kicker text-[color:var(--copper)]">
            Box score · {issue.monthName}
          </p>
          <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)]">In peak this month</h2>
          {issue.peaks.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--cream)]/60">
              No primary species is marked peak this month. Check present fish on the{" "}
              <a href="/fundamentals" className="underline">
                season page
              </a>
              .
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {issue.peaks.map((p) => (
                <li key={p.name}>
                  <p className="font-heading text-lg text-[color:var(--cream)]">{p.name}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--cream)]/40">{p.theaters}</p>
                  <p className="mt-1 text-sm text-[color:var(--cream)]/65">{p.why}</p>
                </li>
              ))}
            </ul>
          )}
          {noise.length > 0 && (
            <p className="mt-4 text-xs text-[color:var(--cream)]/45">Noise, not the headline: {noise.join(", ")}.</p>
          )}
        </article>
        <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="kicker text-[color:var(--copper)]">Rules</p>
          <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)]">Closed or closing</h2>
          {issue.closures.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--cream)]/65">
              No coast-wide harvest closure is on the board this week. Still verify before you keep a fish.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {issue.closures.map((c) => (
                <li key={c.title}>
                  <p className="font-heading text-lg text-[color:var(--copper)]">{c.title}</p>
                  <p className="mt-1 text-sm text-[color:var(--cream)]/70">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
          <a
            href={`${seasonHref}${seasonHref.includes("?") ? "&" : "?"}month=${issue.month}`}
            className="mt-5 inline-block text-sm text-[color:var(--sea)] underline underline-offset-4"
          >
            {issue.monthName} by region, type, and species
          </a>
        </article>
      </section>
      <RegsStamp theater={coasts?.[0] ?? "texas"} />
    </div>
  );
}
