import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DOCK_DIESEL_NOTE,
  dockDieselForDesk,
  dockDieselQuote,
  formatDockDiesel,
  isGulfFuelDesk,
  parseEiaGulfRetail,
} from "../lib/dock-diesel.ts";

const fixture = readFileSync(path.join(process.cwd(), "scripts/fixtures/eia-gulf-retail.html"), "utf8");
const weekOf = new Date(Date.UTC(2026, 10, 14, 16, 0, 0));

const parsed = parseEiaGulfRetail(fixture);
assert.ok(parsed);
assert.equal(parsed.week, "2026-11-09");
assert.equal(parsed.diesel, "5.741");
assert.equal(parsed.regular, "3.481");
assert.notEqual(parsed.diesel, "6.127");
assert.notEqual(parsed.regular, "3.995");

const fresh = dockDieselQuote(fixture, weekOf);
assert.deepEqual(fresh, parsed);
assert.equal(
  formatDockDiesel(fresh!),
  "Dock Diesel · Gulf Coast retail, week of Nov 9: diesel $5.741/gal, regular $3.481/gal (EIA)",
);
assert.equal(DOCK_DIESEL_NOTE, "EIA weekly, Gulf Coast retail average. Road fuel, not a marina dock price.");
assert.match(DOCK_DIESEL_NOTE, /EIA weekly, Gulf Coast retail average/);
assert.match(DOCK_DIESEL_NOTE, /not a marina dock price/);

const onTheDay = dockDieselQuote(fixture, new Date(Date.UTC(2026, 10, 23, 23, 0, 0)));
assert.equal(onTheDay?.week, "2026-11-09");

const stale = dockDieselQuote(fixture, new Date(Date.UTC(2026, 10, 24, 12, 0, 0)));
assert.equal(stale, null);

const brokenPrice = fixture.replace("<td>5.741</td>", "<td>NA</td>");
assert.equal(dockDieselQuote(brokenPrice, weekOf), null);
assert.equal(parseEiaGulfRetail(brokenPrice), null);

assert.equal(dockDieselQuote("", weekOf), null);
assert.equal(dockDieselQuote("<html><table><caption>nope</caption></table></html>", weekOf), null);
assert.equal(dockDieselQuote("not html at all", weekOf), null);

const gasTableEnd = fixture.indexOf("</table>");
const mismatched = `${fixture.slice(0, gasTableEnd).replace("11/09/26", "11/16/26")}${fixture.slice(gasTableEnd)}`;
assert.equal(parseEiaGulfRetail(mismatched), null);
assert.equal(dockDieselQuote(mismatched, weekOf), null);

assert.equal(isGulfFuelDesk("texas"), true);
assert.equal(isGulfFuelDesk("louisiana"), true);
assert.equal(isGulfFuelDesk("florida"), false);
assert.equal(isGulfFuelDesk("bahamas"), false);
assert.equal(isGulfFuelDesk("north-carolina"), false);
assert.equal(isGulfFuelDesk(null), false);
assert.equal(isGulfFuelDesk("Texas"), false);

assert.equal(dockDieselForDesk("texas", fresh)?.diesel, "5.741");
assert.equal(dockDieselForDesk("louisiana", fresh)?.regular, "3.481");
assert.equal(dockDieselForDesk("florida", fresh), null);
assert.equal(dockDieselForDesk("galveston", fresh), null);
assert.equal(dockDieselForDesk("texas", null), null);
assert.equal(dockDieselForDesk("venice", fresh), null);

let threw = false;
try {
  dockDieselQuote(fixture.slice(0, 40), new Date(Number.NaN));
} catch {
  threw = true;
}
assert.equal(threw, false);
assert.equal(dockDieselQuote(fixture.slice(0, 40), new Date(Number.NaN)), null);

console.log("ok dock diesel");
