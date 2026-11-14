import type { SkyKind } from "@/lib/types";

export type { SkyKind };

const RANK: Record<SkyKind, number> = { clear: 1, clouds: 2, rain: 3, storm: 4 };

export function skyFromText(text?: string | null): SkyKind | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("thunder") || t.includes("t-storm") || t.includes("tstm")) return "storm";
  if (t.includes("rain") || t.includes("shower") || t.includes("drizzle")) return "rain";
  if (t.includes("fog") || t.includes("overcast") || t.includes("cloud")) return "clouds";
  if (t.includes("sun") || t.includes("fair") || t.includes("clear")) return "clear";
  return null;
}

/** Open-Meteo WMO: 0–1 clear, 2/3/45/48 and drizzle 51–57 clouds, wet bands rain, 95+ storm. */
export function skyFromWmo(code?: number | null): SkyKind | null {
  if (code == null || Number.isNaN(code)) return null;
  if (code >= 95) return "storm";
  if ((code >= 61 && code <= 67) || (code >= 71 && code <= 77) || (code >= 80 && code <= 86)) return "rain";
  if ((code >= 51 && code <= 57) || code === 2 || code === 3 || code === 45 || code === 48) return "clouds";
  if (code === 0 || code === 1) return "clear";
  return null;
}

/** Human sky line from an Open-Meteo WMO code — used when NWS left the phrase blank. */
export function skyPhraseFromWmo(code?: number | null): string | null {
  if (code == null || Number.isNaN(code)) return null;
  if (code >= 95) return "Thunderstorms";
  if (code >= 80) return "Showers";
  if (code >= 71) return "Snow";
  if (code >= 61) return "Rain";
  if (code >= 51) return "Drizzle";
  if (code >= 45) return "Fog";
  if (code === 3) return "Overcast";
  if (code === 2) return "Partly cloudy";
  if (code === 1) return "Mostly clear";
  if (code === 0) return "Clear";
  return null;
}

export function worseSky(a: SkyKind | null, b: SkyKind | null): SkyKind | null {
  if (!a) return b;
  if (!b) return a;
  return RANK[a] >= RANK[b] ? a : b;
}

/** A 70% shower chance is rain even if the headline stayed “partly sunny.” */
export function coerceSky(kind: SkyKind | null, chance: number | null): SkyKind | null {
  if (kind === "storm") return "storm";
  if ((chance ?? 0) >= 70) return "rain";
  return kind;
}

/**
 * How much the sky should tax a 1–10. Storms are a stay-tied call.
 * Light rain still fishes a marsh; it blinds a bonefish flat.
 */
export function precipFishability(kind: SkyKind | null, chance: number | null, sight: boolean) {
  const sky = coerceSky(kind, chance);
  if (sky === "storm") return 0.28;
  if (sky === "rain") {
    if ((chance ?? 100) < 40) return sight ? 0.72 : 0.85;
    return sight ? 0.38 : 0.58;
  }
  if (sky === "clouds") return sight ? 0.72 : 0.92;
  return 1;
}

export function isSightSky(tideCharacter: string, activity?: string) {
  return tideCharacter === "sight-skinny" || activity === "fly";
}

export function skyCopy(kind: SkyKind | null, chance: number | null, text?: string | null) {
  const sky = coerceSky(kind, chance);
  const pop = chance != null ? `${Math.round(chance)}%` : null;
  if (sky === "storm") return pop ? `Thunderstorms · ${pop}` : "Thunderstorms";
  if (sky === "rain") return pop ? `Rain · ${pop}` : text?.trim() || "Rain";
  if (sky === "clouds") return text?.trim() || (pop ? `Clouds · ${pop}` : "Clouds");
  if (text?.trim()) return pop ? `${text.trim()} · ${pop}` : text.trim();
  return pop ? `${pop} chance of rain` : "No sky reading";
}

export function skyWord(kind: SkyKind | null) {
  if (kind === "storm") return "t-storm";
  if (kind === "rain") return "rain";
  return null;
}
