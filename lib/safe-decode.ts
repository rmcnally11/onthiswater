/** decodeURIComponent, or null when the escape sequence is broken. */
export function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    if (error instanceof URIError) return null;
    throw error;
  }
}

/** The URL parser swaps invalid UTF-8 for U+FFFD and may re-escape the rest. */
const REPLACEMENT = /%ef%bf%bd|\uFFFD/i;
/** A percent sign followed by exactly one hex digit — a truncated escape. */
const TRUNCATED_ESCAPE = /%[0-9a-f](?![0-9a-f])/i;

function brokenEncoding(value: string): boolean {
  if (REPLACEMENT.test(value)) return true;
  if (safeDecode(value) === null) return true;
  return false;
}

/**
 * /book (and anything under it) with a broken percent-escape in the path or
 * query. Well-formed escapes (%20, %25) still decode. Other routes are left
 * alone.
 */
export function bookRequestStatus(pathname: string, search: string): "not-found" | "ok" {
  if (pathname !== "/book" && !pathname.startsWith("/book/")) return "ok";
  if (brokenEncoding(pathname)) return "not-found";
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (query && brokenEncoding(query)) return "not-found";
  return "ok";
}

/**
 * A search-param value the page can keep. Undefined stays undefined.
 * A broken escape or a replaced invalid sequence is null (not-found).
 * A literal percent from %25 is kept as-is. Ordinary ids decode unchanged.
 */
export function decodeBookField(value: string | undefined): string | undefined | null {
  if (value == null) return undefined;
  if (value.includes("\uFFFD") || TRUNCATED_ESCAPE.test(value)) return null;
  if (/%(?![0-9a-f]{2})/i.test(value)) return value;
  return safeDecode(value);
}
