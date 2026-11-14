import type { ReactElement, ReactNode } from "react";
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { TideChartGraphic } from "@/components/viz/tide-chart-graphic";
import { getArea } from "@/lib/data/areas";
import { theaterLabel } from "@/lib/data/theaters";
import { layoutTideChart } from "@/lib/tide-chart";
import { loadTides } from "@/lib/tides";
import type { TideChartLayout } from "@/lib/tide-chart";
import { CHARCOAL, HULL, PAPER, PEACH, SAND, SUN, TEAL } from "@/lib/house";

function TideChartOg({ layout }: { layout: TideChartLayout }) {
  const { width, height, padL, padT, padB, fontSize, yTicks, marks, dayMarks, nowX, nowOn } = layout;
  return (
    <div style={{ position: "relative", width, height, display: "flex" }}>
      <TideChartGraphic
        layout={layout}
        fillId="ogTideFill"
        labels={false}
        paint={{ cream: CHARCOAL, copper: HULL, gold: SUN, water: TEAL }}
      />
      {yTicks.map((t) => (
        <div
          key={`y-${t.v}`}
          style={{
            position: "absolute",
            left: 0,
            top: t.y - fontSize * 0.6,
            width: padL - 8,
            display: "flex",
            justifyContent: "flex-end",
            fontSize,
            color: "rgba(74,71,66,0.55)",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {t.v.toFixed(1)}
        </div>
      ))}
      {marks.map((m) => (
        <div
          key={`${m.time}-${m.type}`}
          style={{
            position: "absolute",
            left: m.x - 10,
            top: m.type === "H" ? m.y - fontSize * 1.6 : m.y + 6,
            width: 20,
            display: "flex",
            justifyContent: "center",
            fontSize,
            color: "rgba(74,71,66,0.78)",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {m.type}
        </div>
      ))}
      {nowOn ? (
        <div
          style={{
            position: "absolute",
            left: nowX + 6,
            top: padT,
            fontSize,
            color: HULL,
            letterSpacing: 1,
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          NOW
        </div>
      ) : null}
      {dayMarks
        .filter((_, i) => i % 2 === 0)
        .map((m) => (
          <div
            key={`day-${m.x}`}
            style={{
              position: "absolute",
              left: m.x,
              top: height - padB + 4,
              fontSize,
              color: "rgba(74,71,66,0.45)",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {m.label}
          </div>
        ))}
    </div>
  );
}

export const runtime = "nodejs";
export const revalidate = 300;

const WIDTH = 1200;
const HEIGHT = 520;

function chrome(opts: { kicker: string; title: string; stage: string; source: string; children?: ReactNode }) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        background: PAPER,
        color: CHARCOAL,
        boxShadow: `inset 0 0 0 10px ${SAND}`,
        padding: "28px 36px 24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 3.2,
              textTransform: "uppercase",
              color: HULL,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {opts.kicker}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 36,
              lineHeight: 1.1,
              fontFamily: "Georgia, Times New Roman, serif",
            }}
          >
            {opts.title}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 18, color: CHARCOAL }}>{opts.stage}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "rgba(74,71,66,0.55)" }}>{opts.source}</div>
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 16, height: 4 }}>
        <div style={{ width: "42%", background: TEAL }} />
        <div style={{ width: "22%", background: SUN }} />
        <div style={{ width: "36%", background: PEACH }} />
      </div>
      <div style={{ display: "flex", flex: 1, marginTop: 10, alignItems: "center" }}>
        {opts.children ?? (
          <div
            style={{
              fontSize: 22,
              color: "rgba(74,71,66,0.55)",
              fontFamily: "Georgia, Times New Roman, serif",
            }}
          >
            Tide curve needs more hourly points from the gauge.
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontSize: 14,
          color: "rgba(74,71,66,0.55)",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div>On This Water</div>
        <div>Not a chart for navigation</div>
      </div>
    </div>
  );
}

function png(element: ReactElement) {
  return new ImageResponse(element, {
    width: WIDTH,
    height: HEIGHT,
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}

export async function GET(request: NextRequest) {
  const area = getArea(request.nextUrl.searchParams.get("area"));
  const kicker = `${theaterLabel(area.theater)} · ${area.shortName}`;

  try {
    const tides = await loadTides(area, new Date(), { observe: false });
    const layout = layoutTideChart({
      hourly: tides.hourly,
      nextHiLo: tides.nextHiLo,
      timezone: area.timezone,
      width: 1128,
      height: 340,
    });
    const stage = `${tides.stage.replace("-", " ")}${
      tides.predictedNow != null ? ` · ${tides.predictedNow.toFixed(2)} ft` : ""
    }`;
    const source = tides.source === "noaa" ? "NOAA hourly · ft MLLW" : "Modeled M2 · not a gauge";

    return png(
      chrome({
        kicker,
        title: `${area.name} tide`,
        stage,
        source,
        children: layout.ok ? <TideChartOg layout={layout} /> : undefined,
      }),
    );
  } catch {
    return png(
      chrome({
        kicker,
        title: `${area.name} tide`,
        stage: "Gauge quiet",
        source: "Try the live brief",
      }),
    );
  }
}
