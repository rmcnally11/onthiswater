import type { Metadata } from "next";
import { MorningMail } from "@/components/morning-mail";
import { desksForCoasts, isAllCoasts, letterDeskForArea, resolveElectedCoasts } from "@/lib/coasts";
import { readCoastsPref, readWaterPref } from "@/lib/prefs";
import { Waterline } from "@/components/viz/waterline";
import { JsonLd } from "@/components/json-ld";
import { faqJsonLd, HOME_FAQ, pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Get the morning",
  description:
    "This morning in the inbox. Tell us the water. A Texas-only list does not get Andros or Seychelles.",
  path: "/join",
});

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ coasts?: string; desks?: string }>;
}) {
  const q = await searchParams;
  const [cookie, water] = await Promise.all([readCoastsPref(), readWaterPref()]);
  const coasts = resolveElectedCoasts({
    coastsQuery: q.coasts,
    desksQuery: q.desks,
    cookie: cookie?.join(",") ?? null,
  });
  const signupDesks =
    coasts && !isAllCoasts(coasts)
      ? desksForCoasts(coasts)
      : [letterDeskForArea(water?.areaId) ?? "galveston"];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <JsonLd data={faqJsonLd(HOME_FAQ)} />
      <header>
        <p className="kicker text-[color:var(--copper)]">The list · this morning · Saturday</p>
        <h1 className="page-title mt-3 text-[color:var(--cream)]">
          Get the morning
        </h1>
        <p className="mt-3 text-sm text-[color:var(--cream)]/65">
          Tell us the water. We’ll send the morning. Take a whole coast or only the subsections —
          Florida is Key Largo, Islamorada, Flamingo, Marathon, Key West, Boca Grande, Jupiter,
          and Biscayne, not Islamorada alone. North Carolina is Hatteras, Morehead City, and
          Wilmington. A Texas-only list does not get Andros, Seychelles, or the Azores.
        </p>
        <Waterline className="mt-4" />
      </header>
      <MorningMail
        source="Letter"
        defaultDesks={signupDesks}
        defaultDesk={signupDesks[0]}
        join
      />
    </div>
  );
}
