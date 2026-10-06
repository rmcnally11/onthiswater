import { unstable_cache } from "next/cache";
import type { ActivityId, Briefing } from "@/lib/types";
import { getArea } from "@/lib/data/areas";
import { loadConditions } from "@/lib/conditions";
import { buildBriefing } from "@/lib/engine";
import { loadOfficialLayers } from "@/lib/layers";
import { isYmd, snapshotHour, startOfDayInZone, ymdInZone } from "@/lib/time";

const ACTIVITIES = new Set(["wade", "skiff", "kayak", "fly", "spin", "structure", "offshore", "all"]);

export function parseActivity(raw?: string | null): ActivityId | "all" {
  if (!raw || !ACTIVITIES.has(raw)) return "all";
  return raw as ActivityId | "all";
}

export function parseBriefDate(raw?: string | null) {
  return isYmd(raw) ? raw : null;
}

/** A today brief with no wind must not be stored. The next read tries again. */
export class WindMiss extends Error {
  briefing: Briefing;
  constructor(briefing: Briefing) {
    super("Wind not in");
    this.name = "WindMiss";
    this.briefing = briefing;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function instantFor(dateYmd: string, hourKey: string, timeZone: string) {
  const hour = Number(hourKey);
  const start = startOfDayInZone(dateYmd, timeZone);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return start;
  return new Date(start.getTime() + hour * 3600000);
}

async function buildOnce(
  areaId: string,
  activity: ActivityId | "all",
  dateYmd: string,
  hourKey: string,
): Promise<Briefing> {
  const area = getArea(areaId);
  const at = instantFor(dateYmd, hourKey, area.timezone);
  const [conditions, official] = await Promise.all([
    loadConditions(area, at),
    loadOfficialLayers(area, { includeGnis: false, timeoutMs: 1600 }),
  ]);
  const built = buildBriefing(area, conditions, activity, at, {
    wrecks: official.wrecks,
    zones: official.zones,
    access: official.access,
  });
  return {
    ...built,
    generatedAt: new Date().toISOString(),
  };
}

async function computeBriefing(
  areaId: string,
  activity: ActivityId | "all",
  dateYmd: string,
  hourKey: string,
): Promise<Briefing> {
  let last: Briefing | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const built = await buildOnce(areaId, activity, dateYmd, hourKey);
    last = built;
    if (built.kind !== "today" || built.conditions.weather.windMph != null) return built;
    if (attempt < 2) await sleep(400 * (attempt + 1));
  }
  throw new WindMiss(last!);
}

// v15 is one local hour. v14's 3-minute cache let the card and /api/tweets
// recompute on either side of a refresh, and a quiet wind call was stored.
const cachedBriefing = unstable_cache(computeBriefing, ["field-briefing-v15"], {
  revalidate: 3600,
});

export async function getBriefing(
  areaId?: string | null,
  activityRaw?: string | null,
  dateRaw?: string | null,
): Promise<Briefing> {
  const area = getArea(areaId);
  const activity = parseActivity(activityRaw);
  const now = new Date();
  const today = ymdInZone(now, area.timezone);
  const dateYmd = parseBriefDate(dateRaw) ?? today;
  const hourKey = dateYmd === today ? snapshotHour(now, area.timezone).hour : "08";
  try {
    return await cachedBriefing(area.id, activity, dateYmd, hourKey);
  } catch (error) {
    if (error instanceof WindMiss) return error.briefing;
    if (error instanceof Error && error.message === "Wind not in") {
      return buildOnce(area.id, activity, dateYmd, hourKey);
    }
    throw error;
  }
}
