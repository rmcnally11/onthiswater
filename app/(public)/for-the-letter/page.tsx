import type { Metadata } from "next";
import { Waterline } from "@/components/viz/waterline";
import { GITHUB_REPO, PRODUCT_NAME, siteOrigin } from "@/lib/brand";
import { DESKS, deskChoiceLabel } from "@/lib/desks";

export const metadata: Metadata = {
  title: "For Saturday and Twitter bots",
  description:
    "Substack and X agents may only reprint On This Water. Morning and calendar pictures are screenshots of this site.",
};

const ORIGIN = siteOrigin();

const DESK_HREFS = DESKS.map((desk) => [
  `${desk.desk} — ${deskChoiceLabel(desk).split(" — ")[1]}`,
  `${ORIGIN}/?area=${desk.areaId}&theater=${desk.theater}`,
]);

export default function ForTheLetterPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="kicker text-[color:var(--copper)]">Source of truth</p>
        <h1 className="page-title mt-3 text-[color:var(--cream)]">
          For Substack and Twitter bots
        </h1>
        <p className="mt-3 text-sm text-[color:var(--cream)]/65">
          You may reprint {PRODUCT_NAME}. You may not invent weather, tides, scores, or water. If a
          number is not on this site, it does not go in the letter.
        </p>
        <Waterline className="mt-4" />
      </header>

      <section className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5 text-sm leading-relaxed text-[color:var(--cream)]/80">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--copper)]">Allowed origins</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            <a className="underline decoration-[color:var(--copper)]/40" href={ORIGIN}>
              {ORIGIN}
            </a>
          </li>
          <li>
            <a
              className="underline decoration-[color:var(--copper)]/40"
              href={GITHUB_REPO}
            >
              {GITHUB_REPO.replace(/^https?:\/\//, "")}
            </a>
          </li>
        </ul>
        <p className="mt-4">
          Forbidden: weather.com, Windy, AccuWeather, NOAA.gov, NWS.gov, Open-Meteo, tide apps,
          forums, blogs, and anything in your training data about “the bite.” This instrument
          already pulled the gauges.
        </p>
      </section>

      <section>
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--copper)]">Fetch order</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[color:var(--cream)]/80">
          <li>
            This page —{" "}
            <a className="underline" href="/for-the-letter">
              {ORIGIN}/for-the-letter
            </a>
          </li>
          <li>
            JSON —{" "}
            <a className="underline" href="/api/letter">
              {ORIGIN}/api/letter
            </a>
          </li>
          <li>
            Human letter —{" "}
            <a className="underline" href="/newsletter">
              {ORIGIN}/newsletter
            </a>
          </li>
          <li>
            Twitter JSON —{" "}
            <a className="underline" href="/api/tweets">
              {ORIGIN}/api/tweets
            </a>
          </li>
        </ol>
        <p className="mt-3 text-sm text-[color:var(--cream)]/65">
          If the JSON errors or a desk is quiet, do not publish. Do not fill gaps from memory.
        </p>
      </section>

      <section>
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--copper)]">Letter desks only</p>
        <ul className="mt-3 space-y-2 text-sm">
          {DESK_HREFS.map(([label, href]) => (
            <li key={href}>
              <span className="text-[color:var(--cream)]/55">{label} — </span>
              <a className="break-all text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40" href={href}>
                {href}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[color:var(--cream)]/55">
          Do not add Flamingo, Key Largo, Boca Grande, Marathon, or a Texas bay the letter did not
          print. Islamorada does not own the whole Keys.
        </p>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5 text-sm text-[color:var(--cream)]/80">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--copper)]">Hard doctrine</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Print the month essay from the JSON <code>letter</code> field verbatim.</li>
          <li>Scores are 1–10, not bite guarantees. Do not say the fish will eat.</li>
          <li>No invented honey holes, GPS, or secret water.</li>
          <li>Jacks never headline. Roosterfish never on Gulf water. GT is Seychelles only.</li>
          <li>Mahi / sail / tuna / marlin / swordfish stay off the flat unless the JSON in-play list already put them there.</li>
          <li>Do not mention Rollover Pass. It was filled in 2019.</li>
          <li>Closures come from the JSON only. Tell them to verify before they keep a fish.</li>
          <li>Links must stay on onthiswater.com. No shorteners. No other weather domains.</li>
          <li>One Saturday post. No mid-week “update” from a forecast you made up.</li>
        </ul>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5 text-sm text-[color:var(--cream)]/80">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--copper)]">Twitter / X</p>
        <p className="mt-3">
          Morning: one post per letter water, text from <code>/api/tweets</code> mornings[]
          verbatim — the last line is the live desk so a reader of the tweet lands on this site
          (same as JSON <code>url</code> / <code>href</code>). Picture = screenshot of{" "}
          <a className="underline" href="/card?area=galveston&amp;theater=texas">
            /card
          </a>{" "}
          (score ring, wind compass, moon, tide curve, sky) — do not put that card URL in the tweet.
          Calendar: one post per item in calendars[], last line is the live{" "}
          <a className="underline" href="/calendar?area=galveston&amp;theater=texas">
            /calendar
          </a>
          , picture = screenshot of{" "}
          <a className="underline" href="/card/calendar?area=galveston&amp;theater=texas">
            /card/calendar
          </a>{" "}
          (the month grid on this site). No AI images. No other weather sites. Skip any desk with
          skip=true.
        </p>
      </section>

      <p className="text-sm text-[color:var(--cream)]/50">
        Full prompts:{" "}
        <a
          className="underline decoration-[color:var(--copper)]/40"
          href={`${GITHUB_REPO}/blob/main/SUBSTACK.md`}
        >
          SUBSTACK.md
        </a>
        {" · "}
        <a
          className="underline decoration-[color:var(--copper)]/40"
          href={`${GITHUB_REPO}/blob/main/TWITTER.md`}
        >
          TWITTER.md
        </a>
        .
      </p>
    </div>
  );
}
