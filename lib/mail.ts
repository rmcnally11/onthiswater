import { fuelHref, fuelMailLine } from "@/lib/dock-posted";
import type { Area, Briefing, CalendarDay, TheaterId } from "@/lib/types";
import { DESKS } from "@/lib/desks";
import { morningLine } from "@/lib/morning";
import { theaterLabel } from "@/lib/data/theaters";
import { formatInZone, formatYmdLong, parseNoaaGmt } from "@/lib/time";
import { ORIGIN, calendarCardUrl, calendarHref } from "@/lib/tweet";
import { tideChartUrl } from "@/lib/tide-chart";
import { skyCopy } from "@/lib/wx";
import type { NewsletterIssue } from "@/lib/newsletter";
import { coastEditionLabel } from "@/lib/coasts";
import { copper, gold, scoreHex, scoreInk } from "@/lib/viz";
import { feedNotes } from "@/lib/feeds";
import { windWord } from "@/lib/wind";
import { pressureLine } from "@/lib/pressure";
import { deskWords, forLetter, LETTER_LEGEND, letterImageAlt } from "@/lib/letter-copy";
import {
  MONTH_NAMES,
  MONTH_THEATER,
  closuresForCoasts,
  peaksThisMonth,
  theaterLabel as coastLabel,
} from "@/lib/data/fundamentals";
import {
  LINE,
  MUTED,
  NAVY,
  PAGE,
  PANEL,
  btn,
  dek,
  emailDoc,
  escapeHtml,
  heading,
  kicker,
  scoreDisc,
  sectionTitle,
  tileRow,
} from "@/lib/mail-ui";

function deskMeta(areaId: string) {
  return DESKS.find((d) => d.areaId === areaId);
}

function tideStamp(stamp: string, tz: string) {
  const d = stamp.includes("T") ? new Date(stamp) : parseNoaaGmt(stamp);
  return formatInZone(d, tz, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export function morningSubject(briefing: Briefing) {
  return `This morning on ${briefing.area.shortName}`;
}

function instruments(briefing: Briefing) {
  const w = briefing.conditions.weather;
  const tides = briefing.conditions.tides;
  const rows: Array<{ label: string; value: string; note?: string }> = [];
  rows.push({
    label: "Wind",
    value:
      w.windMph != null
        ? `${Math.round(w.windMph)} mph${w.windCardinal ? ` ${w.windCardinal}` : ""}${
            w.windGustMph != null ? ` · gust ${Math.round(w.windGustMph)}` : ""
          }`
        : "Not in",
    note: w.source.toUpperCase(),
  });
  rows.push({
    label: "Sky",
    value: skyCopy(w.wx, w.precipChance, w.sky),
    note: w.wx === "storm" ? "Stay tied" : w.wx === "rain" ? "Sight goes blind first" : undefined,
  });
  rows.push({
    label: "Water",
    value: briefing.conditions.waterTempF != null ? `${briefing.conditions.waterTempF.toFixed(1)}°F` : "No gauge",
    note: briefing.conditions.waterTempSource ?? undefined,
  });
  rows.push({
    label: "Tide",
    value: tides.stage.replace("-", " "),
    note:
      tides.predictedNow != null
        ? `${tides.predictedNow.toFixed(2)} ft ${tides.source === "noaa" ? "MLLW" : "modeled"}`
        : tides.source,
  });
  if (tides.anomalyFt != null) {
    const a = tides.anomalyFt;
    rows.push({
      label: "Wind vs table",
      value: `${a > 0 ? "+" : ""}${a.toFixed(2)} ft`,
      note:
        Math.abs(a) >= 0.25
          ? "Wind is moving more water than the printout"
          : "Table is telling the truth",
    });
  }
  const glass = pressureLine(w);
  if (glass) {
    rows.push({
      label: "Glass",
      value: glass,
      note: w.pressureCite ?? (w.pressureSource === "open-meteo" ? "Modeled — not a dock barometer" : undefined),
    });
  }
  rows.push({
    label: "Moon",
    value: briefing.conditions.moon.name,
    note: `${Math.round(briefing.conditions.moon.illumination * 100)}% lit · ${briefing.conditions.moon.springNeap}`,
  });
  if (briefing.conditions.river) {
    const r = briefing.conditions.river;
    rows.push({
      label: "River",
      value: `${Math.round(r.cfs).toLocaleString()} cfs`,
      note: `${r.name} · USGS ${r.site}${r.high ? " — stain is the story" : ""}`,
    });
  }
  return rows;
}

function inPlay(briefing: Briefing) {
  return briefing.species
    .filter((s) => s.inPlay && !s.closed && s.species.role === "primary")
    .slice(0, 5);
}

function clocks(briefing: Briefing) {
  return briefing.conditions.tides.nextHiLo.slice(0, 4).map((t) => ({
    when: tideStamp(t.time, briefing.area.timezone),
    what: t.type === "H" ? "High" : "Low",
    height: `${t.height.toFixed(1)} ft`,
  }));
}

function mailOrigin(origin?: string) {
  return (origin || ORIGIN).replace(/\/$/, "");
}

function hrefs(briefing: Briefing, origin?: string) {
  const root = mailOrigin(origin);
  const q = `area=${briefing.area.id}&theater=${briefing.area.theater}`;
  return {
    brief: `${root}/?${q}`,
    calendar: `${root}/calendar?${q}`,
    map: `${root}/map?${q}`,
    card: `${root}/card?${q}`,
  };
}

function fuelMailHtml(briefing: Briefing) {
  const next = fuelHref({ theater: briefing.area.theater, areaId: briefing.area.id });
  return `Posted fuel on that coast — <a href="${escapeHtml(next.href)}" style="color:${copper}">${escapeHtml(next.label)}</a>`;
}

function tideImage(briefing: Briefing, opts?: { origin?: string; bleed?: boolean; alt?: string }) {
  const src = tideChartUrl(briefing.area.id, mailOrigin(opts?.origin), briefing.forDate);
  const tides = briefing.conditions.tides;
  const alt =
    opts?.alt ??
    `${briefing.area.shortName} tide · ${tides.stage.replace("-", " ")}${
      tides.predictedNow != null ? ` · ${tides.predictedNow.toFixed(2)} ft` : ""
    }`;
  const href = hrefs(briefing, opts?.origin).brief;
  const radius = opts?.bleed ? "0" : "14px";
  const bottom = opts?.bleed ? "0" : "14px";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 ${bottom}">
    <tr>
      <td style="padding:0;font-size:0;line-height:0;background:${PANEL}">
        <a href="${href}" style="display:block">
          <img src="${escapeHtml(src)}" width="600" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;border-radius:${radius}" />
        </a>
      </td>
    </tr>
  </table>`;
}

function instrumentTiles(briefing: Briefing) {
  const rows = instruments(briefing);
  const chunks: string[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    chunks.push(tileRow(rows[i], rows[i + 1]));
  }
  return chunks.join("");
}

export function morningEmailText(briefing: Briefing, yolo?: CalendarDay | null) {
  const meta = deskMeta(briefing.area.id);
  const links = hrefs(briefing);
  const line = morningLine(briefing, yolo);
  const parts = [
    `${theaterLabel(briefing.area.theater)} · ${briefing.area.name}`,
    meta ? `${meta.desk}. ${meta.kicker}.` : null,
    briefing.headline,
    `${briefing.overall.toFixed(1)} / 10 · ${briefing.confidence} confidence · ${formatYmdLong(briefing.forDate, briefing.area.timezone)}`,
    line,
    "",
    "THE WATER",
    ...instruments(briefing).map((r) => `${r.label}: ${r.value}${r.note ? ` (${r.note})` : ""}`),
    clocks(briefing).length
      ? `Next tides: ${clocks(briefing)
          .map((c) => `${c.what} ${c.when} ${c.height}`)
          .join("; ")}`
      : null,
    "",
  ];
  if (briefing.warnings.length) {
    parts.push("WATCH", ...briefing.warnings.map((w) => `• ${w}`), "");
  }
  if (briefing.where.length) {
    parts.push(
      "WHERE",
      ...briefing.where.slice(0, 4).map((p) => `• ${p.spot.name} (${p.score.toFixed(1)}) — ${p.why[0] ?? p.spot.note}`),
      "",
    );
  }
  if (briefing.when.length) {
    parts.push(
      "WHEN",
      ...briefing.when.map((w) => `• ${w.label} (${w.score.toFixed(1)}) — ${w.why}`),
      "",
    );
  }
  const fish = inPlay(briefing);
  if (fish.length) {
    parts.push(
      "IN PLAY",
      ...fish.map((s) => `• ${s.species.commonName} (${s.score.toFixed(1)}) — ${s.why}`),
      "",
    );
  }
  if (briefing.why.length) {
    parts.push("WHY", ...briefing.why.slice(0, 6).map((w) => `• ${w}`), "");
  }
  if (yolo) {
    parts.push(
      `Best dry day is ${formatYmdLong(yolo.date, briefing.area.timezone)} (${yolo.score.toFixed(1)}). Best remaining dry day with a real wind forecast.`,
      "",
    );
  }
  parts.push(
    `Live brief: ${links.brief}`,
    `Calendar: ${links.calendar}`,
    `Map: ${links.map}`,
    fuelMailLine({ theater: briefing.area.theater, areaId: briefing.area.id }),
    "",
    "Scores are 1–10, not a bite. This is not a chart for navigation. The gauges stay live on the page — this mail is a snapshot.",
  );
  return parts.filter((p) => p != null).join("\n");
}

function morningDeskCard(
  briefing: Briefing,
  yolo?: CalendarDay | null,
  opts: { compact?: boolean; showTide?: boolean; origin?: string } = {},
) {
  const compact = Boolean(opts.compact);
  const meta = deskMeta(briefing.area.id);
  const links = hrefs(briefing, opts.origin);
  const line = morningLine(briefing, yolo);
  const fish = inPlay(briefing);
  const tides = clocks(briefing);
  const w = briefing.conditions.weather;
  const chart = opts.showTide ? tideImage(briefing, { origin: opts.origin }) : "";

  const play = fish
    .map((s) => `${s.species.commonName} ${s.score.toFixed(1)}`)
    .join(" · ");

  const watch = briefing.warnings[0]
    ? `<p style="margin:10px 0 0;font-size:13px;color:${copper};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">⚠ ${escapeHtml(briefing.warnings[0])}</p>`
    : "";

  const yoloLine = yolo
    ? `<p style="margin:10px 0 0;font-size:13px;color:${NAVY};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">Best dry day <strong>${escapeHtml(formatYmdLong(yolo.date, briefing.area.timezone))}</strong> · ${yolo.score.toFixed(1)}</p>`
    : "";

  const extra = compact
    ? `${watch}${yoloLine}
    <p style="margin:10px 0 0;font-size:13px;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${fuelMailHtml(briefing)}</p>`
    : `${instrumentTiles(briefing)}
    ${tides.length
      ? `<p style="margin:4px 0 0;font-size:13px;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${tides
          .map((t) => `<span class="fb-tide" style="display:inline-block;padding:0 12px 0 0"><strong style="color:${NAVY}">${escapeHtml(t.what)}</strong> ${escapeHtml(t.when)} · ${escapeHtml(t.height)}</span>`)
          .join("")}</p>`
      : ""}
    ${play ? `<p style="margin:12px 0 0;font-size:14px;color:${NAVY}">In play · ${escapeHtml(play)}</p>` : ""}
    ${watch}${yoloLine}
    <p style="margin:14px 0 0">${btn(links.brief, `Open ${briefing.area.shortName}`)}</p>
    <p style="margin:10px 0 0;font-size:13px;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${fuelMailHtml(briefing)}</p>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 18px;background:${PAGE};border:1px solid ${LINE};border-radius:18px">
    ${chart ? `<tr><td style="padding:0;font-size:0;line-height:0">${chart}</td></tr>` : ""}
    <tr>
      <td style="padding:${chart ? "12px 16px 16px" : "18px 16px 16px"}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%">
          <tr>
            <td valign="top">
              ${kicker(`${theaterLabel(briefing.area.theater)} · ${briefing.area.shortName}${meta ? ` · ${meta.desk}` : ""}`)}
              <p style="margin:8px 0 0;font-size:22px;line-height:1.25;color:${NAVY};font-family:Georgia,'Times New Roman',serif">${escapeHtml(briefing.headline)}</p>
              <p style="margin:8px 0 0;font-size:15px;line-height:1.45;color:${MUTED}">${escapeHtml(line)}</p>
              <p style="margin:8px 0 0;font-size:12px;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(briefing.confidence)} · ${escapeHtml(formatYmdLong(briefing.forDate, briefing.area.timezone))} · ${escapeHtml(windWord(w.windMph))}</p>
              <p style="margin:6px 0 0;font-size:11px;line-height:1.4;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(feedNotes(briefing.area, briefing.conditions).map((n) => n.label).join(" · "))}</p>
            </td>
            <td valign="top" align="right" width="100" style="width:100px;padding-left:10px">${scoreDisc(briefing.overall)}</td>
          </tr>
        </table>
        ${extra}
      </td>
    </tr>
  </table>`;
}

export function morningEmailHtml(
  briefing: Briefing,
  yolo?: CalendarDay | null,
  opts?: { origin?: string },
) {
  return morningDigestHtml([{ briefing, yolo }], opts);
}

export function morningDigestSubject(
  rows: Array<{ briefing: Briefing }>,
  opts?: { quiet?: string[] },
) {
  const quiet = opts?.quiet?.filter(Boolean) ?? [];
  const prefix = quiet.length ? "Partial brief · " : "";
  if (rows.length === 1) return `${prefix}${morningSubject(rows[0].briefing)}`;
  const bits = rows.slice(0, 4).map((r) => `${r.briefing.area.shortName} ${r.briefing.overall.toFixed(1)}`);
  const more = rows.length > 4 ? ` +${rows.length - 4}` : "";
  return `${prefix}This morning · ${bits.join(" · ")}${more}`;
}

function quietBanner(quiet: string[]) {
  if (!quiet.length) return "";
  const names = quiet.join(", ");
  return `<p style="margin:0 0 16px;padding:12px 14px;background:#fff6e8;border:1px solid #e3b01c;border-radius:14px;font-size:14px;line-height:1.45;color:${NAVY};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif"><strong>Partial brief.</strong> ${escapeHtml(names)} ${quiet.length === 1 ? "is" : "are"} quiet. The desks below answered.</p>`;
}

export function morningDigestText(
  rows: Array<{ briefing: Briefing; yolo?: CalendarDay | null }>,
  opts?: { quiet?: string[] },
) {
  const quiet = opts?.quiet?.filter(Boolean) ?? [];
  const head = quiet.length
    ? `Partial brief — ${quiet.join(", ")} ${quiet.length === 1 ? "is" : "are"} quiet.\n\n`
    : "";
  return `${head}${rows.map((r) => morningEmailText(r.briefing, r.yolo)).join("\n\n———\n\n")}`;
}

export function morningDigestHtml(
  rows: Array<{ briefing: Briefing; yolo?: CalendarDay | null }>,
  opts?: { origin?: string; quiet?: string[] },
) {
  const quiet = opts?.quiet?.filter(Boolean) ?? [];
  if (!rows.length) {
    return emailDoc({ body: `${heading("Gauges quiet")}${dek("No desks answered this morning.")}` });
  }
  const first = rows[0];
  const line = morningLine(first.briefing, first.yolo);
  const names = rows.map((r) => r.briefing.area.shortName).join(" · ");
  const single = rows.length === 1;
  const cards = rows
    .map((r) =>
      morningDeskCard(r.briefing, r.yolo, {
        compact: !single && rows.length > 3,
        showTide: !single,
        origin: opts?.origin,
      }),
    )
    .join("");
  const hero = single ? tideImage(first.briefing, { origin: opts?.origin, bleed: true }) : undefined;
  const banner = quietBanner(quiet);
  return emailDoc({
    preheader: quiet.length
      ? `Partial brief · ${quiet.join(", ")} quiet`
      : single
        ? `${first.briefing.area.shortName} ${first.briefing.overall.toFixed(1)} · ${line}`
        : names,
    hero,
    brand: false,
    body: single
      ? `${banner}${cards}
    <p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">
      Scores are 1–10, not a bite. This mail is a snapshot. The gauges stay live on the page.
    </p>`
      : `
    ${banner}${cards}
    <p style="margin:8px 0 0">${btn(`${mailOrigin(opts?.origin)}/`, "Open the live brief")}</p>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">
      Scores are 1–10, not a bite. This mail is a snapshot. The gauges stay live on the page.
    </p>`,
  });
}

export function letterSubject(_issue: NewsletterIssue, _coasts: TheaterId[] | null) {
  return `Saturday on your water`;
}

export function letterEmailText(issue: NewsletterIssue, coasts: TheaterId[] | null) {
  const edition = coastEditionLabel(coasts);
  const parts = [`Saturday on your water · ${edition}`, issue.rangeLabel, "", forLetter(issue.letter), ""];
  for (const desk of issue.desks) {
    const name = desk.briefing?.area.shortName ?? desk.desk;
    parts.push(
      `${desk.desk.toUpperCase()} · ${name}`,
      desk.briefing ? forLetter(desk.briefing.headline) : forLetter(desk.error ?? desk.kicker),
      deskWords(desk.briefing, desk.error),
      desk.briefing?.when[0]?.label ? forLetter(desk.briefing.when[0].label) : "",
      forLetter(desk.seasonal),
      "",
    );
  }
  if (issue.peaks.length) {
    parts.push(
      "IN PEAK",
      ...issue.peaks.map((p) => `• ${forLetter(p.name)} (${forLetter(p.theaters)}) — ${forLetter(p.why)}`),
      "",
    );
  }
  if (issue.closures.length) {
    parts.push(
      "CLOSED OR CLOSING",
      ...issue.closures.map((c) => `• ${forLetter(c.title)} — ${forLetter(c.body)}`),
      "",
    );
  }
  const qs = coasts?.length && coasts.length < 7 ? `?coasts=${coasts.join(",")}` : "";
  parts.push(
    `Read the letter: ${ORIGIN}/newsletter${qs}`,
    `Season: ${ORIGIN}/fundamentals${qs ? `?theater=${coasts![0]}` : ""}`,
    "",
    "This edition is the water you elected. Coasts you did not pick stay off this letter.",
    LETTER_LEGEND,
  );
  return parts.join("\n");
}

export function letterEmailHtml(issue: NewsletterIssue, coasts: TheaterId[] | null) {
  const edition = coastEditionLabel(coasts);
  const qs = coasts?.length && coasts.length < 7 ? `?coasts=${coasts.join(",")}` : "";
  const desks = issue.desks
    .map((desk) => {
      const name = desk.briefing?.area.shortName ?? desk.desk.replace(" desk", "");
      const head = forLetter(desk.briefing?.headline ?? desk.error ?? desk.kicker);
      const conditions = deskWords(desk.briefing, desk.error);
      const window = desk.briefing?.when[0];
      const feeds = desk.briefing
        ? feedNotes(desk.briefing.area, desk.briefing.conditions)
            .map((n) => n.label)
            .join(" · ")
        : "Gauge quiet";
      const chart = desk.briefing
        ? tideImage(desk.briefing, { bleed: true, alt: letterImageAlt(desk.briefing) })
        : "";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 14px;background:${PAGE};border:1px solid ${LINE};border-radius:18px">
        ${chart ? `<tr><td style="padding:0;font-size:0;line-height:0">${chart}</td></tr>` : ""}
        <tr>
          <td style="padding:${chart ? "12px 16px 16px" : "16px"}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%">
              <tr>
                <td valign="top">
                  ${kicker(desk.desk)}
                  <p style="margin:8px 0 0;font-size:22px;line-height:1.25;color:${NAVY};font-family:Georgia,'Times New Roman',serif">${escapeHtml(name)}</p>
                  <p style="margin:8px 0 0;font-size:15px;line-height:1.45;color:${MUTED}">${escapeHtml(head)}</p>
                  <p style="margin:8px 0 0;font-size:12px;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(feeds)}</p>
                  <p style="margin:8px 0 0;font-size:13px;color:${NAVY};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(conditions)}</p>
                  ${
                    window
                      ? `<p style="margin:8px 0 0;font-size:13px;color:${MUTED}">Window · ${escapeHtml(forLetter(window.label))}${window.why ? ` — ${escapeHtml(forLetter(window.why))}` : ""}</p>`
                      : ""
                  }
                  <p style="margin:8px 0 0;font-size:13px;color:${MUTED}">${escapeHtml(forLetter(desk.seasonal))}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
    })
    .join("");
  const peaks = issue.peaks.length
    ? `${sectionTitle("In peak")}${issue.peaks
        .map(
          (p) =>
            `<p style="margin:0 0 10px;font-size:15px;line-height:1.45"><strong style="color:${NAVY}">${escapeHtml(forLetter(p.name))}</strong> · ${escapeHtml(forLetter(p.theaters))}<br/><span style="color:${MUTED}">${escapeHtml(forLetter(p.why))}</span></p>`,
        )
        .join("")}`
    : "";
  const closures = issue.closures.length
    ? `${sectionTitle("Closed or closing")}${issue.closures
        .map(
          (c) =>
            `<p style="margin:0 0 10px;font-size:15px;line-height:1.45"><strong style="color:${copper}">${escapeHtml(forLetter(c.title))}</strong><br/><span style="color:${MUTED}">${escapeHtml(forLetter(c.body))}</span></p>`,
        )
        .join("")}`
    : "";
  return emailDoc({
    preheader: `${edition} · ${issue.rangeLabel}`,
    body: `
    ${kicker(`Saturday on your water · ${edition}`)}
    ${heading(`${issue.monthName} on your water`)}
    ${dek(issue.rangeLabel)}
    <p style="margin:16px 0 0;font-size:16px;line-height:1.55;color:${NAVY}">${escapeHtml(forLetter(issue.letter))}</p>
    ${sectionTitle("This week")}
    ${desks}
    ${peaks}
    ${closures}
    <p style="margin:20px 0 0">${btn(`${ORIGIN}/newsletter${qs}`, "Open the letter")}</p>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">
      This edition is the water you elected.
    </p>`,
    legend: LETTER_LEGEND,
  });
}

export type CalendarMonth = { year: number; month: number; label: string; days: CalendarDay[] };

function calendarGridHtml(month: CalendarMonth, area: Area) {
  const first = new Date(`${month.year}-${String(month.month).padStart(2, "0")}-01T12:00:00`);
  const pad = first.getDay();
  const cells: string[] = [];
  for (let i = 0; i < pad; i++) {
    cells.push(`<td width="14%" style="width:14%;padding:3px 2px;background:${PAGE}">&nbsp;</td>`);
  }
  for (const day of month.days) {
    const n = Number(day.date.slice(-2));
    const pip = scoreHex(day.score);
    const pipInk = scoreInk(day.score);
    const ring = day.yolo ? copper : day.amazing ? gold : LINE;
    const ringW = day.yolo || day.amazing ? "2px" : "1px";
    const wet = day.wx === "storm" ? "storm" : day.wx === "rain" ? "rain" : "";
    const wind = windWord(day.windMph).split(" · ")[0];
    cells.push(`<td width="14%" align="center" valign="top" style="width:14%;padding:3px 2px">
      <a href="${ORIGIN}/?area=${area.id}&theater=${area.theater}&date=${day.date}" style="display:block;text-decoration:none;color:${NAVY};background:${PAGE};border:${ringW} solid ${ring};border-radius:12px;padding:6px 2px 8px">
        <div style="font-size:11px;line-height:1;font-family:Georgia,'Times New Roman',serif">${n}</div>
        <div style="width:22px;height:22px;margin:5px auto 0;border-radius:11px;background:${pip};color:${pipInk};font-size:10px;font-weight:700;line-height:22px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${day.score.toFixed(0)}</div>
        <div style="font-size:9px;line-height:1.2;padding-top:4px;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(wind)}</div>
        ${wet ? `<div style="font-size:9px;color:${copper};padding-top:2px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${escapeHtml(wet)}</div>` : ""}
      </a>
    </td>`);
  }
  while (cells.length % 7 !== 0) {
    cells.push(`<td width="14%" style="width:14%;padding:3px 2px;background:${PAGE}">&nbsp;</td>`);
  }
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(`<tr>${cells.slice(i, i + 7).join("")}</tr>`);
  }
  const head = ["S", "M", "T", "W", "T", "F", "S"]
    .map(
      (d) =>
        `<th width="14%" style="width:14%;padding:0 0 6px;font-size:10px;letter-spacing:.1em;color:${MUTED};font-weight:normal;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${d}</th>`,
    )
    .join("");
  return `<table role="presentation" class="fb-cal" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0">
    <tr>${head}</tr>
    ${rows.join("")}
  </table>
  <p style="margin:10px 0 0;font-size:12px;color:${MUTED};line-height:1.45;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">Gold ring = amazing dry day. Copper = best dry day left. Pip is the 1–10. Wind is light / breeze / windy — not a direction.</p>`;
}

function upcomingHtml(days: CalendarDay[], area: Area) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: area.timezone });
  const next = days.filter((d) => d.date >= today).slice(0, 7);
  if (!next.length) return "";
  return `${sectionTitle("Next seven")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%">${next
    .map((d) => {
      const label = formatYmdLong(d.date, area.timezone);
      const sky = skyCopy(d.wx, d.precipChance) || "sky later";
      const wind = windWord(d.windMph);
      const tag = d.yolo ? "Best dry" : d.amazing ? "Amazing" : d.confidence;
      const bg = scoreHex(d.score);
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%">
            <tr>
              <td width="44" valign="top" style="width:44px;padding-right:10px">
                <div style="width:36px;height:36px;border-radius:18px;background:${bg};color:${scoreInk(d.score)};text-align:center;line-height:36px;font-size:12px;font-weight:700;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">${d.score.toFixed(1)}</div>
              </td>
              <td valign="top">
                <p style="margin:0;font-size:15px;color:${NAVY}"><strong>${escapeHtml(label)}</strong></p>
                <p style="margin:4px 0 0;font-size:13px;color:${MUTED};line-height:1.4">${escapeHtml(tag)} · ${escapeHtml(wind)} · ${escapeHtml(sky)}${d.bestWindow ? ` · ${escapeHtml(d.bestWindow)}` : ""}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("")}</table>`;
}

export function calendarSubject(area: Area, month: CalendarMonth) {
  return calendarDigestSubject([{ area, month }]);
}

export function calendarDigestSubject(rows: Array<{ area: Area; month: CalendarMonth }>) {
  if (rows.length === 1) {
    const { area, month } = rows[0];
    const yolo = month.days.find((d) => d.yolo);
    return yolo
      ? `Calendar · ${area.shortName} · best dry day ${formatYmdLong(yolo.date, area.timezone)}`
      : `Calendar · ${area.shortName} · ${month.label}`;
  }
  const names = rows.slice(0, 4).map((r) => r.area.shortName).join(" · ");
  const more = rows.length > 4 ? ` +${rows.length - 4}` : "";
  return `Calendar · ${names}${more} · ${rows[0]?.month.label ?? "this month"}`;
}

export function calendarEmailText(area: Area, month: CalendarMonth) {
  const yolo = month.days.find((d) => d.yolo);
  const amazing = month.days.filter((d) => d.amazing).map((d) => d.date);
  const lines = [
    `On This Water calendar · ${theaterLabel(area.theater)} · ${area.name}`,
    month.label,
    yolo ? `Best dry day: ${yolo.date} · ${yolo.score.toFixed(1)}` : null,
    amazing.length ? `Amazing dry days: ${amazing.join(", ")}` : null,
    "",
    ...month.days.map((d) => {
      const mark = d.yolo ? " dry" : d.amazing ? " amazing" : "";
      return `${d.date}  ${d.score.toFixed(1)}${mark}  ${d.drivers[0] ?? ""}`;
    }),
    "",
    `Live calendar: ${calendarHref(area.id, area.theater)}`,
    `Graphic card: ${calendarCardUrl(area.id, area.theater)}`,
    "",
    "Scores are 1–10, not a bite. Rain and thunderstorms cannot own the best dry day.",
  ];
  return lines.filter((l) => l != null).join("\n");
}

export function calendarEmailHtml(area: Area, month: CalendarMonth) {
  return calendarDigestHtml([{ area, month }]);
}

export function calendarDigestText(rows: Array<{ area: Area; month: CalendarMonth }>) {
  return rows.map((r) => calendarEmailText(r.area, r.month)).join("\n\n———\n\n");
}

function calendarWaterBlock(area: Area, month: CalendarMonth) {
  const yolo = month.days.find((d) => d.yolo);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 22px;background:${PAGE};border:1px solid ${LINE};border-radius:18px">
    <tr>
      <td style="padding:16px">
        ${kicker(`${theaterLabel(area.theater)} · ${area.shortName}`)}
        <p style="margin:8px 0 0;font-size:24px;line-height:1.2;color:${NAVY};font-family:Georgia,'Times New Roman',serif">${escapeHtml(area.shortName)}</p>
        <p style="margin:6px 0 12px;font-size:14px;color:${MUTED}">${escapeHtml(month.label)}${yolo ? ` · best dry day ${escapeHtml(formatYmdLong(yolo.date, area.timezone))} · ${yolo.score.toFixed(1)}` : ""}</p>
        ${calendarGridHtml(month, area)}
        ${upcomingHtml(month.days, area)}
        <p style="margin:16px 0 0">${btn(calendarHref(area.id, area.theater), `Open ${area.shortName} calendar`)}</p>
      </td>
    </tr>
  </table>`;
}

export function calendarDigestHtml(rows: Array<{ area: Area; month: CalendarMonth }>) {
  if (!rows.length) {
    return emailDoc({ body: `${heading("Calendar quiet")}${dek("No month grids set.")}` });
  }
  const names = rows.map((r) => r.area.shortName).join(" · ");
  const first = rows[0];
  return emailDoc({
    preheader: rows.length === 1 ? `${first.area.shortName} calendar · ${first.month.label}` : `Calendar · ${names}`,
    body: `
    ${kicker(rows.length === 1 ? `Calendar · ${theaterLabel(first.area.theater)}` : "Calendar · your water")}
    ${heading(rows.length === 1 ? first.area.shortName : `${rows.length} month grids`)}
    ${dek(
      rows.length === 1
        ? `${first.month.label} · scores, moon, rain, and the best dry day left.`
        : `${first.month.label}. Every water you left on — not just the first desk.`,
    )}
    ${sectionTitle(rows.length === 1 ? "The month" : "Your water")}
    ${rows.map((r) => calendarWaterBlock(r.area, r.month)).join("")}
    <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">
      Scores are 1–10, not a bite. Days past the wind forecast are tide and moon only.
    </p>`,
  });
}

export type SeasonIssue = {
  month: number;
  monthName: string;
  coasts: TheaterId[];
  letter: string;
  peaks: { name: string; theaters: string; why: string }[];
  closures: { title: string; body: string }[];
};

export function buildSeasonIssue(coasts: TheaterId[], at = new Date()): SeasonIssue {
  const month = Number(
    new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "America/Chicago" }).format(at),
  );
  const chosen = coasts.length ? coasts : (["texas"] as TheaterId[]);
  return {
    month,
    monthName: MONTH_NAMES[month - 1],
    coasts: chosen,
    letter: chosen.map((t) => MONTH_THEATER[month][t]).filter(Boolean).join(" "),
    peaks: peaksThisMonth(month)
      .filter((s) => s.theaters.some((t) => chosen.includes(t)))
      .map((s) => ({
        name: s.commonName,
        theaters: s.theaters.filter((t) => chosen.includes(t)).map(coastLabel).join(" · "),
        why: s.why,
      })),
    closures: closuresForCoasts(month, chosen, at),
  };
}

export function seasonalSubject(issue: SeasonIssue) {
  return `Season · ${coastEditionLabel(issue.coasts)} · ${issue.monthName}`;
}

export function seasonalEmailText(issue: SeasonIssue) {
  const qs = issue.coasts.length === 1 ? `?theater=${issue.coasts[0]}` : "";
  return [
    `Seasonal fundamentals · ${coastEditionLabel(issue.coasts)} · ${issue.monthName}`,
    "",
    issue.letter,
    "",
    issue.peaks.length ? "IN PEAK" : null,
    ...issue.peaks.map((p) => `• ${p.name} (${p.theaters}) — ${p.why}`),
    "",
    issue.closures.length ? "CLOSED OR CLOSING" : null,
    ...issue.closures.map((c) => `• ${c.title} — ${c.body}`),
    "",
    `Season page: ${ORIGIN}/fundamentals${qs}`,
    "",
    "This is doctrine for the coasts you elected, not a honey-hole list. Verify before you keep a fish.",
  ]
    .filter((l) => l != null)
    .join("\n");
}

export function seasonalEmailHtml(issue: SeasonIssue) {
  const qs = issue.coasts.length === 1 ? `?theater=${issue.coasts[0]}` : "";
  const peaks = issue.peaks.length
    ? `${sectionTitle("In peak")}${issue.peaks
        .map(
          (p) =>
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 10px;background:${PANEL};border:1px solid ${LINE};border-radius:14px"><tr><td style="padding:12px 14px"><p style="margin:0;font-size:16px;color:${NAVY}"><strong>${escapeHtml(p.name)}</strong></p><p style="margin:4px 0 0;font-size:13px;color:${MUTED}">${escapeHtml(p.theaters)} · ${escapeHtml(p.why)}</p></td></tr></table>`,
        )
        .join("")}`
    : `${sectionTitle("In peak")}<p style="margin:0;font-size:15px;color:${MUTED}">No primary species is marked peak this month on your coasts. Present fish still show on the season page.</p>`;
  const closures = issue.closures.length
    ? `${sectionTitle("Closed or closing")}${issue.closures
        .map(
          (c) =>
            `<p style="margin:0 0 10px;font-size:15px;line-height:1.45"><strong style="color:${copper}">${escapeHtml(c.title)}</strong><br/><span style="color:${MUTED}">${escapeHtml(c.body)}</span></p>`,
        )
        .join("")}`
    : "";
  return emailDoc({
    preheader: `${coastEditionLabel(issue.coasts)} · ${issue.monthName} fundamentals`,
    body: `
    ${kicker(`Season · ${coastEditionLabel(issue.coasts)}`)}
    ${heading(`${issue.monthName} on your water`)}
    <p style="margin:16px 0 0;font-size:16px;line-height:1.55;color:${NAVY}">${escapeHtml(issue.letter)}</p>
    ${peaks}
    ${closures}
    <p style="margin:22px 0 0">${btn(`${ORIGIN}/fundamentals${qs}`, "Open the season page")}</p>
    <p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:${MUTED};font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">
      Doctrine for the coasts you elected, not a honey-hole list. Verify before you keep a fish.
    </p>`,
  });
}
