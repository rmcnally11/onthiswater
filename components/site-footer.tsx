import { dockPostedHomeHref } from "@/lib/dock-posted";

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--line)] px-4 py-8 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-center">
      <p className="text-sm text-[color:var(--cream)]/70">
        Want this morning in the inbox?{" "}
        <a
          href="/join"
          className="font-medium text-[color:var(--copper)] underline decoration-[color:var(--copper)]/40 underline-offset-2"
        >
          Join the list
        </a>
        .
      </p>
      <p data-testid="dock-posted-credit" className="mt-3 text-xs text-[color:var(--cream)]/40">
        What they posted on the pump —{" "}
        <a
          href={dockPostedHomeHref()}
          className="font-medium text-[color:var(--copper)] underline decoration-[color:var(--copper)]/40 underline-offset-2"
        >
          marina fuel on this water
        </a>
        . Tide and wind live here.
      </p>
      <p className="mt-3 text-xs text-[color:var(--cream)]/40">
        Scores are 1–10. They are not a bite. Not a chart you steer by.
        Verify TPWD, FWC, Bahamas, FKNMS, and NPS rules before you fish. Your book is yours, on this
        phone.
      </p>
    </footer>
  );
}
