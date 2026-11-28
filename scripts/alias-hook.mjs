import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    if (/\.[a-z0-9]+$/i.test(rel)) {
      return nextResolve(new URL(`../${rel}`, import.meta.url).href, context);
    }
    let url = new URL(`../${rel}.ts`, import.meta.url);
    if (!existsSync(fileURLToPath(url))) {
      const tsx = new URL(`../${rel}.tsx`, import.meta.url);
      if (existsSync(fileURLToPath(tsx))) url = tsx;
    }
    return nextResolve(url.href, context);
  }
  // Node's type stripper does not apply Next's extensionless package entry.
  const nextEntry = {
    "next/cache": "cache.js",
    "next/server": "server.js",
    "next/headers": "headers.js",
    "next/navigation": "navigation.js",
  }[specifier];
  // next/image's package entry is CJS. The letter render test only needs an img.
  if (specifier === "next/image") {
    return nextResolve(new URL("./image-stub.mjs", import.meta.url).href, context);
  }
  if (nextEntry) {
    const url = new URL(`../node_modules/next/${nextEntry}`, import.meta.url);
    return nextResolve(url.href, context);
  }
  return nextResolve(specifier, context);
}

const dataRoot = new URL("../data/", import.meta.url).href;

export async function load(url, context, nextLoad) {
  if (url.startsWith(dataRoot) && url.endsWith(".json")) {
    const source = readFileSync(fileURLToPath(url), "utf8");
    return { format: "module", source: `export default ${source}`, shortCircuit: true };
  }
  return nextLoad(url, context);
}
