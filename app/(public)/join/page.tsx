import type { Metadata } from "next";
import { JoinMail } from "@/components/join-mail";
import { Waterline } from "@/components/viz/waterline";
import { JsonLd } from "@/components/json-ld";
import { faqJsonLd, HOME_FAQ, pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Join the list",
  description:
    "This morning in the inbox. Tell us the water. A Texas-only list does not get Andros or Seychelles.",
  path: "/join",
});

export default function JoinPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <JsonLd data={faqJsonLd(HOME_FAQ)} />
      <header>
        <p className="kicker text-[color:var(--copper)]">The list · this morning · Saturday</p>
        <h1 className="page-title mt-3 text-[color:var(--cream)]">
          Join the list
        </h1>
        <p className="mt-3 text-sm text-[color:var(--cream)]/65">
          Tell us the water. We’ll send the morning. Take a whole coast or only the subsections —
          Florida is Key Largo, Islamorada, Flamingo, Marathon, Key West, Boca Grande, Jupiter,
          and Biscayne, not Islamorada alone. North Carolina is Hatteras, Morehead City, and
          Wilmington. A Texas-only list does not get Andros, Seychelles, or the Azores.
        </p>
        <Waterline className="mt-4" />
      </header>
      <JoinMail />
    </div>
  );
}
