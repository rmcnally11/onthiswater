/** Airtable single line text on Subscribers. Names, not field ids. New rows only. */
export const SIGNUP_PATH_FIELD = "signup_path";
export const UTM_SOURCE_FIELD = "utm_source";
export const UTM_MEDIUM_FIELD = "utm_medium";
export const UTM_CAMPAIGN_FIELD = "utm_campaign";

export const LANDING_STORAGE_KEY = "otw-signup-landing";

const MAX_SIGNUP_FIELD = 200;

export type SignupAttribution = {
  signup_path?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

type LandingInput = {
  signup_path?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
};

type LandingStorage = Pick<Storage, "getItem" | "setItem">;

function cleanText(raw: string | null | undefined) {
  return (raw ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

/** Trimmed, capped, and blank when empty or the placeholder `unknown`. */
export function sanitizeSignupText(raw: string | null | undefined) {
  const value = cleanText(raw);
  if (!value || value.toLowerCase() === "unknown") return "";
  return value.slice(0, MAX_SIGNUP_FIELD);
}

function pathBeforeQuery(value: string) {
  return (value.split("#")[0] ?? "").split("?")[0] ?? "";
}

/** Path only. No query string, no hash, no email, capped at 200. */
export function sanitizeSignupPath(raw: string | null | undefined) {
  const value = cleanText(raw);
  if (!value || value.toLowerCase() === "unknown") return "";

  let path = value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return "";
    }
  }
  path = pathBeforeQuery(path);
  try {
    path = pathBeforeQuery(decodeURIComponent(path));
  } catch {
    // A broken escape stays query-stripped and still loses any email segment.
  }
  const containedEmail = path.includes("@");
  path = path.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "");
  const parts = path.split("/").filter((seg) => seg.length > 0 && !seg.includes("@"));
  if (!parts.length) {
    if (containedEmail) return "";
    return path.startsWith("/") ? "/" : "";
  }
  return `/${parts.join("/")}`.slice(0, MAX_SIGNUP_FIELD);
}

/** Omit a field when it has no usable value. Never writes "" or "unknown". */
export function signupAttributionFields(input: LandingInput): SignupAttribution {
  const signup_path = sanitizeSignupPath(input.signup_path);
  const utm_source = sanitizeSignupText(input.utm_source);
  const utm_medium = sanitizeSignupText(input.utm_medium);
  const utm_campaign = sanitizeSignupText(input.utm_campaign);
  return {
    ...(signup_path ? { [SIGNUP_PATH_FIELD]: signup_path } : {}),
    ...(utm_source ? { [UTM_SOURCE_FIELD]: utm_source } : {}),
    ...(utm_medium ? { [UTM_MEDIUM_FIELD]: utm_medium } : {}),
    ...(utm_campaign ? { [UTM_CAMPAIGN_FIELD]: utm_campaign } : {}),
  };
}

export function landingFromLocation(pathname: string, search: string): SignupAttribution {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return signupAttributionFields({
    signup_path: pathname,
    utm_source: q.get("utm_source"),
    utm_medium: q.get("utm_medium"),
    utm_campaign: q.get("utm_campaign"),
  });
}

function parseStoredLanding(raw: string): SignupAttribution {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    return signupAttributionFields({
      signup_path: typeof parsed.signup_path === "string" ? parsed.signup_path : "",
      utm_source: typeof parsed.utm_source === "string" ? parsed.utm_source : "",
      utm_medium: typeof parsed.utm_medium === "string" ? parsed.utm_medium : "",
      utm_campaign: typeof parsed.utm_campaign === "string" ? parsed.utm_campaign : "",
    });
  } catch {
    return {};
  }
}

/**
 * First page of this tab wins. Later pages, including /join, do not replace it.
 * sessionStorage only — no cookie.
 */
export function captureLanding(storage: LandingStorage, pathname: string, search: string): SignupAttribution {
  let existing: string | null = null;
  let readable = true;
  try {
    existing = storage.getItem(LANDING_STORAGE_KEY);
  } catch {
    readable = false;
  }
  if (readable && existing != null) return parseStoredLanding(existing);
  const next = landingFromLocation(pathname, search);
  if (readable) {
    try {
      storage.setItem(LANDING_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode can reject the write. The caller still has `next` in memory.
    }
  }
  return next;
}

export function captureBrowserLanding(): SignupAttribution {
  if (typeof window === "undefined") return {};
  try {
    return captureLanding(window.sessionStorage, window.location.pathname, window.location.search);
  } catch {
    return landingFromLocation(window.location.pathname, window.location.search);
  }
}
