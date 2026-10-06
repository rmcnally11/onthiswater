import { cream, copper } from "@/lib/viz";
import { resolveWindDegrees, windCompassCaption } from "@/lib/wind";
import { cn } from "@/lib/utils";

export function WindCompass({
  degrees,
  mph,
  gust,
  cardinal,
  size = 140,
  className,
}: {
  degrees: number | null;
  mph: number | null;
  gust?: number | null;
  cardinal?: string | null;
  size?: number;
  className?: string;
}) {
  const resolved = resolveWindDegrees(degrees, cardinal);
  const dir = resolved ?? 0;
  const has = resolved != null;
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={size} height={size} viewBox="0 0 120 120" aria-label={has ? `Wind from ${cardinal ?? `${Math.round(dir)}°`}` : "No wind"}>
        <circle cx="60" cy="60" r="52" fill="#eef6fc" stroke="rgba(11,31,51,0.14)" />
        {ticks.map((deg) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const inner = deg % 90 === 0 ? 40 : 44;
          const x1 = 60 + inner * Math.cos(rad);
          const y1 = 60 + inner * Math.sin(rad);
          const x2 = 60 + 50 * Math.cos(rad);
          const y2 = 60 + 50 * Math.sin(rad);
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={cream}
              strokeOpacity={deg % 90 === 0 ? 0.55 : 0.2}
              strokeWidth={deg % 90 === 0 ? 1.6 : 1}
            />
          );
        })}
        <text x="60" y="18" textAnchor="middle" fill={cream} fontSize="8" letterSpacing="1.2">
          N
        </text>
        <text x="106" y="64" textAnchor="middle" fill={cream} fillOpacity="0.45" fontSize="8">
          E
        </text>
        <text x="60" y="112" textAnchor="middle" fill={cream} fillOpacity="0.45" fontSize="8">
          S
        </text>
        <text x="14" y="64" textAnchor="middle" fill={cream} fillOpacity="0.45" fontSize="8">
          W
        </text>
        {has ? (
          <g transform={`rotate(${dir} 60 60)`}>
            <polygon points="60,16 66,58 60,52 54,58" fill={copper} />
            <polygon points="60,104 66,62 60,68 54,62" fill={cream} fillOpacity="0.35" />
          </g>
        ) : null}
        <circle cx="60" cy="60" r="18" fill="#ffffff" stroke="rgba(11,31,51,0.16)" />
        <text x="60" y="58" textAnchor="middle" fill={cream} fontSize="13" fontWeight="600" fontFamily="ui-monospace, monospace">
          {mph != null ? Math.round(mph) : "—"}
        </text>
        <text x="60" y="70" textAnchor="middle" fill="rgba(11,31,51,0.5)" fontSize="7" letterSpacing="0.8">
          MPH
        </text>
      </svg>
      <p className="mt-1 text-center text-[11px] text-[color:var(--cream)]/70">
        {windCompassCaption(degrees, mph, cardinal, gust)}
      </p>
    </div>
  );
}
