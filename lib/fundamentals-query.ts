import { parseCoasts } from "@/lib/coasts";
import { WATER_TYPES } from "@/lib/data/fundamentals";
import type { WaterTypeId } from "@/lib/data/fundamentals";
import { SPECIES } from "@/lib/data/species";
import { THEATER_IDS } from "@/lib/data/theaters";
import type { SpeciesId, TheaterId } from "@/lib/types";

const THEATER_CHOICES = new Set<string>(["all", ...THEATER_IDS]);

export type FundamentalsSelection = {
  theater: TheaterId | "all";
  type: WaterTypeId | "all";
  speciesId: SpeciesId | "all";
  month: number;
  regionIds: TheaterId[];
};

/** Same filter rules the server page used to apply from searchParams and fb_coasts. */
export function fundamentalsSelection(input: {
  theater?: string | null;
  type?: string | null;
  species?: string | null;
  month?: string | null;
  coastsCookie?: string | null;
  nowMonth: number;
}): FundamentalsSelection {
  const pref = parseCoasts(input.coastsCookie);
  const theaterRaw = input.theater ?? "";
  const hasTheaterParam = theaterRaw !== "";
  const theater = (
    hasTheaterParam && THEATER_CHOICES.has(theaterRaw)
      ? theaterRaw
      : pref.length === 1
        ? pref[0]
        : "all"
  ) as TheaterId | "all";
  const type = (WATER_TYPES.some((t) => t.id === input.type) ? input.type : "all") as WaterTypeId | "all";
  const parsedMonth = Number(input.month);
  const month = parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : input.nowMonth;
  const speciesId = (SPECIES.some((s) => s.id === input.species) ? input.species : "all") as SpeciesId | "all";
  const regionIds: TheaterId[] =
    theater !== "all"
      ? [theater]
      : hasTheaterParam
        ? [...THEATER_IDS]
        : pref.length
          ? pref
          : [...THEATER_IDS];
  return { theater, type, speciesId, month, regionIds };
}
