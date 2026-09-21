import { AREAS, areasInTheater } from "@/lib/data/areas";
import { isKeysFlorida } from "@/lib/data/theaters";
import type { Area, TheaterId } from "@/lib/types";

export type CoastHub = {
  slug: string;
  theater: TheaterId;
  title: string;
  h1: string;
  kicker: string;
  intro: string;
  waters: Area[];
};

function hub(
  slug: string,
  theater: TheaterId,
  title: string,
  h1: string,
  kicker: string,
  intro: string,
  waters: Area[],
): CoastHub {
  return { slug, theater, title, h1, kicker, intro, waters };
}

export const COAST_HUBS: CoastHub[] = [
  hub(
    "texas",
    "texas",
    "Texas this morning — tide, wind, go or wait",
    "This morning on the Texas coast",
    "Wind is the tide",
    "Sabine through Lower Laguna. Live NOAA gauges. The wind often moves more water than the printed table. Scores are 1–10, not a bite.",
    areasInTheater("texas"),
  ),
  hub(
    "louisiana",
    "louisiana",
    "Louisiana this morning — tide, wind, go or wait",
    "This morning on the Louisiana coast",
    "River is the tide",
    "Venice, Grand Isle, Calcasieu. River stage and wind move more water than the printed tide. Live NOAA gauges. Scores are 1–10, not a bite.",
    areasInTheater("louisiana"),
  ),
  hub(
    "florida",
    "florida",
    "Florida this morning — tide, wind, go or wait",
    "This morning on Florida",
    "Educated fish, short windows",
    "The Keys, Boca Grande, Jupiter, Biscayne. Live NOAA gauges. Not a magazine. Scores are 1–10, not a bite.",
    areasInTheater("florida"),
  ),
  hub(
    "keys",
    "florida",
    "Florida Keys this morning — tide, wind, go or wait",
    "This morning on the Keys",
    "Bones, permit, tarpon",
    "Key Largo through Key West, plus Florida Bay. Live NOAA gauges. Adjacent FKNMS water is the law. Scores are 1–10, not a bite.",
    AREAS.filter((a) => isKeysFlorida(a.id)),
  ),
  hub(
    "bahamas",
    "bahamas",
    "Bahamas this morning — tide, wind, go or wait",
    "This morning in the Bahamas",
    "Bonefish country",
    "Andros, Abaco, Grand Bahama, Eleuthera. Tide is a modeled lunar clock — there is no NOAA gauge on these flats. Scores are 1–10, not a bite.",
    areasInTheater("bahamas"),
  ),
  hub(
    "mexico",
    "mexico",
    "Mexico this morning — tide, wind, go or wait",
    "This morning on Mexican water",
    "Two oceans",
    "Yucatan flats and Baja. Modeled tide, Open-Meteo wind. CONAPESCA rules, not FWC. Scores are 1–10, not a bite.",
    areasInTheater("mexico"),
  ),
  hub(
    "puerto-rico",
    "puerto-rico",
    "Puerto Rico this morning — tide, wind, go or wait",
    "This morning on Puerto Rico",
    "Urban tarpon, then the drop",
    "San Juan, Vieques, La Parguera. Live NOAA gauges. DNER rules, not FWC. Scores are 1–10, not a bite.",
    areasInTheater("puerto-rico"),
  ),
  hub(
    "seychelles",
    "seychelles",
    "Seychelles this morning — tide, wind, go or wait",
    "This morning in the Seychelles",
    "GT country",
    "Alphonse, Farquhar, the inner islands. Modeled tide. Scores are 1–10, not a bite.",
    areasInTheater("seychelles"),
  ),
  hub(
    "north-carolina",
    "north-carolina",
    "North Carolina this morning — tide, wind, go or wait",
    "This morning on North Carolina",
    "The Stream or the wind",
    "Hatteras, Morehead City, Wilmington. Live NOAA gauges. The Stream is a short run from the Outer Banks. Scores are 1–10, not a bite.",
    areasInTheater("north-carolina"),
  ),
  hub(
    "south-carolina",
    "south-carolina",
    "South Carolina this morning — tide, wind, go or wait",
    "This morning on South Carolina",
    "Marsh reds, harbor bulls",
    "Charleston, Hilton Head, Myrtle Beach. Live NOAA gauges. Lowcountry marsh and the Grand Strand. Scores are 1–10, not a bite.",
    areasInTheater("south-carolina"),
  ),
  hub(
    "azores",
    "azores",
    "Azores this morning — tide, wind, go or wait",
    "This morning in the Azores",
    "Blue-marlin country",
    "Horta and São Miguel. Tide is a modeled Atlantic clock — there is no NOAA gauge. Scores are 1–10, not a bite.",
    areasInTheater("azores"),
  ),
];

export const COAST_HUB_BY_SLUG = Object.fromEntries(COAST_HUBS.map((h) => [h.slug, h]));

export function coastHub(slug?: string | null) {
  if (!slug) return null;
  return COAST_HUB_BY_SLUG[slug] ?? null;
}
