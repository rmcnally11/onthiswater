import { cn } from "@/lib/utils";

export function JoinLink({
  href = "/join",
  on = false,
  compact = false,
  className,
  children = "Join the list",
}: {
  href?: string;
  on?: boolean;
  compact?: boolean;
  className?: string;
  children?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium tracking-wide text-white shadow-[0_1px_0_rgba(11,31,51,0.12)] transition",
        compact ? "px-3.5 py-1.5 text-sm" : "px-4 py-2 text-sm",
        on
          ? "bg-[color:var(--cream)] text-[color:var(--ink)]"
          : "bg-[color:var(--copper)] hover:bg-[color:var(--copper)]/90",
        className,
      )}
    >
      {children}
    </a>
  );
}
