import { cardinalFromDeg, degreesFromCardinal } from "@/lib/time";

export function windLabel(mph: number | null | undefined, cardinal?: string | null) {
  if (mph == null || !Number.isFinite(mph)) return null;
  const n = Math.round(mph);
  return cardinal ? `${n} mph ${cardinal}` : `${n} mph`;
}

export function resolveWindDegrees(degrees: number | null | undefined, cardinal?: string | null) {
  if (degrees != null && Number.isFinite(degrees)) return degrees;
  return degreesFromCardinal(cardinal);
}

/** Same words the compass already uses when a direction exists. */
export function windCompassCaption(
  degrees: number | null | undefined,
  mph: number | null | undefined,
  cardinal?: string | null,
  gust?: number | null,
) {
  const resolved = resolveWindDegrees(degrees, cardinal);
  const gustBit = gust != null && Number.isFinite(gust) ? ` · gust ${Math.round(gust)}` : "";
  if (resolved != null) {
    const name = cardinal || cardinalFromDeg(resolved);
    return `From ${name ?? `${Math.round(resolved)}°`}${gustBit}`;
  }
  if (mph != null && Number.isFinite(mph)) return `${Math.round(mph)} mph${gustBit}`;
  return "No wind reading";
}

export function windLevel(mph: number) {
  if (mph < 8) return 1;
  if (mph < 16) return 2;
  return 3;
}

export function windWord(mph: number | null) {
  if (mph == null) return "no wind forecast";
  const n = Math.round(mph);
  if (mph < 8) return `light · ${n} mph`;
  if (mph < 16) return `breeze · ${n} mph`;
  if (mph < 22) return `windy · ${n} mph`;
  return `blow · ${n} mph`;
}
