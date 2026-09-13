import type { HabNow, TheaterId } from "../types";

/**
 * Official cites only — do not invent bite advice or water beyond these.
 *
 * 1. TPWD Red Tide Status, September 7–11, 2026 (page updated ~Sep 12):
 *    Upper Coast (Galveston Bay and Sabine Lake) — fish kills and respiratory
 *    symptoms at Bolivar Peninsula / Crystal Beach and several locations across
 *    Galveston Island. Samples indicated moderate to high Karenia.
 *    Golden Crescent / Coastal Bend / Lower Laguna: no fish kills / background or clear.
 *    https://tpwd.texas.gov/landwater/water/environconcerns/hab/redtide/status.phtml
 *
 * 2. DSHS (9.9.2026): Galveston Bay shellfish TX-1, TX-6, TX-7, TX-8 closed for
 *    elevated Karenia; West Galveston Bay TX-9 precautionary Karenia closure.
 *
 * 3. NOAA NCCOS (issued 09-12-2026 ~6 PM): moderate to high respiratory-irritation
 *    risk for Galveston County beaches (next ~36 hours from that issue).
 *    https://coastalscience.noaa.gov/science-areas/habs/hab-forecasts/gulf-coast/
 */

export const TPWD_RED_TIDE_STATUS =
  "https://tpwd.texas.gov/landwater/water/environconcerns/hab/redtide/status.phtml";
export const DSHS_HAB_SEAFOOD =
  "https://www.dshs.texas.gov/seafood-aquatic-life-group/information-on-consumption-advisories-possession-bans-rescinded-orders-seafood-aquatic-life/harmful-algal-blooms-seafood";
export const NCCOS_GULF_FORECAST =
  "https://coastalscience.noaa.gov/science-areas/habs/hab-forecasts/gulf-coast/";

export type TexasHabRegion = "upper-coast" | "golden-crescent" | "coastal-bend" | "lower-laguna";

export const TEXAS_HAB_REGION: Record<string, TexasHabRegion> = {
  sabine: "upper-coast",
  galveston: "upper-coast",
  matagorda: "golden-crescent",
  aransas: "coastal-bend",
  corpus: "coastal-bend",
  baffin: "coastal-bend",
  "lower-laguna": "lower-laguna",
};

export function texasHabRegion(areaId: string): TexasHabRegion | null {
  return TEXAS_HAB_REGION[areaId] ?? null;
}

/** DSHS posted 9.9.2026. No official lift in the cited facts. */
export function texasKareniaShellfishClosed(date: Date, timeZone = "America/Chicago") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  // Harvest line for the September 2026 Upper Coast bloom. Drop or extend when
  // DSHS posts a lift — do not invent one.
  return year === 2026 && month === 9 && day >= 9;
}

/** Cited TPWD block + DSHS date. Used when the live page fetch fails. */
export function texasHabBulletinWindow(date: Date, timeZone = "America/Chicago") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return year === 2026 && month === 9 && day >= 7;
}

export function texasKareniaClosureNote(): { title: string; body: string; theaters: TheaterId[] } {
  return {
    title: "Galveston Bay Karenia — DSHS shellfish",
    body: "DSHS (9.9.2026): TX-1, TX-6, TX-7, TX-8 closed for elevated Karenia. West Galveston Bay TX-9 is a precautionary Karenia closure. TPWD Sep 7–11: fish kills and respiratory symptoms at Bolivar / Crystal Beach and several Galveston Island locations; samples moderate to high. Not a bite. Verify DSHS and TPWD before you keep a shellfish or wade a kill.",
    theaters: ["texas"],
  };
}

const MONTH =
  "January|February|March|April|May|June|July|August|September|October|November|December";

const STATUS_HEADING = new RegExp(
  `\\b(${MONTH})\\s+\\d{1,2}(?:\\s*[–-]\\s*\\d{1,2})?,?\\s+(20\\d{2})`,
  "i",
);

const REGION_SPLIT =
  /(Upper Coast|Golden Crescent|Coastal Bend|Rio Grande Valley Area)(?:\s*\([^)]+\))?\s*:\s*/gi;

export type TpwdStatusBlock = {
  when: string;
  year: number;
  text: string;
};

export function parseTpwdLatestBlock(html: string): TpwdStatusBlock | null {
  const headings = [...html.matchAll(/<h2\b[^>]*>\s*([^<]+?)\s*<\/h2>/gi)];
  const status = headings.find((h) => STATUS_HEADING.test(h[1] ?? ""));
  if (!status || status.index == null) return null;
  const when = (status[1] ?? "").replace(/\s+/g, " ").trim();
  const year = Number(when.match(/20\d{2}/)?.[0] ?? 0);
  const start = status.index + status[0].length;
  const rest = html.slice(start);
  const next = rest.search(/<h2\b/i);
  const chunk = next === -1 ? rest : rest.slice(0, next);
  const text = chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { when, year, text };
}

export function tpwdRegionBody(block: TpwdStatusBlock, region: TexasHabRegion): string | null {
  const want =
    region === "upper-coast"
      ? "upper coast"
      : region === "golden-crescent"
        ? "golden crescent"
        : region === "coastal-bend"
          ? "coastal bend"
          : "rio grande valley";
  const matches = [...block.text.matchAll(new RegExp(REGION_SPLIT.source, "gi"))];
  for (let i = 0; i < matches.length; i++) {
    const name = (matches[i][1] ?? "").toLowerCase();
    if (!name.includes(want)) continue;
    const from = (matches[i].index ?? 0) + matches[i][0].length;
    const to = i + 1 < matches.length ? (matches[i + 1].index ?? block.text.length) : block.text.length;
    return block.text.slice(from, to).trim().replace(/\s+/g, " ");
  }
  return null;
}

function habRank(body: string): { hot: boolean; level: string } {
  const b = body.toLowerCase();
  if (/no reports of red tide/.test(b)) return { hot: false, level: "not present" };
  if (/no fish kills/.test(b) && /background|below the reporting threshold/.test(b)) {
    return { hot: false, level: "background" };
  }
  if (/no fish kills/.test(b) && !/moderate|high|respiratory/.test(b)) {
    return { hot: false, level: "background" };
  }
  if (/moderate to high/.test(b)) return { hot: true, level: "moderate to high" };
  if (/\bhigh\b/.test(b) && /red tide|karenia/.test(b)) return { hot: true, level: "high" };
  if (/moderate/.test(b) && /red tide|karenia/.test(b)) return { hot: true, level: "moderate" };
  if (/respiratory/.test(b) || (/fish kills/.test(b) && !/no fish kills/.test(b))) {
    return { hot: true, level: "bloom" };
  }
  if (/background/.test(b)) return { hot: false, level: "background" };
  return { hot: false, level: "posted update" };
}

const UPPER_COAST_CITES =
  "DSHS (9.9.2026): Galveston Bay shellfish TX-1, TX-6, TX-7, TX-8 closed for elevated Karenia; West Galveston Bay TX-9 precautionary. NOAA NCCOS issued 09-12-2026 ~6 PM: moderate to high respiratory-irritation risk for Galveston County beaches (next ~36 hours from that issue).";

export function habFromTpwdBlock(
  areaId: string,
  block: TpwdStatusBlock,
  nowYear: number,
): HabNow {
  const region = texasHabRegion(areaId);
  const body = region ? tpwdRegionBody(block, region) : null;
  const current = block.year >= nowYear;
  if (!current || !body) {
    return {
      hot: false,
      level: current ? "posted update" : "no current post",
      where: current
        ? "TPWD has a current-year update — read the cite. Blooms are patchy."
        : "TPWD posts only when a bloom is confirmed. No current-year update on the status page.",
      when: block.when,
      source: "TPWD",
      href: TPWD_RED_TIDE_STATUS,
    };
  }
  const { hot, level } = habRank(body);
  const where =
    region === "upper-coast" && hot ? `${body} ${UPPER_COAST_CITES}` : body;
  return {
    hot,
    level,
    where,
    when: block.when,
    source: "TPWD",
    href: TPWD_RED_TIDE_STATUS,
  };
}

/** Cited September 2026 facts — fallback only when the TPWD page does not answer. */
export function citedTexasHab(areaId: string): HabNow | null {
  const region = texasHabRegion(areaId);
  if (!region) return null;
  if (region === "upper-coast") {
    return {
      hot: true,
      level: "moderate to high",
      where: `Fish kills and respiratory symptoms reported at Bolivar Peninsula / Crystal Beach and several locations across Galveston Island. Water samples indicated moderate to high Karenia. ${UPPER_COAST_CITES}`,
      when: "September 7–11, 2026",
      source: "TPWD",
      href: TPWD_RED_TIDE_STATUS,
    };
  }
  if (region === "golden-crescent") {
    return {
      hot: false,
      level: "background",
      where: "No fish kills reported. Port O’Connor cells below 2/mL (background).",
      when: "September 7–11, 2026",
      source: "TPWD",
      href: TPWD_RED_TIDE_STATUS,
    };
  }
  if (region === "coastal-bend") {
    return {
      hot: false,
      level: "background",
      where: "No fish kills reported. Port Aransas cells below 2/mL (background).",
      when: "September 7–11, 2026",
      source: "TPWD",
      href: TPWD_RED_TIDE_STATUS,
    };
  }
  return {
    hot: false,
    level: "not present",
    where: "No reports of red tide.",
    when: "September 7–11, 2026",
    source: "TPWD",
    href: TPWD_RED_TIDE_STATUS,
  };
}
