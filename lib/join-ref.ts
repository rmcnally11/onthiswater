import { AREA_BY_ID } from "@/lib/data/areas";
import { COAST_HUB_BY_SLUG } from "@/lib/coast-hubs";

const REF_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function normalizeJoinRef(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!REF_RE.test(value)) return "";
  return value;
}

/** `ref` wins. `utm_source` is the fallback. Empty when neither is a usable tag. */
export function joinRefFromSearch(search: string): string {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return normalizeJoinRef(q.get("ref")) || normalizeJoinRef(q.get("utm_source"));
}

export function joinHref(ref?: string | null): string {
  const clean = normalizeJoinRef(ref);
  return clean ? `/join?ref=${encodeURIComponent(clean)}` : "/join";
}

function pathOnly(pathname: string) {
  const bare = (pathname.split("?")[0] ?? "/").split("#")[0] ?? "/";
  if (bare.length > 1 && bare.endsWith("/")) return bare.slice(0, -1);
  return bare || "/";
}

function decodeSeg(seg: string) {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/** Where an internal Join link is sitting, so /join can record it. */
export function joinRefForPath(pathname: string): string {
  const path = pathOnly(pathname);
  if (path === "/join") return "";
  const morning = path.match(/^\/morning\/([^/]+)(?:\/|$)/);
  if (morning) {
    const areaId = decodeSeg(morning[1] ?? "");
    if (AREA_BY_ID[areaId]) return `desk-${areaId}`;
    return "morning";
  }
  if (path === "/morning") return "morning";
  if (path === "/newsletter" || path.startsWith("/newsletter/")) return "newsletter";
  if (path === "/") return "home";
  if (path === "/calendar" || path.startsWith("/calendar/")) return "calendar";
  if (path === "/map") return "map";
  if (path === "/compare") return "compare";
  if (path === "/species") return "species";
  if (path === "/method") return "method";
  if (path === "/fundamentals" || path.startsWith("/fundamentals/")) return "fundamentals";
  if (path === "/book" || path.startsWith("/book/")) return "book";
  if (path === "/for-the-letter") return "for-the-letter";
  if (path === "/card" || path.startsWith("/card/")) return "card";
  const slug = path.startsWith("/") ? path.slice(1) : path;
  if (slug && !slug.includes("/") && COAST_HUB_BY_SLUG[slug]) return `coast-${slug}`;
  return "site";
}

export function subscribePayload(input: {
  name: string;
  email: string;
  zip: string;
  desks: string[];
  cadence: string[];
  source: string;
  ref?: string | null;
}) {
  const ref = normalizeJoinRef(input.ref);
  return {
    name: input.name,
    email: input.email,
    zip: input.zip,
    desks: input.desks,
    cadence: input.cadence,
    source: input.source,
    ...(ref ? { ref } : {}),
  };
}
