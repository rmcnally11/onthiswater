import assert from "node:assert/strict";
import {
  citedTexasHab,
  habFromTpwdBlock,
  parseTpwdLatestBlock,
  texasHabBulletinWindow,
  texasHabRegion,
  texasKareniaShellfishClosed,
} from "../lib/data/texas-hab.ts";

const TPWD_SEP_2026 = `
		<h2 class="h3">September 7-11, 2026</h2>
		<p><strong>For questions and information about the human health effects of red tide, please contact your local health department.</strong></p>
		<p><strong>Upper Coast (Galveston Bay and Sabine Lake)</strong>: Fish kills and respiratory symptoms were reported in Bolivar Peninsula, Crystal Beach, TX and at several locations across Galveston Island, TX. Water samples collected in Bolivar Peninsula, Crystal Beach, TX and Galveston Island, TX indicated a moderate to high concentration of red tide.</p>
		<p><strong>Golden Crescent (Matagorda Bay and San Antonio Bay)</strong>: No fish kills reported. The monitoring station in Port O’Connor indicates that cell concentrations are below the reporting threshold of 2 cells/mL (background concentration).</p>
		<p><strong>Coastal Bend (Aransas Bay, Corpus Christi Bay and upper Laguna Madre)</strong>: No fish kills reported. The monitoring station in Port Aransas indicates that cell concentrations are below the reporting threshold of 2 cells/mL (background concentration).</p>
		<p><strong>Rio Grande Valley Area (Lower Laguna Madre)</strong>: No reports of red tide.</p>
		<h2 class="h3">October 11-13, 2023</h2>
		<p><strong>Upper Coast (Galveston Bay and Sabine Lake)</strong>: No new fish kills have been reported in the Galveston area.</p>
		<p>On September 13, 2023, elevated Karenia brevis was reported at Freeport.</p>
`;

assert.equal(texasHabRegion("galveston"), "upper-coast");
assert.equal(texasHabRegion("sabine"), "upper-coast");
assert.equal(texasHabRegion("matagorda"), "golden-crescent");
assert.equal(texasHabRegion("corpus"), "coastal-bend");
assert.equal(texasHabRegion("baffin"), "coastal-bend");
assert.equal(texasHabRegion("lower-laguna"), "lower-laguna");

const block = parseTpwdLatestBlock(TPWD_SEP_2026);
assert.ok(block);
assert.equal(block.year, 2026);
assert.match(block.when, /September 7-11, 2026/);
assert.doesNotMatch(block.text, /September 13, 2023/);

const galveston = habFromTpwdBlock("galveston", block, 2026);
assert.equal(galveston.hot, true);
assert.equal(galveston.level, "moderate to high");
assert.match(galveston.where, /Bolivar Peninsula/);
assert.match(galveston.where, /TX-1, TX-6, TX-7, TX-8/);
assert.match(galveston.where, /TX-9/);
assert.match(galveston.where, /09-12-2026/);
assert.match(galveston.where, /Galveston County beaches/);

const sabine = habFromTpwdBlock("sabine", block, 2026);
assert.equal(sabine.hot, true);

const matagorda = habFromTpwdBlock("matagorda", block, 2026);
assert.equal(matagorda.hot, false);
assert.equal(matagorda.level, "background");
assert.doesNotMatch(matagorda.where, /TX-1/);

const corpus = habFromTpwdBlock("corpus", block, 2026);
assert.equal(corpus.hot, false);
assert.equal(corpus.level, "background");

const llm = habFromTpwdBlock("lower-laguna", block, 2026);
assert.equal(llm.hot, false);
assert.equal(llm.level, "not present");

const stale = habFromTpwdBlock("galveston", block, 2027);
assert.equal(stale.hot, false);
assert.equal(stale.level, "no current post");

const chicago = (ymd: string) => new Date(`${ymd}T17:00:00Z`);
assert.equal(texasKareniaShellfishClosed(chicago("2026-09-09")), true);
assert.equal(texasKareniaShellfishClosed(chicago("2026-09-13")), true);
assert.equal(texasKareniaShellfishClosed(chicago("2026-09-08")), false);
assert.equal(texasKareniaShellfishClosed(chicago("2026-10-01")), false);
assert.equal(texasHabBulletinWindow(chicago("2026-09-07")), true);
assert.equal(texasHabBulletinWindow(chicago("2026-08-31")), false);

const cited = citedTexasHab("galveston");
assert.ok(cited?.hot);
assert.match(cited?.where ?? "", /Karenia/);

console.log("ok hab");
