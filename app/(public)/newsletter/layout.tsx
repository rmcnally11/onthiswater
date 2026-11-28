import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AlmanacSubscribe } from "@/components/almanac-subscribe";
import { LETTER_SEO } from "@/lib/letter-copy";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: LETTER_SEO.title,
  description: LETTER_SEO.description,
  path: "/newsletter",
  imageAlt: LETTER_SEO.imageAlt,
});

export default function NewsletterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-10">
      {children}
      <AlmanacSubscribe placement="field-letter" className="mx-auto max-w-3xl" />
    </div>
  );
}
