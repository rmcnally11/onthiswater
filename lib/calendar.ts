import { unstable_cache } from "next/cache";
import type { ActivityId, Area, CalendarDay } from "@/lib/types";
import { clockParts, ymdInZone } from "@/lib/time";
import { moonGlyph, moonPhase, modeledHourlyTide } from "@/lib/moon";
import { SPECIES } from "@/lib/data/species";
import { getArea, usesModeledOcean } from "@/lib/data/areas";
import { fetchHiLo } from "@/lib/noaa";
import { fetchNwsDayWinds } from "@/lib/nws";
import { fetchOpenMeteo } from "@/lib/openmeteo";
import { activityWindPenalty, timeOfDayScore } from "@/lib/engine";
import { coerceSky, isSightSky, precipFishability, skyFromText, skyFromWmo, skyCopy, worseSky } from "@/lib/wx";
import type { SkyKind } from "@/lib/types";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function parseStamp(stamp: string) {
  if (stamp.includes("T")) return new Date(stamp.endsWith("Z") ? stamp : `${stamp}Z`);
  return new Date(`${stamp.replace(" ", "T")}:00Z`);
}

type HiLoRow = { time: string; height: number; type: "H" | "L"; at: Date };

type CalendarInputs = {
  hourly: { time: string; height: number }[];
  hilo: HiLoRow[];
  windByDay: Map<string, number>;
  popByDay: Map<string, number>;
  wxByDay: Map<string, SkyKind>;
};

function rangeScoreFor(area: Area, range: number) {
  if (area.tideCharacter === "sight-skinny") {
    return range < 0.4 ? 0.4 : range < 2.4 ? 1 : 0.65;
  }
  if (area.tideCharacter === "blue-water") return 0.75;
  return clamp(range / Math.max(1.2, area.meanRangeFt * 1.4), 0.3, 1);
}

function deriveHiLo(hourly: { time: string; height: number }[]): HiLoRow[] {
  const out: HiLoRow[] = [];
  for (let i = 1; i < hourly.length - 1; i++) {
    const prev = hourly[i - 1].height;
    const cur = hourly[i].height;
    const next = hourly[i + 1].height;
    if (cur >= prev && cur > next) {
      out.push({ time: hourly[i].time, height: cur, type: "H", at: parseStamp(hourly[i].time) });
    }
    if (cur <= prev && cur < next) {
      out.push({ time: hourly[i].time, height: cur, type: "L", at: parseStamp(hourly[i].time) });
    }
  }
  return out;
}

function dayTideQuality(hourly: { time: string; height: number }[], hilo: HiLoRow[], ymd: string, area: Area) {
  const dayPts = hourly.filter((h) => ymdInZone(parseStamp(h.time), area.timezone) === ymd);
  if (dayPts.length >= 4) {
    const heights = dayPts.map((p) => p.height);
    const range = Math.max(...heights) - Math.min(...heights);
    let bestMove = 0;
    let bestHour: number | null = null;
    for (let i = 1; i < dayPts.length; i++) {
      const move = Math.abs(dayPts[i].height - dayPts[i - 1].height);
      if (move > bestMove) {
        bestMove = move;
        bestHour = clockParts(parseStamp(dayPts[i].time), area.timezone).hour;
      }
    }
    return { score: 0.55 * rangeScoreFor(area, range) + 0.45 * clamp(bestMove / 0.15, 0.3, 1), range, bestHour };
  }

  const extremes = hilo.filter((h) => ymdInZone(h.at, area.timezone) === ymd);
  if (extremes.length < 2) return { score: 0.45, range: area.meanRangeFt, bestHour: null as number | null };
  const heights = extremes.map((p) => p.height);
  const range = Math.max(...heights) - Math.min(...heights);
  let bestMove = 0;
  let bestHour: number | null = null;
  for (let i = 1; i < extremes.length; i++) {
    const move = Math.abs(extremes[i].height - extremes[i - 1].height);
    if (move > bestMove) {
      bestMove = move;
      const mid = new Date((extremes[i].at.getTime() + extremes[i - 1].at.getTime()) / 2);
      bestHour = clockParts(mid, area.timezone).hour;
    }
  }
  return {
    score: 0.55 * rangeScoreFor(area, range) + 0.45 * clamp(bestMove / Math.max(0.35, area.meanRangeFt * 0.4), 0.3, 1),
    range,
    bestHour,
  };
}

function seasonalForArea(area: Area, month: number, activity: ActivityId | "all") {
  const local = SPECIES.filter((s) => {
    if (!s.theaters.includes(area.theater)) return false;
    if (activity === "offshore") return s.role === "bluewater" || s.role === "pacific" || s.role === "primary";
    return s.role === "primary" || (s.role === "pacific" && area.theater === "mexico");
  });
  if (!local.length) return 0.5;
  const scores = local.map((s) => {
    if (!s.presentMonths.includes(month)) return 0.15;
    let n = s.peakMonths.includes(month) ? 1 : 0.55;
    if (activity === "fly" && (s.id === "bonefish" || s.id === "permit" || s.id === "redfish" || s.id === "roosterfish" || s.id === "gt")) n += 0.08;
    if (activity === "structure" && (s.id === "sheepshead" || s.id === "black-drum")) n += 0.1;
    if (activity === "offshore" && (s.role === "bluewater" || s.id === "roosterfish")) n += 0.12;
    return n;
  });
  return scores.sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length);
}

function withBudget<T>(promise: Promise<T>, ms: number, label: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms);
    }),
  ]);
}

async function loadCalendarInputs(area: Area, start: Date, dayCount: number): Promise<CalendarInputs> {
  const [hiloSettled, windSettled] = await Promise.allSettled([
    area.noaaStation
      ? withBudget(fetchHiLo(area.noaaStation, new Date(start.getTime() - 86400000), dayCount + 2), 2800, "NOAA hi/lo")
      : Promise.resolve([]),
    usesModeledOcean(area)
      ? withBudget(fetchOpenMeteo(area.lat, area.lon), 2500, "Open-Meteo")
      : withBudget(fetchNwsDayWinds(area.lat, area.lon), 2800, "NWS"),
  ]);

  const hilo: HiLoRow[] =
    hiloSettled.status === "fulfilled"
      ? hiloSettled.value.map((h) => ({ ...h, at: h.at ?? parseStamp(h.time) }))
      : [];

  let hourly: { time: string; height: number }[] = [];
  if (!hilo.length) {
    hourly = modeledHourlyTide(
      new Date(start.getTime() - 12 * 3600000),
      (dayCount + 3) * 24,
      area.meanRangeFt,
      area.modeledTideOffsetHours ?? 0,
    );
  }

  const resolvedHiLo = hilo.length ? hilo : deriveHiLo(hourly);

  const windByDay = new Map<string, number>();
  const popByDay = new Map<string, number>();
  const wxByDay = new Map<string, SkyKind>();
  const ingestWind = (wind: Awaited<ReturnType<typeof fetchOpenMeteo>> | Awaited<ReturnType<typeof fetchNwsDayWinds>>) => {
    if ("hourly" in wind) {
      wind.hourly.time.forEach((t, i) => {
        const ymd = ymdInZone(new Date(t), area.timezone);
        windByDay.set(ymd, Math.max(windByDay.get(ymd) ?? 0, wind.hourly.wind_speed_10m[i] ?? 0));
        const pop = wind.hourly.precipitation_probability?.[i];
        if (pop != null) popByDay.set(ymd, Math.max(popByDay.get(ymd) ?? 0, pop));
        const sky = coerceSky(skyFromWmo(wind.hourly.weather_code?.[i]), pop ?? popByDay.get(ymd) ?? null);
        if (sky) wxByDay.set(ymd, worseSky(wxByDay.get(ymd) ?? null, sky) ?? sky);
      });
      wind.daily?.time.forEach((t, i) => {
        const ymd = ymdInZone(new Date(`${t}T12:00:00Z`), area.timezone);
        const dailyWind = wind.daily?.wind_speed_10m_max[i];
        if (dailyWind != null) windByDay.set(ymd, Math.max(windByDay.get(ymd) ?? 0, dailyWind));
        const pop = wind.daily?.precipitation_probability_max[i];
        if (pop != null) popByDay.set(ymd, Math.max(popByDay.get(ymd) ?? 0, pop));
        const sky = coerceSky(skyFromWmo(wind.daily?.weather_code[i]), pop ?? null);
        if (sky) wxByDay.set(ymd, worseSky(wxByDay.get(ymd) ?? null, sky) ?? sky);
      });
      return;
    }
    for (const p of wind.periods) {
      const ymd = ymdInZone(new Date(p.startTime), area.timezone);
      const nums = [...(p.windSpeed ?? "").matchAll(/(\d+)/g)].map((m) => Number(m[1]));
      const mph = nums.length ? Math.max(...nums) : 0;
      windByDay.set(ymd, Math.max(windByDay.get(ymd) ?? 0, mph));
      const pop = p.probabilityOfPrecipitation?.value;
      if (pop != null) popByDay.set(ymd, Math.max(popByDay.get(ymd) ?? 0, pop));
      const sky = coerceSky(skyFromText(p.shortForecast), pop ?? popByDay.get(ymd) ?? null);
      if (sky) wxByDay.set(ymd, worseSky(wxByDay.get(ymd) ?? null, sky) ?? sky);
    }
  };
  if (windSettled.status === "fulfilled") ingestWind(windSettled.value);
  if (!windByDay.size) {
    try {
      ingestWind(await withBudget(fetchOpenMeteo(area.lat, area.lon), 2500, "Open-Meteo fallback"));
    } catch {
      // astronomical days stay unlabeled
    }
  }

  return { hourly, hilo: resolvedHiLo, windByDay, popByDay, wxByDay };
}

function scoreDay(area: Area, activity: ActivityId | "all", ymd: string, inputs: CalendarInputs): CalendarDay {
  const [year, month] = [Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7))];
  const noon = new Date(Date.UTC(year, month - 1, Number(ymd.slice(8, 10)), 16, 0));
  const moon = moonPhase(noon);
  const tide = dayTideQuality(inputs.hourly, inputs.hilo, ymd, area);
  const season = seasonalForArea(area, month, activity);
  const wind = inputs.windByDay.get(ymd) ?? null;
  const windScore = activityWindPenalty(activity, wind);
  const tod = timeOfDayScore(tide.bestHour ?? 8, month, null);
  const spring =
    area.tideCharacter === "sight-skinny"
      ? moon.springNeap === "neap"
        ? 0.85
        : moon.springNeap === "spring"
          ? 0.7
          : 1
      : moon.springNeap === "spring"
        ? 1
        : moon.springNeap === "neap"
          ? 0.65
          : 0.85;
  const hasWind = wind != null;
  const pop = inputs.popByDay.get(ymd) ?? null;
  const wx = inputs.wxByDay.get(ymd) ?? null;
  const skyScore = precipFishability(wx, pop, isSightSky(area.tideCharacter, activity));
  const score = clamp(
    10 *
      (0.24 * season +
        0.28 * tide.score +
        0.13 * spring +
        0.15 * (hasWind ? windScore : 0.5) +
        0.08 * tod +
        0.12 * skyScore),
    1,
    10,
  );
  const todayYmd = ymdInZone(new Date(), area.timezone);
  const tides = inputs.hilo
    .filter((t) => ymdInZone(t.at, area.timezone) === ymd)
    .map((t) => {
      const p = clockParts(t.at, area.timezone);
      const h12 = ((p.hour + 11) % 12) + 1;
      return {
        type: t.type,
        time: `${h12}:${String(p.minute).padStart(2, "0")}${p.hour >= 12 ? "p" : "a"}`,
        height: t.height,
      };
    });
  const rangeFromHiLo =
    tides.length >= 2 ? Math.max(...tides.map((t) => t.height)) - Math.min(...tides.map((t) => t.height)) : tide.range;
  const wet = wx === "storm" || wx === "rain" || (pop != null && pop >= 55);
  const amazing =
    hasWind &&
    wind != null &&
    wind <= 14 &&
    !wet &&
    (score >= 8.2 ||
      (score >= 7.6 &&
        (area.tideCharacter === "sight-skinny" ? moon.springNeap !== "spring" : moon.springNeap === "spring")));

  return {
    date: ymd,
    score: Number(score.toFixed(1)),
    confidence: ymd === todayYmd ? "observed" : hasWind ? "forecast" : "astronomical",
    drivers: [
      `${moon.name.toLowerCase()} · ${moon.springNeap}`,
      `tide range ~${tide.range.toFixed(1)} ft`,
      wind != null ? `wind to ${Math.round(wind)} mph` : "no wind forecast this far out",
      wx || pop != null ? skyCopy(wx, pop) : "sky not in this far out",
    ],
    bestWindow:
      tide.bestHour != null ? `${((tide.bestHour + 11) % 12) + 1}${tide.bestHour >= 12 ? "p" : "a"} moving water` : null,
    amazing,
    moon: {
      name: moon.name,
      glyph: moonGlyph(moon.phase),
      phase: moon.phase,
      illumination: moon.illumination,
      springNeap: moon.springNeap,
    },
    tides,
    tideRangeFt: Number(rangeFromHiLo.toFixed(2)),
    windMph: wind,
    precipChance: pop,
    wx,
    yolo: false,
  };
}

export function pickYolo(days: CalendarDay[], fromYmd: string): CalendarDay | null {
  const pool = days.filter((d) => d.date >= fromYmd && d.windMph != null);
  if (!pool.length) return null;
  const wetRank = (d: CalendarDay) => (d.wx === "storm" ? 3 : d.wx === "rain" ? 2 : (d.precipChance ?? 0) >= 55 ? 1 : 0);
  return [...pool].sort((a, b) => {
    if (wetRank(a) !== wetRank(b)) return wetRank(a) - wetRank(b);
    if (a.amazing !== b.amazing) return a.amazing ? -1 : 1;
    if (b.score !== a.score) return b.score - a.score;
    return (a.windMph ?? 99) - (b.windMph ?? 99);
  })[0];
}

function markYolo(days: CalendarDay[], fromYmd: string) {
  const winner = pickYolo(days, fromYmd);
  return days.map((d) => ({ ...d, yolo: winner?.date === d.date }));
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthsFromInputs(
  area: Area,
  activity: ActivityId | "all",
  year: number,
  month: number,
  count: number,
  inputs: CalendarInputs,
) {
  const months: { year: number; month: number; label: string; days: CalendarDay[] }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(year, month - 1 + i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const days: CalendarDay[] = [];
    for (let day = 1; day <= daysInMonth(y, m); day++) {
      days.push(scoreDay(area, activity, `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`, inputs));
    }
    const fromYmd = ymdInZone(new Date(), area.timezone);
    months.push({
      year: y,
      month: m,
      label: d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      days: markYolo(days, fromYmd),
    });
  }
  return months;
}

export async function buildCalendar(
  area: Area,
  year: number,
  month: number,
  activity: ActivityId | "all",
): Promise<CalendarDay[]> {
  const start = new Date(Date.UTC(year, month - 1, 1, 6, 0));
  const inputs = await loadCalendarInputs(area, start, daysInMonth(year, month));
  return monthsFromInputs(area, activity, year, month, 1, inputs)[0].days;
}

export function upcomingDays(months: { days: CalendarDay[] }[], fromYmd: string, count = 14) {
  return months.flatMap((m) => m.days).filter((d) => d.date >= fromYmd).slice(0, count);
}

async function computeUpcoming(areaId: string, activity: ActivityId | "all", fromYmd: string, count: number) {
  const area = getArea(areaId);
  const start = new Date(`${fromYmd}T12:00:00Z`);
  const inputs = await loadCalendarInputs(area, start, count + 2);
  const days: CalendarDay[] = [];
  const cursor = new Date(
    Date.UTC(Number(fromYmd.slice(0, 4)), Number(fromYmd.slice(5, 7)) - 1, Number(fromYmd.slice(8, 10))),
  );
  for (let i = 0; i < count; i++) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth() + 1;
    const d = cursor.getUTCDate();
    days.push(scoreDay(area, activity, `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, inputs));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return markYolo(days, fromYmd);
}

const cachedUpcoming = unstable_cache(computeUpcoming, ["field-calendar-upcoming-v3"], {
  revalidate: 180,
});

export async function buildUpcoming(
  area: Area,
  activity: ActivityId | "all",
  fromYmd: string,
  count = 14,
): Promise<CalendarDay[]> {
  return cachedUpcoming(area.id, activity, fromYmd, count);
}

async function computeCalendarRange(
  areaId: string,
  year: number,
  month: number,
  activity: ActivityId | "all",
  count: number,
) {
  const area = getArea(areaId);
  const start = new Date(Date.UTC(year, month - 1, 1, 6, 0));
  const inputs = await loadCalendarInputs(area, start, count * 32);
  return monthsFromInputs(area, activity, year, month, count, inputs);
}

const cachedCalendarRange = unstable_cache(computeCalendarRange, ["field-calendar-v4"], {
  revalidate: 300,
});

export async function buildCalendarRange(
  area: Area,
  year: number,
  month: number,
  activity: ActivityId | "all",
  count = 2,
) {
  return cachedCalendarRange(area.id, year, month, activity, count);
}

export async function getYoloDay(area: Area, activity: ActivityId | "all") {
  const now = clockParts(new Date(), area.timezone);
  const months = await buildCalendarRange(area, now.year, now.month, activity, 1);
  return months[0]?.days.find((d) => d.yolo) ?? pickYolo(months[0]?.days ?? [], ymdInZone(new Date(), area.timezone));
}
