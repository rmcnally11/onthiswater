import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { dockPostedHomeHref, fuelHref, fuelMailLine } from "../lib/dock-posted.ts";
import { morningHref } from "../lib/hrefs.ts";
import { cavalierHref } from "../lib/cavaliers.ts";

const galveston = fuelHref({ theater: "texas", areaId: "galveston" });
assert.equal(galveston.label, "Galveston posted fuel");
assert.match(galveston.href, /corridor=galveston-bay/);
assert.match(galveston.href, /#board/);
assert.match(galveston.href, /utm_source=onthiswater/);
assert.match(galveston.href, /utm_medium=handoff/);
assert.doesNotMatch(galveston.href, /\/run/);

assert.equal(fuelHref({ theater: "texas", areaId: "sabine" }).label, "Texas posted fuel");
assert.match(fuelHref({ theater: "texas", areaId: "sabine" }).href, /region=texas/);
assert.match(fuelHref({ theater: "texas", areaId: "aransas" }).href, /region=texas/);
assert.match(fuelHref({ theater: "florida", areaId: "key-largo" }).href, /corridor=upper-keys/);
assert.match(fuelHref({ theater: "florida", areaId: "islamorada" }).href, /region=keys/);
assert.match(fuelHref({ theater: "florida", areaId: "key-west" }).href, /region=keys/);
assert.match(fuelHref({ theater: "louisiana", areaId: "venice" }).href, /region=louisiana/);
assert.match(fuelHref({ theater: "florida", areaId: "boca-grande" }).href, /region=west-florida/);
assert.match(fuelHref({ theater: "florida", areaId: "biscayne" }).href, /region=east-florida/);
assert.equal(fuelHref({ theater: "bahamas", areaId: "andros" }).label, "US posted fuel");
assert.match(fuelHref({ theater: "bahamas", areaId: "andros" }).href, /#board/);
assert.doesNotMatch(fuelHref({ theater: "bahamas", areaId: "andros" }).href, /corridor=|region=/);
assert.equal(fuelHref({ theater: "north-carolina", areaId: "hatteras" }).label, "US posted fuel");
assert.equal(fuelHref({ theater: "south-carolina", areaId: "charleston" }).label, "US posted fuel");
assert.equal(fuelHref({ theater: "azores", areaId: "horta" }).label, "US posted fuel");
assert.match(dockPostedHomeHref(), /#board/);
assert.match(dockPostedHomeHref(), /utm_source=onthiswater/);
assert.doesNotMatch(dockPostedHomeHref(), /\/run/);
assert.match(fuelMailLine({ theater: "texas", areaId: "galveston" }), /corridor=galveston-bay/);
assert.doesNotMatch(fuelMailLine({ theater: "texas", areaId: "galveston" }), /\/run/);

assert.equal(morningHref({ areaId: "galveston", theater: "texas" }), "/morning/galveston");
assert.equal(
  morningHref({ areaId: "galveston", theater: "texas", date: "2026-09-04" }),
  "/morning/galveston/2026-09-04",
);
assert.equal(
  morningHref({ areaId: "islamorada", activity: "fly" }),
  "/morning/islamorada?activity=fly",
);
assert.match(cavalierHref(), /coastalcavaliers\.com/);
assert.match(cavalierHref(), /utm_source=onthiswater/);

const root = process.cwd();
const brief = readFileSync(path.join(root, "components/briefing-panel.tsx"), "utf8");
assert.match(brief, /DockPostedHandoff/);
assert.match(brief, /area\.theater/);
assert.match(brief, /area\.id/);

const desk = readFileSync(path.join(root, "components/morning-desk.tsx"), "utf8");
assert.match(desk, /DockPostedHandoff/);
assert.match(desk, /CavalierHandoff/);
assert.match(desk, /This morning on/);
assert.match(desk, /\/morning\//);

const handoff = readFileSync(path.join(root, "components/dock-posted-handoff.tsx"), "utf8");
assert.match(handoff, /What they posted on the pump/);
assert.match(handoff, /marina fuel on this water/);

const footer = readFileSync(path.join(root, "components/site-footer.tsx"), "utf8");
assert.match(footer, /dockPostedHomeHref/);
assert.match(footer, /data-testid="dock-posted-credit"/);
assert.match(footer, /marina fuel on this water/);

const mail = readFileSync(path.join(root, "lib/mail.ts"), "utf8");
assert.match(mail, /fuelMailLine/);
assert.match(mail, /fuelMailHtml/);
assert.doesNotMatch(mail, /\/run\?corridor/);

const robots = readFileSync(path.join(root, "app/robots.ts"), "utf8");
assert.match(robots, /sitemap\.xml/);
assert.match(robots, /siteOrigin/);

const sitemap = readFileSync(path.join(root, "app/sitemap.ts"), "utf8");
assert.match(sitemap, /morning\/\$\{area/);
assert.doesNotMatch(sitemap, /vercel\.app/);

const desks = readFileSync(path.join(root, "lib/desks.ts"), "utf8");
for (const id of [
  "galveston",
  "venice",
  "islamorada",
  "andros",
  "ascension",
  "san-juan",
  "alphonse",
  "hatteras",
  "morehead-city",
  "wilmington",
  "charleston",
  "hilton-head",
  "myrtle-beach",
  "horta",
  "sao-miguel",
]) {
  assert.match(desks, new RegExp(`areaId: "${id}"`));
}
assert.match(desks, /São Miguel/);

const areas = readFileSync(path.join(root, "lib/data/areas.ts"), "utf8");
assert.match(areas, /id: "hatteras"/);
assert.match(areas, /noaaStation: "8654467"/);
assert.match(areas, /id: "morehead-city"/);
assert.match(areas, /noaaStation: "8656483"/);
assert.match(areas, /id: "wilmington"/);
assert.match(areas, /noaaStation: "8658163"/);
assert.match(areas, /id: "charleston"/);
assert.match(areas, /noaaStation: "8665530"/);
assert.match(areas, /id: "hilton-head"/);
assert.match(areas, /noaaStation: "8670870"/);
assert.match(areas, /id: "myrtle-beach"/);
assert.match(areas, /noaaStation: "8661070"/);
assert.match(areas, /id: "horta"/);
assert.match(areas, /id: "sao-miguel"/);
assert.match(areas, /theater === "azores"/);

const theaters = readFileSync(path.join(root, "lib/data/theaters.ts"), "utf8");
assert.match(theaters, /"north-carolina"/);
assert.match(theaters, /"south-carolina"/);
assert.match(theaters, /"azores"/);

const hubs = readFileSync(path.join(root, "lib/coast-hubs.ts"), "utf8");
assert.match(hubs, /"north-carolina"/);
assert.match(hubs, /"south-carolina"/);
assert.match(hubs, /"azores"/);

console.log("dock-posted sister tests passed");
