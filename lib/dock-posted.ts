export const DOCK_POSTED = "https://www.dockposted.com";

export type FuelTarget = {
  href: string;
  label: string;
};

function boardUrl(query: Record<string, string> = {}): string {
  const url = new URL(DOCK_POSTED);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("utm_source", "onthiswater");
  url.searchParams.set("utm_medium", "handoff");
  url.hash = "board";
  return url.toString();
}

export function dockPostedHomeHref(): string {
  return boardUrl();
}

export function fuelHref(input: {
  theater?: string | null;
  areaId?: string | null;
}): FuelTarget {
  const area = (input.areaId ?? "").toLowerCase();
  const theater = (input.theater ?? "").toLowerCase();

  if (area === "sabine") {
    return { href: boardUrl({ region: "texas" }), label: "Texas posted fuel" };
  }
  if (area === "galveston" || (theater === "texas" && !area)) {
    return { href: boardUrl({ corridor: "galveston-bay" }), label: "Galveston posted fuel" };
  }
  if (theater === "texas") {
    return { href: boardUrl({ region: "texas" }), label: "Texas posted fuel" };
  }

  if (area === "key-largo") {
    return { href: boardUrl({ corridor: "upper-keys" }), label: "Keys posted fuel" };
  }
  if (
    area === "islamorada" ||
    area === "key-west" ||
    area === "marathon" ||
    area === "florida-bay" ||
    theater === "keys"
  ) {
    return { href: boardUrl({ region: "keys" }), label: "Keys posted fuel" };
  }

  if (
    theater === "louisiana" ||
    area === "venice" ||
    area === "grand-isle" ||
    area === "calcasieu"
  ) {
    return { href: boardUrl({ region: "louisiana" }), label: "Louisiana posted fuel" };
  }

  if (area === "boca-grande") {
    return { href: boardUrl({ region: "west-florida" }), label: "West Florida posted fuel" };
  }
  if (area === "jupiter" || area === "biscayne") {
    return { href: boardUrl({ region: "east-florida" }), label: "East Florida posted fuel" };
  }

  if (
    theater === "bahamas" ||
    theater === "mexico" ||
    theater === "puerto-rico" ||
    theater === "seychelles" ||
    theater === "north-carolina" ||
    theater === "south-carolina" ||
    theater === "azores"
  ) {
    return { href: boardUrl(), label: "US posted fuel" };
  }

  return { href: boardUrl(), label: "Dock Posted" };
}

export function fuelMailLine(input: {
  theater?: string | null;
  areaId?: string | null;
}): string {
  const next = fuelHref(input);
  return `Posted fuel on that coast: ${next.href}`;
}
