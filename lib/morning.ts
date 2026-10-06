import type { Briefing, CalendarDay } from "@/lib/types";
import { formatYmdLong } from "@/lib/time";
import { windLabel } from "@/lib/wind";
import { skyCopy } from "@/lib/wx";

export function morningLine(briefing: Briefing, yolo?: CalendarDay | null) {
  const name = briefing.area.shortName;
  const score = briefing.overall.toFixed(1);
  const wind =
    windLabel(briefing.conditions.weather.windMph, briefing.conditions.weather.windCardinal) ??
    "no wind reading yet";
  const sky =
    briefing.conditions.weather.wx || briefing.conditions.weather.precipChance != null
      ? ` ${skyCopy(briefing.conditions.weather.wx, briefing.conditions.weather.precipChance, briefing.conditions.weather.sky)}.`
      : "";
  const anomaly = briefing.conditions.tides.anomalyFt;
  const vs =
    anomaly != null && Math.abs(anomaly) >= 0.25
      ? ` Wind versus the table: ${anomaly > 0 ? "+" : ""}${anomaly.toFixed(1)} ft.`
      : "";
  const yoloBit =
    yolo && !yolo.date.startsWith("x")
      ? ` Best dry day is ${formatYmdLong(yolo.date, briefing.area.timezone)}.`
      : "";
  if (briefing.kind === "forecast") {
    return `${name} ${score} on ${formatYmdLong(briefing.forDate, briefing.area.timezone)}. ${wind}.${sky}${vs}${yoloBit} Scores are 1–10, not a bite.`;
  }
  if (briefing.kind === "astronomical") {
    return `${name} ${score} on ${formatYmdLong(briefing.forDate, briefing.area.timezone)} — tide, moon, and season only. No wind forecast that far out.${yoloBit} Scores are 1–10, not a bite.`;
  }
  return `${name} ${score} this morning. ${wind}.${sky}${vs}${yoloBit} Scores are 1–10, not a bite.`;
}
