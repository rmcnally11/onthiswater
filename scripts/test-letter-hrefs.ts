import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ForTheLetterPage from "../app/(public)/for-the-letter/page.tsx";

const html = renderToStaticMarkup(createElement(ForTheLetterPage));

const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) =>
  (match[1] ?? "").replaceAll("&amp;", "&"),
);

function has(href: string) {
  assert.ok(hrefs.includes(href), `missing ${href}\n${hrefs.filter((h) => h.startsWith("/card") || h.startsWith("/calendar")).join("\n")}`);
}

has("/card?area=galveston&theater=texas");
has("/calendar?area=galveston&theater=texas");
has("/card/calendar?area=galveston&theater=texas");

for (const href of hrefs) {
  assert.equal(href.includes("amp;"), false, `encoded amp in href: ${href}`);
}

assert.match(html, /<h1[\s>]/);
assert.doesNotMatch(html, /<h3[\s>]/);
const h2 = html.indexOf("<h2");
const h1 = html.indexOf("<h1");
assert.ok(h1 !== -1 && h2 !== -1 && h1 < h2, "heading order should be h1 then h2");
