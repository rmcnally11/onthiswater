import type { Metadata } from "next";
import { SPECIES } from "@/lib/data/species";
import { Badge } from "@/components/ui/badge";
import { MonthHeat, MonthHeatLegend } from "@/components/viz/month-heat";
import { TempBar } from "@/components/viz/temp-bar";
import { Waterline } from "@/components/viz/waterline";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Species on this water",
  description:
    "Who swims where — drum, snook, hogfish, the snappers, grouper, cobia, kings, billfish. Doctrine from the Field Manual, limits from TPWD and FWC.",
  path: "/species",
});

export default function SpeciesPage() {
  const nowMonth = new Date().getUTCMonth() + 1;
  return (
    <div className="space-y-6">
      <div>
        <p className="kicker text-[color:var(--copper)]">Who swims where</p>
        <h1 className="page-title mt-3 text-[color:var(--cream)]">Species</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--cream)]/65">
          Doctrine from the Field Manual, limits from TPWD Outdoor Annual 2025–26 and FWC. Bahamas
          flats fish are treated as catch-and-release. The year bar is peak (copper) versus present
          (wash). The thermal strip is the fish’s window, not today’s gauge.
        </p>
        <Waterline className="mt-3" />
        <div className="mt-3">
          <MonthHeatLegend />
        </div>
      </div>
      <div className="grid gap-4">
        {SPECIES.map((s) => (
          <article id={s.id} key={s.id} className="scroll-mt-24 rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="font-heading text-2xl text-[color:var(--cream)]">{s.commonName}</h2>
                <p className="text-sm italic text-[color:var(--cream)]/75">{s.latin}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="bg-[color:var(--copper)]/20 capitalize text-[color:var(--cream)]/80">
                  {s.role === "primary"
                    ? "Inshore target"
                    : s.role === "incidental"
                      ? "Noise — not the headline"
                      : s.role === "bluewater"
                        ? "Bluewater"
                        : "Pacific only"}
                </Badge>
                {s.theaters.length === 0 ? (
                  <Badge variant="secondary" className="bg-[color:var(--cream)]/5 text-[color:var(--cream)]/70">
                    Not on this water
                  </Badge>
                ) : (
                  s.theaters.map((t) => (
                    <Badge key={t} variant="secondary" className="bg-[color:var(--cream)]/5 capitalize text-[color:var(--cream)]/70">
                      {t === "florida" ? "Florida" : t === "louisiana" ? "Louisiana" : t}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <MonthHeat className="mt-4" peak={s.peakMonths} present={s.presentMonths} nowMonth={nowMonth} />
            <TempBar
              className="mt-4"
              label="Thermal window"
              tempF={null}
              min={s.tempMin - 4}
              max={s.tempMax + 4}
              opt={s.tempOpt}
              detail={`${s.tempMin}–${s.tempMax}°F · best ${s.tempOpt[0]}–${s.tempOpt[1]}°F`}
            />
            <p className="mt-3 text-[color:var(--cream)]/75">{s.why}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <p className="text-sm text-[color:var(--cream)]/65">
                <span className="text-[color:var(--copper)]">Fly. </span>
                {s.flyNote}
              </p>
              <p className="text-sm text-[color:var(--cream)]/65">
                <span className="text-[color:var(--copper)]">Spin. </span>
                {s.spinNote}
              </p>
            </div>
            <p className="mt-3 text-xs text-[color:var(--cream)]/75">
              {s.regulation}{" "}
              <a className="underline decoration-[color:var(--copper)]/50" href={s.regulationUrl}>
                Official source
              </a>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
