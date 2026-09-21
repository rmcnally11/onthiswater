export const DESKS = [
  {
    theater: "texas" as const,
    areaId: "galveston",
    desk: "Texas water",
    kicker: "Wind is the tide",
  },
  {
    theater: "louisiana" as const,
    areaId: "venice",
    desk: "Louisiana water",
    kicker: "River is the tide",
  },
  {
    theater: "florida" as const,
    areaId: "islamorada",
    desk: "Florida water",
    kicker: "Educated fish, short windows",
  },
  {
    theater: "bahamas" as const,
    areaId: "andros",
    desk: "Bahamas water",
    kicker: "Bonefish country",
  },
  {
    theater: "mexico" as const,
    areaId: "ascension",
    desk: "Mexico water",
    kicker: "Two oceans",
  },
  {
    theater: "puerto-rico" as const,
    areaId: "san-juan",
    desk: "Puerto Rico water",
    kicker: "Urban tarpon, then the drop",
  },
  {
    theater: "seychelles" as const,
    areaId: "alphonse",
    desk: "Seychelles water",
    kicker: "GT country",
  },
  {
    theater: "north-carolina" as const,
    areaId: "hatteras",
    desk: "North Carolina water",
    kicker: "The Stream or the wind",
  },
  {
    theater: "north-carolina" as const,
    areaId: "morehead-city",
    desk: "North Carolina water",
    kicker: "Short run to blue water",
  },
  {
    theater: "north-carolina" as const,
    areaId: "wilmington",
    desk: "North Carolina water",
    kicker: "Cape Fear inshore, then the shoals",
  },
  {
    theater: "south-carolina" as const,
    areaId: "charleston",
    desk: "South Carolina water",
    kicker: "Marsh reds, harbor bulls",
  },
  {
    theater: "south-carolina" as const,
    areaId: "hilton-head",
    desk: "South Carolina water",
    kicker: "Port Royal Sound",
  },
  {
    theater: "south-carolina" as const,
    areaId: "myrtle-beach",
    desk: "South Carolina water",
    kicker: "Grand Strand to Winyah",
  },
  {
    theater: "azores" as const,
    areaId: "horta",
    desk: "Azores water",
    kicker: "Blue-marlin country",
  },
  {
    theater: "azores" as const,
    areaId: "sao-miguel",
    desk: "Azores water",
    kicker: "Early-season second door",
  },
] as const;

const PLACE_NAME: Record<string, string> = {
  "san-juan": "San Juan",
  "sao-miguel": "São Miguel",
  "morehead-city": "Morehead City",
  "hilton-head": "Hilton Head",
  "myrtle-beach": "Myrtle Beach",
};

export function letterDeskForTheater(theater: string) {
  return DESKS.find((d) => d.theater === theater)?.areaId;
}

export function deskChoiceLabel(desk: (typeof DESKS)[number]) {
  const place =
    PLACE_NAME[desk.areaId] ??
    desk.areaId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${desk.desk.replace(" water", "")} — ${place}`;
}
