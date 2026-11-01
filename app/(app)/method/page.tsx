import type { Metadata } from "next";
import { Waterline } from "@/components/viz/waterline";
import { ScoreRing } from "@/components/viz/score-ring";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "How the score is built",
  description:
    "Where, when, and why on this water — tied to a NOAA gauge, not a vibe. Observed, inferred, and the method tax.",
  path: "/method",
});

const LAYERS = [
  {
    title: "Observed",
    items: [
      "NOAA CO-OPS tides, observed water, station wind and water temp",
      "NWS hourly (U.S., including Puerto Rico) and Open-Meteo (Bahamas, Mexico, Seychelles)",
      "USGS GNIS names — pins snapped to Feature IDs when the hydro layer has them",
      "NOAA ENC wrecks and FKNMS legal polygons",
    ],
  },
  {
    title: "Inferred",
    items: [
      "Habitat × tide: flood the grass, drain the creek, wrecks on the fall",
      "Wind setup/setdown: observed minus predicted. On Texas this often is the tide",
      "Species thermal windows and seasonal peaks",
      "Bahamas and Mexico tide is a modeled M2 — labeled, not a gauge",
    ],
  },
  {
    title: "Method tax",
    items: [
      "Fly and kayak pay above ~16 mph",
      "Wade needs standing water",
      "Skiff loses skinny flats at dead low",
      "Jetty likes midday current. Spin is what you do when the day does not allow the fly",
      "Offshore (troll / deep jig) wants wind a boat can stand and hides the grass marks on purpose",
    ],
  },
];

export default function MethodPage() {
  return (
    <div className="space-y-8 text-[color:var(--cream)]/80">
      <div>
        <p className="kicker text-[color:var(--copper)]">Transparency</p>
        <h1 className="page-title mt-3 text-[color:var(--cream)]">How the score is built</h1>
        <p className="mt-3 max-w-2xl text-sm">
          The brief answers three questions: <em>where</em> on this water, <em>when</em> the tide is
          moving, and <em>why</em> — tied to a gauge, not a vibe. The calendar is the same engine
          stretched across a month.
        </p>
        <Waterline className="mt-4" />
      </div>

      <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <ScoreRing score={7.4} label="Example" sub="not a bite guarantee" size={140} />
        <div className="grid gap-3 sm:grid-cols-3">
          {LAYERS.map((block) => (
            <article key={block.title} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--copper)]">{block.title}</p>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--cream)]/70">
                {block.items.map((item) => (
                  <li key={item}>— {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5 text-sm">
        <h2 className="font-heading text-2xl text-[color:var(--cream)]">Official layers we still want live</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            TPWD coastal ramp inventory via TxGIO (
            <a className="underline" href="https://data.geographic.texas.gov/">
              data.geographic.texas.gov
            </a>
            ). TPWD Coastal REST still requires a token. Access pins here are curated from the
            published launch directory.
          </li>
          <li>
            Texas GLO Beach & Bay Access from{" "}
            <a className="underline" href="https://www.glo.texas.gov/coastal/protecting-coast/open-beaches">
              glo.texas.gov
            </a>
            . Hub item is cited; a public REST query was not open without their token.
          </li>
          <li>
            NPS Padre Island driving/camping closures —{" "}
            <a className="underline" href="https://www.nps.gov/pais/planyourvisit/drivingdownisland.htm">
              nps.gov/pais
            </a>
            . We cite the rule; the park API needs a key.
          </li>
        </ul>
        <p className="mt-4">
          Scores are 1–10. They are not bite guarantees. A 9 in August heat still means go early. A 3
          after a norther still holds fish in the gut if you already know the water.
        </p>
      </section>
    </div>
  );
}
