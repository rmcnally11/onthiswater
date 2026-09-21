import type { TheaterId } from "@/lib/types";

export const THEATER_META: { id: TheaterId; label: string; short: string }[] = [
  { id: "texas", label: "Texas", short: "Texas" },
  { id: "louisiana", label: "Louisiana", short: "Louisiana" },
  { id: "florida", label: "Florida", short: "Florida" },
  { id: "bahamas", label: "Bahamas", short: "Bahamas" },
  { id: "mexico", label: "Mexico", short: "Mexico" },
  { id: "puerto-rico", label: "Puerto Rico", short: "P. Rico" },
  { id: "seychelles", label: "Seychelles", short: "Seychelles" },
  { id: "north-carolina", label: "North Carolina", short: "N. Carolina" },
  { id: "south-carolina", label: "South Carolina", short: "S. Carolina" },
  { id: "azores", label: "Azores", short: "Azores" },
];

export const THEATER_IDS = THEATER_META.map((t) => t.id);

export function theaterLabel(theater: TheaterId) {
  return THEATER_META.find((t) => t.id === theater)?.label ?? theater;
}

export function isKeysFlorida(areaId: string) {
  return (
    areaId === "biscayne" ||
    areaId === "key-largo" ||
    areaId === "islamorada" ||
    areaId === "florida-bay" ||
    areaId === "marathon" ||
    areaId === "key-west"
  );
}
