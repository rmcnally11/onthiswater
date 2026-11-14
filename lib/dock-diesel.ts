/**
 * Gulf Coast (PADD 3) weekly retail on-highway diesel and regular gasoline.
 *
 * Runtime fetch is the public Gasoline and Diesel Fuel Update. No API key.
 * https://www.eia.gov/petroleum/gasdiesel/
 *
 * Series (weekly, dollars per gallon, retail):
 * - Diesel, No. 2: EMD_EPD2D_PTE_R30_DPG
 *   https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMD_EPD2D_PTE_R30_DPG&f=W
 *   https://www.eia.gov/dnav/pet/hist_xls/EMD_EPD2D_PTE_R30_DPGw.xls
 * - Regular gasoline, all formulations: EMM_EPMR_PTE_R30_DPG
 *   https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMM_EPMR_PTE_R30_DPG&f=W
 *   https://www.eia.gov/dnav/pet/hist_xls/EMM_EPMR_PTE_R30_DPGw.xls
 *
 * These are road-fuel retail averages. They are not marina dock prices.
 */

export const EIA_GASDIESEL_URL = "https://www.eia.gov/petroleum/gasdiesel/";

export const EIA_DIESEL_SERIES_ID = "EMD_EPD2D_PTE_R30_DPG";
export const EIA_DIESEL_SERIES_URL =
  "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMD_EPD2D_PTE_R30_DPG&f=W";
export const EIA_DIESEL_HISTORY_XLS = "https://www.eia.gov/dnav/pet/hist_xls/EMD_EPD2D_PTE_R30_DPGw.xls";

export const EIA_REGULAR_SERIES_ID = "EMM_EPMR_PTE_R30_DPG";
export const EIA_REGULAR_SERIES_URL =
  "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMM_EPMR_PTE_R30_DPG&f=W";
export const EIA_REGULAR_HISTORY_XLS = "https://www.eia.gov/dnav/pet/hist_xls/EMM_EPMR_PTE_R30_DPGw.xls";

/** Hide the line when the published week is older than this many calendar days. */
export const DOCK_DIESEL_MAX_AGE_DAYS = 14;

export const DOCK_DIESEL_NOTE =
  "EIA weekly, Gulf Coast retail average. Road fuel, not a marina dock price.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const PRICE_RE = /^\d+\.\d{2,3}$/;
const WEEK_CELL_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
const ISO_WEEK_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DockDieselQuote = {
  /** Monday survey date, YYYY-MM-DD. */
  week: string;
  /** EIA's published dollars-per-gallon text, not a rounded rewrite. */
  diesel: string;
  regular: string;
};

export function isGulfFuelDesk(theater: string | null | undefined): boolean {
  return theater === "texas" || theater === "louisiana";
}

export function dockDieselForDesk(
  theater: string | null | undefined,
  quote: DockDieselQuote | null,
): DockDieselQuote | null {
  if (!isGulfFuelDesk(theater) || !quote) return null;
  return quote;
}

function stripTags(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function cells(rowHtml: string, tag: "th" | "td"): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  return [...rowHtml.matchAll(re)].map((match) => stripTags(match[1] ?? ""));
}

function parseWeekCell(raw: string): string | null {
  const match = WEEK_CELL_RE.exec(raw.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const yy = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const year = yy >= 70 ? 1900 + yy : 2000 + yy;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function headerWeeks(table: string): Array<string | null> {
  const head = table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1] ?? "";
  let best: Array<string | null> = [];
  let bestCount = 0;
  for (const tr of head.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const parsed = cells(tr[1] ?? "", "th").map(parseWeekCell);
    const count = parsed.filter((week) => week).length;
    if (count > bestCount) {
      best = parsed;
      bestCount = count;
    }
  }
  return bestCount > 0 ? best : [];
}

function gulfCells(table: string): string[] | null {
  const body = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  for (const tr of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const raw = tr[1] ?? "";
    const padd3 = /pet_pri_gnd_dcus_r30_w/i.test(raw);
    const text = stripTags(raw);
    const named = /gulf coast/i.test(text) && /padd\s*3/i.test(text);
    if (!padd3 && !named) continue;
    return cells(raw, "td");
  }
  return null;
}

function productOf(table: string): "diesel" | "regular" | null {
  const caption = stripTags(table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1] ?? "");
  if (/regular gasoline/i.test(caption) && /gallon/i.test(caption)) return "regular";
  if (/on-highway diesel/i.test(caption) && /gallon/i.test(caption)) return "diesel";
  return null;
}

function priceAt(row: string[], index: number): string | null {
  const raw = row[index]?.trim() ?? "";
  if (!PRICE_RE.test(raw)) return null;
  const value = Number(raw);
  // A week-over-week delta is a small number. A retail gallon outside this band is the wrong cell.
  if (!Number.isFinite(value) || value < 0.5 || value > 20) return null;
  return raw;
}

function latestPoint(weeks: Array<string | null>, row: string[]): { week: string; price: string } | null {
  let index = -1;
  let week = "";
  weeks.forEach((candidate, i) => {
    if (!candidate) return;
    if (candidate > week) {
      week = candidate;
      index = i;
    }
  });
  if (index < 0) return null;
  const price = priceAt(row, index);
  if (!price) return null;
  return { week, price };
}

/** Latest PADD 3 diesel and regular prices from the weekly update HTML. No date cutoff. */
export function parseEiaGulfRetail(html: string): DockDieselQuote | null {
  if (!html) return null;
  let diesel: { week: string; price: string } | null = null;
  let regular: { week: string; price: string } | null = null;
  const tables = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi) ?? [];
  for (const table of tables) {
    const product = productOf(table);
    if (!product) continue;
    const row = gulfCells(table);
    const weeks = headerWeeks(table);
    if (!row || weeks.length === 0) continue;
    const point = latestPoint(weeks, row);
    if (!point) continue;
    if (product === "diesel" && !diesel) diesel = point;
    if (product === "regular" && !regular) regular = point;
  }
  if (!diesel || !regular || diesel.week !== regular.week) return null;
  return { week: diesel.week, diesel: diesel.price, regular: regular.price };
}

/** Calendar days from the survey Monday to `asOf`, in UTC dates. */
export function dockDieselAgeDays(week: string, asOf: Date): number | null {
  const match = ISO_WEEK_RE.exec(week);
  if (!match || Number.isNaN(asOf.getTime())) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const weekUtc = Date.UTC(year, month - 1, day);
  const check = new Date(weekUtc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  const asOfUtc = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  return Math.round((asOfUtc - weekUtc) / 86_400_000);
}

/** Parsed quote, or null when the page is unreadable or the week is older than 14 days. */
export function dockDieselQuote(html: string, asOf: Date): DockDieselQuote | null {
  try {
    const parsed = parseEiaGulfRetail(html);
    if (!parsed) return null;
    const age = dockDieselAgeDays(parsed.week, asOf);
    if (age == null || age > DOCK_DIESEL_MAX_AGE_DAYS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function formatDockDiesel(quote: DockDieselQuote): string | null {
  const match = ISO_WEEK_RE.exec(quote.week);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  const day = Number(match[3]);
  if (!month || !Number.isInteger(day) || day < 1 || day > 31) return null;
  if (!PRICE_RE.test(quote.diesel) || !PRICE_RE.test(quote.regular)) return null;
  return `Dock Diesel · Gulf Coast retail, week of ${month} ${day}: diesel $${quote.diesel}/gal, regular $${quote.regular}/gal (EIA)`;
}
