/** Read one cookie from a `document.cookie` or `Cookie` header string. */
export function cookieValue(jar: string, name: string): string | null {
  for (const part of jar.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = decodeCookiePart(trimmed.slice(0, eq));
    if (key !== name) continue;
    return decodeCookiePart(trimmed.slice(eq + 1));
  }
  return null;
}

function decodeCookiePart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Browser cookie write. Matches the server cookie options: path, 180 days, Lax, not HttpOnly. */
export function documentCookie(name: string, value: string, maxAge: number) {
  return `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
