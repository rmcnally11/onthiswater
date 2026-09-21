export type TheaterId =
  | "texas"
  | "louisiana"
  | "florida"
  | "bahamas"
  | "mexico"
  | "puerto-rico"
  | "seychelles"
  | "north-carolina"
  | "south-carolina"
  | "azores";

export type ActivityId = "wade" | "skiff" | "kayak" | "fly" | "spin" | "structure" | "offshore";

export type Habitat =
  | "grass-flat"
  | "marsh-drain"
  | "oyster-reef"
  | "pass-jetty"
  | "channel-gut"
  | "sand-dropoff"
  | "hard-flat"
  | "mangrove-edge"
  | "wreck-edge"
  | "creek-bight"
  | "river-delta"
  | "spoil-bank"
  | "serpulid-reef"
  | "structure-piling"
  | "blue-water";

export type TideStage =
  | "incoming"
  | "high-slack"
  | "outgoing"
  | "low-slack";

export type MarkSource = "field-manual" | "public-structure" | "saved-map";

export type SpeciesId =
  | "redfish"
  | "speckled-trout"
  | "flounder"
  | "black-drum"
  | "sheepshead"
  | "snook"
  | "tarpon"
  | "bonefish"
  | "permit"
  | "hogfish"
  | "yellowtail-snapper"
  | "mangrove-snapper"
  | "mutton-snapper"
  | "red-snapper"
  | "lane-snapper"
  | "gag-grouper"
  | "red-grouper"
  | "black-grouper"
  | "cobia"
  | "pompano"
  | "tripletail"
  | "king-mackerel"
  | "spanish-mackerel"
  | "amberjack"
  | "jacks"
  | "mahi"
  | "sailfish"
  | "wahoo"
  | "tuna"
  | "blue-marlin"
  | "white-marlin"
  | "striped-marlin"
  | "swordfish"
  | "barracuda"
  | "roosterfish"
  | "gt";

/** Who may own a brief headline. Incidental = noise. Bluewater ≠ a flat. */
export type SpeciesRole = "primary" | "incidental" | "bluewater" | "pacific";

export type Area = {
  id: string;
  theater: TheaterId;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  timezone: string;
  noaaStation: string | null;
  noaaTempStation?: string | null;
  summary: string;
  /** Sight-fishing flats want cleaner, often smaller range. Marsh wants moving water. */
  tideCharacter: "marsh-current" | "sight-skinny" | "pass-current" | "blue-water";
  meanRangeFt: number;
  modeledTideOffsetHours?: number;
  /** Species that may own this micro-area's headline, in preference order. */
  leadSpecies: SpeciesId[];
  /** When method is offshore — troll, edge, jig. Inshore leads stay on the flat. */
  offshoreLead?: SpeciesId[];
};

export type Spot = {
  id: string;
  areaId: string;
  name: string;
  lat: number;
  lon: number;
  habitat: Habitat;
  activities: ActivityId[];
  species: SpeciesId[];
  source: MarkSource;
  note: string;
  /** Wind directions this shoreline is sheltered from, 0-360. */
  protectedFrom?: { min: number; max: number };
  depth: "skinny" | "mid" | "deep";
  /** USGS GNIS feature ID when the pin is snapped to the gazetteer. */
  gnisId?: number;
};

export type OfficialKind = "gnis" | "enc-wreck" | "fknms-zone" | "access" | "pins" | "saved-map";

export type OfficialMark = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: OfficialKind;
  source: string;
  sourceUrl: string;
  detail: string;
  legal?: boolean;
};

export type Species = {
  id: SpeciesId;
  commonName: string;
  latin: string;
  role: SpeciesRole;
  theaters: TheaterId[];
  peakMonths: number[];
  presentMonths: number[];
  tempMin: number;
  tempMax: number;
  tempOpt: [number, number];
  habitats: Habitat[];
  preferTide: TideStage[];
  flyNote: string;
  spinNote: string;
  why: string;
  regulation: string;
  regulationUrl: string;
};

export type HiLo = {
  time: string;
  height: number;
  type: "H" | "L";
};

export type HourlyTide = {
  time: string;
  height: number;
};

export type AnomalyPoint = {
  time: string;
  predicted: number;
  observed: number;
  anomaly: number;
};

export type TideAnalysis = {
  stage: TideStage;
  rising: boolean;
  predictedNow: number | null;
  observedNow: number | null;
  anomalyFt: number | null;
  anomalySeries: AnomalyPoint[];
  rangeTodayFt: number | null;
  nextHiLo: HiLo[];
  hourly: HourlyTide[];
  source: "noaa" | "modeled";
};

export type SkyKind = "clear" | "clouds" | "rain" | "storm";

export type WeatherNow = {
  airF: number | null;
  windMph: number | null;
  windGustMph: number | null;
  windDirDeg: number | null;
  windCardinal: string | null;
  pressureMb: number | null;
  /** 3-hour change in mb. Positive is rising glass. */
  pressureTrendMb: number | null;
  pressureSource: "ndbc" | "noaa" | "open-meteo" | null;
  /** Named station or “Open-Meteo modeled”. */
  pressureCite: string | null;
  /** 0–100. NWS POP or Open-Meteo probability. */
  precipChance: number | null;
  /** Inches this hour when Open-Meteo answered. */
  precipIn: number | null;
  /** NWS shortForecast or a sky phrase. */
  sky: string | null;
  wx: SkyKind | null;
  source: "noaa" | "nws" | "open-meteo";
  fetchedAt: string;
};

export type RiverNow = {
  site: string;
  name: string;
  cfs: number;
  high: boolean;
  fetchedAt: string;
};

/** NDBC buoy or C-MAN. Witness only — never the tide clock. */
export type BuoyNow = {
  id: string;
  name: string;
  kind: "buoy" | "c-man";
  href: string;
  where: string;
  windMph: number | null;
  windGustMph: number | null;
  windDirDeg: number | null;
  windCardinal: string | null;
  waveFt: number | null;
  waterTempF: number | null;
  pressureMb: number | null;
  pressureTrendMb: number | null;
  fetchedAt: string;
};

export type MarineAlert = {
  event: string;
  headline: string;
  severity: string;
};

export type HabNow = {
  hot: boolean;
  level: string;
  where: string;
  when: string | null;
  source: string;
  href: string;
};

export type SargassumNow = {
  elevated: boolean;
  level: string;
  note: string;
  source: string;
  href: string;
  bulletinHref: string;
};

export type SalinityNow = {
  ppt: number;
  color: string;
  site: string;
  name: string;
  kind: "bay" | "river";
  href: string;
  fetchedAt: string;
};

export type Conditions = {
  areaId: string;
  waterTempF: number | null;
  waterTempSource: string | null;
  tides: TideAnalysis;
  weather: WeatherNow;
  moon: {
    phase: number;
    name: string;
    illumination: number;
    springNeap: "spring" | "neap" | "mid";
  };
  /** USGS IV 00060 on Texas / Louisiana river mouths. */
  river?: RiverNow | null;
  /** NDBC buoy or C-MAN nearest this water. Not the tide. */
  buoy?: BuoyNow | null;
  hab?: HabNow | null;
  sargassum?: SargassumNow | null;
  salinity?: SalinityNow | null;
  /** Active NWS marine / flood / convective alerts at this point. */
  alerts?: MarineAlert[];
};

export type SpotPick = {
  spot: Spot;
  score: number;
  why: string[];
};

export type WindowPick = {
  start: string;
  end: string;
  label: string;
  score: number;
  why: string;
};

export type SpeciesPick = {
  species: Species;
  score: number;
  inPlay: boolean;
  closed: boolean;
  why: string;
};

export type BriefKind = "today" | "forecast" | "astronomical";

export type Briefing = {
  area: Area;
  activity: ActivityId | "all";
  generatedAt: string;
  /** Local Y-M-D this brief is built for. */
  forDate: string;
  kind: BriefKind;
  confidence: "high" | "medium" | "low";
  overall: number;
  headline: string;
  where: SpotPick[];
  when: WindowPick[];
  why: string[];
  species: SpeciesPick[];
  conditions: Conditions;
  warnings: string[];
  /** TPWD / GLO / NPS public launches and drive-on corridors near this water. */
  access: OfficialMark[];
  /** FKNMS no-take polygons and other legal closures in the box. */
  legal: OfficialMark[];
  /** Zones in the GIS box beyond the six shown on the brief. */
  extraLegal?: number;
};

export type CalendarTide = {
  type: "H" | "L";
  time: string;
  height: number;
};

export type CalendarDay = {
  date: string;
  score: number;
  confidence: "observed" | "forecast" | "astronomical";
  drivers: string[];
  bestWindow: string | null;
  /** Score high enough that this is a book-the-day window for this micro-area. */
  amazing: boolean;
  /** Best remaining dry day this month with a real wind forecast. */
  yolo: boolean;
  moon: {
    name: string;
    glyph: string;
    phase: number;
    illumination: number;
    springNeap: "spring" | "neap" | "mid";
  };
  tides: CalendarTide[];
  tideRangeFt: number | null;
  windMph: number | null;
  precipChance: number | null;
  wx: SkyKind | null;
};
