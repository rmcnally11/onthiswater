import { cn } from "@/lib/utils";
import { scoreHex, scoreInk } from "@/lib/viz";

export function ScorePip({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-md px-2 py-0.5 font-mono text-sm font-semibold",
        className,
      )}
      style={{ background: scoreHex(score), color: scoreInk(score) }}
    >
      {score.toFixed(1)}
    </span>
  );
}
