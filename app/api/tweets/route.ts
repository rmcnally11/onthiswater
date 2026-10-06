import { NextResponse } from "next/server";
import { GITHUB_REPO } from "@/lib/brand";
import { getMorningSnapshot } from "@/lib/briefing";
import { getCalendarSnapshot } from "@/lib/calendar";
import { getArea } from "@/lib/data/areas";
import {
  ORIGIN,
  TWEET_DESKS,
  calendarAlt,
  calendarCardUrl,
  calendarHref,
  calendarTweetText,
  deskHref,
  morningAlt,
  morningCardUrl,
  morningTweetText,
} from "@/lib/tweet";

export const dynamic = "force-dynamic";

export async function GET() {
  const mornings = [];
  const calendars = [];

  for (const desk of TWEET_DESKS) {
    const area = getArea(desk.areaId);
    try {
      const { briefing, yolo } = await getMorningSnapshot(area.id);
      if (briefing.kind === "today" && briefing.conditions.weather.windMph == null) {
        throw new Error("Wind not in");
      }
      mornings.push({
        desk: desk.desk,
        kicker: desk.kicker,
        theater: desk.theater,
        areaId: desk.areaId,
        shortName: briefing.area.shortName,
        score: briefing.overall,
        text: morningTweetText(briefing, yolo, desk.kicker),
        image: morningCardUrl(area.id, area.theater),
        alt: morningAlt(briefing),
        href: deskHref(area.id, area.theater),
        url: deskHref(area.id, area.theater),
        skip: false,
      });
    } catch (error) {
      mornings.push({
        desk: desk.desk,
        kicker: desk.kicker,
        theater: desk.theater,
        areaId: desk.areaId,
        shortName: area.shortName,
        score: null,
        text: null,
        image: morningCardUrl(area.id, area.theater),
        alt: null,
        href: deskHref(area.id, area.theater),
        url: deskHref(area.id, area.theater),
        skip: true,
        error: error instanceof Error ? error.message : "Gauge quiet",
      });
    }

    try {
      const snap = await getCalendarSnapshot(area, "all");
      const days = snap.months[0]?.days ?? [];
      calendars.push({
        desk: desk.desk,
        theater: desk.theater,
        areaId: desk.areaId,
        shortName: area.shortName,
        text: calendarTweetText(area.shortName, area.id, area.theater, days),
        image: calendarCardUrl(area.id, area.theater),
        alt: calendarAlt(area.shortName, days, area.id),
        href: calendarHref(area.id, area.theater),
        url: calendarHref(area.id, area.theater),
        skip: false,
      });
    } catch (error) {
      calendars.push({
        desk: desk.desk,
        theater: desk.theater,
        areaId: desk.areaId,
        shortName: area.shortName,
        text: null,
        image: calendarCardUrl(area.id, area.theater),
        alt: null,
        href: calendarHref(area.id, area.theater),
        url: calendarHref(area.id, area.theater),
        skip: true,
        error: error instanceof Error ? error.message : "Calendar did not set",
      });
    }
  }

  return NextResponse.json({
    source: `${ORIGIN}/for-the-letter`,
    instructions: `${ORIGIN}/for-the-letter`,
    github: `${GITHUB_REPO}/blob/main/TWITTER.md`,
    rule: "Post text verbatim — the last line is the live site so readers can open the brief. Screenshot image only. Do not generate pictures. Skip any desk with skip=true.",
    mornings,
    calendars,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
