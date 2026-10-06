import type { ActivityId, Briefing, CalendarDay } from "@/lib/types";
import { getArea } from "@/lib/data/areas";
import { getYoloDay } from "@/lib/calendar";
import { loadConditions } from "@/lib/conditions";
import { buildBriefing } from "@/lib/engine";
import { loadOfficialLayers } from "@/lib/layers";
import { readOrCreate, snapshotKey, snapshotStore, type MorningSnapshot } from "@/lib/snapshot-store";
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

const inflight = new Map<string, Promise<MorningSnapshot>>();

async function computeSnapshot(
  areaId: string,
  activity: ActivityId | "all",
  dateYmd: string,
  hourKey: string,
): Promise<MorningSnapshot> {
  const area = getArea(areaId);
  let briefing: Briefing;
  try {
    briefing = await computeBriefing(areaId, activity, dateYmd, hourKey);
  } catch (error) {
    if (error instanceof WindMiss) briefing = error.briefing;
    else throw error;
  }
  let yolo: CalendarDay | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      yolo = (await getYoloDay(area, activity)) ?? null;
      break;
    } catch {
      yolo = null;
      if (attempt === 0) await sleep(300);
    }
  }
  return { v: 1, briefing, yolo };
}

export async function getMorningSnapshot(
  areaId?: string | null,
  activityRaw?: string | null,
  dateRaw?: string | null,
): Promise<MorningSnapshot> {
  const area = getArea(areaId);
  const activity = parseActivity(activityRaw);
  const now = new Date();
  const today = ymdInZone(now, area.timezone);
  const dateYmd = parseBriefDate(dateRaw) ?? today;
  const hourKey = dateYmd === today ? snapshotHour(now, area.timezone).hour : "08";
  const key = snapshotKey(area.id, activity, dateYmd, hourKey);
  const pending = inflight.get(key);
  if (pending) return pending;

  const at = instantFor(dateYmd, hourKey, area.timezone);
  const retire = snapshotHour(new Date(at.getTime() - 48 * 3600000), area.timezone);
  const retireKey = snapshotKey(area.id, activity, retire.ymd, retire.hour);
  const work = readOrCreate(
    snapshotStore(),
    key,
    () => computeSnapshot(area.id, activity, dateYmd, hourKey),
    retireKey,
  ).finally(() => {
    if (inflight.get(key) === work) inflight.delete(key);
  });
  inflight.set(key, work);
  return work;
}

export async function getBriefing(
  areaId?: string | null,
  activityRaw?: string | null,
  dateRaw?: string | null,
): Promise<Briefing> {
  const snap = await getMorningSnapshot(areaId, activityRaw, dateRaw);
  return snap.briefing;
}
