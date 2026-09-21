import type { Area, OfficialMark } from "@/lib/types";
import { isKeysFlorida } from "@/lib/data/theaters";

export type OfficialPoint = OfficialMark;

type ArcGisFeature = {
  attributes: Record<string, unknown>;
  geometry?: { x?: number; y?: number; rings?: number[][][]; points?: number[][] };
};

async function arcgisQuery(url: string) {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`GIS ${res.status}`);
  return res.json() as Promise<{ features?: ArcGisFeature[]; error?: { message: string } }>;
}

function centroid(rings?: number[][][]) {
  if (!rings?.[0]?.length) return null;
  const pts = rings[0];
  const x = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return { lon: x, lat: y };
}

function deskPad(area: Area) {
  if (area.id === "florida-bay" || area.id === "key-largo") return 0.18;
  if (area.theater === "florida" || area.theater === "louisiana") return 0.22;
  return 0.35;
}

function bbox(area: Area, pad = 0.35) {
  return {
    xmin: area.lon - pad,
    ymin: area.lat - pad,
    xmax: area.lon + pad,
    ymax: area.lat + pad,
  };
}

function nearDesk(area: Area, lat: number, lon: number, pad = deskPad(area)) {
  const dlat = lat - area.lat;
  const dlon = (lon - area.lon) * Math.cos((area.lat * Math.PI) / 180);
  return Math.hypot(dlat, dlon) <= pad;
}

export async function fetchGnisNear(area: Area): Promise<OfficialPoint[]> {
  const { xmin, ymin, xmax, ymax } = bbox(area, deskPad(area));
  const names = [
    "Pass",
    "Channel",
    "Cut",
    "Inlet",
    "Reef",
    "Bank",
    "Bight",
    "Point",
    "Key",
  ];
  if (area.theater === "mexico" || area.theater === "bahamas" || area.theater === "seychelles" || area.theater === "azores") return [];
  const state =
    area.theater === "texas"
      ? "TX"
      : area.theater === "florida"
        ? "FL"
        : area.theater === "louisiana"
          ? "LA"
          : area.theater === "puerto-rico"
            ? "PR"
            : area.theater === "north-carolina"
              ? "NC"
              : area.theater === "south-carolina"
                ? "SC"
                : "";
  const nameClause = names.map((n) => `gaz_name LIKE '%${n}%'`).join(" OR ");
  const where = state ? `state_alpha='${state}' AND (${nameClause})` : nameClause;
  const geom = `${xmin},${ymin},${xmax},${ymax}`;
  const url =
    `https://cartowfs.nationalmap.gov/arcgis/rest/services/geonames/FeatureServer/4/query` +
    `?geometry=${geom}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326` +
    `&spatialRel=esriSpatialRelIntersects&where=${encodeURIComponent(where)}` +
    `&outFields=gaz_name,gaz_featureclass,state_alpha,gaz_id,county_name&returnGeometry=true&resultRecordCount=40&f=json`;
  try {
    const json = await arcgisQuery(url);
    return (json.features ?? [])
      .filter((f) => f.geometry?.x != null && f.geometry?.y != null)
      .filter((f) => nearDesk(area, f.geometry!.y!, f.geometry!.x!))
      .map((f) => ({
        id: `gnis-${f.attributes.gaz_id}`,
        name: String(f.attributes.gaz_name),
        lat: f.geometry!.y!,
        lon: f.geometry!.x!,
        kind: "gnis" as const,
        source: "USGS GNIS",
        sourceUrl: `https://edits.nationalmap.gov/apps/gaz-domestic/public/search/names/${f.attributes.gaz_id}`,
        detail: `${f.attributes.gaz_featureclass} · ${f.attributes.county_name}, ${f.attributes.state_alpha} · Feature ID ${f.attributes.gaz_id}`,
      }))
      .sort((a, b) => {
        const da = Math.hypot(a.lat - area.lat, (a.lon - area.lon) * Math.cos((area.lat * Math.PI) / 180));
        const db = Math.hypot(b.lat - area.lat, (b.lon - area.lon) * Math.cos((area.lat * Math.PI) / 180));
        return da - db;
      });
  } catch {
    return [];
  }
}

export async function fetchEncWrecks(area: Area): Promise<OfficialPoint[]> {
  if (area.theater === "bahamas" || area.theater === "mexico" || area.theater === "seychelles" || area.theater === "azores") return [];
  const { xmin, ymin, xmax, ymax } = bbox(area, Math.min(0.28, deskPad(area) + 0.04));
  const url =
    `https://gis.charttools.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer/36/query` +
    `?geometry=${xmin},${ymin},${xmax},${ymax}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326` +
    `&spatialRel=esriSpatialRelIntersects&outFields=OBJNAM,CATWRK,VALSOU,INFORM,SORIND,SORDAT` +
    `&returnGeometry=true&resultRecordCount=40&f=json`;
  try {
    const json = await arcgisQuery(url);
    return (json.features ?? [])
      .filter((f) => f.geometry?.x != null)
      .filter((f) => nearDesk(area, f.geometry!.y!, f.geometry!.x!, Math.min(0.28, deskPad(area) + 0.04)))
      .map((f, i) => ({
        id: `enc-${area.id}-${i}-${f.geometry!.x}`,
        name: String(f.attributes.OBJNAM || "").trim() || "Charted wreck",
        lat: f.geometry!.y!,
        lon: f.geometry!.x!,
        kind: "enc-wreck" as const,
        source: "NOAA ENC (Office of Coast Survey)",
        sourceUrl: "https://www.nauticalcharts.noaa.gov/data/gis-data-and-services.html",
        detail: [
          f.attributes.CATWRK,
          f.attributes.VALSOU != null ? `sounding ${f.attributes.VALSOU}` : null,
          f.attributes.INFORM,
          f.attributes.SORIND,
        ]
          .filter(Boolean)
          .join(" · "),
      }))
      .sort((a, b) => {
        const an = a.name === "Charted wreck" || /^\d+$/.test(a.name) ? 1 : 0;
        const bn = b.name === "Charted wreck" || /^\d+$/.test(b.name) ? 1 : 0;
        return an - bn;
      });
  } catch {
    return [];
  }
}

const ZONE_LABEL: Record<number, string> = {
  1: "Sanctuary Preservation Area — no fishing / no take (typical SPA)",
  2: "Ecological Reserve — no take",
  3: "Research Only — closed except permitted science",
};

export async function fetchFknmsZones(area: Area): Promise<OfficialPoint[]> {
  if (!isKeysFlorida(area.id)) return [];
  const pad = area.id === "florida-bay" ? 0.16 : area.id === "key-largo" ? 0.2 : 0.28;
  const { xmin, ymin, xmax, ymax } = bbox(area, pad);
  const url =
    `https://gis.ngdc.noaa.gov/arcgis/rest/services/nccos/BenthicMapping_FKNMS_Dataviewer/MapServer/52/query` +
    `?geometry=${xmin},${ymin},${xmax},${ymax}&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326` +
    `&spatialRel=esriSpatialRelIntersects&outFields=NAME,ZONE_&returnGeometry=true&resultRecordCount=40&f=json`;
  try {
    const json = await arcgisQuery(url);
    return (json.features ?? [])
      .map((f, i) => {
        const c = centroid(f.geometry?.rings) ?? { lat: area.lat, lon: area.lon };
        const zone = Number(f.attributes.ZONE_);
        return {
          id: `fknms-${f.attributes.NAME}-${i}`,
          name: String(f.attributes.NAME),
          lat: c.lat,
          lon: c.lon,
          kind: "fknms-zone" as const,
          source: "NOAA FKNMS management zones",
          sourceUrl: "https://sanctuaries.noaa.gov/library/imast_gis.html",
          detail: ZONE_LABEL[zone] ?? `Zone type ${zone}`,
          legal: true,
        };
      })
      .filter((z) => {
        const dlat = z.lat - area.lat;
        const dlon = (z.lon - area.lon) * Math.cos((area.lat * Math.PI) / 180);
        return Math.hypot(dlat, dlon) <= pad;
      })
      .sort((a, b) => {
        const da = Math.hypot(a.lat - area.lat, (a.lon - area.lon) * Math.cos((area.lat * Math.PI) / 180));
        const db = Math.hypot(b.lat - area.lat, (b.lon - area.lon) * Math.cos((area.lat * Math.PI) / 180));
        return da - db;
      });
  } catch {
    return [];
  }
}

/** Public access we can stand behind without a live GLO token. Cited to the agency. */
const ACCESS: OfficialPoint[] = [
  {
    id: "acc-seawolf",
    name: "Seawolf Park",
    lat: 29.334,
    lon: -94.779,
    kind: "access",
    source: "TPWD / Galveston Parks — public ramp & pier",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "Pelican Island. Ramp, pier, jetty-adjacent. County park fees.",
  },
  {
    id: "acc-san-luis-park",
    name: "San Luis Pass County Park",
    lat: 29.078,
    lon: -95.127,
    kind: "access",
    source: "Brazoria County / GLO beach-access system",
    sourceUrl: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
    detail: "Follets Island. Ramp and beach. Current at the pass — wade with respect.",
  },
  {
    id: "acc-east-beach",
    name: "Galveston East Beach",
    lat: 29.324,
    lon: -94.723,
    kind: "access",
    source: "City of Galveston / Texas GLO beach access",
    sourceUrl: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
    detail: "Drive-on beach. 2WD when packed; 4WD after rain. GLO + city plan, not a TPWD ramp.",
  },
  {
    id: "acc-matagorda-nature",
    name: "Matagorda Bay Nature Park",
    lat: 28.6,
    lon: -95.98,
    kind: "access",
    source: "LCRA / TPWD coastal access",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "Colorado mouth. Ramp and park. River stain after rain.",
  },
  {
    id: "acc-goose-island",
    name: "Goose Island State Park",
    lat: 28.128,
    lon: -96.984,
    kind: "access",
    source: "TPWD state park",
    sourceUrl: "https://tpwd.texas.gov/state-parks/goose-island",
    detail: "Ramp, pier, wade shore. Copano / St. Charles.",
  },
  {
    id: "acc-packery-park",
    name: "Packery Channel County Park",
    lat: 27.608,
    lon: -97.202,
    kind: "access",
    source: "Nueces County / TPWD-listed launch",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "Ramp both sides of the cut. Wade the bars on a moving tide.",
  },
  {
    id: "acc-isla-blanca",
    name: "Isla Blanca Park",
    lat: 26.069,
    lon: -97.157,
    kind: "access",
    source: "Cameron County / GLO beach access",
    sourceUrl: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
    detail: "South end of SPI. Ramps, jetties, Brazos Santiago. County beach plan governs 2WD/4WD.",
  },
  {
    id: "acc-pins-malaquite",
    name: "Malaquite Visitor Center — PINS",
    lat: 27.425,
    lon: -97.297,
    kind: "pins",
    source: "NPS Padre Island National Seashore",
    sourceUrl: "https://www.nps.gov/pais/planyourvisit/beach-driving.htm",
    detail: "South Beach driving is 4WD, NPS permit, tires aired down. Closed sections shift after storms. Confirm nps.gov/pais before you drop a tire.",
  },
  {
    id: "acc-pins-north",
    name: "PINS North Beach",
    lat: 27.52,
    lon: -97.26,
    kind: "pins",
    source: "NPS Padre Island National Seashore",
    sourceUrl: "https://www.nps.gov/pais/planyourvisit/beach-driving.htm",
    detail: "North Beach is the easier drive. Still NPS rules, not a county 2WD corridor.",
  },
  {
    id: "acc-flamingo",
    name: "Flamingo Marina",
    lat: 25.141,
    lon: -80.924,
    kind: "access",
    source: "NPS Everglades National Park",
    sourceUrl: "https://www.nps.gov/ever/planyourvisit/flamingo.htm",
    detail: "The Florida Bay launch. Park fee. Backcountry permit if you camp.",
  },
  {
    id: "acc-pennekamp",
    name: "John Pennekamp Coral Reef State Park",
    lat: 25.125,
    lon: -80.407,
    kind: "access",
    source: "Florida State Parks",
    sourceUrl: "https://www.floridastateparks.org/parks-and-trails/john-pennekamp-coral-reef-state-park",
    detail: "Key Largo launch. Adjacent SPAs are no-take — check the red polygons.",
  },
  {
    id: "acc-harry-harris",
    name: "Harry Harris Park / Tavernier",
    lat: 25.025,
    lon: -80.493,
    kind: "access",
    source: "Monroe County Parks",
    sourceUrl: "https://www.monroecounty-fl.gov/",
    detail: "County park on the oceanside at the south end of Key Largo. Tavernier Creek is the cut.",
  },
  {
    id: "acc-founders",
    name: "Founders Park / Islamorada",
    lat: 24.94,
    lon: -80.61,
    kind: "access",
    source: "Village of Islamorada",
    sourceUrl: "https://www.islamorada.fl.us/",
    detail: "Public ramp, bayside. The oceanside flats are a run from here.",
  },
  {
    id: "acc-sabine-battleground",
    name: "Sabine Pass Battleground State Historic Site",
    lat: 29.733,
    lon: -93.875,
    kind: "access",
    source: "TPWD / THC historic site — public ramp",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "Texas Point / Sabine Pass. Ramp and jetty water. NOAA 8770822 is the clock.",
  },
  {
    id: "acc-umphrey",
    name: "Walter Umphrey State Park / Pleasure Island",
    lat: 29.733,
    lon: -93.898,
    kind: "access",
    source: "TPWD-listed launch · Port Arthur",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "Sabine Lake side. Marsh drains and lake edges from here.",
  },
  {
    id: "acc-61st",
    name: "Galveston 61st Street / Offatts Bayou",
    lat: 29.285,
    lon: -94.825,
    kind: "access",
    source: "City of Galveston / TPWD-listed launch",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "West Bay and Offatts. Trailer traffic. The bay side of the island.",
  },
  {
    id: "acc-quintana",
    name: "Quintana Beach County Park",
    lat: 28.932,
    lon: -95.308,
    kind: "access",
    source: "Brazoria County / GLO beach-access system",
    sourceUrl: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
    detail: "Freeport jetties and beach. County plan, not a TPWD park. Surf and pass water.",
  },
  {
    id: "acc-surfside",
    name: "Surfside Beach access",
    lat: 28.945,
    lon: -95.283,
    kind: "access",
    source: "Village of Surfside / Texas GLO",
    sourceUrl: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
    detail: "Drive-on when the county says so. 2WD on packed sand; 4WD after rain.",
  },
  {
    id: "acc-matagorda-harbor",
    name: "Matagorda Harbor",
    lat: 28.69,
    lon: -95.968,
    kind: "access",
    source: "Matagorda County / TPWD-listed launch",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "East Matagorda and the Colorado mouth. The Nature Park is next door.",
  },
  {
    id: "acc-poc-harbor",
    name: "Port O'Connor public harbor",
    lat: 28.448,
    lon: -96.406,
    kind: "access",
    source: "Calhoun County / TPWD-listed launch",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "West Matagorda, the ship channel, and the jetties. NOAA 8773701.",
  },
  {
    id: "acc-fulton",
    name: "Fulton Harbor",
    lat: 28.061,
    lon: -97.043,
    kind: "access",
    source: "Aransas County / TPWD-listed launch",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "Copano and Aransas. Goose Island is the other public door.",
  },
  {
    id: "acc-rockport-beach",
    name: "Rockport Beach",
    lat: 28.027,
    lon: -97.046,
    kind: "access",
    source: "City of Rockport / GLO beach access",
    sourceUrl: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
    detail: "Bay beach, pier, and park. Not a Gulf drive-on corridor.",
  },
  {
    id: "acc-indian-point",
    name: "Indian Point Park",
    lat: 27.853,
    lon: -97.355,
    kind: "access",
    source: "San Patricio County / TPWD-listed launch",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "Corpus / Nueces. Pier and ramp. Winter drum water from the bank.",
  },
  {
    id: "acc-port-a-beach",
    name: "Port Aransas Beach Access 1A",
    lat: 27.828,
    lon: -97.052,
    kind: "access",
    source: "City of Port Aransas / Texas GLO beach access",
    sourceUrl: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
    detail: "Typical 2WD when packed. City + GLO plan. Jetties are a short walk north.",
  },
  {
    id: "acc-padre-balli",
    name: "Padre Balli Park / Bob Hall Pier",
    lat: 27.588,
    lon: -97.217,
    kind: "access",
    source: "Nueces County / GLO beach access",
    sourceUrl: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
    detail: "Packery neighborhood. Pier, beach, county park. Confirm pier status after storms.",
  },
  {
    id: "acc-kaufer",
    name: "Kaufer-Hubert Memorial Park / Loyola Beach",
    lat: 27.36,
    lon: -97.68,
    kind: "access",
    source: "Kleberg County / TPWD-listed launch",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "The Baffin door from land. Ramp on the Laguna. King's Inn is the fried-shrimp shrine, not a waypoint.",
  },
  {
    id: "acc-bird-island",
    name: "Bird Island Basin — PINS",
    lat: 27.467,
    lon: -97.313,
    kind: "pins",
    source: "NPS Padre Island National Seashore",
    sourceUrl: "https://www.nps.gov/pais/planyourvisit/birdislandbasin.htm",
    detail: "Laguna-side campground and ramp. NPS fee. Windsurf and kayak water. Not the Gulf beach drive.",
  },
  {
    id: "acc-andy-bowie",
    name: "Andy Bowie Park",
    lat: 26.135,
    lon: -97.167,
    kind: "access",
    source: "Cameron County / GLO beach access",
    sourceUrl: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
    detail: "North SPI. County beach plan. 2WD/4WD posted at the entrance.",
  },
  {
    id: "acc-thomae",
    name: "Adolph Thomae Jr. County Park",
    lat: 26.355,
    lon: -97.43,
    kind: "access",
    source: "Cameron County / TPWD-listed launch",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "Arroyo Colorado into the Lower Laguna. Ramp and park. The LLM classroom starts here.",
  },
  {
    id: "acc-mansfield",
    name: "Port Mansfield public ramps",
    lat: 26.557,
    lon: -97.428,
    kind: "access",
    source: "Willacy County / TPWD-listed launch",
    sourceUrl: "https://tpwd.texas.gov/fishboat/boat/launch/",
    detail: "Basin and cut. NOAA 8778490. Laguna skinny a mile inside.",
  },
  {
    id: "acc-boca-chica",
    name: "Boca Chica / Beach Access 6",
    lat: 26.0,
    lon: -97.155,
    kind: "access",
    source: "Cameron County beach-access plan / Texas GLO",
    sourceUrl: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
    detail: "South of SPI. County plan is the 2WD/4WD law here. Closures shift with SpaceX and storms — confirm before you drop a tire.",
  },
  {
    id: "acc-matheson",
    name: "Matheson Hammock Park",
    lat: 25.679,
    lon: -80.266,
    kind: "access",
    source: "Miami-Dade Parks",
    sourceUrl: "https://www.miamidade.gov/parks/matheson-hammock.asp",
    detail: "West-side mangrove and basin launch. Baby tarpon and snook water, not the oceanside slam.",
  },
  {
    id: "acc-crandon",
    name: "Crandon Marina",
    lat: 25.721,
    lon: -80.155,
    kind: "access",
    source: "Miami-Dade Parks",
    sourceUrl: "https://www.miamidade.gov/parks/crandon.asp",
    detail: "Key Biscayne. Oceanside banks and Stiltsville from here. Park fee.",
  },
  {
    id: "acc-black-point",
    name: "Black Point Marina",
    lat: 25.537,
    lon: -80.327,
    kind: "access",
    source: "Miami-Dade Parks",
    sourceUrl: "https://www.miamidade.gov/parks/marinas-black-point.asp",
    detail: "South Biscayne. Featherbed and the Safety Valve are the run.",
  },
  {
    id: "acc-bahia-honda",
    name: "Bahia Honda State Park",
    lat: 24.658,
    lon: -81.277,
    kind: "access",
    source: "Florida State Parks",
    sourceUrl: "https://www.floridastateparks.org/parks-and-trails/bahia-honda-state-park",
    detail: "Middle Keys bridge and oceanside. Adjacent FKNMS polygons are no-take — check the red rings.",
  },
  {
    id: "acc-garrison-bight",
    name: "Garrison Bight / Key West public ramps",
    lat: 24.569,
    lon: -81.785,
    kind: "access",
    source: "City of Key West",
    sourceUrl: "https://www.cityofkeywest-fl.gov/",
    detail: "The Lower Keys door. Marquesas is a weather-window run from here.",
  },
  {
    id: "acc-placida",
    name: "Placida / Gasparilla public ramps",
    lat: 26.833,
    lon: -82.265,
    kind: "access",
    source: "Charlotte County",
    sourceUrl: "https://www.charlottecountyfl.gov/",
    detail: "Harbor side of the Boca desk. The Pass is a run south from here.",
  },
  {
    id: "acc-cayo-costa",
    name: "Cayo Costa State Park",
    lat: 26.66,
    lon: -82.22,
    kind: "access",
    source: "Florida State Parks",
    sourceUrl: "https://www.floridastateparks.org/parks-and-trails/cayo-costa-state-park",
    detail: "Barrier island south of Boca Grande Pass. Boat or ferry. Park rules.",
  },
  {
    id: "acc-burt-reynolds",
    name: "Burt Reynolds Park ramp",
    lat: 26.944,
    lon: -80.082,
    kind: "access",
    source: "Palm Beach County Parks",
    sourceUrl: "https://discover.pbcgov.org/parks/",
    detail: "Loxahatchee / Jupiter Inlet. County ramp. The inlet is in sight.",
  },
  {
    id: "acc-juno-pier",
    name: "Juno Beach Pier",
    lat: 26.893,
    lon: -80.056,
    kind: "access",
    source: "Palm Beach County Parks",
    sourceUrl: "https://discover.pbcgov.org/parks/",
    detail: "Public pier. Snook and a beach tarpon if they swing close.",
  },
  {
    id: "acc-venice-marina",
    name: "Venice public launches",
    lat: 29.277,
    lon: -89.355,
    kind: "access",
    source: "Plaquemines Parish / LDWF ramp directory",
    sourceUrl: "https://www.wlf.louisiana.gov/page/boat-ramps",
    detail: "Birdfoot door. South and Southwest Pass are the run. Confirm which ramps are open after a blow.",
  },
  {
    id: "acc-grand-isle-sp",
    name: "Grand Isle State Park",
    lat: 29.263,
    lon: -89.955,
    kind: "access",
    source: "Louisiana State Parks",
    sourceUrl: "https://www.lastateparks.com/historic-sites/grand-isle-state-park",
    detail: "Campground, pier, surf. NOAA 8761724 is on this island.",
  },
  {
    id: "acc-holly-beach",
    name: "Cameron / Calcasieu Point",
    lat: 29.768,
    lon: -93.34,
    kind: "access",
    source: "Cameron Parish / LDWF",
    sourceUrl: "https://www.wlf.louisiana.gov/page/boat-ramps",
    detail: "SW Louisiana beach. Parish rules shift. Calcasieu Pass is the next throat east.",
  },
  {
    id: "acc-punta-allen",
    name: "Punta Allen / Sian Ka’an",
    lat: 19.78,
    lon: -87.47,
    kind: "access",
    source: "Sian Ka’an Biosphere / CONAPESCA",
    sourceUrl: "https://www.gob.mx/conanp",
    detail: "Village launch into Ascension Bay. Biosphere reserve. Lodge and park rules. CONAPESCA license.",
  },
  {
    id: "acc-mujeres",
    name: "Isla Mujeres marinas",
    lat: 21.237,
    lon: -86.731,
    kind: "access",
    source: "CONAPESCA / Quintana Roo",
    sourceUrl: "https://www.gob.mx/conapesca",
    detail: "The sailfish fleet door. Not a flats ramp.",
  },
  {
    id: "acc-barriles",
    name: "Los Barriles launches",
    lat: 23.681,
    lon: -109.699,
    kind: "access",
    source: "CONAPESCA / BCS",
    sourceUrl: "https://www.gob.mx/conapesca",
    detail: "East Cape door. Surf rooster and the run to Gordo.",
  },
  {
    id: "acc-lapaz",
    name: "La Paz marinas / malecón",
    lat: 24.142,
    lon: -110.311,
    kind: "access",
    source: "CONAPESCA / BCS",
    sourceUrl: "https://www.gob.mx/conapesca",
    detail: "Town water. Espíritu Santo is the run north. Park rules on the island.",
  },
  {
    id: "acc-condado",
    name: "Condado / San Juan launches",
    lat: 18.457,
    lon: -66.08,
    kind: "access",
    source: "DNER / Municipio de San Juan",
    sourceUrl: "https://www.drna.pr.gov/",
    detail: "Urban door into the lagoon and the bay. NOAA 9755371 is on this harbor.",
  },
  {
    id: "acc-esperanza",
    name: "Esperanza / Vieques",
    lat: 18.093,
    lon: -65.47,
    kind: "access",
    source: "DNER",
    sourceUrl: "https://www.drna.pr.gov/",
    detail: "South-side village. Mosquito Bay is a reserve — not this ramp’s job.",
  },
  {
    id: "acc-parguera",
    name: "La Parguera village",
    lat: 17.974,
    lon: -67.046,
    kind: "access",
    source: "DNER",
    sourceUrl: "https://www.drna.pr.gov/",
    detail: "Southwest mangrove door. Magueyes 9759110 is the clock.",
  },
  {
    id: "acc-victoria",
    name: "Victoria / Mahé",
    lat: -4.62,
    lon: 55.45,
    kind: "access",
    source: "Seychelles Fishing Authority",
    sourceUrl: "https://www.sfa.sc/",
    detail: "The public inner-island door. Outer atolls are a plane, not a skiff ride.",
  },
  {
    id: "acc-alphonse",
    name: "Alphonse lodge",
    lat: -7.028,
    lon: 52.737,
    kind: "access",
    source: "SFA / Alphonse Island",
    sourceUrl: "https://www.sfa.sc/",
    detail: "Lodge water. St François is the neighbor atoll. Not a freelance wade.",
  },
  {
    id: "acc-farquhar",
    name: "Farquhar lodge",
    lat: -10.176,
    lon: 51.134,
    kind: "access",
    source: "SFA / Farquhar",
    sourceUrl: "https://www.sfa.sc/",
    detail: "Southern atoll door. Lodge and SFA rules.",
  },
  {
    id: "acc-oregon-inlet",
    name: "Oregon Inlet Fishing Center",
    lat: 35.796,
    lon: -75.547,
    kind: "access",
    source: "NCDMF / Dare County",
    sourceUrl: "https://www.deq.nc.gov/about/divisions/marine-fisheries",
    detail: "North Outer Banks door. The inlet is in sight. Confirm which ramps are open after a blow.",
  },
  {
    id: "acc-hatteras",
    name: "Hatteras village launches",
    lat: 35.219,
    lon: -75.69,
    kind: "access",
    source: "NCDMF / National Park Service",
    sourceUrl: "https://www.nps.gov/caha/",
    detail: "South Banks door. NOAA 8654467 is on this water. Cape Hatteras National Seashore rules.",
  },
  {
    id: "acc-morehead",
    name: "Morehead City / Beaufort waterfront",
    lat: 34.723,
    lon: -76.696,
    kind: "access",
    source: "NCDMF / Town of Morehead City",
    sourceUrl: "https://www.deq.nc.gov/about/divisions/marine-fisheries",
    detail: "Crystal Coast door. Beaufort Inlet is the run. Duke Marine Lab 8656483 is the clock.",
  },
  {
    id: "acc-wrightsville",
    name: "Wrightsville / Seapath launches",
    lat: 34.213,
    lon: -77.797,
    kind: "access",
    source: "NCDMF / New Hanover County",
    sourceUrl: "https://www.deq.nc.gov/about/divisions/marine-fisheries",
    detail: "Cape Fear door. Masonboro Inlet is in sight. NOAA 8658163 is on this beach.",
  },
  {
    id: "acc-charleston",
    name: "Charleston public landings",
    lat: 32.781,
    lon: -79.925,
    kind: "access",
    source: "SCDNR / City of Charleston",
    sourceUrl: "https://www.dnr.sc.gov/marine/",
    detail: "Harbor door. NOAA 8665530 is the entrance clock. County ramps shift after a blow.",
  },
  {
    id: "acc-hilton-head",
    name: "Hilton Head / Broad Creek landings",
    lat: 32.216,
    lon: -80.753,
    kind: "access",
    source: "SCDNR / Town of Hilton Head Island",
    sourceUrl: "https://www.dnr.sc.gov/marine/",
    detail: "Port Royal door. Clock is Fort Pulaski 8670870, the nearest live NOAA well.",
  },
  {
    id: "acc-murrells",
    name: "Murrells Inlet / Georgetown landings",
    lat: 33.528,
    lon: -79.025,
    kind: "access",
    source: "SCDNR",
    sourceUrl: "https://www.dnr.sc.gov/marine/",
    detail: "Grand Strand door. Winyah is the next river south. Springmaid 8661070 is the clock.",
  },
  {
    id: "acc-horta",
    name: "Horta marina",
    lat: 38.534,
    lon: -28.628,
    kind: "access",
    source: "Portos dos Açores",
    sourceUrl: "https://www.azores.gov.pt/",
    detail: "Faial door. The English-facing fleet. Princess Alice is the run, not a freelance wade.",
  },
  {
    id: "acc-ponta-delgada",
    name: "Ponta Delgada marina",
    lat: 37.741,
    lon: -25.668,
    kind: "access",
    source: "Portos dos Açores",
    sourceUrl: "https://www.azores.gov.pt/",
    detail: "São Miguel door. Early-season second hub. The south drop is the run.",
  },
];

export function accessNear(area: Area): OfficialPoint[] {
  const maxDeg =
    area.id === "florida-bay" || area.id === "key-largo"
      ? 0.18
      : area.theater === "florida" || area.theater === "louisiana"
      ? 0.28
      : area.theater === "texas"
        ? 0.55
        : area.theater === "mexico" ||
          area.theater === "seychelles" ||
          area.theater === "puerto-rico" ||
          area.theater === "azores"
        ? 0.4
        : area.theater === "north-carolina" || area.theater === "south-carolina"
          ? 0.35
          : 0.9;
  return ACCESS.filter((p) => {
    const dlat = p.lat - area.lat;
    const dlon = (p.lon - area.lon) * Math.cos((area.lat * Math.PI) / 180);
    return Math.hypot(dlat, dlon) < maxDeg;
  });
}

async function firstOrEmpty<T>(promise: Promise<T[]>, timeoutMs?: number): Promise<T[]> {
  const safe = promise.catch(() => [] as T[]);
  if (!timeoutMs) return safe;
  return Promise.race([
    safe,
    new Promise<T[]>((resolve) => {
      setTimeout(() => resolve([]), timeoutMs);
    }),
  ]);
}

export async function loadOfficialLayers(
  area: Area,
  opts?: { includeGnis?: boolean; timeoutMs?: number },
) {
  const includeGnis = opts?.includeGnis !== false;
  const timeoutMs = opts?.timeoutMs;
  const [gnis, wrecks, zones] = await Promise.all([
    includeGnis ? firstOrEmpty(fetchGnisNear(area), timeoutMs) : Promise.resolve([]),
    firstOrEmpty(fetchEncWrecks(area), timeoutMs),
    firstOrEmpty(fetchFknmsZones(area), timeoutMs),
  ]);
  return {
    gnis,
    wrecks,
    zones,
    access: accessNear(area),
    sources: [
      {
        name: "USGS GNIS",
        url: "https://www.usgs.gov/tools/geographic-names-information-system-gnis",
        use: "Canonical names and coordinates for passes, bays, channels.",
      },
      {
        name: "NOAA ENC / ENC Direct",
        url: "https://gis.charttools.noaa.gov/arcgis/rest/services/encdirect",
        use: "Charted wrecks and obstructions. Not for navigation.",
      },
      {
        name: "NOAA FKNMS GIS",
        url: "https://sanctuaries.noaa.gov/library/imast_gis.html",
        use: "Legal SPA / Ecological Reserve / Research-Only polygons.",
      },
      {
        name: "TPWD boat launch directory",
        url: "https://tpwd.texas.gov/fishboat/boat/launch/",
        use: "Public ramps. Coastal GIS also flows through TxGIO (formerly TNRIS) and TPWD open data.",
      },
      {
        name: "TxGIO / data.geographic.texas.gov",
        url: "https://data.geographic.texas.gov/",
        use: "State clearinghouse for TPWD coastal inventories when agency REST is token-gated.",
      },
      {
        name: "Texas GLO beach access",
        url: "https://www.glo.texas.gov/coast/coastal-management/beach-access",
        use: "Drive-on corridors and county beach-access plans (2WD/4WD).",
      },
      {
        name: "NPS Padre Island NS",
        url: "https://www.nps.gov/pais/planyourvisit/beach-driving.htm",
        use: "PINS driving, camping, and closure rules.",
      },
    ],
  };
}
