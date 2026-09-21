import type { ActivityId, Habitat, SpeciesId, TheaterId } from "@/lib/types";
import { AREAS } from "@/lib/data/areas";
import { theaterLabel } from "@/lib/data/theaters";
import {
  SPECIES,
  charlotteHarborSnookClosed,
  flounderClosed,
  louisianaFlounderClosed,
  seFloridaSnookClosed,
} from "@/lib/data/species";
import { texasKareniaClosureNote, texasKareniaShellfishClosed } from "@/lib/data/texas-hab";

export { theaterLabel };

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type WaterTypeId =
  | "fly"
  | "spin"
  | "sight"
  | "wade"
  | "skiff"
  | "structure"
  | "marsh"
  | "skinny"
  | "offshore";

export const WATER_TYPES: {
  id: WaterTypeId;
  label: string;
  short: string;
  activities?: ActivityId[];
  habitats?: Habitat[];
  species: SpeciesId[];
  essay: string;
}[] = [
  {
    id: "fly",
    label: "Fly",
    short: "Fly",
    activities: ["fly"],
    species: ["redfish", "speckled-trout", "snook", "tarpon", "bonefish", "permit", "gt"],
    essay:
      "Fly when the day allows it. That is the whole doctrine. Eight-weight for tails and bones, nine for permit, ten-plus when a tarpon is the job. Wind is the tax — above about 16 mph the presentation gets ugly and the honest move is the spinning rod. Lead the fish, put the fly where he is going, and do not trout-set a trout. Keys fish have seen every Gotcha in the catalog. Bahamas will forgive a sloppy landing Texas and Biscayne will not.",
  },
  {
    id: "spin",
    label: "Spin",
    short: "Spin",
    activities: ["spin"],
    species: [
      "redfish",
      "speckled-trout",
      "flounder",
      "black-drum",
      "sheepshead",
      "snook",
      "tarpon",
      "permit",
      "hogfish",
      "yellowtail-snapper",
      "mangrove-snapper",
      "mutton-snapper",
      "cobia",
      "pompano",
    ],
    essay:
      "Spin is not a consolation prize. It is what you do when the wind, the depth, or the fish does not allow the fly. Gold spoon in grass. Soft plastic when they will not come up. Live crab for a Keys permit that has refused every merkin. A 30-pound black drum in a Galveston channel is a day that does not owe you a strip-set. Carry both. Decide on the water.",
  },
  {
    id: "sight",
    label: "Sight fishing",
    short: "Sight",
    habitats: ["hard-flat", "grass-flat", "sand-dropoff"],
    species: ["bonefish", "permit", "redfish", "speckled-trout", "gt"],
    essay:
      "Sight water wants cleaner, often smaller range and a sun angle you can read. Lower Laguna and Baffin are the Texas classrooms — inches of water, serpulid rock, a tail that looks like a redfish until it is a drum. Keys oceanside is permit and bones on banks that get a boat every hour. Bahamas is the same game with more fish and fewer excuses. Alphonse is the Indian Ocean version — GT on the rim, bones inside. Polarized glasses are not optional. If you cannot see the bottom, you are fishing yesterday's rumor.",
  },
  {
    id: "wade",
    label: "Wade",
    short: "Wade",
    activities: ["wade"],
    species: ["redfish", "speckled-trout", "bonefish"],
    essay:
      "Feet on the flat. You need water you can stand in and a tide that does not strand you. Texas mid-coast grass and the Laguna spoil banks are the classic walk. Grand Bahama and the Abaco Marls are the thinking wade — pancake sand, long shots, no engine to spook the school. Do not wade a Keys oceanside bank you have not watched for a full cycle. The water leaves.",
  },
  {
    id: "skiff",
    label: "Skiff",
    short: "Skiff",
    activities: ["skiff"],
    species: ["permit", "bonefish", "tarpon", "redfish", "snook"],
    essay:
      "Pole the skinny, run the guts. A skiff loses a flat at dead low and loses the fish when you run across the bank they are using. Islamorada and Biscayne are poling theaters with boat traffic as a species. Flamingo is a different boat — backcountry, color, wind. Venice is a third — river-marsh, not a sight flat. Texas Rockport and Baffin are the same idea in grass and rock. Idle before you think you should.",
  },
  {
    id: "structure",
    label: "Jetty / rocks",
    short: "Rocks",
    activities: ["structure"],
    habitats: ["pass-jetty", "structure-piling", "oyster-reef"],
    species: [
      "sheepshead",
      "black-drum",
      "redfish",
      "flounder",
      "mangrove-snapper",
      "hogfish",
      "gag-grouper",
      "black-grouper",
    ],
    essay:
      "Granite, pilings, passes. Midday is legal — sheep face the tide and pick. Fall jetty bulls are a Texas event, not a rumor. Flounder sit the sand drains on the outgoing. This is spinning-rod country with a short, ugly leader if you insist on a fly. Do not invent a wreck as a honey hole. Named structure only, and the fish still have to be in season.",
  },
  {
    id: "marsh",
    label: "Marsh & drains",
    short: "Marsh",
    habitats: ["marsh-drain", "mangrove-edge", "creek-bight"],
    species: ["redfish", "speckled-trout", "flounder", "snook"],
    essay:
      "Marsh wants moving water. Flood the grass, drain the creek. On the Texas coast the wind often moves more water than the printed tide — observed minus predicted is the real story. Sabine and Galveston dump after a blow. Flamingo is the Florida version: reds and snook in the backcountry, not on the oceanside. If the table says incoming and the marsh is emptying, believe the marsh.",
  },
  {
    id: "skinny",
    label: "Skinny water",
    short: "Skinny",
    habitats: ["hard-flat", "grass-flat", "serpulid-reef"],
    species: ["bonefish", "permit", "redfish", "speckled-trout"],
    essay:
      "Inches. Baffin, Lower Laguna, Keys oceanside banks, Andros west-side sand, Ascension Bay, St François, Vieques banks. Tide character is sight-skinny: a huge range can empty the flat; a dead-small range can leave fish in a bathtub with no refresh. Push too far and you are walking the boat home. Trophy trout on serpulid rock is not the same as a school of 3-pound bones — same depth, different fish, different mistake.",
  },
  {
    id: "offshore",
    label: "Offshore",
    short: "Offshore",
    activities: ["offshore"],
    species: [
      "mahi",
      "sailfish",
      "wahoo",
      "tuna",
      "blue-marlin",
      "white-marlin",
      "striped-marlin",
      "swordfish",
      "red-snapper",
      "amberjack",
      "king-mackerel",
      "roosterfish",
      "gt",
    ],
    essay:
      "Trolling, the edge, and deep jigging. This is not the grass brief. Weedlines, humps, and named banks — Islamorada Hump, Flower Garden, Gordo, El Bajo, the Cancún sailfish current. Fly-and-teaser when the wind allows it. A heavy jig when it does not. Switch the method filter to Offshore or the engine will hide these marks on purpose. Roosterfish is Baja. Do not invent him on a Galveston morning.",
  },
];

export const REGION_ESSAYS: Record<
  TheaterId,
  { title: string; dek: string; body: string }
> = {
  texas: {
    title: "Texas — wind is the tide",
    dek: "Seven working bays, one printed table that is often a suggestion.",
    body: "This coast runs from a brackish border estuary at Sabine to hypersaline rock at Baffin and the clear classroom of the Lower Laguna. The main event is the red. Trout live a foot deeper in the same bays. Flounder own the fall nights at the passes until the November closure. Winter belongs to drum and sheep on mud and granite. Corpus still sees a tarpon along the beach in mid-summer — Port A was once Tarpon, Texas — but that is a bay-boat job, not the skinny skiff. Do not fish Baffin like Rockport. Do not invent Rollover Pass; it was filled in 2019. Birds are GPS for trout. A hard norther empties the shoreline and stacks fish in the guts. Fly when the morning is honest. The gold spoon is what you came for when it is not.",
  },
  florida: {
    title: "Florida — two coasts, do not mix them",
    dek: "Keys oceanside is bones and permit. Backcountry is reds and snook. Boca is the pass. Jupiter is the inlet.",
    body: "Biscayne is the north end of the grand-slam stage. Key Largo is the first Key — Card Sound, Garden Cove, Pennekamp as the launch, not a secret flat. Adjacent SPAs are no-take. Islamorada is the mecca — Channel 5, oceanside banks, wrecks for permit that have seen every crab. Flamingo is a different country: reds and snook, not oceanside bones. Marathon and Key West stretch it south. Then the mainland: Boca Grande Pass is the spring tarpon stack, Charlotte Harbor the snook and reds — Gulf rules, not Atlantic. Jupiter is inlet snook and a beach tarpon, clocked to Lake Worth Pier. Snook closures differ by FWC region. FKNMS polygons are Keys-only. Do not headline Jupiter with a bonefish.",
  },
  louisiana: {
    title: "Louisiana — river, marsh, and the birdfoot",
    dek: "Wind and the Mississippi move more water than the printed tide.",
    body: "Venice is the birdfoot — South and Southwest Pass, ponds on the west bank, bulls in the throats, school reds and trout inside, tarpon in the heat on the south passes. Grand Isle is a different desk: one inhabited barrier island, Caminada, Barataria, a state-park surf. Calcasieu is the Texas-border cousin under LDWF rules — same fish, different bag, not Sabine Lake. Reds are 4 a day, 18–27, none over 27. Trout are a slot. Flounder typically close Oct 15–Nov 30. Do not put a Texas tag on a Cameron fish.",
  },
  mexico: {
    title: "Mexico — two oceans, do not mix them",
    dek: "Yucatan is bones and sail. Baja is rooster and dorado. Neither is Texas.",
    body: "Ascension Bay / Sian Ka’an is the Caribbean flat — Punta Allen, permit and bones, biosphere rules, a modeled tide. Isla Mujeres is the other Yucatan desk: winter sailfish on the current, summer mahi, a troll-and-kite day. Cross the country and you are in another fishery. East Cape is rooster in the wash and Gordo Banks when the blue water is in. La Paz is Espíritu Santo and El Bajo. CONAPESCA license. No NOAA gauge. Roosterfish does not live in the Gulf of Mexico.",
  },
  bahamas: {
    title: "Bahamas — bonefish country",
    dek: "Winter singles. Summer schools. Permit on the west sides when it lays down.",
    body: "Andros is the capital — west-side white sand, schools by the acre, double-digit singles in the creeks, tarpon in the bights, permit May through October on the west side and outer cays. Abaco is Marls and ocean cays; verify what is actually running after Dorian. Grand Bahama is the thinking wade, a town to sleep in, big singles on foot. Eleuthera and the Exuma edge take more weather and give you more permit. Tides here are a modeled lunar clock, labeled as such — there is no NOAA gauge on these islands. Flats licensing has been tightening; verify before you wade. Jacks will find you. They are not why you booked the week.",
  },
  "puerto-rico": {
    title: "Puerto Rico — urban tarpon, east-island flats",
    dek: "DNER water. Real NOAA gauges. Not a Keys copy and not FWC.",
    body: "San Juan is Condado Lagoon and the bay — tarpon under the bridges, snook in the edges, a north-coast drop that is an offshore method. Vieques and Culebra are the Spanish Virgins: more sand, bones and permit, Mosquito Bay a reserve. La Parguera is the southwest mangrove desk, clocked to Magueyes 9759110. Blue marlin live in the story of this island; this brief will not invent a billfish on a lagoon. License is DNER. Do not paste a Jupiter snook closure onto Condado.",
  },
  seychelles: {
    title: "Seychelles — GT country",
    dek: "Indian Ocean atolls. Modeled tide. Lodge water on the outer rims.",
    body: "Alphonse and St François are the photograph — giant trevally on the edge, bones and Indo-Pacific permit on the sand. Farquhar is the southern atoll, same fish, farther. Mahé is the public door: reef, park water, blue water, not the St François flat. There is no NOAA gauge. Tide is a labeled model. SFA license. Roosterfish does not live here. Atlantic jack crevalle does not either. You came for a GT.",
  },
  "north-carolina": {
    title: "North Carolina — the Stream or the wind",
    dek: "Outer Banks to Cape Fear. Live NOAA gauges. NCDMF, not FWC.",
    body: "Hatteras is Oregon Inlet to Hatteras Inlet — a short run to the Stream when it lays down, tuna and mahi in the heat, winter bluefin when they show, a billfish if you booked that boat. Morehead City is the Crystal Coast: Beaufort Inlet, a short bluewater run, Big Rock tournament water. Wilmington is heavier inshore — Wrightsville, Cape Fear, reds and trout and fall flounder — then a longer run to Frying Pan. Clock the inlet you actually left. Do not fish Wilmington like Hatteras. Flounder seasons move; verify NCDMF before you keep a flatfish.",
  },
  "south-carolina": {
    title: "South Carolina — marsh reds, harbor bulls",
    dek: "Lowcountry and the Grand Strand. Live NOAA gauges. SCDNR, not NCDMF.",
    body: "Charleston is the Lowcountry capital — marsh reds, trout, flounder, harbor bulls, Cooper River Entrance as the clock. Hilton Head and Port Royal are the same fish under a bigger tide; Fort Pulaski is the nearest live well, not a Charleston Harbor substitute. Myrtle Beach is the Grand Strand: Murrells Inlet, Georgetown, Winyah Bay, Springmaid Pier on the surf. Do not fish Winyah like the harbor. SCDNR bags are not North Carolina numbers.",
  },
  azores: {
    title: "Azores — blue-marlin country",
    dek: "Mid-Atlantic islands. Modeled tide. Jul–Oct is why Horta exists.",
    body: "Horta on Faial is the world hub — English-facing charter fleet, Princess Alice the named bank, July through October the photograph. São Miguel / Ponta Delgada is the early-season second door, tuna and a billfish on the south drop before Faial’s peak. Tide is a labeled Atlantic model. There is no NOAA gauge. Blue marlin is catch-and-release culture here. Do not invent a Carolina marsh on Pico.",
  },
};

export const MONTH_THEATER: Record<number, Record<TheaterId, string>> = {
  1: {
    texas:
      "Gut month. Black drum and sheep on mud and granite. Trout slide to holes after a norther. Midday sun is legal. Reds still eat; they just will not tail in a north wind.",
    louisiana:
      "Same norther, more marsh. Reds in the ponds on the warm afternoon. Trout in the lakes. Venice is a coat and a gut.",
    florida:
      "Cold fronts thin the bones, then hand you a bluebird day. Snook closed on both coasts this month. Boca Pass is a winter red and a closed snook. Jupiter too.",
    bahamas:
      "Single-bone season. Fewer fish, bigger shoulders, longer leaders. Dress for the front. The school of 3-pounders is a summer story.",
    mexico:
      "Yucatan sail peak off Mujeres. Ascension bones if the front missed you. Baja rooster still eat; dress for the norther that was a Texas story yesterday.",
    "puerto-rico":
      "Tarpon in Condado if the winter wind lays down. Snook in the edges. The north drop is a coat and a kite.",
    seychelles:
      "NW monsoon. Atolls fish. GT on the rim, bones inside. This is why the week was booked in June.",
    "north-carolina":
      "Winter bluefin if they show off Hatteras. Inshore is a coat and a gut. Flounder is a later story — verify NCDMF.",
    "south-carolina":
      "Marsh reds on the warm afternoon. Harbor bulls if the wind lays down. A front is a plan.",
    azores:
      "Off-season. The fleet is not here yet. Tuna if a boat is running. Horta’s photograph is July.",
  },
  2: {
    texas:
      "Still winter. Sheep and drum until the water climbs. Early reds start to show on mud flats on the warm afternoons. Do not trust a February trout on the grass at dawn.",
    louisiana:
      "Last of the winter ponds. Reds start to show. Trout still want the remaining water. A front is a plan.",
    florida:
      "Bones and permit if the front missed you. Tarpon are a rumor that becomes a fish in March. Boca snook still closed through the end of the month.",
    bahamas:
      "The last honest month of winter singles. Book the wade. West-side permit are still early.",
    mexico:
      "Sail still on the Cancún bank. Ascension starts to feel like the photograph. East Cape rooster on warm afternoons.",
    "puerto-rico":
      "Same winter pattern. Harbor tarpon. East-island bones if the trade is honest.",
    seychelles:
      "Still the atoll season. Farquhar and Alphonse both eat. Mahé is a reef day.",
    "north-carolina":
      "Last of the winter inlets. Bluefin taper. Reds start to show on warm afternoons.",
    "south-carolina":
      "Last of the winter ponds. Reds start to show. A front is still a plan.",
    azores:
      "Still early. São Miguel is the second door if anyone is running. Horta waits.",
  },
  3: {
    texas:
      "The coast wakes up. Reds and trout both peak. Water is finally in the window. Windy, but the fish are on the grass again.",
    louisiana:
      "Reds and trout both turn on. Ponds fill. The birdfoot starts to feel like the photograph.",
    florida:
      "Permit opens its shoulders. Boca tarpon start to stack. Jupiter snook reopen on the typical SE calendar — verify FWC.",
    bahamas:
      "Transition. Winter singles mix with the first schools. A good month to have both a shrimp and a crab tied.",
    mexico:
      "Sail taper. Ascension permit and bones. Baja water starts to look like spring.",
    "puerto-rico":
      "Tarpon turn on. Permit on the east banks. San Juan still a lagoon, not a flat.",
    seychelles:
      "Peak shoulder. GT and bones both honest. Book this week in October.",
    "north-carolina":
      "The coast wakes up. Reds and trout both turn on. Cobia start to talk.",
    "south-carolina":
      "Marsh fills. Reds and trout both honest. The harbor starts to feel like itself.",
    azores:
      "Shoulder. São Miguel tuna if the water is right. Horta’s peak is still months away.",
  },
  4: {
    texas:
      "Prime. Reds tailing, trout on bait, water not yet a bathtub. This is the Texas month people move for.",
    louisiana:
      "Prime marsh. Reds in the ponds, trout on bait, the passes still honest. Book Venice now.",
    florida:
      "Tarpon month. Boca Grande Pass is why the rest of the year exists. Keys migration. Jupiter inlet. Permit still in play.",
    bahamas:
      "Bones through the spring. Tarpon in the bights. The week starts to feel like the photograph.",
    mexico:
      "Ascension grand-slam month. Mujeres mahi start. East Cape rooster and the first dorado.",
    "puerto-rico":
      "Tarpon month in the harbor. East-island permit. The north coast starts talking mahi.",
    seychelles:
      "Last of the classic atoll window before the SE trades build. GT still the headline.",
    "north-carolina":
      "Prime inshore. Reds and trout. Cobia on the beach. The Stream starts to look like spring.",
    "south-carolina":
      "Prime marsh. Reds in the creeks, trout on bait. Book Charleston now.",
    azores:
      "Early tuna on São Miguel. The Horta fleet starts to think about July.",
  },
  5: {
    texas:
      "Still excellent if you beat the heat. First light on the grass, then deeper. Jacks arrive as noise.",
    louisiana:
      "Still excellent early. Heat starts. Trout slide deeper at midday. First-light ponds.",
    florida:
      "Boca tarpon still the headline — then Gulf snook close May 1. Keys tarpon peak. Afternoon storms rewrite the flat.",
    bahamas:
      "West-side permit turn on. Bones still school. This is the grand-slam calendar month if the wind allows the fly.",
    mexico:
      "Baja turns on. Dorado, tuna on Gordo, rooster in the wash. Yucatan flats still honest if you beat the heat.",
    "puerto-rico":
      "Heat arrives. First-light tarpon. Mahi on the north drop. Snook in the trees at Parguera.",
    seychelles:
      "SE trades start. The atolls get wind. Mahé reef and a GT that still eats.",
    "north-carolina":
      "Still excellent early. Cobia. First mahi on the Stream. Heat starts at midday.",
    "south-carolina":
      "Still excellent early. Heat starts. First-light creeks. Kings on the beach.",
    azores:
      "The island warms. São Miguel still the honest early door. Horta is weeks out.",
  },
  6: {
    texas:
      "Too hot in the middle. Trout leave the flat at midday. Reds work drains at dawn. Corpus beach tarpon is a different boat.",
    louisiana:
      "Heat and river. Venice tarpon on the south passes. Trout at first light. Reds in the drains.",
    florida:
      "Snook closed on both coasts. Boca still a tarpon argument. Jupiter is catch-and-release. Do not harvest a snook because the score is an 8.",
    bahamas:
      "Summer schools of 3–5 lb bones. Permit on the west sides. Bring the buff and the 8-weight and go early.",
    mexico:
      "Heat. Ascension early. Mujeres mahi. East Cape is a dawn rooster and a midday bank.",
    "puerto-rico":
      "Too hot in the middle. Condado at dawn. The drop is a boat-and-ice problem.",
    seychelles:
      "Wind. This is not the photograph month on St François. Inner islands still fish.",
    "north-carolina":
      "Heat. First-light reds. Mahi and tuna on the Stream. Hatteras is a dawn inlet.",
    "south-carolina":
      "Heat. First-light creeks. Kings and a cobia if you already know the water.",
    azores:
      "The fleet starts to gather. Late June is a maybe. July is the photograph.",
  },
  7: {
    texas:
      "Bathtub bays. Night and first-light reds. Trout in guts and over deep grass. Beach tarpon if you already know the water.",
    louisiana:
      "Birdfoot tarpon if you already know the water. Night and first-light reds. Trout in the lakes.",
    florida:
      "Snook still closed. Boca Pass is a heat-and-current problem. Summer showers can switch a Key West flat on once they clear.",
    bahamas:
      "Schoolie bones and resident tarpon. The lodge week is a heat-management problem as much as a fish problem.",
    mexico:
      "Baja peak offshore. Dorado and tuna. Rooster at first light. Yucatan is a shade problem.",
    "puerto-rico":
      "Midsummer. Night and first-light tarpon. Mahi if the weed is in. Do not invent a bonefish morning in Condado.",
    seychelles:
      "SE monsoon. Offshore and reef more than the skinny sand. Tuna if you came for that.",
    "north-carolina":
      "Stream month. Mahi, tuna, a billfish off Hatteras and Morehead. Inshore is first light.",
    "south-carolina":
      "Midsummer. Night and first-light reds. Mahi if the weed is in. Do not invent a Hatteras morning in Winyah.",
    azores:
      "Peak starts. Horta is why the week was booked. Princess Alice if the water is right.",
  },
  8: {
    texas:
      "Same heat, slightly shorter days. Trout still deep. Reds on the first moving water. Flounder are a September story — do not force them.",
    louisiana:
      "Same heat. Venice tarpon thinning. Reds on the first moving water. Flounder are an October story here.",
    florida:
      "Snook still closed — Boca through September, Jupiter through August. Bones at first light. Thunder by two.",
    bahamas:
      "Summer pattern holds. Smaller packs, honest shots, west-side permit if it lays down. Fly in the morning. Shade at noon.",
    mexico:
      "Same heat. Gordo if the water is right. Ascension at dawn. Sail are a winter story.",
    "puerto-rico":
      "Same heat. Parguera trees at first light. The north drop if a storm missed you.",
    seychelles:
      "Still the windy half. Plan Mahé or wait for October.",
    "north-carolina":
      "Same heat. Stream still honest. Flounder are a later story — do not force them.",
    "south-carolina":
      "Same heat. Creeks at first light. The Strand if a storm missed you.",
    azores:
      "Peak. Horta and Princess Alice. This is the photograph month.",
  },
  9: {
    texas:
      "The coast exhales. Reds peak again. Trout come back up. Jetty bulls start to show. Water finally loses a few degrees.",
    louisiana:
      "The marsh exhales. Reds and trout come back up. Flounder start to think about the passes.",
    florida:
      "Jupiter snook typically reopen Sept 1. Boca stays closed through the 30th — Charlotte Harbor / Southwest. Verify FWC. Keys permit still around.",
    bahamas:
      "Bones and permit both still in play. The first cool nights are a rumor that becomes a fish in November.",
    mexico:
      "Baja still has dorado. Yucatan flats exhale. The sail fleet is still months away.",
    "puerto-rico":
      "The island exhales. Tarpon still eat. East banks start to look like themselves.",
    seychelles:
      "Trades ease. The atolls remember why you booked them.",
    "north-carolina":
      "The coast exhales. Reds and trout come back up. Stream still has mahi. Flounder start to think about the inlets.",
    "south-carolina":
      "The marsh exhales. Reds come back up. Flounder start to talk. Verify SCDNR.",
    azores:
      "Last of the classic window. Horta still eats. Book this week in March.",
  },
  10: {
    texas:
      "The best month many years. Reds, trout, and the flounder run to the Gulf. Nights at the passes. Measure every flatfish — the closure is coming.",
    louisiana:
      "Reds, trout, and the flounder run. LDWF typically shuts flounder Oct 15. Measure everything before the 15th.",
    florida:
      "Boca snook typically reopen Oct 1. Jupiter still open. Keys backcountry gets its color back.",
    bahamas:
      "Permit taper on the west sides. Bones start to look like winter again. A lovely shoulder week.",
    mexico:
      "Shoulder. Ascension bones look like winter. Baja dorado taper. Book Mujeres for January, not now.",
    "puerto-rico":
      "Shoulder. Permit and bones on Vieques. Harbor tarpon still honest.",
    seychelles:
      "The atoll year starts. GT peak. This is the week people should have booked in March.",
    "north-carolina":
      "Reds, trout, and the flounder run. NCDMF seasons move — verify before you keep a flatfish.",
    "south-carolina":
      "Reds, trout, and the flounder run. Measure everything. SCDNR, not NCDMF.",
    azores:
      "The fleet thins. Last honest billfish weeks. São Miguel is a plane change.",
  },
  11: {
    texas:
      "Flounder closed the entire month. Do not keep one. Reds still peak. Trout on the last warm grass. Drum show up with the first real front.",
    louisiana:
      "Flounder closed the entire month. Reds still eat. Trout on the last warm ponds. A front is a plan.",
    florida:
      "Bones like the cooler water. Backcountry reds. Boca and Jupiter snook still typically open — verify FWC. Tarpon are mostly gone.",
    bahamas:
      "Winter singles begin. This is why people book Andros in November. Long leaders. Soft landings. Fewer boats.",
    mexico:
      "Ascension winter bones. Mujeres sail start to show. Baja rooster still eat on a warm afternoon.",
    "puerto-rico":
      "Cooler water. East-island bones. A north swell is a plan, not a cancellation.",
    seychelles:
      "Prime. Alphonse and Farquhar both look like the photograph. You came for a GT.",
    "north-carolina":
      "Cooler water. Reds still eat. Flounder may already be shut — verify NCDMF. A norther is a plan.",
    "south-carolina":
      "Cooler water. Marsh reds. A north swell is a plan, not a cancellation.",
    azores:
      "Off-season. The photograph was July. Tuna if a boat is still running.",
  },
  12: {
    texas:
      "Flounder stay closed through the 14th. Drum and sheep take the granite. Trout in the guts. A Christmas cold snap is a plan, not a cancellation.",
    louisiana:
      "Flounder typically reopen Dec 1 — verify LDWF. Drum and reds in the remaining water. A front is still a plan.",
    florida:
      "Boca snook close Dec 1. Jupiter closes Dec 15. Bones if the front missed you. Sailfish live on the edge — not in this brief.",
    bahamas:
      "Peak winter bonefishing. Schools give way to singles. Permit are a maybe. You came for the grey ghost.",
    mexico:
      "Sail peak off Isla Mujeres. Ascension singles. Baja is a coat and a rooster. This is why the fleet is here.",
    "puerto-rico":
      "Winter tarpon in the lagoon. Sail on the north drop. DNER, not an FWC calendar.",
    seychelles:
      "Peak atoll. GT and bones. Mahé is where you change planes.",
    "north-carolina":
      "Winter inlets. Drum and reds in the remaining water. Bluefin if they show. A Christmas norther is a plan.",
    "south-carolina":
      "Winter marsh. Drum and reds. A front is still a plan. SCDNR, not an FWC calendar.",
    azores:
      "Off-season. Horta is a harbor and a plane. The fleet comes back in June.",
  },
};

export function waterTypeById(id: string | null | undefined) {
  return WATER_TYPES.find((t) => t.id === id) ?? null;
}

export function areasForType(type: WaterTypeId, theater?: TheaterId | "all") {
  const def = waterTypeById(type);
  return AREAS.filter((a) => {
    if (theater && theater !== "all" && a.theater !== theater) return false;
    if (type === "marsh") return a.tideCharacter === "marsh-current";
    if (type === "skinny" || type === "sight") return a.tideCharacter === "sight-skinny";
    if (type === "offshore") return Boolean(a.offshoreLead?.length) || a.tideCharacter === "blue-water";
    if (type === "structure")
      return (
        a.tideCharacter === "pass-current" ||
        a.theater === "texas" ||
        a.theater === "louisiana" ||
        a.theater === "north-carolina" ||
        a.theater === "south-carolina"
      );
    if (type === "fly" || type === "spin" || type === "wade" || type === "skiff") {
      return a.leadSpecies.some((id) => def?.species.includes(id));
    }
    return true;
  });
}

export function speciesForFilters(opts: {
  theater?: TheaterId | "all";
  type?: WaterTypeId | "all";
  speciesId?: SpeciesId | "all";
  month?: number;
}) {
  const type = opts.type && opts.type !== "all" ? waterTypeById(opts.type) : null;
  return SPECIES.filter((s) => {
    if (s.role === "bluewater" || s.role === "pacific") {
      if (opts.type === "offshore") return true;
      if (s.role === "pacific" && opts.theater === "mexico") return true;
      return false;
    }
    if (opts.speciesId && opts.speciesId !== "all" && s.id !== opts.speciesId) return false;
    if (opts.theater && opts.theater !== "all" && !s.theaters.includes(opts.theater)) return false;
    if (type && !type.species.includes(s.id)) return false;
    if (opts.month && !s.presentMonths.includes(opts.month)) return false;
    return true;
  });
}

export function peaksThisMonth(month: number, theater?: TheaterId | "all") {
  return SPECIES.filter((s) => {
    if (s.role !== "primary" && !(s.role === "pacific" && (theater === "mexico" || theater === "all" || !theater)))
      return false;
    if (!s.peakMonths.includes(month)) return false;
    if (theater && theater !== "all" && !s.theaters.includes(theater)) return false;
    return true;
  });
}

export type ClosureNote = { title: string; body: string; theaters: TheaterId[] };

export function closuresThisMonth(month: number, date = new Date()): ClosureNote[] {
  const notes: ClosureNote[] = [];
  if (texasKareniaShellfishClosed(date)) {
    notes.push(texasKareniaClosureNote());
  }
  if (flounderClosed(date, "America/Chicago")) {
    notes.push({
      title: "Texas flounder",
      body: "Closed Nov 1–Dec 14. The fall run is real in October. This week the correct fish is a red or a trout.",
      theaters: ["texas"],
    });
  } else if (month === 10) {
    notes.push({
      title: "Texas flounder — last call",
      body: "The run to the Gulf is on. Measure every fish. The season shuts Nov 1 through Dec 14.",
      theaters: ["texas"],
    });
  }
  if (louisianaFlounderClosed(date, "America/Chicago")) {
    notes.push({
      title: "Louisiana flounder",
      body: "Typically closed Oct 15–Nov 30. LDWF, not TPWD. Verify the week you keep one.",
      theaters: ["louisiana"],
    });
  } else if (month === 10) {
    notes.push({
      title: "Louisiana flounder — last call",
      body: "The run is on. Typical close is Oct 15. Measure everything.",
      theaters: ["louisiana"],
    });
  }
  if (seFloridaSnookClosed(date, "America/New_York")) {
    notes.push({
      title: "SE Florida snook (Jupiter, Keys, Biscayne)",
      body: "Typically closed Dec 15–Jan 31 and June 1–Aug 31. Catch-and-release is still fishing. Do not harvest a snook because a desk scored an 8.",
      theaters: ["florida"],
    });
  } else if (month === 5) {
    notes.push({
      title: "SE Florida snook — spawn window ahead",
      body: "The typical June–August closure is next. Verify FWC the morning you keep one.",
      theaters: ["florida"],
    });
  }
  if (charlotteHarborSnookClosed(date, "America/New_York")) {
    notes.push({
      title: "Charlotte Harbor / Boca Grande snook",
      body: "Typically closed Dec 1–end of Feb and May 1–Sep 30. Gulf region, not Atlantic. Verify FWC.",
      theaters: ["florida"],
    });
  }
  return notes;
}

export function closuresForCoasts(month: number, coasts: TheaterId[] | null, date = new Date()) {
  const notes = closuresThisMonth(month, date);
  if (!coasts || coasts.length === 0) return notes;
  return notes.filter((n) => n.theaters.some((t) => coasts.includes(t)));
}
