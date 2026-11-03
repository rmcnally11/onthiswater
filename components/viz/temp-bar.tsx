import { useId } from "react";
import { cream, copper } from "@/lib/viz";
import { cn } from "@/lib/utils";

export function TempBar({
  tempF,
  min = 48,
  max = 92,
  opt,
  label = "Water",
  detail,
  className,
}: {
  tempF: number | null;
  min?: number;
  max?: number;
  opt?: [number, number];
  label?: string;
  detail?: string;
  className?: string;
}) {
  const gradientId = `tempScale-${useId().replace(/:/g, "")}`;
  const span = max - min || 1;
  const pct = tempF == null ? null : Math.max(0, Math.min(1, (tempF - min) / span));
  const optL = opt ? Math.max(0, Math.min(1, (opt[0] - min) / span)) : null;
  const optR = opt ? Math.max(0, Math.min(1, (opt[1] - min) / span)) : null;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--cream)]/75">{label}</p>
        <p className="font-heading text-2xl text-[color:var(--cream)]">
          {tempF != null ? `${tempF.toFixed(1)}°` : "—"}
        </p>
      </div>
      <svg viewBox="0 0 200 22" className="mt-2 h-6 w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="35%" stopColor="#2dd4bf" />
            <stop offset="70%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#e23b3b" />
          </linearGradient>
        </defs>
        <rect x="2" y="8" width="196" height="6" rx="3" fill={`url(#${gradientId})`} opacity="0.85" />
        {optL != null && optR != null ? (
          <rect
            x={2 + optL * 196}
            y="6"
            width={Math.max(2, (optR - optL) * 196)}
            height="10"
            rx="2"
            fill="none"
            stroke={cream}
            strokeOpacity="0.55"
          />
        ) : null}
        {pct != null ? (
          <g transform={`translate(${2 + pct * 196}, 11)`}>
            <polygon points="0,-9 4,0 0,9 -4,0" fill={copper} />
          </g>
        ) : null}
        <text x="2" y="21" fill={cream} fillOpacity="0.75" fontSize="7">
          {min}°
        </text>
        <text x="198" y="21" textAnchor="end" fill={cream} fillOpacity="0.75" fontSize="7">
          {max}°
        </text>
      </svg>
      {detail ? <p className="mt-1 text-[11px] text-[color:var(--cream)]/75">{detail}</p> : null}
    </div>
  );
}
