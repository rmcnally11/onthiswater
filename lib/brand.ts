export const PRODUCT_NAME = "On This Water";
export const LETTER_NAME = "Saturday";
export const PRODUCT_LINE = "This morning on your water.";
export const PRODUCT_DOMAIN = "onthiswater.com";
export const GITHUB_REPO = "https://github.com/rmcnally11/onthiswater";
export const USER_AGENT = "OnThisWater/1.0 (inshore conditions; https://onthiswater.com)";

/**
 * Canonical public origin for metadata, sitemap locs, and robots.
 * Always https and the www host. The apex 308s here, so canonical URLs
 * must not follow NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = "https://www.onthiswater.com";

/** Mail, letter JSON, and tweet links. Not for canonical or Open Graph URLs. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE_URL).replace(/\/$/, "");
}
