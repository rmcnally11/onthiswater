import { cn } from "@/lib/utils";
import { windLevel } from "@/lib/wind";

export function WindMark({ mph, className }: { mph: number | null; className?: string }) {
  if (mph == null) {
    return (
      <span className={cn("text-[9px] uppercase tracking-wide text-[color:var(--cream)]/75", className)}>—</span>
    );
  }
  const level = windLevel(mph);
  const blow = mph >= 22;
  const windy = mph >= 16;
  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 18 14"
      role="img"
      focusable="false"
      aria-label={`${Math.round(mph)} mph`}
      className={cn(
        blow
          ? "text-[color:var(--copper)]"
          : windy
            ? "text-[color:var(--coral)]"
            : "text-[color:var(--cream)]/55",
        className,
      )}
    >
      <title>{`${Math.round(mph)} mph`}</title>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M1 ${3.6 + i * 3.4} C6 ${2.2 + i * 3.4}, 11 ${4.6 + i * 3.4}, 17 ${3.1 + i * 3.4}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity={i < level ? 1 : 0.14}
        />
      ))}
    </svg>
  );
}
