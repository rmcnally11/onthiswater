import type { Briefing, CalendarDay, TheaterId } from "@/lib/types";
import { PRODUCT_NAME, siteOrigin } from "@/lib/brand";
import { DESKS } from "@/lib/newsletter";
import { theaterLabel } from "@/lib/data/theaters";
import { skyCopy, skyWord } from "@/lib/wx";

export const ORIGIN = siteOrigin();

export const TWEET_DESKS = DESKS;

/** Words people actually search — location + fishery, not a hashtag dump. */
const PLACE: Record<string, string> = {
  galveston: "Texas coast inshore fishing",
  venice: "Louisiana birdfoot inshore fishing",
  islamorada: "Islamorada Florida Keys flats fishing",
  andros: "Andros Bahamas bonefish flats",
  ascension: "Ascension Bay Mexico flats fishing",
  "san-juan": "San Juan Puerto Rico inshore fishing",
  alphonse: "Alphonse Seychelles flats fishing",
};

export function deskHref(areaId: string, theater: string) {
  return `${ORIGIN}/?area=${areaId}&theater=${theater}`;
}

export function morningCardUrl(areaId: string, theater: string) {
  return `${ORIGIN}/card?area=${areaId}&theater=${theater}`;
}

export function calendarCardUrl(areaId: string, theater: string) {
  return `${ORIGIN}/card/calendar?area=${areaId}&theater=${theater}`;
}

export function calendarHref(areaId: string, theater: string) {
  return `${ORIGIN}/calendar?area=${areaId}&theater=${theater}`;
}

function windBit(briefing: Briefing) {
  const w = briefing.conditions.weather;
  if (w.windMph == null) return "wind not in";
  return `${Math.round(w.windMph)} mph${w.windCardinal ? ` ${w.windCardinal}` : ""}`;
}

function skyBit(briefing: Briefing) {
  const w = briefing.conditions.weather;
  if (w.wx === "storm") return "thunderstorms — stay tied";
  if (w.wx === "rain") {
    return w.precipChance != null ? `${Math.round(w.precipChance)}% rain in the forecast` : "rain in the forecast";
  }
  if (w.wx === "clear") return "clear fishing weather";
  if (w.wx === "clouds") return "cloudy fishing weather";
  if (w.sky) return `${w.sky.toLowerCase()} fishing weather`;
  if (w.precipChance != null) return `${Math.round(w.precipChance)}% chance of rain`;
  return "sky not in";
}

function extraBit(briefing: Briefing) {
  const alert = (briefing.conditions.alerts ?? []).find((a) =>
    /small craft|gale|tropical|hurricane|special marine|storm warning/i.test(a.event),
  );
  if (alert) return ` NWS ${alert.event}.`;
  if (briefing.conditions.hab?.hot) {
    return ` ${briefing.conditions.hab.source} red tide ${briefing.conditions.hab.level}.`;
  }
  const river = briefing.conditions.river;
  if (river?.high) {
    return ` ${river.name.split(",")[0]} ${Math.round(river.cfs).toLocaleString()} cfs — stain is the story.`;
  }
  return "";
}

export function morningTweetText(briefing: Briefing, yolo?: CalendarDay | null, kicker?: string) {
  const place = PLACE[briefing.area.id] ?? `${theaterLabel(briefing.area.theater)} fishing`;
  const yoloBit = yolo ? ` Best dry day left is ${yolo.date.slice(5)}.` : "";
  const kick = kicker ? ` ${kicker}.` : "";
  const line = `${briefing.area.shortName} fishing weather: ${briefing.overall.toFixed(1)} this morning. ${place}. Wind ${windBit(briefing)}, ${skyBit(briefing)}.${extraBit(briefing)}${kick} ${PRODUCT_NAME} — a 1–10, not a bite.${yoloBit}`;
  return `${line}\n${deskHref(briefing.area.id, briefing.area.theater)}`;
}

export function morningAlt(briefing: Briefing) {
  const w = briefing.conditions.weather;
  const place = PLACE[briefing.area.id] ?? briefing.area.name;
  return [
    `${PRODUCT_NAME} ${place} weather card`,
    `${briefing.area.shortName} fishing score ${briefing.overall.toFixed(1)} of 10`,
    w.windMph != null ? `wind ${Math.round(w.windMph)} mph ${w.windCardinal ?? ""}`.trim() : null,
    skyCopy(w.wx, w.precipChance, w.sky),
    briefing.conditions.moon.name,
  ]
    .filter(Boolean)
    .join(". ");
}

export function calendarTweetText(
  shortName: string,
  areaId: string,
  theater: string,
  days: CalendarDay[],
) {
  const place = PLACE[areaId] ?? `${theaterLabel(theater as TheaterId)} fishing`;
  const yolo = days.find((d) => d.yolo);
  const storms = days.filter((d) => d.wx === "storm").slice(0, 3);
  const rains = days.filter((d) => d.wx === "rain").slice(0, 2);
  const yoloBit = yolo
    ? `Best remaining dry day is ${yolo.date.slice(5)} (${yolo.score.toFixed(1)}).`
    : "No best dry day with a real wind forecast yet.";
  const wetBit = storms.length
    ? ` Thunderstorms ${storms.map((d) => d.date.slice(5)).join(", ")}.`
    : rains.length
      ? ` Rain in the forecast ${rains.map((d) => d.date.slice(5)).join(", ")}.`
      : "";
  const line = `${shortName} fishing calendar — ${place}. ${yoloBit}${wetBit} Inshore forecast from ${PRODUCT_NAME}. Not a bite call.`;
  return `${line}\n${calendarHref(areaId, theater)}`;
}

export function calendarAlt(shortName: string, days: CalendarDay[], areaId?: string) {
  const yolo = days.find((d) => d.yolo);
  const place = areaId ? PLACE[areaId] ?? shortName : shortName;
  return `${PRODUCT_NAME} ${place} calendar. Month grid with moon, tide, and fishing weather.${yolo ? ` Best dry day ${yolo.date}.` : ""} The outline is the best dry day left. Gold is an amazing dry day. Rain and thunderstorm labels are from this site.`;
}
