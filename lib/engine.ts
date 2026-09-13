import type {
  ActivityId,
  Area,
  Briefing,
  Conditions,
  Habitat,
  OfficialMark,
  SpeciesPick,
  Spot,
  SpotPick,
  TideStage,
  WindowPick,
} from "@/lib/types";
import { SPECIES, SPECIES_BY_ID } from "@/lib/data/species";
import { leadsFor } from "@/lib/data/areas";
import { spotsForArea } from "@/lib/data/spots";
import {
  flounderClosed,
  louisianaFlounderClosed,
  snookClosedOn,
} from "@/lib/data/species";
import { clockParts, hourInZone, ymdInZone } from "@/lib/time";
import { composeHeadline, pickHeadlineSpecies } from "@/lib/headline";
import { isSightSky, precipFishability, skyCopy } from "@/lib/wx";
import { tideGauge } from "@/lib/data/tide-gauges";
import { salinityCoast, salinitySiteFor } from "@/lib/salinity";
import { riverSiteFor } from "@/lib/rivers";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function thermalScore(temp: number | null, opt: [number, number], min: number, max: number) {
  if (temp == null) return 0.55;
  if (temp < min || temp > max) return 0.15;
  if (temp >= opt[0] && temp <= opt[1]) return 1;
  if (temp < opt[0]) return clamp((temp - min) / (opt[0] - min), 0, 1);
  return clamp((max - temp) / (max - opt[1]), 0, 1);
}

function monthIn(list: number[], month: number) {
  return list.includes(month);
}

function habitatTideFit(habitat: Habitat, stage: TideStage) {
  const table: Record<Habitat, Partial<Record<TideStage, number>>> = {
    "marsh-drain": { outgoing: 1, incoming: 0.75, "high-slack": 0.35, "low-slack": 0.2 },
    "grass-flat": { incoming: 1, "high-slack": 0.7, outgoing: 0.55, "low-slack": 0.25 },
    "hard-flat": { incoming: 1, outgoing: 0.75, "high-slack": 0.55, "low-slack": 0.3 },
    "oyster-reef": { incoming: 0.85, outgoing: 0.85, "high-slack": 0.7, "low-slack": 0.55 },
    "pass-jetty": { incoming: 0.9, outgoing: 1, "high-slack": 0.4, "low-slack": 0.45 },
    "channel-gut": { outgoing: 1, incoming: 0.7, "low-slack": 0.65, "high-slack": 0.4 },
    "sand-dropoff": { outgoing: 0.9, incoming: 0.75, "low-slack": 0.5, "high-slack": 0.4 },
    "structure-piling": { incoming: 0.9, outgoing: 0.9, "high-slack": 0.55, "low-slack": 0.5 },
    "mangrove-edge": { outgoing: 1, incoming: 0.75, "high-slack": 0.4, "low-slack": 0.35 },
    "wreck-edge": { outgoing: 0.95, incoming: 0.85, "low-slack": 0.55, "high-slack": 0.4 },
    "creek-bight": { outgoing: 0.95, incoming: 0.8, "high-slack": 0.45, "low-slack": 0.4 },
    "river-delta": { outgoing: 0.85, incoming: 0.7, "high-slack": 0.4, "low-slack": 0.35 },
    "spoil-bank": { incoming: 0.85, outgoing: 0.75, "high-slack": 0.55, "low-slack": 0.35 },
    "serpulid-reef": { incoming: 0.8, outgoing: 0.8, "high-slack": 0.7, "low-slack": 0.6 },
    "blue-water": { incoming: 0.8, outgoing: 0.8, "high-slack": 0.65, "low-slack": 0.6 },
  };
  return table[habitat]?.[stage] ?? 0.5;
}

function windFishability(mph: number | null, activity: ActivityId | "all") {
  if (mph == null) return 0.65;
  const cap =
    activity === "fly" || activity === "kayak"
      ? 16
      : activity === "wade"
        ? 20
        : activity === "offshore"
          ? 28
          : 22;
  if (mph < 4) return activity === "fly" ? 0.72 : 0.7; // slick: spooky for sight
  if (mph <= 12) return 1;
  if (mph <= cap) return 0.7;
  if (mph <= cap + 6) return 0.4;
  return 0.15;
}

function timeOfDayScore(hour: number, month: number, waterTemp: number | null) {
  const hot = (waterTemp ?? 75) >= 84 || month === 7 || month === 8;
  const cold = (waterTemp ?? 70) <= 58 || month === 12 || month === 1;
  if (hot) {
    if (hour < 8 || hour >= 17) return 1;
    if (hour < 10 || hour >= 16) return 0.7;
    return 0.25;
  }
  if (cold) {
    if (hour >= 11 && hour <= 16) return 1;
    if (hour >= 9 && hour <= 17) return 0.7;
    return 0.35;
  }
  if (hour >= 6 && hour <= 10) return 1;
  if (hour >= 16 && hour <= 19) return 0.9;
  return 0.55;
}

function isClosed(speciesId: string, area: Area, now: Date) {
  if (speciesId === "flounder" && area.theater === "texas") {
    return flounderClosed(now, area.timezone);
  }
  if (speciesId === "flounder" && area.theater === "louisiana") {
    return louisianaFlounderClosed(now, area.timezone);
  }
  if (speciesId === "snook") {
    return snookClosedOn(area.id, area.theater, now, area.timezone);
  }
  return false;
}

export function scoreSpecies(
  area: Area,
  conditions: Conditions,
  now: Date,
  activity: ActivityId | "all" = "all",
): SpeciesPick[] {
  const month = clockParts(now, area.timezone).month;
  const water = conditions.waterTempF;
  const leads = leadsFor(area, activity);
  const offshore = activity === "offshore";
  return SPECIES.filter((s) => s.theaters.includes(area.theater)).map((s) => {
    const closed = isClosed(s.id, area, now);
    const present = monthIn(s.presentMonths, month);
    const peak = monthIn(s.peakMonths, month);
    const season = !present ? 0.1 : peak ? 1 : 0.55;
    const thermal = thermalScore(water, s.tempOpt, s.tempMin, s.tempMax);
    const tideFit = Math.max(...s.preferTide.map((t) => (t === conditions.tides.stage ? 1 : 0.55)));
    let score = 10 * (0.4 * season + 0.35 * thermal + 0.25 * tideFit);
    if (closed) score *= 0.35;
    if (s.role === "incidental") score = Math.min(score, 5.8);
    if (s.role === "bluewater" && !offshore) score *= 0.42;
    if (s.role === "pacific" && area.theater !== "mexico") score = 0;
    const bits: string[] = [];
    if (s.role === "incidental") bits.push("Bycatch and beach noise — not the reason you came.");
    if (s.role === "bluewater") {
      bits.push(
        offshore
          ? "Bluewater. Weedlines, humps, and the edge — this is the method."
          : "Bluewater. Weedlines, humps, and the edge — not this flat or marsh. Switch method to Offshore.",
      );
    }
    if (s.role === "pacific") {
      bits.push(
        area.theater === "mexico"
          ? "Pacific / Sea of Cortez. Baja, not the Gulf."
          : "Pacific fish. Not on this atlas.",
      );
    }
    if (closed) bits.push("Closed to harvest — still swims, do not keep.");
    if (peak) bits.push("In peak season for this water.");
    else if (present) bits.push("Present, not peak.");
    else bits.push("Off-season here.");
    if (water != null) {
      if (water > s.tempMax - 2) bits.push(`Water ${water.toFixed(0)}°F is the hot edge for this fish.`);
      else if (water < s.tempMin + 3) bits.push(`Water ${water.toFixed(0)}°F is the cold edge.`);
      else if (water >= s.tempOpt[0] && water <= s.tempOpt[1]) bits.push(`Water ${water.toFixed(0)}°F sits in the feeding window.`);
    }
    if (s.preferTide.includes(conditions.tides.stage)) bits.push(`This tide stage (${conditions.tides.stage.replace("-", " ")}) matches how they hunt.`);
    const canHeadline =
      leads.includes(s.id) &&
      (s.role === "primary" ||
        (s.role === "pacific" && area.theater === "mexico") ||
        (s.role === "bluewater" && (offshore || area.leadSpecies.includes(s.id))));
    return {
      species: s,
      score: Number(clamp(score, 0, 10).toFixed(1)),
      inPlay: score >= 5 && present && canHeadline,
      closed,
      why: bits.join(" "),
    };
  }).sort((a, b) => b.score - a.score);
}

function spotMatchesActivity(spot: Spot, activity: ActivityId | "all") {
  if (activity === "all") return true;
  return spot.activities.includes(activity);
}

function wreckMarkToSpot(mark: OfficialMark, area: Area): Spot {
  return {
    id: mark.id,
    areaId: area.id,
    name: mark.name,
    lat: mark.lat,
    lon: mark.lon,
    habitat: "wreck-edge",
    activities: ["skiff", "spin", "fly", "offshore"],
    species:
      area.theater === "florida"
        ? ["permit", "tarpon", "hogfish", "yellowtail-snapper", "mutton-snapper", "black-grouper"]
        : area.theater === "texas" || area.theater === "louisiana"
          ? ["red-snapper", "mangrove-snapper", "sheepshead", "cobia", "amberjack"]
          : area.theater === "bahamas" || area.theater === "puerto-rico" || area.theater === "mexico"
            ? ["hogfish", "yellowtail-snapper", "mutton-snapper", "black-grouper"]
            : ["gt", "tuna"],
    source: "public-structure",
    note: `${mark.detail || "Charted wreck / obstruction."} NOAA ENC — surveyed position, not a navigation chart.`,
    depth: "deep",
  };
}

export function pickSpots(
  area: Area,
  conditions: Conditions,
  activity: ActivityId | "all",
  species: SpeciesPick[],
  wrecks: OfficialMark[] = [],
  now = new Date(),
): SpotPick[] {
  const inPlay = new Set(species.filter((s) => s.inPlay).map((s) => s.species.id));
  const wind = conditions.weather.windMph;
  const windDir = conditions.weather.windDirDeg;
  const water = conditions.waterTempF;
  const hot = (water ?? 75) >= 84;
  const cold = (water ?? 70) <= 58;

  const catalog = [
    ...spotsForArea(area.id, activity),
    ...wrecks
      .filter((w) => {
        const n = w.name.trim();
        if (!n || n === "Charted wreck") return false;
        if (/test/i.test(n) || /dangerous wreck/i.test(n)) return false;
        return true;
      })
      .slice(0, 8)
      .map((w) => wreckMarkToSpot(w, area)),
  ];

  return catalog
    .filter((spot) => {
      if (!spotMatchesActivity(spot, activity)) return false;
      const n = `${spot.name} ${spot.note}`.toLowerCase();
      const offshoreMark =
        n.includes("troll") ||
        n.includes("color change") ||
        n.includes("blue water") ||
        n.includes("hump") ||
        spot.habitat === "blue-water";
      if (activity === "offshore") return offshoreMark || spot.activities.includes("offshore");
      if (offshoreMark) return false;
      return true;
    })
    .map((spot) => {
      const why: string[] = [];
      let score = 4;
      const tideFit = habitatTideFit(spot.habitat, conditions.tides.stage);
      score += 3 * tideFit;
      why.push(
        `${spot.habitat.replaceAll("-", " ")} on ${conditions.tides.stage === "incoming" || conditions.tides.stage === "outgoing" ? "an" : "a"} ${conditions.tides.stage.replaceAll("-", " ")} tide is a ${tideFit >= 0.8 ? "classic" : tideFit >= 0.55 ? "workable" : "secondary"} match.`,
      );

      const sky = precipFishability(
        conditions.weather.wx,
        conditions.weather.precipChance,
        spot.habitat === "hard-flat" || spot.habitat === "grass-flat" || spot.depth === "skinny",
      );
      if (sky < 0.95) {
        if (conditions.weather.wx === "storm") {
          why.push("Thunderstorms — this mark is a stay-tied call, not a window.");
        } else if (conditions.weather.wx === "rain" && (spot.habitat === "hard-flat" || spot.depth === "skinny")) {
          why.push("Rain blinds skinny water. Sight dies before the fish do.");
        }
      }

      const speciesHit = spot.species.filter((id) => inPlay.has(id));
      score += Math.min(2, speciesHit.length * 0.7);
      if (speciesHit.length) {
        why.push(
          `In-play: ${speciesHit.map((id) => SPECIES_BY_ID[id]?.commonName ?? id).join(", ")}.`,
        );
      }

      if (hot && spot.depth === "deep") {
        score += 1.2;
        why.push("Water is hot — deeper guts, passes, and shade hold oxygen and fish.");
      }
      if (hot && spot.depth === "skinny" && clockParts(now, area.timezone).hour > 10 && clockParts(now, area.timezone).hour < 16) {
        score -= 1.4;
        why.push("Skinny water at midday in this heat is a walk, not a hunt.");
      }
      if (cold && (spot.depth === "deep" || spot.habitat === "channel-gut" || spot.habitat === "oyster-reef")) {
        score += 1.1;
        why.push("Cold water: fish slide to guts, shell, and the remaining water.");
      }

      const anomaly = conditions.tides.anomalyFt;
      const gulfMarsh =
        (area.theater === "texas" || area.theater === "louisiana") && area.tideCharacter === "marsh-current";
      if (anomaly != null && anomaly < -0.4 && (spot.depth === "deep" || spot.habitat === "channel-gut" || spot.habitat === "marsh-drain")) {
        score += 1;
        why.push(
          gulfMarsh
            ? `Observed water is ${anomaly.toFixed(1)} ft below the tide table — wind is pulling water out.`
            : `Observed water is ${anomaly.toFixed(1)} ft below the tide table — sit the remaining guts.`,
        );
      }
      if (anomaly != null && anomaly > 0.4 && (spot.habitat === "grass-flat" || spot.habitat === "hard-flat" || spot.habitat === "marsh-drain")) {
        score += 0.8;
        why.push(
          gulfMarsh
            ? `Observed water is ${anomaly.toFixed(1)} ft above the table — the marsh and flats are wetter than printed.`
            : `Observed water is ${anomaly.toFixed(1)} ft above the table — the banks are wetter than printed.`,
        );
      }

      if (wind != null && wind >= 15 && spot.protectedFrom && windDir != null) {
        const { min, max } = spot.protectedFrom;
        const sheltered = min <= max ? windDir >= min && windDir <= max : windDir >= min || windDir <= max;
        if (sheltered) {
          score += 1;
          why.push("Leeward of this wind.");
        }
      }
      if (activity === "fly" && wind != null && wind > 16) {
        score -= 1.2;
        why.push("Fly suffers in this wind — tighten the loop or pick spin.");
      }
      if (activity === "wade" && spot.depth === "deep") {
        score -= 0.8;
      }
      if (activity === "skiff" && conditions.tides.stage === "low-slack" && spot.depth === "skinny") {
        score -= 0.7;
        why.push("Skiff may be off plane / off the flat at dead low.");
      }
      if (
        activity !== "offshore" &&
        area.tideCharacter === "sight-skinny" &&
        (spot.habitat === "wreck-edge" || spot.habitat === "blue-water") &&
        spot.depth === "deep"
      ) {
        score -= 2.4;
        why.push("Offshore wreck or hump — secondary to the flat on this brief.");
      }
      if (activity === "offshore") {
        if (spot.habitat === "blue-water" || spot.habitat === "wreck-edge") {
          score += 1.6;
          why.push("Troll, edge, or jig water — this is the method.");
        }
        if (spot.depth === "skinny") {
          score -= 2.2;
          why.push("Skinny water. Not the offshore brief.");
        }
      }

      if (sky < 0.95) score *= 0.55 + 0.45 * sky;
      return { spot, score: Number(clamp(score, 0, 10).toFixed(1)), why };
    })
    .sort((a, b) => b.score - a.score);
}

export function pickWindows(
  area: Area,
  conditions: Conditions,
  activity: ActivityId | "all",
  now = new Date(),
): WindowPick[] {
  const hourly = conditions.tides.hourly;
  if (hourly.length < 4) return [];
  const windows: WindowPick[] = [];
  const parsed = hourly.map((h) => ({
    ...h,
    at: new Date(h.time.includes("T") ? `${h.time}:00Z` : `${h.time.replace(" ", "T")}:00Z`),
  }));

  for (let i = 1; i < parsed.length - 1; i++) {
    const slope = parsed[i].height - parsed[i - 1].height;
    const moving = Math.abs(slope) >= 0.03;
    if (!moving) continue;
    const hour = hourInZone(parsed[i].at, area.timezone);
    const tod = timeOfDayScore(hour, clockParts(parsed[i].at, area.timezone).month, conditions.waterTempF);
    const wind = conditions.weather.windMph;
    const w = windFishability(wind, activity);
    if (parsed[i].at < now) continue;
    const sky = precipFishability(
      conditions.weather.wx,
      conditions.weather.precipChance,
      isSightSky(area.tideCharacter, activity),
    );
    const score = clamp(10 * (0.4 * (moving ? 1 : 0.3) + 0.3 * tod + 0.18 * w + 0.12 * sky), 1, 10);
    const tide = slope > 0 ? "incoming" : "outgoing";
    const light = hour < 8 ? "First light" : hour >= 17 ? "Last light" : null;
    windows.push({
      start: parsed[i].time,
      end: parsed[Math.min(i + 2, parsed.length - 1)].time,
      label: light ? `${light} · ${tide}` : `${tide === "incoming" ? "Incoming" : "Outgoing"} water`,
      score: Number(score.toFixed(1)),
      why: light
        ? `${light} on ${tide} water.`
        : tod > 0.8
          ? "Moving water in the right part of the day."
          : "Water is moving, but the hour is against you — heat or dark.",
    });
  }

  const collapsed: WindowPick[] = [];
  for (const w of windows) {
    const last = collapsed[collapsed.length - 1];
    const sameTide = last && windowTide(last.label) === windowTide(w.label);
    if (last && sameTide && w.score >= 5) {
      last.end = w.end;
      last.score = Math.max(last.score, w.score);
      if (isLightWindow(w.label) && !isLightWindow(last.label)) {
        last.label = w.label;
        last.why = w.why;
      }
    } else if (w.score >= 5.2) {
      collapsed.push({ ...w });
    }
  }
  return collapsed.slice(0, 5);
}

function windowTide(label: string) {
  return /incoming/i.test(label) ? "incoming" : "outgoing";
}

function isLightWindow(label: string) {
  return /first light|last light/i.test(label);
}

export function buildBriefing(
  area: Area,
  conditions: Conditions,
  activity: ActivityId | "all",
  now = new Date(),
  official?: { wrecks?: OfficialMark[]; zones?: OfficialMark[]; access?: OfficialMark[] },
): Omit<Briefing, "generatedAt"> {
  const leads = leadsFor(area, activity);
  const species = scoreSpecies(area, conditions, now, activity)
    .filter((s) => {
      if (activity === "offshore") {
        return (
          s.species.role === "bluewater" ||
          s.species.role === "pacific" ||
          s.species.role === "incidental" ||
          leads.includes(s.species.id)
        );
      }
      if (s.species.role === "pacific") return area.theater === "mexico" && leads.includes(s.species.id);
      if (s.species.role === "bluewater") return area.leadSpecies.includes(s.species.id);
      return s.species.role === "primary" || s.species.role === "incidental";
    })
    .filter((s) => s.species.role === "incidental" || leads.includes(s.species.id))
    .sort((a, b) => {
      if (a.species.role !== b.species.role) {
        const rank = { primary: 0, pacific: 1, bluewater: 2, incidental: 3 } as const;
        return rank[a.species.role] - rank[b.species.role];
      }
      return b.score - a.score;
    });
  const where = pickSpots(area, conditions, activity, species, official?.wrecks ?? [], now).slice(0, 6);
  const when = pickWindows(area, conditions, activity, now);
  const month = clockParts(now, area.timezone).month;
  const water = conditions.waterTempF;
  const wind = conditions.weather.windMph;
  const why: string[] = [];
  const warnings: string[] = [];

  const gauge = tideGauge(area.noaaStation);
  const modeledNote =
    conditions.tides.source !== "modeled"
      ? gauge
        ? ` from NOAA ${gauge.id} ${gauge.name}`
        : " from NOAA"
      : gauge
        ? ` (modeled — NOAA ${gauge.id} ${gauge.name} did not answer)`
        : area.theater === "bahamas" || area.theater === "mexico" || area.theater === "seychelles"
          ? " (modeled — no NOAA gauge on this water)"
          : " (modeled — no NOAA gauge on this water)";
  why.push(`Tide is ${conditions.tides.stage.replace("-", " ")}${modeledNote}.`);
  if (conditions.tides.anomalyFt != null) {
    const a = conditions.tides.anomalyFt;
    const signed = `${a > 0 ? "+" : ""}${a.toFixed(2)}`;
    if (Math.abs(a) >= 0.35) {
      if (area.theater === "texas" || area.theater === "louisiana") {
        why.push(
          `On this coast the wind often outruns the printed tide. Observed water is ${signed} ft versus the prediction.`,
        );
      } else if (area.theater === "florida") {
        why.push(
          `The gauge is ${signed} ft off the predicted table — read the water, not just the printout.`,
        );
      } else if (area.theater === "mexico" || area.theater === "bahamas" || area.theater === "seychelles") {
        why.push(
          `The model is ${signed} ft off the harmonic table. Treat it as setup, not a guarantee.`,
        );
      } else if (area.theater === "puerto-rico") {
        why.push(
          `The gauge is ${signed} ft off the predicted table — read the water, not just the printout.`,
        );
      }
    } else {
      why.push("Observed water is close to the astronomical prediction — the table is telling the truth today.");
    }
  }
  if (water != null) {
    why.push(`Water ${water.toFixed(1)}°F. ${water >= 86 ? "Heat is the locator: early, late, deeper." : water <= 58 ? "Cold is the locator: guts, mud, midday sun." : "Temperature is in a workable band."}`);
  }
  const sky = precipFishability(
    conditions.weather.wx,
    conditions.weather.precipChance,
    isSightSky(area.tideCharacter, activity),
  );
  if (conditions.weather.wx || conditions.weather.precipChance != null || conditions.weather.sky) {
    why.push(
      `${skyCopy(conditions.weather.wx, conditions.weather.precipChance, conditions.weather.sky)}. ${
        conditions.weather.wx === "storm"
          ? "Lightning is a stay-tied call."
          : conditions.weather.wx === "rain"
            ? isSightSky(area.tideCharacter, activity)
              ? "Sight water goes blind. Wait it out or switch to stained marsh."
              : "Marsh still fishes in a shower. A soaker is a different day."
            : conditions.weather.wx === "clouds" && isSightSky(area.tideCharacter, activity)
              ? "Clouds steal the window on bones and permit."
              : "Sky is workable."
      }`,
    );
  }
  if (wind != null) {
    if (activity === "offshore") {
      why.push(
        `Wind ${wind.toFixed(0)} mph ${conditions.weather.windCardinal ?? ""}. ${
          wind <= 18
            ? "Troll and jig are on."
            : wind <= 28
              ? "A workday on a real boat. Fly-and-teaser gets ugly."
              : "Stay tied. This is not a skiff number."
        }`,
      );
    } else {
      why.push(
        `Wind ${wind.toFixed(0)} mph ${conditions.weather.windCardinal ?? ""}. ${wind <= 12 ? "Castable. Sight-fishing is on if the sun is out." : wind <= 18 ? "Work the leeward shore. Fly gets harder." : "This is a spin / structure / stay-home call."}`,
      );
    }
  }
  if (conditions.buoy) {
    const b = conditions.buoy;
    const bits: string[] = [];
    if (b.windMph != null) bits.push(`${Math.round(b.windMph)} mph ${b.windCardinal ?? ""}`.trim());
    if (b.waveFt != null) bits.push(`${b.waveFt.toFixed(1)} ft seas`);
    if (b.waterTempF != null) bits.push(`SST ${b.waterTempF.toFixed(0)}°F`);
    why.push(
      `NDBC ${b.id} ${b.name}: ${bits.join(" · ") || "no report"}. ${b.where}. Witness only — not the tide clock.`,
    );
  }
  why.push(
    `${conditions.moon.name} moon — ${conditions.moon.springNeap} tide range. ${
      area.tideCharacter === "sight-skinny"
        ? "Sight water often prefers a moderate range and clean water over a huge spring."
        : area.tideCharacter === "blue-water"
          ? "Offshore wants bait and current more than a skinny tide."
          : "Marsh and passes usually want the extra current of a spring."
    }`,
  );

  if (water != null && water >= 88) warnings.push("Extreme water temperature. Fish stress quickly — keep them wet, or don't boat them.");
  if (wind != null && wind >= (activity === "offshore" ? 30 : 22)) {
    warnings.push("Small-craft wind. The score is not a safety brief.");
  }
  if (conditions.weather.wx === "storm") {
    warnings.push("Thunderstorms in the forecast. Lightning is a stay-tied call. The score is not a safety brief.");
  } else if (conditions.weather.wx === "rain" && (conditions.weather.precipChance ?? 100) >= 50) {
    warnings.push(
      isSightSky(area.tideCharacter, activity)
        ? "Rain is likely. Sight-fishing goes blind — this is not a bonefish / permit day."
        : "Rain is likely. A marsh still fishes. A soaker and lightning do not.",
    );
  }
  if (conditions.river?.high) {
    warnings.push(
      `${conditions.river.name} is ${Math.round(conditions.river.cfs).toLocaleString()} cfs — coffee-colored water is the story. USGS ${conditions.river.site}.`,
    );
  }
  if (conditions.hab?.hot) {
    const habLine = `${conditions.hab.source} K. brevis ${conditions.hab.level}${conditions.hab.when ? ` · ${conditions.hab.when}` : ""}. ${conditions.hab.where} Patchy — not a score. Check the cite before you wade.`;
    warnings.push(habLine);
    why.unshift(habLine);
  }
  if (conditions.sargassum?.elevated) {
    warnings.push(`${conditions.sargassum.note} Not a GPS weed pin. Treat the neighborhood as weedy until you see the water.`);
  }
  if (conditions.salinity) {
    const s = conditions.salinity;
    why.push(
      `Salinity ${s.ppt.toFixed(s.ppt < 10 ? 1 : 0)} ppt at ${s.name} (${s.color}). USGS ${s.site}${s.kind === "river" ? " — river well, not mid-bay" : ""}.`,
    );
  } else if (salinityCoast(area.theater)) {
    const well = salinitySiteFor(area.id);
    why.push(
      well
        ? `USGS salinity well ${well.name} is quiet or stale — not all-clear, not a color reading.`
        : "No USGS 00480 well on this desk. Do not read another bay’s river as this water.",
    );
  }
  if (!conditions.river && (area.theater === "texas" || area.theater === "louisiana")) {
    const river = riverSiteFor(area.id);
    if (!river) {
      why.push("No USGS discharge gauge on this desk. Wind and the tide table still tell the color story.");
    }
  }
  for (const alert of conditions.alerts ?? []) {
    warnings.push(`NWS ${alert.event}: ${alert.headline}`);
  }
  if (area.theater === "mexico") {
    warnings.push("Mexico requires a CONAPESCA license. Sian Ka’an, Contoy, and Espíritu Santo are park or biosphere water — verify before you fish.");
  }
  if (area.theater === "puerto-rico") {
    warnings.push("Puerto Rico is DNER water, not FWC. Marine reserves (including Mosquito Bay) are not a freelance wade. Verify before you keep a fish.");
  }
  if (area.theater === "seychelles") {
    warnings.push("Seychelles requires an SFA license. Outer atolls are lodge water. Ste Anne and other parks are marked — verify before you fish.");
  }
  if (flounderClosed(now, area.timezone) && area.theater === "texas") {
    warnings.push("Texas flounder season is closed Nov 1–Dec 14. Catch-and-release only if you hook one.");
  }
  if (louisianaFlounderClosed(now, area.timezone) && area.theater === "louisiana") {
    warnings.push("Louisiana flounder is typically closed Oct 15–Nov 30. Verify LDWF before you keep one.");
  }
  if (snookClosedOn(area.id, area.theater, now, area.timezone)) {
    warnings.push(
      area.id === "boca-grande"
        ? "Charlotte Harbor / Southwest snook harvest is typically closed May 1–Sep 30 and Dec 1–end of Feb. Verify FWC."
        : "Snook are typically closed to harvest on the SE/Atlantic coast in this window. Verify FWC.",
    );
  }
  const zones = [...(official?.zones ?? [])].sort((a, b) => {
    const da = Math.hypot(a.lat - area.lat, (a.lon - area.lon) * Math.cos((area.lat * Math.PI) / 180));
    const db = Math.hypot(b.lat - area.lat, (b.lon - area.lon) * Math.cos((area.lat * Math.PI) / 180));
    return da - db;
  });
  const legal = zones.slice(0, 6);
  const extraLegal = Math.max(0, zones.length - legal.length);
  if (legal.length) {
    const names = legal.slice(0, 3).map((z) => z.name).join(", ");
    warnings.push(
      `FKNMS no-take water in this box: ${names}${extraLegal ? ` + ${extraLegal} more on the map` : ""}. The red polygons are the legal source — do not fish them.`,
    );
  }

  const top = pickHeadlineSpecies(area, species, leads);
  const overall = clamp(
    (0.4 * (where[0]?.score ?? 4) +
      0.3 * (top?.score ?? 4) +
      0.3 * (when[0]?.score ?? 4)) *
      (0.55 + 0.45 * sky),
    1,
    10,
  );

  const headline = composeHeadline(area, top, conditions);

  const forDate = ymdInZone(now, area.timezone);
  const todayYmd = ymdInZone(new Date(), area.timezone);
  const kind: Briefing["kind"] =
    forDate === todayYmd
      ? "today"
      : wind != null
        ? "forecast"
        : "astronomical";

  if (kind === "forecast") {
    warnings.unshift(
      `This page is for ${forDate}, not this morning. Wind is a forecast. Observed water versus the table is a today-only reading.`,
    );
  }
  if (kind === "astronomical") {
    warnings.unshift(
      `This page is for ${forDate}. No wind forecast that far out — score is tide, moon, and season. Not a best-dry-day call.`,
    );
  }

  let confidence: Briefing["confidence"] = "medium";
  if (kind === "today" && conditions.tides.source === "noaa" && water != null && wind != null) confidence = "high";
  if (kind === "forecast") confidence = "medium";
  if (kind === "astronomical" || (water == null && conditions.tides.source === "modeled")) confidence = "low";
  if (kind === "today" && conditions.tides.source === "modeled") confidence = "medium";

  void month;
  return {
    area,
    activity,
    forDate,
    kind,
    confidence,
    overall: Number(overall.toFixed(1)),
    headline,
    where,
    when,
    why,
    species,
    conditions,
    warnings,
    access: (official?.access ?? []).slice(0, 6),
    legal,
    extraLegal,
  };
}

export function activityWindPenalty(activity: ActivityId | "all", windMph: number | null) {
  return windFishability(windMph, activity);
}

export { timeOfDayScore, habitatTideFit };
