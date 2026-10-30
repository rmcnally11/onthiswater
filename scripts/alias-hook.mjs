import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    let url = new URL(`../${rel}.ts`, import.meta.url);
    if (!existsSync(fileURLToPath(url))) {
      const tsx = new URL(`../${rel}.tsx`, import.meta.url);
      if (existsSync(fileURLToPath(tsx))) url = tsx;
    }
    return nextResolve(url.href, context);
  }
  // Node's type stripper does not apply Next's extensionless package entry.
  if (specifier === "next/cache" || specifier === "next/server") {
    const file = specifier === "next/cache" ? "cache.js" : "server.js";
    const url = new URL(`../node_modules/next/${file}`, import.meta.url);
    return nextResolve(url.href, context);
  }
  return nextResolve(specifier, context);
}
