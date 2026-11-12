"use client";

import { useId, useState } from "react";
import type { HiLo, HourlyTide } from "@/lib/types";
import { layoutTideChart, sampleAtX } from "@/lib/tide-chart";
import { tideGauge } from "@/lib/data/tide-gauges";
import { TideChartGraphic } from "@/components/viz/tide-chart-graphic";
import { formatInZone } from "@/lib/time";
import { cn } from "@/lib/utils";

export function TideCurve({
  hourly,
  nextHiLo,
  timezone,
  nowHeight,
  stage,
  source,
  station,
  windows,
  className,
  height = 168,
}: {
  hourly: HourlyTide[];
  nextHiLo?: HiLo[];
  timezone: string;
  nowHeight?: number | null;
  stage?: string;
  source?: string;
  station?: string | null;
  windows?: { start: string; end: string }[];
  className?: string;
  height?: number;
}) {
  const fillId = useId().replace(/:/g, "");
  const layout = layoutTideChart({
    hourly,
    nextHiLo,
    timezone,
    windows,
    width: 720,
    height,
  });
  const [cursor, setCursor] = useState<{ x: number; y: number; label: string } | null>(null);
  const gauge = tideGauge(station);

  if (!layout.ok) {
    return (
      <div className={cn("flex h-40 items-center justify-center text-sm text-[color:var(--cream)]/75", className)}>
        Tide curve needs more hourly points from the gauge.
      </div>
    );
  }

  function readAt(svg: SVGSVGElement, clientX: number) {
    const box = svg.getBoundingClientRect();
    const x = ((clientX - box.left) / Math.max(1, box.width)) * layout.width;
    const sample = sampleAtX(layout, x);
    if (!sample) return;
    const when = formatInZone(new Date(sample.t), timezone, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    setCursor({ x: sample.x, y: sample.y, label: `${when} · ${sample.h.toFixed(2)} ft` });
  }

  return (
    <div className={cn("w-full", className)}>
      <div
        className="relative touch-none"
        onPointerLeave={() => setCursor(null)}
      >
        <TideChartGraphic
          layout={layout}
          fillId={`tideFill-${fillId}`}
          fit="fluid"
          cursor={cursor}
        />
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="absolute inset-0 h-full w-full cursor-crosshair"
          role="presentation"
          onPointerMove={(e) => readAt(e.currentTarget, e.clientX)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            readAt(e.currentTarget, e.clientX);
          }}
        >
          <rect x={layout.padL} y={layout.padT} width={layout.width - layout.padL - layout.padR} height={layout.innerH} fill="transparent" />
        </svg>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[color:var(--cream)]/75">
        <span className="capitalize">
          {stage?.replace("-", " ") ?? "tide"}
          {nowHeight != null ? ` · ${nowHeight.toFixed(2)} ft` : ""}
          {cursor ? ` · ${cursor.label}` : " · drag or hover for the clock"}
        </span>
        <span>
          {source === "noaa" && gauge ? (
            <>
              NOAA tide gauge{" "}
              <a
                className="underline decoration-[color:var(--copper)]/40"
                href={gauge.href}
                target="_blank"
                rel="noreferrer"
              >
                {gauge.id}
              </a>
              {` · ${gauge.name} · ft MLLW · not a weather buoy`}
            </>
          ) : source === "modeled" ? (
            "Modeled M2 clock — no NOAA gauge on this water. Not a buoy."
          ) : (
            "ft"
          )}
        </span>
      </div>
    </div>
  );
}
