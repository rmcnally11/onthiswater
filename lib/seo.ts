import type { Metadata } from "next";
import { PRODUCT_DOMAIN, PRODUCT_NAME, siteOrigin } from "@/lib/brand";

export const HOME_TITLE =
  "On This Water — tide and wind this morning, Texas to the Azores";
export const HOME_DESCRIPTION =
  "This morning on your water. Live NOAA tides, wind, and whether to leave. Texas through the Carolinas, the islands, and the Azores. Not On The Water magazine. Scores are 1–10, not a bite.";

export const FLEET_SAME_AS = [
  "https://www.dockposted.com",
  "https://coastalcavaliers.com",
  "https://thegoodpiratesalmanac.substack.com",
];

export function ogImageForArea(areaId: string) {
  return `/api/og/tide?area=${encodeURIComponent(areaId)}`;
}

export function canonicalUrl(path: string) {
  const origin = siteOrigin();
  if (!path || path === "/") return `${origin}/`;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  absoluteTitle?: boolean;
  index?: boolean;
}): Metadata {
  const url = canonicalUrl(opts.path);
  const image = opts.image ?? ogImageForArea("galveston");
  const title = opts.absoluteTitle ? { absolute: opts.title } : opts.title;
  return {
    title,
    description: opts.description,
    alternates: { canonical: url },
    robots: opts.index === false ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: PRODUCT_NAME,
      type: "website",
      images: [{ url: image, width: 1200, height: 520, alt: opts.imageAlt ?? opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: PRODUCT_NAME,
    alternateName: "On This Water conditions brief",
    url: canonicalUrl("/"),
    description: HOME_DESCRIPTION,
    sameAs: FLEET_SAME_AS,
  };
}

export function webAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: PRODUCT_NAME,
    url: canonicalUrl("/"),
    applicationCategory: "WeatherApplication",
    operatingSystem: "Web",
    description: HOME_DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: PRODUCT_NAME, url: `https://${PRODUCT_DOMAIN}` },
  };
}

export const HOME_FAQ = [
  {
    question: "Is this a bite forecast?",
    answer:
      "No. Scores are 1–10. They are not a bite. Not a chart you steer by.",
  },
  {
    question: "Where does the tide come from?",
    answer:
      "Live NOAA CO-OPS gauges on Texas, Louisiana, Florida, Puerto Rico, and the Carolinas. Bahamas, Mexico, Seychelles, and the Azores use a modeled tide, and the brief says so.",
  },
  {
    question: "What does go or wait mean?",
    answer:
      "Today versus tomorrow on the same water — wind, rain, and the table. You decide.",
  },
  {
    question: "Is this On The Water magazine?",
    answer:
      "No. On This Water is a conditions brief: tide, wind, and whether to leave. The magazine is a different house.",
  },
];

export function faqJsonLd(items: { question: string; answer: string }[] = HOME_FAQ) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function reportJsonLd(opts: {
  headline: string;
  description: string;
  path: string;
  date: string;
  placeName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Report",
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.date,
    url: canonicalUrl(opts.path),
    about: {
      "@type": "Place",
      name: opts.placeName,
    },
    publisher: {
      "@type": "Organization",
      name: PRODUCT_NAME,
      url: canonicalUrl("/"),
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}
