import {
  DOCK_DIESEL_NOTE,
  dockDieselForDesk,
  formatDockDiesel,
  type DockDieselQuote,
} from "@/lib/dock-diesel";

export function DockDieselCopy({
  theater,
  quote,
  compact = false,
}: {
  theater?: string | null;
  quote: DockDieselQuote | null;
  compact?: boolean;
}) {
  const shown = dockDieselForDesk(theater, quote);
  if (!shown) return null;
  const line = formatDockDiesel(shown);
  if (!line) return null;
  return (
    <p
      data-testid="dock-diesel"
      className={
        compact
          ? "mt-2 text-[13px] leading-snug text-[color:var(--cream)]"
          : "mt-3 text-sm leading-snug text-[color:var(--cream)]"
      }
    >
      {line}
      <span className="mt-1 block text-xs leading-snug text-[color:var(--cream)]/80">{DOCK_DIESEL_NOTE}</span>
    </p>
  );
}
