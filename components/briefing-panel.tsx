import type { ReactNode } from "react";
import type { Briefing, CalendarDay } from "@/lib/types";
import { FeedNotes } from "@/components/feed-notes";
import { GoWhen } from "@/components/go-when";
import { coastExpected } from "@/lib/feeds";
import { salinityCoast, salinitySiteFor } from "@/lib/salinity";
import { riverSiteFor } from "@/lib/rivers";
import { habCovers } from "@/lib/hab";
import { sargassumCovers } from "@/lib/sargassum";
import { buoyForArea } from "@/lib/data/buoys";
import { regulationFor } from "@/lib/data/species";
import { theaterLabel } from "@/lib/data/theaters";
import { isKeysFlorida } from "@/lib/data/theaters";
import { ScorePip } from "@/components/score-pip";
import { ScoreRing } from "@/components/viz/score-ring";
import { MoonDisk } from "@/components/viz/moon-disk";
import { WindCompass } from "@/components/viz/wind-compass";
import { TideCurve } from "@/components/viz/tide-curve";
import { TempBar } from "@/components/viz/temp-bar";
import { UpcomingStrip } from "@/components/viz/upcoming-strip";
import { Waterline } from "@/components/viz/waterline";
import { WindTable } from "@/components/wind-table";
import { RegsStamp } from "@/components/regs-stamp";
import { CopyLine } from "@/components/copy-line";
import { YoloBanner } from "@/components/yolo-banner";
import { formatInZone, formatYmdLong, parseNoaaGmt } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { morningLine } from "@/lib/morning";
import { briefHref, compareHref, morningHref } from "@/lib/hrefs";
import { neighborArea } from "@/lib/data/areas";
import { skyCopy } from "@/lib/wx";
import { pressureInHg, pressureTrendWord } from "@/lib/pressure";
import { LongRecord } from "@/components/long-record";
import { longRecordBay } from "@/lib/data/long-record";
import { DockPostedHandoff } from "@/components/dock-posted-handoff";
import { LogCatchLaunch } from "@/components/log-catch";
import { logContextFromBriefing } from "@/lib/book";

function tideClock(stamp: string, tz: string) {
  const d = stamp.includes("T") ? new Date(stamp) : parseNoaaGmt(stamp);
  return formatInZone(d, tz, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export function BriefingPanel({
  briefing,
  upcoming,
  upcomingSlot,
  yolo,
  tomorrow,
}: {
  briefing: Briefing;
  upcoming?: CalendarDay[];
  upcomingSlot?: ReactNode;
  yolo?: CalendarDay | null;
  tomorrow?: Briefing | null;
}) {
  const { area, conditions } = briefing;
  const calHref = `/calendar?area=${area.id}&theater=${area.theater}${briefing.activity !== "all" ? `&activity=${briefing.activity}` : ""}`;
  const neighbor = neighborArea(area);
  const line = morningLine(briefing, yolo);
  const gulf = area.theater === "texas" || area.theater === "louisiana";
  const buoyMeta = buoyForArea(area.id);
  const riverMeta = riverSiteFor(area.id);
  const saltMeta = salinitySiteFor(area.id);
  const showTable =
    gulf || (conditions.tides.anomalyFt != null && Math.abs(conditions.tides.anomalyFt) >= 0.25);

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)]">
        <Waterline />
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-7">
          <div>
            <p className="kicker text-[color:var(--copper)]">
              {theaterLabel(area.theater)} ·{" "}
              {area.name}
            </p>
            <h1 className="page-title mt-3 text-[color:var(--cream)]">
              {briefing.headline}
            </h1>
            <p className="mt-4 max-w-2xl text-[color:var(--cream)]/70">{area.summary}</p>
            {briefing.warnings.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm text-amber-800">
                {briefing.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <FeedNotes area={area} conditions={conditions} />
            </div>
          </div>
            <ScoreRing
            score={briefing.overall}
            size={148}
            label={briefing.kind === "today" ? "Today" : briefing.kind === "forecast" ? "Forecast" : "Tide + moon"}
            sub={`${briefing.confidence} confidence`}
          />
        </div>
        {briefing.kind !== "today" && (
          <div className="border-t border-[color:var(--line)] px-5 py-3 text-sm text-[color:var(--cream)]/70 md:px-7">
            Forecast brief for {formatYmdLong(briefing.forDate, area.timezone)}.{" "}
            <a className="underline decoration-[color:var(--copper)]/40" href={briefHref({ areaId: area.id, theater: area.theater, activity: briefing.activity })}>
              Back to this morning
            </a>
          </div>
        )}
        <div className="border-t border-[color:var(--line)] px-5 py-4 md:px-7">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--copper)]">The line</p>
          <p className="mt-2 font-heading text-xl leading-snug text-[color:var(--cream)]">{line}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CopyLine text={line} />
            <LogCatchLaunch context={logContextFromBriefing(briefing)} />
          </div>
          <DockPostedHandoff theater={area.theater} areaId={area.id} compact />
        </div>
        <div className="border-t border-[color:var(--line)] px-3 py-4 md:px-6">
          <TideCurve
            hourly={conditions.tides.hourly}
            nextHiLo={conditions.tides.nextHiLo}
            timezone={area.timezone}
            nowHeight={conditions.tides.predictedNow}
            stage={conditions.tides.stage}
            source={conditions.tides.source}
            station={area.noaaStation}
            windows={briefing.when}
            height={190}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Instrument
          label="Wind"
          source={
            conditions.buoy
              ? `${conditions.weather.source.toUpperCase()} · NDBC ${conditions.buoy.id}`
              : conditions.weather.source.toUpperCase()
          }
        >
          <WindCompass
            degrees={conditions.weather.windDirDeg}
            mph={conditions.weather.windMph}
            gust={conditions.weather.windGustMph}
            cardinal={conditions.weather.windCardinal}
            size={156}
          />
        </Instrument>
        {conditions.buoy ? (
          <Instrument
            label={conditions.buoy.kind === "buoy" ? "Buoy" : "NDBC station"}
            source={`NDBC ${conditions.buoy.id}`}
          >
            <p className="font-heading text-2xl leading-tight text-[color:var(--cream)]">
              {conditions.buoy.windMph != null
                ? `${Math.round(conditions.buoy.windMph)} mph ${conditions.buoy.windCardinal ?? ""}`
                : "No wind report"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--cream)]/65">
              {conditions.buoy.name}
              {conditions.buoy.waveFt != null ? ` · ${conditions.buoy.waveFt.toFixed(1)} ft seas` : ""}
              {conditions.buoy.waterTempF != null ? ` · SST ${conditions.buoy.waterTempF.toFixed(0)}°F` : ""}
              {conditions.buoy.pressureMb != null ? ` · ${Math.round(conditions.buoy.pressureMb)} mb` : ""}
            </p>
            <p className="mt-3 text-xs text-[color:var(--cream)]/45">{conditions.buoy.where}</p>
            <a
              className="mt-2 inline-block text-xs text-[color:var(--copper)] underline decoration-[color:var(--copper)]/40"
              href={conditions.buoy.href}
              target="_blank"
              rel="noreferrer"
            >
              NDBC {conditions.buoy.id}
            </a>
          </Instrument>
        ) : (
          <Instrument label="Buoy" source={buoyMeta ? `NDBC ${buoyMeta.id}` : "No station"}>
            <p className="font-heading text-2xl leading-tight text-[color:var(--cream)]">
              {buoyMeta ? "Quiet" : "None"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--cream)]/65">
              {buoyMeta
                ? `${buoyMeta.name} did not report. Witness only — not the tide clock.`
                : "No honest NDBC or C-MAN near this water. Do not invent a buoy."}
            </p>
          </Instrument>
        )}
        <Instrument
          label="Sky"
          source={
            conditions.weather.precipChance != null
              ? `${Math.round(conditions.weather.precipChance)}% rain`
              : conditions.weather.source.toUpperCase()
          }
        >
          <p className="font-heading text-3xl leading-tight text-[color:var(--cream)]">
            {conditions.weather.wx === "storm"
              ? "Storms"
              : conditions.weather.wx === "rain"
                ? "Rain"
                : conditions.weather.wx === "clouds"
                  ? "Clouds"
                  : conditions.weather.wx === "clear"
                    ? "Clear"
                    : "No sky reading"}
          </p>
          <p className="mt-2 text-sm text-[color:var(--cream)]/65">
            {skyCopy(conditions.weather.wx, conditions.weather.precipChance, conditions.weather.sky)}
          </p>
            <p className="mt-3 text-xs text-[color:var(--cream)]/45">
            {conditions.weather.wx === "storm"
              ? "Lightning is a stay-tied call."
              : conditions.weather.wx === "rain"
                ? "Sight water goes blind. A marsh still fishes a shower."
                : "A 20% shower chance is not a cancel. A soaker is."}
          </p>
        </Instrument>
        <Instrument
          label="Glass"
          source={conditions.weather.pressureCite ?? "No barometer"}
        >
          <p className="font-heading text-3xl leading-tight text-[color:var(--cream)]">
            {pressureInHg(conditions.weather.pressureMb) != null
              ? `${pressureInHg(conditions.weather.pressureMb)?.toFixed(2)} inHg`
              : "—"}
          </p>
          <p className="mt-2 text-sm text-[color:var(--cream)]/65">
            {conditions.weather.pressureMb != null
              ? `${Math.round(conditions.weather.pressureMb)} mb · ${pressureTrendWord(conditions.weather.pressureTrendMb)}`
              : "No live or modeled glass on this desk."}
          </p>
          <p className="mt-3 text-xs text-[color:var(--cream)]/45">
            {conditions.weather.pressureSource === "open-meteo"
              ? "Modeled mean sea level. Not a dock barometer. The glass is not a bite."
              : "Three-hour change on this station. The glass is not a bite."}
          </p>
        </Instrument>
        <Instrument
          label="Moon"
          source={`${Math.round(conditions.moon.illumination * 100)}% lit`}
        >
          <MoonDisk
            phase={conditions.moon.phase}
            illumination={conditions.moon.illumination}
            name={conditions.moon.name}
            springNeap={conditions.moon.springNeap}
            size={120}
          />
        </Instrument>
        <Instrument label="Water" source={conditions.waterTempSource ?? "No gauge"}>
          <TempBar
            tempF={conditions.waterTempF}
            detail={
              conditions.tides.rangeTodayFt != null
                ? `Today’s range ${conditions.tides.rangeTodayFt.toFixed(1)} ft`
                : undefined
            }
          />
          <p className="mt-4 text-center font-heading text-2xl capitalize text-[color:var(--cream)]">
            {conditions.tides.stage.replace("-", " ")}
          </p>
          <p className="text-center text-[11px] text-[color:var(--cream)]/45">
            {conditions.tides.predictedNow != null
              ? `${conditions.tides.predictedNow.toFixed(2)} ft ${conditions.tides.source === "noaa" ? "MLLW" : "modeled"}`
              : conditions.tides.source}
          </p>
        </Instrument>
        {coastExpected(area) ? (
          <Instrument
            label="Coast"
            source={[conditions.hab?.source, conditions.sargassum?.source, conditions.salinity ? "USGS" : null]
              .filter(Boolean)
              .join(" · ") || "No live coast layer"}
          >
            {conditions.hab ? (
              <p className="text-sm text-[color:var(--cream)]/80">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--cream)]/40">
                  K. brevis
                </span>
                <br />
                {conditions.hab.level}
                {conditions.hab.hot && conditions.hab.when ? ` · ${conditions.hab.when}` : ""}
                <br />
                <span className="text-xs text-[color:var(--cream)]/55">{conditions.hab.where}</span>
                <br />
                <a
                  className="text-xs text-[color:var(--copper)] underline decoration-[color:var(--copper)]/40"
                  href={conditions.hab.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {conditions.hab.source}
                </a>
              </p>
            ) : habCovers(area) ? (
              <p className="text-sm text-amber-900">
                Red-tide check failed. That is not all-clear — open the agency page before you wade.
              </p>
            ) : null}
            {conditions.sargassum ? (
              <p className={`text-sm text-[color:var(--cream)]/80 ${conditions.hab || habCovers(area) ? "mt-3" : ""}`}>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--cream)]/40">
                  Sargassum
                </span>
                <br />
                {conditions.sargassum.level}
                <br />
                <span className="text-xs text-[color:var(--cream)]/55">{conditions.sargassum.note}</span>
                <br />
                <a
                  className="text-xs text-[color:var(--copper)] underline decoration-[color:var(--copper)]/40"
                  href={conditions.sargassum.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  NOAA SIR
                </a>
                {" · "}
                <a
                  className="text-xs text-[color:var(--copper)] underline decoration-[color:var(--copper)]/40"
                  href={conditions.sargassum.bulletinHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  USF SaWS
                </a>
              </p>
            ) : sargassumCovers(area) ? (
              <p className={`text-sm text-amber-900 ${conditions.hab || habCovers(area) ? "mt-3" : ""}`}>
                Sargassum check failed. Not a GPS pin. Not all-clear.
              </p>
            ) : null}
            {conditions.salinity ? (
              <p className={`text-sm text-[color:var(--cream)]/80 ${conditions.hab || conditions.sargassum || habCovers(area) || sargassumCovers(area) ? "mt-3" : ""}`}>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--cream)]/40">
                  Salinity / color
                </span>
                <br />
                {conditions.salinity.ppt.toFixed(conditions.salinity.ppt < 10 ? 1 : 0)} ppt · {conditions.salinity.color}
                <br />
                <span className="text-xs text-[color:var(--cream)]/55">{conditions.salinity.name}</span>
                <br />
                <a
                  className="text-xs text-[color:var(--copper)] underline decoration-[color:var(--copper)]/40"
                  href={conditions.salinity.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  USGS {conditions.salinity.site}
                </a>
              </p>
            ) : salinityCoast(area.theater) ? (
              <p className={`text-sm text-[color:var(--cream)]/55 ${conditions.hab || conditions.sargassum || habCovers(area) || sargassumCovers(area) ? "mt-3" : ""}`}>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--cream)]/40">
                  Salinity / color
                </span>
                <br />
                {saltMeta
                  ? `${saltMeta.name} is quiet or stale. Not a color reading.`
                  : "No USGS 00480 well on this desk. Do not borrow another bay’s river."}
              </p>
            ) : null}
          </Instrument>
        ) : null}
        {conditions.river ? (
          <Instrument label="River" source={`USGS ${conditions.river.site}`}>
            <p className="font-heading text-3xl leading-tight text-[color:var(--cream)]">
              {Math.round(conditions.river.cfs).toLocaleString()}{" "}
              <span className="text-lg font-sans text-[color:var(--cream)]/55">cfs</span>
            </p>
            <p className="mt-2 text-sm text-[color:var(--cream)]/65">{conditions.river.name}</p>
            <p className="mt-3 text-xs text-[color:var(--cream)]/45">
              {conditions.river.high
                ? "High — coffee-colored water is the story. Not a secret hole."
                : "Discharge into this bay. High water stains the flat."}
            </p>
            <a
              className="mt-2 inline-block text-xs text-[color:var(--copper)] underline decoration-[color:var(--copper)]/40"
              href={`https://waterdata.usgs.gov/monitoring-location/${conditions.river.site}/`}
              target="_blank"
              rel="noreferrer"
            >
              USGS {conditions.river.site}
            </a>
          </Instrument>
        ) : area.theater === "texas" || area.theater === "louisiana" ? (
          <Instrument label="River" source={riverMeta ? `USGS ${riverMeta.site}` : "No gauge"}>
            <p className="font-heading text-2xl leading-tight text-[color:var(--cream)]">
              {riverMeta ? "Quiet" : "No gauge"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--cream)]/65">
              {riverMeta
                ? `${riverMeta.river} did not answer. Not a color reading.`
                : "No USGS discharge gauge on this desk. Wind and the table still tell the color story."}
            </p>
          </Instrument>
        ) : null}
        {showTable ? (
          <Instrument label="Wind vs table" source={conditions.tides.source === "noaa" ? "Observed − predicted" : "No live gauge"}>
            <WindTable
              anomalyFt={conditions.tides.anomalyFt}
              series={conditions.tides.anomalySeries}
              theater={area.theater}
            />
          </Instrument>
        ) : null}
        <Instrument label="Clock" source={area.noaaStation ? `NOAA ${area.noaaStation}` : "Modeled M2"}>
          <ul className="space-y-2 text-sm">
            {conditions.tides.nextHiLo.slice(0, 5).map((t) => (
              <li key={t.time} className="flex items-center justify-between gap-2 text-[color:var(--cream)]/85">
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${t.type === "H" ? "bg-[color:var(--cream)]" : "bg-[color:var(--copper)]"}`}
                  />
                  {t.type === "H" ? "High" : "Low"}
                </span>
                <span className="font-mono text-[12px]">
                  {tideClock(t.time, area.timezone)} · {t.height.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          {conditions.tides.source === "modeled" && (
            <p className="mt-3 text-xs text-amber-800">
              {area.theater === "mexico"
                ? "Mexico tides are modeled from lunar M2. Use them for windows, not a bar crossing. There is no NOAA gauge here."
                : area.theater === "seychelles"
                  ? "Seychelles tides are modeled from lunar M2. Use them for windows, not a bar crossing. There is no NOAA gauge on these atolls."
                  : area.theater === "azores"
                    ? "Azores tides are modeled from lunar M2. Use them for windows, not a bar crossing. There is no NOAA gauge on these islands."
                    : "Bahamas tides are modeled from lunar M2. Use them for windows, not a bar crossing."}
            </p>
          )}
        </Instrument>
      </section>

      {conditions.tides.anomalyFt != null && Math.abs(conditions.tides.anomalyFt) >= 0.25 && !showTable && (
        <p className="rounded-2xl border border-[color:var(--copper)]/40 bg-[color:var(--copper)]/10 px-4 py-3 text-sm text-[color:var(--cream)]/85">
          Wind versus the table: observed water is{" "}
          <strong>
            {conditions.tides.anomalyFt > 0 ? "+" : ""}
            {conditions.tides.anomalyFt.toFixed(2)} ft
          </strong>{" "}
          from the NOAA prediction. Read the water, not just the printout.
        </p>
      )}

      {tomorrow && briefing.kind === "today" ? <GoWhen today={briefing} tomorrow={tomorrow} /> : null}

      {yolo ? (
        <YoloBanner
          day={yolo}
          areaId={area.id}
          theater={area.theater}
          activity={briefing.activity}
          timezone={area.timezone}
        />
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href={compareHref({ a: area.id, b: neighbor.id, activity: briefing.activity, date: briefing.kind === "today" ? null : briefing.forDate })}
          className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-[color:var(--cream)]/75 hover:text-[color:var(--cream)]"
        >
          Stay or drive · {area.shortName} vs {neighbor.shortName}
        </a>
        <a
          href={calHref}
          className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-[color:var(--cream)]/75 hover:text-[color:var(--cream)]"
        >
          Open the calendar
        </a>
        <a
          href={morningHref({ areaId: area.id, theater: area.theater, activity: briefing.activity })}
          className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-[color:var(--cream)]/75 hover:text-[color:var(--cream)]"
        >
          Morning dispatch
        </a>
      </div>

      {upcomingSlot}
      {upcoming && upcoming.length > 0 ? (
        <UpcomingStrip days={upcoming} timezone={area.timezone} hrefBase={calHref} />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-heading text-2xl text-[color:var(--cream)]">Where</h2>
          <p className="text-sm text-[color:var(--cream)]/55">
            This pip is that mark on this tide — not the day on the ring.
          </p>
          {briefing.where.length === 0 ? (
            <p className="text-[color:var(--cream)]/55">No marks match this method on this water.</p>
          ) : (
            <ul className="space-y-3">
              {briefing.where.map((pick) => (
                <li key={pick.spot.id} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[color:var(--cream)]">
                        <a
                          href={`/map?area=${area.id}&theater=${area.theater}${briefing.activity !== "all" ? `&activity=${briefing.activity}` : ""}`}
                          className="underline decoration-[color:var(--sea)]/40 underline-offset-4 hover:text-[color:var(--sea)]"
                        >
                          {pick.spot.name}
                        </a>
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[color:var(--cream)]/40">
                        {pick.spot.habitat.replaceAll("-", " ")} · {pick.spot.source.replaceAll("-", " ")} · {pick.spot.depth}
                      </p>
                    </div>
                    <ScorePip score={pick.score} />
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--cream)]/70">{pick.spot.note}</p>
                  {pick.spot.gnisId ? (
                    <p className="mt-1 text-xs text-[color:var(--cream)]/40">
                      USGS GNIS{" "}
                      <a
                        className="underline decoration-[color:var(--copper)]/40"
                        href={`https://edits.nationalmap.gov/apps/gaz-domestic/public/search/names/${pick.spot.gnisId}`}
                      >
                        {pick.spot.gnisId}
                      </a>
                    </p>
                  ) : null}
                  <ul className="mt-2 space-y-1 text-sm text-[color:var(--cream)]/55">
                    {pick.why.map((w) => (
                      <li key={w}>— {w}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {pick.spot.activities.map((a) => (
                      <Badge key={a} variant="secondary" className="bg-[color:var(--cream)]/5 text-[color:var(--cream)]/70">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-4">
          <h2 className="font-heading text-2xl text-[color:var(--cream)]">When</h2>
          <p className="text-sm text-[color:var(--cream)]/55">
            When to go is moving water in a good hour — not the day. First light and last light
            are named when the hour is the story. Today’s ring mixes the best mark, the lead fish,
            and the best window, then taxes the sky. A strong incoming can sit under a weak day if
            the wind or the fish is off. Calendar cells are a third recipe: range, moon, and the
            day’s forecast.
          </p>
          <ul className="space-y-2">
            {briefing.when.length === 0 ? (
              <li className="text-sm text-[color:var(--cream)]/55">
                No strong moving-water window in the next couple of days — slack-heavy, or stay home.
              </li>
            ) : (
              briefing.when.map((w) => (
                <li key={w.start} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[color:var(--cream)]">{w.label}</p>
                    <ScorePip score={w.score} />
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--cream)]/50">
                    {tideClock(w.start, area.timezone)} → {tideClock(w.end, area.timezone)}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--cream)]/65">{w.why}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {longRecordBay(area.id) ? (
        <LongRecord areaId={area.id} month={Number(briefing.forDate.slice(5, 7))} />
      ) : null}

      {(briefing.access.length > 0 || briefing.legal.length > 0) && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="font-heading text-2xl text-[color:var(--cream)]">Launch and beach access</h2>
            <p className="mt-1 text-xs text-[color:var(--cream)]/45">
              {area.theater === "texas"
                ? "Cited to TPWD, Texas GLO beach-access plans, and NPS. 2WD/4WD is the county plan, not a guess."
                : area.theater === "louisiana"
                  ? "Cited to LDWF ramp lists and Louisiana State Parks. Parish rules shift after a blow."
                  : area.theater === "florida"
                    ? "County and state ramps near this water. FKNMS no-take is Keys-only, on the legal list."
                    : area.theater === "mexico"
                      ? "Lodge towns and cited marinas. CONAPESCA license. Biosphere and park water is not a freelance wade."
                      : area.theater === "puerto-rico"
                        ? "Cited village and harbor launches. DNER rules. Reserves are marked."
                        : area.theater === "seychelles"
                          ? "Lodge and Victoria doors. SFA license. Outer atolls are not a freelance wade."
                          : area.theater === "north-carolina"
                            ? "Cited NCDMF and county ramps. Cape Hatteras National Seashore rules on the Banks. Confirm after a blow."
                            : area.theater === "south-carolina"
                              ? "Cited SCDNR and town landings. County ramps shift after a blow."
                              : area.theater === "azores"
                                ? "Cited marina doors. Regional rules. Princess Alice is a run, not a freelance wade."
                                : "Settlement and lodge launches. There is no TPWD-style ramp inventory on this island."}
            </p>
            {briefing.access.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--cream)]/55">No public access pin in this box.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {briefing.access.map((p) => (
                  <li key={p.id} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-3">
                    <p className="font-medium text-[color:var(--cream)]">{p.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[color:var(--cream)]/40">{p.source}</p>
                    <p className="mt-1 text-sm text-[color:var(--cream)]/65">{p.detail}</p>
                    <a className="mt-2 inline-block text-xs text-[color:var(--copper)] underline" href={p.sourceUrl}>
                      Official source
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="font-heading text-2xl text-[color:var(--cream)]">Legal water</h2>
            <p className="mt-1 text-xs text-[color:var(--cream)]/45">
              {isKeysFlorida(area.id)
                ? "NOAA FKNMS management zones — Sanctuary Preservation Areas, Ecological Reserves, Research-Only."
                : "No-take and closed water cited to the agency that owns it. Only the Keys box is FKNMS."}
            </p>
            {briefing.legal.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--cream)]/55">
                No FKNMS polygon in this box. Mainland Florida, Louisiana, Texas, Mexico, and the Bahamas are not Keys sanctuary closures.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {briefing.legal.map((p) => (
                  <li key={p.id} className="rounded-2xl border border-rose-400/40 bg-rose-50 p-3">
                    <p className="font-medium text-[color:var(--cream)]">{p.name}</p>
                    <p className="mt-1 text-sm text-rose-900/80">{p.detail}</p>
                    <a className="mt-2 inline-block text-xs text-[color:var(--copper)] underline" href={p.sourceUrl}>
                      FKNMS GIS
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {briefing.extraLegal ? (
              <p className="mt-2 text-xs text-[color:var(--cream)]/45">
                + {briefing.extraLegal} more zones on the{" "}
                <a className="underline decoration-[color:var(--copper)]/50" href={`/map?area=${area.id}&theater=${area.theater}${briefing.activity !== "all" ? `&activity=${briefing.activity}` : ""}`}>
                  map
                </a>
                .
              </p>
            ) : null}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-heading text-2xl text-[color:var(--cream)]">Why — and who</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-[color:var(--cream)]/70">
          {briefing.why.map((w) => (
            <li key={w}>— {w}</li>
          ))}
        </ul>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {briefing.species.map((s) => (
            <article key={s.species.id} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[color:var(--cream)]">
                    <a
                      href={`/species#${s.species.id}`}
                      className="underline decoration-[color:var(--sea)]/40 underline-offset-4 hover:text-[color:var(--sea)]"
                    >
                      {s.species.commonName}
                    </a>
                  </p>
                  <p className="text-xs italic text-[color:var(--cream)]/40">{s.species.latin}</p>
                </div>
                <ScorePip score={s.score} />
              </div>
              <TempBar
                className="mt-3"
                label="Thermal window"
                tempF={conditions.waterTempF}
                min={s.species.tempMin - 4}
                max={s.species.tempMax + 4}
                opt={s.species.tempOpt}
                detail={s.why}
              />
              <p className="mt-2 text-xs text-[color:var(--cream)]/45">{regulationFor(s.species, area.theater)}</p>
            </article>
          ))}
        </div>
        <div className="mt-5">
          <RegsStamp theater={area.theater} />
        </div>
      </section>
    </div>
  );
}

function Instrument({
  label,
  source,
  children,
}: {
  label: string;
  source: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--cream)]/40">{label}</p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--cream)]/30">{source}</p>
      </div>
      {children}
    </div>
  );
}
