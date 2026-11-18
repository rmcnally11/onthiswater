import { parseActivity } from "@/lib/activity";
import { AREA_BY_ID, AREAS, getArea } from "@/lib/data/areas";
import { letterDeskForTheater } from "@/lib/desks";
import type { ActivityId } from "@/lib/types";

export const WATER_COOKIE = "fb_water";

export type WaterPref = {
  areaId: string;
  theater: string;
  activity: ActivityId | "all";
};

export function encodeWaterPref(pref: WaterPref) {
  return `${pref.areaId}|${pref.theater}|${pref.activity}`;
}

export function parseWaterPref(raw?: string | null): WaterPref | null {
  if (!raw) return null;
  const [areaId, theater, activity] = raw.split("|");
  const area = AREAS.find((a) => a.id === areaId);
  if (!area) return null;
  return {
    areaId: area.id,
    theater: theater && theater !== "all" ? theater : area.theater,
    activity: parseActivity(activity),
  };
}

export function waterCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax" as const,
  };
}

export function resolveDesk(
  query: { area?: string; activity?: string; theater?: string },
  pref?: WaterPref | null,
) {
  const area = getArea(query.area ?? pref?.areaId);
  const activity = parseActivity(query.activity ?? pref?.activity);
  const theater = query.theater ?? pref?.theater ?? area.theater;
  return { area, activity, theater };
}

/** Bare Today: no water, no coast. Cookie must not drop you on Galveston. */
export function isAllWaterQuery(query: { area?: string; theater?: string }) {
  const named = query.area ? AREA_BY_ID[query.area] : undefined;
  const theater = query.theater;
  return !named && (!theater || theater === "all");
}

/** If the URL names a theater the current water is not on, land on that theater’s letter desk. */
export function resolveDeskForTheater(
  query: { area?: string; activity?: string; theater?: string },
  pref?: WaterPref | null,
) {
  const desk = resolveDesk(query, pref);
  if (query.theater && query.theater !== "all" && desk.area.theater !== query.theater) {
    const lead = letterDeskForTheater(query.theater);
    return resolveDesk({ ...query, area: query.area ?? lead }, pref);
  }
  return desk;
}
