/**
 * Scout: build one Field Letter PDF with Typst.
 * Does not change the live print sheet or any public page.
 *
 * From the repo root:
 *   node --experimental-strip-types --import ./scripts/register-alias.mjs print/typst/build-letter.ts
 *   node --experimental-strip-types --import ./scripts/register-alias.mjs print/typst/build-letter.ts --live
 *
 * Default reads print/typst/sample/letter.json (a saved /api/letter body).
 * --live refetches https://www.onthiswater.com/api/letter and rewrites that file.
 */
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { coastEditionLabel } from "@/lib/coasts";
import { letterHasScore } from "@/lib/letter-copy";

const exec = promisify(execFile);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = path.join(ROOT, "print/typst");
const SAMPLE = path.join(DIR, "sample");
const CACHE = path.join(DIR, ".cache");
const LETTER_URL = "https://www.onthiswater.com/api/letter";
const NEWSLETTER_URL = "https://www.onthiswater.com/newsletter";
const TYPST_VERSION = "0.15.1";
const TYPST_TARBALL = `typst-x86_64-unknown-linux-musl.tar.xz`;
const TYPST_URL = `https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/${TYPST_TARBALL}`;
const TYPST_SHA256 = "a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c";

const SITE_HOSTS = new Set(["onthiswater.com", "www.onthiswater.com"]);
const OFFSITE = /twitter\.com|(?:^|[^a-z])x\.com|t\.co\b/i;

type Hab = {
  hot: boolean;
  level: string | null;
  where: string | null;
  when: string | null;
};

type ApiDesk = {
  areaId: string;
  desk: string;
  kicker: string;
  shortName: string | null;
  headline: string | null;
  conditions: string | null;
  window: string | null;
  moon: string | null;
  seasonal: string | null;
  inPlay: string[];
  why: string[];
  error: string | null;
  hab: Hab | null;
};

type ApiLetter = {
  source: string;
  permalink: string;
  weekId: string;
  weekLabel: string;
  weekNumber: number;
  monthName: string;
  rangeLabel: string;
  letter: string;
  frozen: boolean;
  generatedAt: string;
  desks: ApiDesk[];
  peaks: { name: string; theaters: string; why: string }[];
  closures: { title: string; body: string }[];
  disclaimer: string;
};

type PrintDesk = {
  areaId: string;
  name: string;
  desk: string;
  kicker: string;
  headline: string | null;
  conditions: string | null;
  window: string | null;
  moon: string | null;
  seasonal: string | null;
  inPlay: string[];
  why: string[];
  error: string | null;
  hab: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function needString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is not a string from the letter`);
  }
  return value;
}

function optionalString(value: unknown, label: string): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throw new Error(`${label} is not a string from the letter`);
  return value;
}

function stringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} is not a list of strings from the letter`);
  }
  return value;
}

function parseHab(value: unknown, label: string): Hab | null {
  if (value == null) return null;
  if (!isRecord(value) || typeof value.hot !== "boolean") {
    throw new Error(`${label} is not a hab record from the letter`);
  }
  return {
    hot: value.hot,
    level: optionalString(value.level, `${label}.level`),
    where: optionalString(value.where, `${label}.where`),
    when: optionalString(value.when, `${label}.when`),
  };
}

function parseDesk(value: unknown, index: number): ApiDesk {
  if (!isRecord(value)) throw new Error(`desks[${index}] is not an object`);
  return {
    areaId: needString(value.areaId, `desks[${index}].areaId`),
    desk: needString(value.desk, `desks[${index}].desk`),
    kicker: needString(value.kicker, `desks[${index}].kicker`),
    shortName: optionalString(value.shortName, `desks[${index}].shortName`),
    headline: optionalString(value.headline, `desks[${index}].headline`),
    conditions: optionalString(value.conditions, `desks[${index}].conditions`),
    window: optionalString(value.window, `desks[${index}].window`),
    moon: optionalString(value.moon, `desks[${index}].moon`),
    seasonal: optionalString(value.seasonal, `desks[${index}].seasonal`),
    inPlay: stringList(value.inPlay, `desks[${index}].inPlay`),
    why: stringList(value.why, `desks[${index}].why`),
    error: optionalString(value.error, `desks[${index}].error`),
    hab: parseHab(value.hab, `desks[${index}].hab`),
  };
}

function parseLetter(value: unknown): ApiLetter {
  if (!isRecord(value)) throw new Error("letter body is not an object");
  if (!Array.isArray(value.desks)) throw new Error("letter desks are missing");
  if (!Array.isArray(value.peaks)) throw new Error("letter peaks are missing");
  if (!Array.isArray(value.closures)) throw new Error("letter closures are missing");
  if (typeof value.weekNumber !== "number" || !Number.isInteger(value.weekNumber)) {
    throw new Error("weekNumber is not an integer from the letter");
  }
  if (typeof value.frozen !== "boolean") throw new Error("frozen is not a boolean from the letter");
  return {
    source: needString(value.source, "source"),
    permalink: needString(value.permalink, "permalink"),
    weekId: needString(value.weekId, "weekId"),
    weekLabel: needString(value.weekLabel, "weekLabel"),
    weekNumber: value.weekNumber,
    monthName: needString(value.monthName, "monthName"),
    rangeLabel: needString(value.rangeLabel, "rangeLabel"),
    letter: needString(value.letter, "letter"),
    frozen: value.frozen,
    generatedAt: needString(value.generatedAt, "generatedAt"),
    desks: value.desks.map((desk, index) => parseDesk(desk, index)),
    peaks: value.peaks.map((peak, index) => {
      if (!isRecord(peak)) throw new Error(`peaks[${index}] is not an object`);
      return {
        name: needString(peak.name, `peaks[${index}].name`),
        theaters: needString(peak.theaters, `peaks[${index}].theaters`),
        why: needString(peak.why, `peaks[${index}].why`),
      };
    }),
    closures: value.closures.map((closure, index) => {
      if (!isRecord(closure)) throw new Error(`closures[${index}] is not an object`);
      return {
        title: needString(closure.title, `closures[${index}].title`),
        body: needString(closure.body, `closures[${index}].body`),
      };
    }),
    disclaimer: needString(value.disclaimer, "disclaimer"),
  };
}

function assertSiteUrl(url: string, label: string) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`${label} is not a URL: ${url}`);
  }
  if (!SITE_HOSTS.has(host)) throw new Error(`${label} leaves On This Water: ${url}`);
  if (OFFSITE.test(url)) throw new Error(`${label} points at X: ${url}`);
}

function habLine(hab: Hab | null): string | null {
  if (!hab?.hot) return null;
  const level = hab.level ?? "";
  const when = hab.when ? ` · ${hab.when}` : "";
  const where = hab.where ?? "";
  return `Red tide. ${level}${when}. ${where} Not a bite.`.replace(/\s+/g, " ").trim();
}

function toPrintDesk(desk: ApiDesk): PrintDesk {
  return {
    areaId: desk.areaId,
    name: desk.shortName ?? desk.desk,
    desk: desk.desk,
    kicker: desk.kicker,
    headline: desk.headline,
    conditions: desk.conditions,
    window: desk.window,
    moon: desk.moon,
    seasonal: desk.seasonal,
    inPlay: desk.inPlay,
    why: desk.why,
    error: desk.error,
    hab: habLine(desk.hab),
  };
}

function collectStrings(value: unknown, out: string[]) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (isRecord(value)) {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
}

function assertPrintable(value: unknown) {
  const strings: string[] = [];
  collectStrings(value, strings);
  for (const text of strings) {
    if (letterHasScore(text)) throw new Error(`score leaked into the sheet: ${text}`);
    if (OFFSITE.test(text)) throw new Error(`X link leaked into the sheet: ${text}`);
    const urls = text.match(/https?:\/\/[^\s)]+/g) ?? [];
    for (const url of urls) assertSiteUrl(url, "sheet link");
  }
}

function printView(letter: ApiLetter) {
  const leadIndex = letter.desks.findIndex((desk) => desk.areaId === "galveston");
  if (leadIndex < 0) throw new Error("Galveston is not in this letter");
  const lead = toPrintDesk(letter.desks[leadIndex]!);
  if (lead.name !== "Galveston") throw new Error(`Galveston short name was ${lead.name}`);
  const waters = letter.desks.filter((desk) => desk.areaId !== "galveston").map(toPrintDesk);
  const live = letter.desks.filter((desk) => desk.headline).length;
  const waterWord = letter.desks.length === 1 ? "water" : "waters";
  const status = letter.frozen ? "frozen Saturday" : "this week’s waters";
  const edition = coastEditionLabel(null);
  const view = {
    newsletter: NEWSLETTER_URL,
    permalink: letter.permalink,
    source: letter.source,
    title: "Saturday on your water",
    weekLabel: letter.weekLabel,
    weekNumber: letter.weekNumber,
    weekId: letter.weekId,
    rangeLabel: letter.rangeLabel,
    monthName: letter.monthName,
    generatedAt: letter.generatedAt,
    edition,
    weekHeading: letter.frozen ? "That Saturday" : "This week",
    meta: `${letter.rangeLabel} · ${letter.monthName} fundamentals · ${edition} · ${live} of ${letter.desks.length} ${waterWord} · ${status}`,
    letter: letter.letter,
    disclaimer: letter.disclaimer,
    lead,
    waters,
    peaks: letter.peaks,
    closures: letter.closures,
  };
  assertSiteUrl(view.newsletter, "newsletter");
  assertSiteUrl(view.permalink, "permalink");
  if (view.newsletter !== NEWSLETTER_URL) throw new Error("newsletter link drifted");
  if (view.lead.areaId !== "galveston") throw new Error("lead is not Galveston");
  if (view.waters.some((desk) => desk.areaId === "galveston")) {
    throw new Error("Galveston was repeated after the lead");
  }
  assertPrintable(view);
  return view;
}

async function loadLetter(live: boolean): Promise<ApiLetter> {
  await mkdir(SAMPLE, { recursive: true });
  const snapshotPath = path.join(SAMPLE, "letter.json");
  if (live) {
    const response = await fetch(LETTER_URL, {
      headers: {
        accept: "application/json",
        "user-agent": "OnThisWater/1.0 (inshore conditions; https://onthiswater.com)",
      },
    });
    if (!response.ok) throw new Error(`${LETTER_URL} returned ${response.status}`);
    const body: unknown = await response.json();
    const letter = parseLetter(body);
    await writeFile(
      snapshotPath,
      JSON.stringify(
        {
          fetchedFrom: LETTER_URL,
          fetchedAt: new Date().toISOString(),
          body,
        },
        null,
        2,
      ) + "\n",
    );
    return letter;
  }
  const saved: unknown = JSON.parse(await readFile(snapshotPath, "utf8"));
  if (!isRecord(saved) || !("body" in saved)) throw new Error("sample/letter.json has no body");
  return parseLetter(saved.body);
}

async function ensureTypst(): Promise<string> {
  if (process.env.TYPST) return process.env.TYPST;
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error(
      `Set TYPST to a local typst binary. This scout pins the linux x64 release. This machine is ${process.platform} ${process.arch}.`,
    );
  }
  const binary = path.join(CACHE, `typst-x86_64-unknown-linux-musl`, "typst");
  try {
    const { stdout } = await exec(binary, ["--version"]);
    if (stdout.includes(TYPST_VERSION)) return binary;
  } catch {
    // Download the pinned release below.
  }
  await mkdir(CACHE, { recursive: true });
  const response = await fetch(TYPST_URL);
  if (!response.ok) throw new Error(`${TYPST_URL} returned ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== TYPST_SHA256) throw new Error(`typst tarball sha256 ${digest} != ${TYPST_SHA256}`);
  const tarball = path.join(CACHE, TYPST_TARBALL);
  await writeFile(tarball, bytes);
  await exec("tar", ["-xJf", tarball, "-C", CACHE]);
  return binary;
}

async function main() {
  const live = process.argv.includes("--live");
  const letter = await loadLetter(live);
  const view = printView(letter);
  const viewPath = path.join(SAMPLE, "letter-print.json");
  await writeFile(viewPath, JSON.stringify(view, null, 2) + "\n");
  const typst = await ensureTypst();
  const output = path.join(SAMPLE, "field-letter.pdf");
  const created = Math.floor(Date.parse(letter.generatedAt) / 1000);
  if (!Number.isFinite(created)) throw new Error("generatedAt is not a time");
  const args = [
    "compile",
    "--root",
    ROOT,
    "--font-path",
    path.join(DIR, "fonts"),
    "--ignore-system-fonts",
    "--ignore-embedded-fonts",
    "--creation-timestamp",
    String(created),
    path.join(DIR, "field-letter.typ"),
    output,
  ];
  const started = performance.now();
  await exec(typst, args);
  const renderMs = Math.round(performance.now() - started);
  const pdf = await readFile(output);
  let text = "";
  try {
    const dumped = await exec("pdftotext", [output, "-"]);
    text = dumped.stdout;
  } catch {
    throw new Error("pdftotext is required to check the sheet for scores");
  }
  if (letterHasScore(text)) throw new Error("rendered PDF still contains a score");
  if (OFFSITE.test(text)) throw new Error("rendered PDF contains an X link");
  if (!text.includes(NEWSLETTER_URL)) throw new Error("rendered PDF is missing the newsletter link");
  const galveston = text.indexOf("Galveston");
  const venice = text.indexOf("Venice");
  if (galveston < 0 || venice < 0 || galveston > venice) {
    throw new Error("Galveston does not lead the waters");
  }
  const { stdout: version } = await exec(typst, ["--version"]);
  const stats = {
    typst: version.trim(),
    renderMs,
    pdfBytes: pdf.length,
    weekId: letter.weekId,
    generatedAt: letter.generatedAt,
    newsletter: NEWSLETTER_URL,
  };
  await writeFile(path.join(SAMPLE, "render.json"), JSON.stringify(stats, null, 2) + "\n");
  console.log(JSON.stringify(stats));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
