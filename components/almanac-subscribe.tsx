import { cn } from "@/lib/utils";

const SUBSCRIBE_ORIGIN = "https://thegoodpiratesalmanac.substack.com/subscribe";

export const ALMANAC_PLACEMENTS = ["home", "morning", "field-letter", "for-the-letter"] as const;

export type AlmanacPlacement = (typeof ALMANAC_PLACEMENTS)[number];

/** Plain subscribe URL. One utm_content per placement. `&` stays `&`. */
export function almanacSubscribeHref(placement: AlmanacPlacement): string {
  const params = new URLSearchParams({
    utm_source: "onthiswater",
    utm_medium: "site",
    utm_campaign: "subscribe-block",
    utm_content: placement,
  });
  return `${SUBSCRIBE_ORIGIN}?${params.toString()}`;
}

export function AlmanacSubscribe({
  placement,
  className,
}: {
  placement: AlmanacPlacement;
  className?: string;
}) {
  const headingId = `almanac-subscribe-${placement}`;
  return (
    <aside
      data-testid="almanac-subscribe"
      data-placement={placement}
      aria-labelledby={headingId}
      className={cn(
        "rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5 print:hidden sm:p-6",
        className,
      )}
    >
      <p className="kicker text-[color:var(--copper)]">The Good Pirate&apos;s Almanac</p>
      <h2 id={headingId} className="mt-2 font-heading text-2xl text-[color:var(--cream)] md:text-3xl">
        Get the Saturday letter free
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[color:var(--cream)]">
        I send one email on Saturday mornings. Wind, sky, and the water on the coasts. Free.
      </p>
      <a
        href={almanacSubscribeHref(placement)}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-[color:var(--copper)] px-4 py-2 text-sm font-medium text-white shadow-[0_1px_0_rgba(11,31,51,0.12)] hover:bg-[color:var(--copper)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[color:var(--sea)]"
      >
        Subscribe to The Good Pirate&apos;s Almanac
      </a>
    </aside>
  );
}
