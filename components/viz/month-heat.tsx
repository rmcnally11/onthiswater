import { cn } from "@/lib/utils";
import { copper } from "@/lib/viz";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function MonthHeat({
  peak,
  present,
  nowMonth,
  className,
}: {
  peak: number[];
  present: number[];
  nowMonth?: number;
  className?: string;
}) {
  const summary = MONTH_NAMES.map((name, i) => {
    const m = i + 1;
    const state = peak.includes(m) ? "peak" : present.includes(m) ? "present" : "off";
    return `${name} ${state}`;
  }).join(", ");

  return (
    <div
      className={cn("grid grid-cols-12 gap-1", className)}
      role="img"
      aria-label={`Season by month. ${summary}.`}
    >
      {MONTHS.map((label, i) => {
        const m = i + 1;
        const isPeak = peak.includes(m);
        const isPresent = present.includes(m);
        return (
          <div key={`${label}-${m}`} className="text-center">
            <div
              className={cn(
                "h-8 rounded-md",
                isPeak && "bg-[color:var(--copper)]",
                !isPeak && isPresent && "bg-[color:var(--copper)]/35",
                !isPeak && !isPresent && "bg-[color:var(--cream)]/15",
                nowMonth === m && "ring-2 ring-[color:var(--cream)]",
              )}
            />
            <p className="mt-1 text-[9px] uppercase tracking-wide text-[color:var(--cream)]/75">{label}</p>
          </div>
        );
      })}
    </div>
  );
}

export function MonthHeatLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.12em] text-[color:var(--cream)]/75">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: copper }} /> Peak
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-[color:var(--copper)]/35" /> Present
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-[color:var(--cream)]/15" /> Off
      </span>
    </div>
  );
}
