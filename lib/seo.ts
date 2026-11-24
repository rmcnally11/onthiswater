import type { Metadata } from "next";
import { PRODUCT_NAME, SITE_URL } from "@/lib/brand";
import { DEFAULT_OG_ALT, DEFAULT_OG_IMAGE } from "@/lib/house";

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
  if (!path || path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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
  const image = opts.image ?? DEFAULT_OG_IMAGE;
  const ogHeight = 630;
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
      images: [{ url: image, width: 1200, height: ogHeight, alt: opts.imageAlt ?? (image === DEFAULT_OG_IMAGE ? DEFAULT_OG_ALT : opts.title) }],
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
    publisher: { "@type": "Organization", name: PRODUCT_NAME, url: SITE_URL },
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

/** Apex redirects here. Letter JSON-LD page URLs use this host. */
export const LETTER_WWW_ORIGIN = "https://www.onthiswater.com";

const LETTER_AUTHOR = "Robert McNally";
const LETTER_PUBLISHER = "The Good Pirate's Almanac";
const LETTER_SERIES_URL = "https://thegoodpiratesalmanac.substack.com";

/** Same string as the root layout title template. */
const ROOT_TITLE_TEMPLATE = "%s — On This Water";

export function letterPageTitle(title: string) {
  return ROOT_TITLE_TEMPLATE.replace("%s", title);
}

export function letterCanonicalUrl(path: string) {
  if (!path || path === "/") return `${LETTER_WWW_ORIGIN}/`;
  return `${LETTER_WWW_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Same `/og.jpg` the pages already use, on the www host. */
export function letterOgImageUrl(image: string = DEFAULT_OG_IMAGE) {
  if (/^https?:\/\//.test(image)) return image;
  const path = image.startsWith("/") ? image : `/${image}`;
  return `${LETTER_WWW_ORIGIN}${path}`;
}

export function letterArticleJsonLd(opts: {
  headline: string;
  description: string;
  path: string;
  /** Saturday date, `YYYY-MM-DD`. Omit when the page has no letter date. */
  datePublished?: string;
  image?: string;
}) {
  const url = letterCanonicalUrl(opts.path);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: letterOgImageUrl(opts.image),
    author: { "@type": "Person", name: LETTER_AUTHOR },
    publisher: { "@type": "Organization", name: LETTER_PUBLISHER },
    isPartOf: {
      "@type": "CreativeWork",
      name: LETTER_PUBLISHER,
      url: LETTER_SERIES_URL,
    },
  };
}

/** Breadcrumb URLs use the www origin, same as the letter Article. */
export function letterBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: letterCanonicalUrl(item.path),
    })),
  };
}
