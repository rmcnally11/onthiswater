"use client";

import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/house-art";
import { PRODUCT_NAME } from "@/lib/brand";
import { dockPostedHomeHref } from "@/lib/dock-posted";
import { letterChromeLegend } from "@/lib/letter-copy";

export function SiteFooter() {
  const legend =
    letterChromeLegend(usePathname() ?? "") ??
    "Scores are 1–10. They are not a bite. Not a chart you steer by.";
  return (
    <footer className="border-t border-[color:var(--line)] px-4 py-8 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-center">
      <a href="/" className="mb-4 inline-flex items-center justify-center gap-2">
        <BrandMark pixels={32} />
        <span className="wordmark text-[#4A4742]">{PRODUCT_NAME}</span>
      </a>
      <p className="text-sm text-[color:var(--cream)]/80">
        Want this morning in the inbox?{" "}
        <a
          href="/join"
          className="font-medium text-[color:var(--copper)] underline decoration-[color:var(--copper)]/40 underline-offset-2"
        >
          Join the list
        </a>
        .
      </p>
      <p data-testid="dock-posted-credit" className="mt-3 text-xs text-[color:var(--cream)]/75">
        What they posted on the pump —{" "}
        <a
          href={dockPostedHomeHref()}
          className="font-medium text-[color:var(--copper)] underline decoration-[color:var(--copper)]/40 underline-offset-2"
        >
          marina fuel on this water
        </a>
        . Tide and wind live here.
      </p>
      <p className="mt-3 text-xs text-[color:var(--cream)]/75">
        {legend}
        Verify TPWD, FWC, Bahamas, FKNMS, and NPS rules before you fish. Your book is yours, on this
        phone.
      </p>
    </footer>
  );
}
