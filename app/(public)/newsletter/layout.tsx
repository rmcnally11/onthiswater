import type { ReactNode } from "react";
import type { Metadata } from "next";
import { LETTER_SEO } from "@/lib/letter-copy";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: LETTER_SEO.title,
  description: LETTER_SEO.description,
  path: "/newsletter",
  imageAlt: LETTER_SEO.imageAlt,
});

export default function NewsletterLayout({ children }: { children: ReactNode }) {
  return children;
}
