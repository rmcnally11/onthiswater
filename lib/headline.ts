import type { Area, Conditions, SpeciesId, SpeciesPick, TideStage } from "@/lib/types";

function pickLead(area: Area, species: SpeciesPick[], leads?: SpeciesId[]): SpeciesPick | undefined {
  const order = leads ?? area.leadSpecies;
  const ranked = order
    .map((id) => species.find((s) => s.species.id === id))
    .filter((s): s is SpeciesPick => Boolean(s));
  return (
    ranked.find((s) => s.inPlay) ??
    ranked[0] ??
    species.find((s) => s.inPlay) ??
    species.find((s) => s.species.role === "primary" || s.species.role === "bluewater" || s.species.role === "pacific")
  );
}

function heatNote(area: Area, water: number | null, wind: number | null) {
  if (water != null && water >= 88) return "Too hot in the middle. First light, or last light.";
  if (water != null && water <= 58) return "Cold fish slide to guts and mud. Midday sun is legal.";
  if (wind != null && wind >= 18) {
    return area.theater === "texas" || area.theater === "louisiana"
      ? "The wind is the tide. Work the leeward shore."
      : area.tideCharacter === "blue-water"
        ? "Work the leeward edge — troll if the fly will not go."
        : "Work the leeward shore — fly gets harder.";
  }
  return null;
}

const PLACE: Record<
  string,
  Record<TideStage, string>
> = {
  sabine: {
    incoming: "flood the Neches and Sabine marsh, then the drains at Texas Point",
    outgoing: "sit the river-marsh drains — this water dumps after a blow",
    "high-slack": "wait — slack on a border estuary is a pause, not a reason to leave",
    "low-slack": "wait for the next dump off the marsh",
  },
  galveston: {
    incoming: "push West and East Bay grass as the wind lets water back in",
    outgoing: "fish the wind-blown shoreline — the table is not the tide here",
    "high-slack": "hold for moving water; Galveston slack is a boat ride",
    "low-slack": "slide to guts and the ship-channel edges until it moves",
  },
  matagorda: {
    incoming: "work East Matagorda reefs and the ICW exchange — there is almost no Gulf inlet",
    outgoing: "Mitchell's Cut and the ship-channel side do the exchanging",
    "high-slack": "wait; this bay does not refresh itself",
    "low-slack": "mid-bay shell and the channel until current starts",
  },
  aransas: {
    incoming: "flood Copano and Redfish Bay grass — this is the mid-coast skiff day",
    outgoing: "drain Lydia Ann and the oyster edges, not a Galveston jetty program",
    "high-slack": "pole the remaining water; slack here is short",
    "low-slack": "get off the skinny and sit the reefs",
  },
  corpus: {
    incoming: "Packery and the Mustang backside, then the Port A jetties if the bulls are in",
    outgoing: "the pass at Port Aransas — this is current water, not a marsh drain",
    "high-slack": "wait for the next push through the jetties",
    "low-slack": "Nueces and Shamrock guts until the pass turns",
  },
  baffin: {
    incoming: "sight the grass and serpulid — do not fish Baffin like Rockport",
    outgoing: "slide to Land Cut and the holes; trophy trout leave the skinny",
    "high-slack": "look, do not grind — this water is clear and they see you",
    "low-slack": "Nine Mile and the Badlands guts, not a wade across the flat",
  },
  "lower-laguna": {
    incoming: "sight-cast reds in inches on South Bay and the spoils",
    outgoing: "the drops off Brazos Santiago and the spoil edges",
    "high-slack": "wait for a push — skinny clear water at slack is a walk",
    "low-slack": "get in the remaining water; this is a sight fishery, not a drain",
  },
  biscayne: {
    incoming: "oceanside banks for bones and permit — west-side mangroves for baby tarpon and snook",
    outgoing: "the ocean banks as they empty; these fish are educated and the window is short",
    "high-slack": "do not grind a Biscayne slack — boat traffic already did",
    "low-slack": "wait for the next incoming; they will not eat a bad presentation here",
  },
  "key-largo": {
    incoming: "oceanside banks off Garden Cove and Rodriguez Key — bones and permit, then Card Sound if you want current",
    outgoing: "the falling ocean bank and Tavernier Creek; Pennekamp SPAs stay no-take",
    "high-slack": "do not grind a Key Largo slack — the park traffic already did",
    "low-slack": "wait for the flood; these fish have seen the catalog",
  },
  islamorada: {
    incoming: "oceanside permit and bones, or Channel 5 current — not a Texas marsh sentence",
    outgoing: "the wrecks and the falling ocean bank; pressured fish want a clean shot",
    "high-slack": "run or rest — slack on this water is not the hour",
    "low-slack": "wait for the flood; Islamorada does not forgive a low-slack cast",
  },
  "florida-bay": {
    incoming: "flood Snake Bight and the Flamingo banks — backcountry reds and snook, not oceanside bones",
    outgoing: "the drains and the colored water west of Flamingo",
    "high-slack": "wind and color decide; slack here is a look, not a grind",
    "low-slack": "sit the remaining guts until the bay breathes",
  },
  marathon: {
    incoming: "Seven Mile current and the oceanside patches — permit and tarpon, not a bonefish morning",
    outgoing: "the bridge shadow and the falling wrecks",
    "high-slack": "wait for the next push under the bridges",
    "low-slack": "bayside basins until Vaca water turns",
  },
  "key-west": {
    incoming: "Marquesas and Harbor Key on a clean incoming — permit country",
    outgoing: "the oceanside wrecks and the falling contentment flats",
    "high-slack": "make the run or wait; slack out here is expensive",
    "low-slack": "wait for the next flood after the shower clears",
  },
  "boca-grande": {
    incoming: "the Pass — tarpon in the throat, then Gasparilla grass for reds and snook",
    outgoing: "sit the falling pass and the first harbor drains; this is current water",
    "high-slack": "wait — slack in Boca Grande Pass is a boat parade, not the hour",
    "low-slack": "hold for the next push; the pass does not fish dead",
  },
  jupiter: {
    incoming: "Jupiter Inlet and the first Loxahatchee points — snook, then a beach tarpon",
    outgoing: "the inlet jetties and the river mouth on the dump",
    "high-slack": "wait; slack here is traffic",
    "low-slack": "hold for the next incoming through the jetties",
  },
  venice: {
    incoming: "flood the west-bank ponds, then the south passes if the bulls are in",
    outgoing: "the birdfoot drains and the pass edges — wind and river stage are the tide",
    "high-slack": "wait; slack on the delta is a pause",
    "low-slack": "sit the remaining guts until the marsh dumps",
  },
  "grand-isle": {
    incoming: "push Barataria and the bayside grass — trout first, reds on the drain later",
    outgoing: "Caminada and the island backside as they empty",
    "high-slack": "the surf and the park pier still fish; the bay wants current",
    "low-slack": "sit Caminada until it turns",
  },
  calcasieu: {
    incoming: "flood Calcasieu Lake shell, then the pass if the wind lets water in",
    outgoing: "the Cameron jetties and the pass — fall flounder water before the LDWF close",
    "high-slack": "wait; this pass wants moving water",
    "low-slack": "lake guts and the ship-channel edges until it turns",
  },
  andros: {
    incoming: "west-side white sand — schools, then the double-digit singles",
    outgoing: "the creek mouths and the bights; tarpon live in the darker water",
    "high-slack": "look, do not wade a high-slack school into the next zip code",
    "low-slack": "wait for the flood on the west side",
  },
  abaco: {
    incoming: "the Marls and Cherokee on foot, or the ocean cays by skiff",
    outgoing: "the Sea of Abaco edges as they empty",
    "high-slack": "verify which creeks are actually open, then wait for water",
    "low-slack": "sit the remaining Marls guts",
  },
  "grand-bahama": {
    incoming: "East or West End pancakes — one fish, on foot",
    outgoing: "the same flat, thinner; pick the darker single",
    "high-slack": "this is a thinking wade — slack is a look",
    "low-slack": "wait for the next inch of water",
  },
  eleuthera: {
    incoming: "Current Cut and the east-side ocean flats — permit first, bones second",
    outgoing: "the cut and the Exuma-edge banks as they fall",
    "high-slack": "weather decides more than Andros; wait",
    "low-slack": "hold for the next push through the cut",
  },
  ascension: {
    incoming: "flood the Ascension flats off Punta Allen — bones first, permit if you earned it",
    outgoing: "Boca Paila and the drains; tarpon live in the darker mouths",
    "high-slack": "look, do not grind a high-slack school across the biosphere",
    "low-slack": "wait for the next inch — this bay empties",
  },
  "isla-mujeres": {
    incoming: "the Cancún / Mujeres bank — sail on the current, not a bonefish morning",
    outgoing: "the same edge as it dumps; troll along it, never across",
    "high-slack": "keep the spread out; slack here is still a current seam",
    "low-slack": "work the north bank and Contoy edge",
  },
  "east-cape": {
    incoming: "the East Cape beaches for rooster, then Gordo if the blue water is in",
    outgoing: "the same wash — rooster faces the tide",
    "high-slack": "the beach still fishes; the bank wants a troll",
    "low-slack": "walk the wash or run the banks",
  },
  "la-paz": {
    incoming: "Espíritu Santo and the rocky beaches — rooster, then El Bajo if the season is on",
    outgoing: "the same island edges as they fall",
    "high-slack": "the town run is legal; the seamount wants moving bait",
    "low-slack": "hold for the next push around the island",
  },
  "san-juan": {
    incoming: "Condado and the bay — urban tarpon, then the north drop if you switched to Offshore",
    outgoing: "the same harbor throats as they dump",
    "high-slack": "wait; slack under the bridges is traffic",
    "low-slack": "hold for the next push through the lagoon",
  },
  vieques: {
    incoming: "the Esperanza and Culebra banks — bones and permit, not a San Juan tarpon sentence",
    outgoing: "the same banks as they empty; the harbor holds the tarpon",
    "high-slack": "look, do not grind a high-slack school into the reserve",
    "low-slack": "wait for the next inch on the south side",
  },
  parguera: {
    incoming: "flood the mangrove cays — snook first, a tarpon in the darker mouths",
    outgoing: "the same trees on the dump, then the southwest drop if the method is Offshore",
    "high-slack": "the village run is legal; the trees want current",
    "low-slack": "sit the remaining guts until the cays breathe",
  },
  alphonse: {
    incoming: "flood St François and the lagoon — bones first, then a GT on the rim",
    outgoing: "the same sand as it empties; the GT still owns the edge",
    "high-slack": "look, do not wade a high-slack school across lodge water",
    "low-slack": "wait for the next inch — this atoll empties",
  },
  farquhar: {
    incoming: "the lagoon sand, then the passes if the GT are up",
    outgoing: "the throats — this is why the week is booked",
    "high-slack": "the lagoon is a look; the pass wants water",
    "low-slack": "hold for the next push through the rim",
  },
  mahe: {
    incoming: "Ste Anne and the inner edges — a GT, not the Alphonse photograph",
    outgoing: "the same reef edges, then the drop if you came to troll",
    "high-slack": "the town run is legal; the park wants current",
    "low-slack": "hold for the next push around the granitic islands",
  },
  hatteras: {
    incoming: "Oregon Inlet and the first sound drains — then the Stream if the wind lets you go",
    outgoing: "the same inlet bars as they dump; winter bluefin live outside",
    "high-slack": "the sound wants current; the Stream still has a seam",
    "low-slack": "hold for the next push through the inlet",
  },
  "morehead-city": {
    incoming: "Beaufort Inlet and the first Crystal Coast points — reds inside, Big Rock outside",
    outgoing: "the inlet jetties and the falling bight",
    "high-slack": "wait; slack here is traffic",
    "low-slack": "hold for the next incoming through the inlet",
  },
  wilmington: {
    incoming: "flood Wrightsville and the Cape Fear marsh — reds and trout, not a Hatteras Stream sentence",
    outgoing: "Snows Cut and the river edges as they empty",
    "high-slack": "the beach still fishes; the creeks want current",
    "low-slack": "sit the remaining guts until the river turns",
  },
  charleston: {
    incoming: "flood the harbor creeks and the first marsh — reds, then a bull if they are in",
    outgoing: "the same drains as they dump; trout sit a foot deeper",
    "high-slack": "the harbor is a pause; the creeks want moving water",
    "low-slack": "sit the remaining guts until the Lowcountry breathes",
  },
  "hilton-head": {
    incoming: "flood Port Royal and Calibogue — same Lowcountry fish, a bigger tide than Charleston",
    outgoing: "the sound edges and the first marsh drains",
    "high-slack": "wait; this sound wants current",
    "low-slack": "hold for the next push through Port Royal",
  },
  "myrtle-beach": {
    incoming: "Murrells Inlet and the Winyah edges — surf pompano, then a creek red",
    outgoing: "the same inlet as it dumps; Georgetown marsh on the fall",
    "high-slack": "the Strand still fishes; the inlet wants water",
    "low-slack": "sit Winyah until it turns",
  },
  horta: {
    incoming: "the Faial Channel and Princess Alice — blue marlin, not a marsh morning",
    outgoing: "the same bank as the current dumps; troll along it, never across",
    "high-slack": "keep the spread out; slack here is still a seam",
    "low-slack": "work the south drop off Pico",
  },
  "sao-miguel": {
    incoming: "the Ponta Delgada south drop — tuna first, a billfish if you earned the early season",
    outgoing: "the same edge as it dumps; this is not Horta’s July photograph",
    "high-slack": "the town run is legal; the canyon wants bait",
    "low-slack": "hold for the next push along the south coast",
  },
};

export function pickHeadlineSpecies(area: Area, species: SpeciesPick[], leads?: SpeciesId[]) {
  return pickLead(area, species, leads);
}

export function composeHeadline(
  area: Area,
  lead: SpeciesPick | undefined,
  conditions: Conditions,
): string {
  const fish = lead?.species.commonName ?? "Fish";
  const verb =
    lead && (lead.score >= 6.5 || lead.inPlay) ? "today" : "are around";
  const place = PLACE[area.id]?.[conditions.tides.stage] ?? "wait for moving water on this water";
  const extra = heatNote(area, conditions.waterTempF, conditions.weather.windMph);
  const leadLine = `${fish} ${verb}. ${place.charAt(0).toUpperCase()}${place.slice(1)}.`;
  return extra ? `${leadLine} ${extra}` : leadLine;
}
