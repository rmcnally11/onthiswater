import { cream, copper, gold, water } from "@/lib/viz";
import type { TideChartLayout } from "@/lib/tide-chart";

export function TideChartGraphic({
  layout,
  fillId = "tideFill",
  fit = "fixed",
  labels = true,
  cursor,
}: {
  layout: TideChartLayout;
  fillId?: string;
  fit?: "fixed" | "fluid";
  labels?: boolean;
  cursor?: { x: number; y: number; label: string } | null;
}) {
  if (!layout.ok) return null;
  const {
    width,
    height,
    padL,
    padR,
    padT,
    padB,
    innerH,
    marks,
    bands,
    yTicks,
    dayMarks,
    nowX,
    nowOn,
    fillPath,
    strokePath,
    fontSize,
    markR,
    strokeWidth,
    nowWidth,
  } = layout;

  return (
    <svg
      width={fit === "fixed" ? width : undefined}
      height={fit === "fixed" ? height : undefined}
      viewBox={`0 0 ${width} ${height}`}
      className={fit === "fluid" ? "h-auto w-full" : undefined}
      role="img"
      focusable="false"
      aria-label="Tide curve"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={copper} stopOpacity={0.45} />
          <stop offset="55%" stopColor={water} stopOpacity={0.55} />
          <stop offset="100%" stopColor={water} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      {bands.map((b, i) =>
        b.w > 0 ? (
          <rect
            key={`band-${i}`}
            x={b.x}
            y={padT}
            width={b.w}
            height={innerH}
            fill={copper}
            opacity={0.12}
          />
        ) : null,
      )}
      {yTicks.map((t) => (
        <line
          key={`tick-${t.v}`}
          x1={padL}
          x2={width - padR}
          y1={t.y}
          y2={t.y}
          stroke={cream}
          strokeOpacity={0.12}
        />
      ))}
      {labels
        ? yTicks.map((t) => (
            <text
              key={`tick-label-${t.v}`}
              x={padL - 6}
              y={t.y + fontSize * 0.35}
              textAnchor="end"
              fill={cream}
              fillOpacity={0.4}
              fontSize={fontSize}
              fontFamily="ui-monospace, monospace"
            >
              {t.v.toFixed(1)}
            </text>
          ))
        : null}
      <path d={fillPath} fill={`url(#${fillId})`} />
      <path d={strokePath} fill="none" stroke={cream} strokeOpacity={0.85} strokeWidth={strokeWidth} />
      {marks.map((m) => (
        <circle key={`${m.time}-${m.type}`} cx={m.x} cy={m.y} r={markR} fill={m.type === "H" ? cream : copper} />
      ))}
      {labels
        ? marks.map((m) => (
            <text
              key={`mark-${m.time}-${m.type}`}
              x={m.x}
              y={m.type === "H" ? m.y - fontSize * 0.85 : m.y + fontSize * 1.5}
              textAnchor="middle"
              fill={cream}
              fillOpacity={0.7}
              fontSize={fontSize}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {m.type}
            </text>
          ))
        : null}
      {cursor ? (
        <g>
          <line
            x1={cursor.x}
            x2={cursor.x}
            y1={padT}
            y2={height - padB}
            stroke={gold}
            strokeWidth={nowWidth}
          />
          <circle cx={cursor.x} cy={cursor.y} r={markR * 1.15} fill={gold} />
        </g>
      ) : null}
      {nowOn ? (
        <line
          x1={nowX}
          x2={nowX}
          y1={padT}
          y2={height - padB}
          stroke={copper}
          strokeDasharray={`${3 * (fontSize / 8)} ${3 * (fontSize / 8)}`}
          strokeWidth={nowWidth}
        />
      ) : null}
      {labels && nowOn && !cursor ? (
        <text
          x={nowX + fontSize * 0.5}
          y={padT + fontSize * 1.25}
          fill={copper}
          fontSize={fontSize}
          letterSpacing={0.8}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          NOW
        </text>
      ) : null}
      {labels && cursor ? (
        <text
          x={cursor.x + fontSize * 0.6 < width - padR - 80 ? cursor.x + fontSize * 0.6 : cursor.x - fontSize * 0.6}
          y={Math.max(padT + fontSize * 1.2, cursor.y - fontSize)}
          textAnchor={cursor.x + fontSize * 0.6 < width - padR - 80 ? "start" : "end"}
          fill={gold}
          fontSize={fontSize * 1.15}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {cursor.label}
        </text>
      ) : null}
      {labels
        ? dayMarks
            .filter((_, i) => i % 2 === 0)
            .map((m) => (
              <text
                key={`day-${m.x}`}
                x={m.x}
                y={height - 6}
                fill={cream}
                fillOpacity={0.35}
                fontSize={fontSize}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {m.label}
              </text>
            ))
        : null}
    </svg>
  );
}
