export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = new URL(`../${specifier.slice(2)}.ts`, import.meta.url);
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
