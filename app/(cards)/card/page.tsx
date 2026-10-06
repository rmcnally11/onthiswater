import { getMorningSnapshot } from "@/lib/briefing";
import { getArea } from "@/lib/data/areas";
import { theaterLabel } from "@/lib/data/theaters";
import { morningLine } from "@/lib/morning";
import { skyCopy } from "@/lib/wx";
import { ScoreRing } from "@/components/viz/score-ring";
import { WindCompass } from "@/components/viz/wind-compass";
import { MoonDisk } from "@/components/viz/moon-disk";
import { TideCurve } from "@/components/viz/tide-curve";
import { Waterline } from "@/components/viz/waterline";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Morning card",
  description: "Share card for this morning.",
  path: "/card",
  index: false,
});

export default async function MorningCardPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; theater?: string }>;
}) {
  const q = await searchParams;
  const area = getArea(q.area);
  let briefing;
  let yolo = null;
  try {
    const snap = await getMorningSnapshot(area.id);
    briefing = snap.briefing;
    yolo = snap.yolo;
  } catch {
    briefing = null;
  }

  if (!briefing) {
    return (
      <div className="flex h-[675px] w-[1200px] items-center justify-center bg-[color:var(--ink)]">
        <p className="font-heading text-3xl text-rose-900">Gauge quiet · {area.shortName}</p>
      </div>
    );
  }

  const w = briefing.conditions.weather;
  const line = morningLine(briefing, yolo);

  return (
    <article className="box-border flex h-[675px] w-[1200px] flex-col bg-[color:var(--ink)] p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker text-[color:var(--copper)]">
            On This Water · {theaterLabel(area.theater)} desk
          </p>
          <h1 className="mt-1 font-heading text-5xl text-[color:var(--cream)]">{area.shortName}</h1>
          <p className="mt-2 max-w-3xl font-heading text-2xl leading-snug text-[color:var(--cream)]/80">{line}</p>
        </div>
        <ScoreRing
          score={briefing.overall}
          size={132}
          label={briefing.kind === "today" ? "Today" : "Day"}
          sub={briefing.confidence}
        />
      </header>
      <Waterline className="my-4" />
      <div className="grid flex-1 grid-cols-[160px_160px_1fr_200px] items-center gap-4">
        <WindCompass
          degrees={w.windDirDeg}
          mph={w.windMph}
          gust={w.windGustMph}
          cardinal={w.windCardinal}
          size={150}
        />
        <MoonDisk
          phase={briefing.conditions.moon.phase}
          illumination={briefing.conditions.moon.illumination}
          name={briefing.conditions.moon.name}
          springNeap={briefing.conditions.moon.springNeap}
          size={120}
        />
        <TideCurve
          hourly={briefing.conditions.tides.hourly}
          nextHiLo={briefing.conditions.tides.nextHiLo}
          timezone={area.timezone}
          nowHeight={briefing.conditions.tides.predictedNow}
          stage={briefing.conditions.tides.stage}
          source={briefing.conditions.tides.source}
          station={area.noaaStation}
          windows={briefing.when}
          height={168}
        />
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--cream)]/40">Sky</p>
          <p className="mt-1 font-heading text-3xl text-[color:var(--cream)]">
            {w.wx === "storm" ? "Storms" : w.wx === "rain" ? "Rain" : w.wx === "clouds" ? "Clouds" : w.wx === "clear" ? "Clear" : "Sky n/a"}
          </p>
          <p className="mt-2 text-sm text-[color:var(--cream)]/60">{skyCopy(w.wx, w.precipChance, w.sky)}</p>
        </div>
      </div>
    </article>
  );
}
