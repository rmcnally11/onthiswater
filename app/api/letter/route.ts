import { NextResponse } from "next/server";
import { GITHUB_REPO, siteOrigin } from "@/lib/brand";
import { getNewsletter, withCoastWaters } from "@/lib/newsletter";
import { isYmd } from "@/lib/time";
import { resolveElectedCoasts } from "@/lib/coasts";

export const dynamic = "force-dynamic";

const ORIGIN = siteOrigin();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const week = url.searchParams.get("week");
  const coasts = resolveElectedCoasts({
    coastsQuery: url.searchParams.get("coasts"),
    desksQuery: url.searchParams.get("desks"),
  });
  try {
    const issue = await withCoastWaters(await getNewsletter(isYmd(week) ? week : null), coasts);
    return NextResponse.json({
      source: `${ORIGIN}/newsletter`,
      permalink: `${ORIGIN}/newsletter/${issue.weekId}`,
      github: GITHUB_REPO,
      instructions: `${ORIGIN}/for-the-letter`,
      weekId: issue.weekId,
      weekLabel: issue.weekLabel,
      weekNumber: issue.weekNumber,
      year: issue.year,
      month: issue.month,
      monthName: issue.monthName,
      rangeLabel: issue.rangeLabel,
      letter: issue.letter,
      frozen: issue.frozen,
      generatedAt: issue.generatedAt,
      desks: issue.desks.map((d) => ({
        desk: d.desk,
        kicker: d.kicker,
        theater: d.theater,
        areaId: d.areaId,
        href: `${ORIGIN}/?area=${d.areaId}&theater=${d.theater}`,
        shortName: d.briefing?.area.shortName ?? null,
        headline: d.briefing?.headline ?? null,
        score: d.briefing?.overall ?? null,
        confidence: d.briefing?.confidence ?? null,
        wind:
          d.briefing?.conditions.weather.windMph != null
            ? `${Math.round(d.briefing.conditions.weather.windMph)} mph${
                d.briefing.conditions.weather.windCardinal
                  ? ` ${d.briefing.conditions.weather.windCardinal}`
                  : ""
              }`
            : null,
        sky: d.briefing?.conditions.weather.sky ?? d.briefing?.conditions.weather.wx ?? null,
        precipChance: d.briefing?.conditions.weather.precipChance ?? null,
        pressureMb: d.briefing?.conditions.weather.pressureMb ?? null,
        pressureTrendMb: d.briefing?.conditions.weather.pressureTrendMb ?? null,
        pressureCite: d.briefing?.conditions.weather.pressureCite ?? null,
        waterTempF: d.briefing?.conditions.waterTempF ?? null,
        tide: d.briefing?.conditions.tides.stage ?? null,
        anomalyFt: d.briefing?.conditions.tides.anomalyFt ?? null,
        moon: d.briefing
          ? `${d.briefing.conditions.moon.name} · ${d.briefing.conditions.moon.springNeap}`
          : null,
        window: d.briefing?.when[0]
          ? `${d.briefing.when[0].label}${d.briefing.when[0].why ? ` — ${d.briefing.when[0].why}` : ""}`
          : null,
        inPlay:
          d.briefing?.species
            .filter((s) => s.inPlay && s.species.role === "primary")
            .slice(0, 4)
            .map((s) => ({ name: s.species.commonName, score: s.score })) ?? [],
        why: d.briefing?.why.slice(0, 2) ?? [],
        hab: d.briefing?.conditions.hab
          ? {
              hot: d.briefing.conditions.hab.hot,
              level: d.briefing.conditions.hab.level,
              where: d.briefing.conditions.hab.where,
              when: d.briefing.conditions.hab.when,
              source: d.briefing.conditions.hab.source,
            }
          : null,
        seasonal: d.seasonal,
        error: d.error,
      })),
      peaks: issue.peaks,
      closures: issue.closures,
      disclaimer: "Scores are 1–10. They are not bite guarantees. Not for navigation.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The letter did not set.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
