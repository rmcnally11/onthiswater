import { scoreHex, cream } from "@/lib/viz";
import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 120,
  label = "Today",
  sub,
  className,
}: {
  score: number;
  size?: number;
  label?: string;
  sub?: string;
  className?: string;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const t = Math.max(0, Math.min(10, score)) / 10;
  const hex = scoreHex(score);
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" focusable="false" aria-label={`Score ${score.toFixed(1)} of 10`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(11,31,51,0.12)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(c * t).toFixed(1)} ${c.toFixed(1)}`}
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="48"
          textAnchor="middle"
          fill={cream}
          fontFamily="var(--font-geist-mono), ui-monospace, monospace"
          fontSize="28"
          fontWeight="500"
        >
          {score.toFixed(1)}
        </text>
        <text x="50" y="64" textAnchor="middle" fill="rgba(11,31,51,0.75)" fontSize="8" letterSpacing="1.4">
          OF 10
        </text>
      </svg>
      {label ? (
        <p className="mt-[-6px] text-[10px] uppercase tracking-[0.18em] text-[color:var(--cream)]/75">{label}</p>
      ) : null}
      {sub ? <p className="text-[11px] text-[color:var(--cream)]/75">{sub}</p> : null}
    </div>
  );
}
