import { cream } from "@/lib/viz";
import { cn } from "@/lib/utils";

/**
 * Astronomical disk. phase 0 = new, 0.5 = full.
 * Shadow is drawn as an offset circle so waxing/waning reads at a glance.
 */
export function MoonDisk({
  phase,
  illumination,
  size = 72,
  name,
  springNeap,
  className,
  uid,
}: {
  phase: number;
  illumination: number;
  size?: number;
  name?: string;
  springNeap?: "spring" | "neap" | "mid";
  className?: string;
  uid?: string;
}) {
  const waxing = phase < 0.5;
  const lit = Math.max(0.04, Math.min(0.98, illumination));
  const offset = waxing ? (1 - lit) * 36 : -(1 - lit) * 36;
  const id = `moon-${uid ?? `${Math.round(phase * 1000)}-${size}`}`;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={size} height={size} viewBox="0 0 80 80" role="img" focusable="false" aria-label={name ?? "Moon"}>
        <defs>
          <clipPath id={`${id}-clip`}>
            <circle cx="40" cy="40" r="28" />
          </clipPath>
          <radialGradient id={`${id}-glow`} cx="35%" cy="30%">
            <stop offset="0%" stopColor="#fff8e7" />
            <stop offset="70%" stopColor="#e8d5a3" />
            <stop offset="100%" stopColor="#c4b07a" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="32" fill="rgba(232,213,163,0.08)" />
        <circle cx="40" cy="40" r="28" fill={`url(#${id}-glow)`} />
        <g clipPath={`url(#${id}-clip)`}>
          <circle cx={40 + offset} cy="40" r="28" fill="#0b1620" fillOpacity={0.82} />
        </g>
        <circle cx="40" cy="40" r="28" fill="none" stroke={cream} strokeOpacity="0.25" strokeWidth="1" />
      </svg>
      {name ? (
        <p className="mt-1 text-center text-[11px] leading-tight text-[color:var(--cream)]/80">{name}</p>
      ) : null}
      {springNeap ? (
        <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--cream)]/40">
          {springNeap} range · {Math.round(illumination * 100)}%
        </p>
      ) : null}
    </div>
  );
}
