import type { Briefing } from "@/lib/types";
import { pressureTrendWord } from "@/lib/pressure";
import { skyCopy } from "@/lib/wx";

type LetterDesk = {
  theater: string;
  areaId: string;
  desk: string;
  kicker: string;
  briefing: Briefing | null;
  error: string | null;
  seasonal: string;
};

type LetterShape = {
  letter: string;
  weekId: string;
  weekLabel: string;
  weekNumber: number;
  year: number;
  month: number;
  monthName: string;
  rangeLabel: string;
  frozen: boolean;
  generatedAt: string;
  desks: LetterDesk[];
  peaks: { name: string; theaters: string; why: string }[];
  closures: { title: string; body: string }[];
};

/** Human close for the Saturday letter. No desk number. */
export const LETTER_LEGEND =
  "Wind, sky, and the water. Not a bite. Not a chart you steer by.";

export const LETTER_DISCLAIMER =
  "Wind, sky, and the water. Not a bite. Not for navigation.";

export const LETTER_SEO = {
  title: "Saturday on your water",
  subtitle: "Wind, sky, and the water",
  description:
    "Saturday on the coasts you asked for — Galveston, Venice, Islamorada, Andros, Ascension, San Juan, Alphonse. Wind, sky, and the water. A Texas list does not carry Seychelles.",
  imageAlt: "Saturday letter. Wind, sky, and the water on the coasts you asked for.",
};

export function letterWeekMeta(dateLabel: string) {
  return {
    title: `Saturday ${dateLabel}`,
    subtitle: LETTER_SEO.subtitle,
    description: `Saturday on the coasts you asked for. ${dateLabel}. Wind, sky, and the water. A Texas list does not carry Seychelles.`,
    imageAlt: `Saturday letter for ${dateLabel}. Wind, sky, and the water.`,
  };
}

export function onFieldLetter(pathname: string) {
  return pathname === "/for-the-letter" || pathname === "/newsletter" || pathname.startsWith("/newsletter/");
}

/** Footer / nav chrome. Null means the rest of the site keeps its own line. */
export function letterChromeLegend(pathname: string) {
  return onFieldLetter(pathname) ? LETTER_LEGEND : null;
}

export function letterNavCopy(pathname: string, label: string, dek: string) {
  if (onFieldLetter(pathname) && label === "How we score") {
    return { label: "Method", dek: "How the morning is built" };
  }
  return { label, dek };
}

/**
 * Desk numbers and the 1–10 legend. A measurement with a unit (78.4°F, 1.20 ft, 30.12 inHg)
 * is not a desk number.
 */
const LETTER_SCORE_RE =
  /score|\/\s*10|\bof 10\b|1\s*[–—-]\s*10|(?<![0-9.])(?:10|[0-9])\.[0-9](?![0-9])(?!\s*(?:ft|°|inHg|mb|ppt|mph|%))/i;

export function letterHasScore(text: string) {
  return LETTER_SCORE_RE.test(text);
}

const REWRITES: Array<[string, string]> = [
  ["Scores are 1–10. They are not bites.", "The week below is wind, sky, and the water."],
  [
    "If the score is a 9 at 2 p.m., believe the water temperature, not the number.",
    "If the afternoon looks kind, believe the water temperature. Heat still owns the middle of the day.",
  ],
  [
    "Do not harvest a snook because the score is an 8.",
    "Do not harvest a snook. The closure does not care how the morning looks.",
  ],
  [
    "Do not harvest a snook because a desk scored an 8.",
    "Do not harvest a snook because the morning looked kind.",
  ],
  [
    "Do not keep a billfish because a desk scored an 8.",
    "Do not keep a billfish because the morning looked kind.",
  ],
];

/** Drop any sentence that still carries a desk number. Known letter lines are rewritten first. */
export function forLetter(text: string) {
  if (!text) return text;
  let next = text;
  for (const [from, to] of REWRITES) next = next.replaceAll(from, to);
  if (!letterHasScore(next)) return next;
  return next
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !letterHasScore(sentence))
    .join(" ")
    .trim();
}

function windPhrase(mph: number | null | undefined, cardinal?: string | null) {
  if (mph == null || !Number.isFinite(mph)) return "No wind reading";
  const n = Math.round(mph);
  const named = n < 8 ? "Light air" : n < 16 ? "A breeze" : n < 22 ? "Windy" : "A blow";
  return cardinal ? `${named}, ${n} mph ${cardinal}` : `${named}, ${n} mph`;
}

function skyPhrase(briefing: Briefing) {
  const weather = briefing.conditions.weather;
  const line = skyCopy(weather.wx, weather.precipChance, weather.sky);
  if ((weather.precipChance ?? 0) < 15 && weather.wx !== "rain" && weather.wx !== "storm") {
    return line.replace(/\s*·\s*\d+%$/, "");
  }
  return line;
}

export function tideVsTable(ft: number | null | undefined) {
  if (ft == null || !Number.isFinite(ft)) return null;
  const mag = Math.abs(ft);
  if (mag < 0.25) return "close to the table";
  if (mag < 0.75) return ft > 0 ? "a little above the table" : "a little under the table";
  if (mag < 1.5) return ft > 0 ? "about a foot above the table" : "about a foot under the table";
  return ft > 0 ? "well above the table" : "well under the table";
}

function glassPhrase(briefing: Briefing) {
  const weather = briefing.conditions.weather;
  if (weather.pressureMb == null) return null;
  return `Glass ${pressureTrendWord(weather.pressureTrendMb)}`;
}

/** Wind, sky, and the water — the sentence that replaces a desk number. */
export function describeDesk(briefing: Briefing) {
  const weather = briefing.conditions.weather;
  const rawTide = briefing.conditions.tides.stage.replaceAll("-", " ");
  const tide = rawTide.charAt(0).toUpperCase() + rawTide.slice(1);
  const versus = tideVsTable(briefing.conditions.tides.anomalyFt);
  const water =
    briefing.conditions.waterTempF != null ? `${Math.round(briefing.conditions.waterTempF)}° water` : null;
  const moon = `${briefing.conditions.moon.name} moon`;
  const bits = [
    windPhrase(weather.windMph, weather.windCardinal),
    skyPhrase(briefing),
    water,
    versus ? `${tide} tide, ${versus}` : `${tide} tide`,
    moon,
    glassPhrase(briefing),
  ].filter(Boolean);
  return `${bits.join(". ")}.`;
}

export function deskWords(briefing: Briefing | null, error?: string | null) {
  if (!briefing) return forLetter(error ? `Gauge quiet. ${error}` : "Gauge quiet.");
  return forLetter(describeDesk(briefing));
}

export function letterTomorrowLine(today: Briefing, tomorrow: Briefing) {
  const todayWind = windPhrase(today.conditions.weather.windMph, today.conditions.weather.windCardinal);
  const tomorrowWind = windPhrase(
    tomorrow.conditions.weather.windMph,
    tomorrow.conditions.weather.windCardinal,
  );
  return forLetter(
    `Today: ${todayWind}, ${skyPhrase(today)}. Tomorrow: ${tomorrowWind}, ${skyPhrase(tomorrow)}.`,
  );
}

export function letterImageAlt(briefing: Briefing) {
  const weather = briefing.conditions.weather;
  return forLetter(
    `${briefing.area.shortName}. ${windPhrase(weather.windMph, weather.windCardinal)}. ${skyPhrase(briefing)}.`,
  );
}

export function letterShareText(briefing: Briefing) {
  return forLetter(`${briefing.area.shortName}. ${describeDesk(briefing)} Not a bite.`);
}

export function publishLetter<T extends Pick<LetterShape, "letter" | "desks" | "peaks" | "closures">>(
  issue: T,
): T {
  return {
    ...issue,
    letter: forLetter(issue.letter),
    desks: issue.desks.map((desk) => ({
      ...desk,
      kicker: forLetter(desk.kicker),
      seasonal: forLetter(desk.seasonal),
    })),
    peaks: issue.peaks.map((peak) => ({
      ...peak,
      name: forLetter(peak.name),
      theaters: forLetter(peak.theaters),
      why: forLetter(peak.why),
    })),
    closures: issue.closures.map((closure) => ({
      ...closure,
      title: forLetter(closure.title),
      body: forLetter(closure.body),
    })),
  };
}

export function letterDeskFields(desk: LetterDesk, origin: string) {
  const briefing = desk.briefing;
  const weather = briefing?.conditions.weather;
  const root = origin.replace(/\/$/, "");
  return {
    desk: desk.desk,
    kicker: forLetter(desk.kicker),
    theater: desk.theater,
    areaId: desk.areaId,
    href: `${root}/?area=${desk.areaId}&theater=${desk.theater}`,
    shortName: briefing?.area.shortName ?? null,
    headline: briefing ? forLetter(briefing.headline) : null,
    conditions: deskWords(briefing, desk.error),
    shareText: briefing ? letterShareText(briefing) : null,
    imageAlt: briefing ? letterImageAlt(briefing) : null,
    confidence: briefing?.confidence ?? null,
    wind:
      weather?.windMph != null
        ? `${Math.round(weather.windMph)} mph${weather.windCardinal ? ` ${weather.windCardinal}` : ""}`
        : null,
    sky: weather?.sky ?? weather?.wx ?? null,
    precipChance: weather?.precipChance ?? null,
    pressureMb: weather?.pressureMb ?? null,
    pressureTrendMb: weather?.pressureTrendMb ?? null,
    pressureCite: weather?.pressureCite ?? null,
    waterTempF: briefing?.conditions.waterTempF ?? null,
    tide: briefing?.conditions.tides.stage ?? null,
    anomalyFt: briefing?.conditions.tides.anomalyFt ?? null,
    moon: briefing ? `${briefing.conditions.moon.name} · ${briefing.conditions.moon.springNeap}` : null,
    window: briefing?.when[0]
      ? forLetter(
          `${briefing.when[0].label}${briefing.when[0].why ? ` — ${briefing.when[0].why}` : ""}`,
        )
      : null,
    inPlay:
      briefing?.species
        .filter((species) => species.inPlay && species.species.role === "primary")
        .slice(0, 4)
        .map((species) => species.species.commonName) ?? [],
    why: (briefing?.why ?? []).map((line) => forLetter(line)).filter(Boolean).slice(0, 2),
    hab: briefing?.conditions.hab
      ? {
          hot: briefing.conditions.hab.hot,
          level: briefing.conditions.hab.level,
          where: forLetter(briefing.conditions.hab.where),
          when: briefing.conditions.hab.when,
          source: briefing.conditions.hab.source,
        }
      : null,
    seasonal: forLetter(desk.seasonal),
    error: desk.error ? forLetter(desk.error) : null,
  };
}

export function letterIssueFields(issue: LetterShape, origin: string) {
  const clean = publishLetter(issue);
  const desks = clean.desks.map((desk) => letterDeskFields(desk, origin));
  return {
    title: LETTER_SEO.title,
    subtitle: `${clean.rangeLabel}. ${LETTER_SEO.subtitle}`,
    description: LETTER_SEO.description,
    imageAlt: LETTER_SEO.imageAlt,
    shareText: forLetter(`${clean.weekLabel}. ${clean.letter} ${LETTER_LEGEND}`),
    weekId: clean.weekId,
    weekLabel: clean.weekLabel,
    weekNumber: clean.weekNumber,
    year: clean.year,
    month: clean.month,
    monthName: clean.monthName,
    rangeLabel: clean.rangeLabel,
    letter: clean.letter,
    frozen: clean.frozen,
    generatedAt: clean.generatedAt,
    desks,
    peaks: clean.peaks,
    closures: clean.closures,
    disclaimer: LETTER_DISCLAIMER,
  };
}
