import { calendarHasForecastWind, type CalendarSnapshot } from "@/lib/snapshot-store";

export type CalendarBudget = {
  noaaMs: number;
  nwsMs: number;
  openMeteoMs: number;
  fallbackMs: number;
};

/** The short pass. Same ceilings the calendar used before the shared snapshot. */
export const TIGHT_BUDGET: CalendarBudget = {
  noaaMs: 2800,
  nwsMs: 2800,
  openMeteoMs: 2500,
  fallbackMs: 2500,
};

/**
 * Second pass when the short one comes back with no forecast wind. Long enough
 * for NWS's two serial calls and for an Open-Meteo request waiting on the
 * shared batch queue, including a fetch the short pass already abandoned.
 */
export const GENEROUS_BUDGET: CalendarBudget = {
  noaaMs: 10000,
  nwsMs: 12000,
  openMeteoMs: 18000,
  fallbackMs: 18000,
};

/** Keep the short pass when it has wind. Otherwise load the inputs again with a longer budget. */
export async function monthsForCalendarSnapshot(
  load: (budget: CalendarBudget) => Promise<CalendarSnapshot["months"]>,
): Promise<CalendarSnapshot["months"]> {
  const first = await load(TIGHT_BUDGET);
  if (calendarHasForecastWind({ v: 1, months: first })) return first;
  return load(GENEROUS_BUDGET);
}
