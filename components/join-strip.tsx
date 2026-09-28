import { JoinLink } from "@/components/join-link";
import { cn } from "@/lib/utils";

export function JoinStrip({ className }: { className?: string }) {
  return (
    <aside
      data-testid="join-strip"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-[color:var(--copper)] bg-[color:var(--ink)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="kicker text-[color:var(--copper)]">This morning · Saturday</p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--cream)]/75">
          This morning and the Saturday letter, in the inbox.
        </p>
      </div>
      <JoinLink compact className="w-full sm:w-auto" />
    </aside>
  );
}
