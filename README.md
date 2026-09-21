# On This Water

Inshore and offshore conditions for the **Texas coast**, **Louisiana**, **Florida** (Keys, Boca Grande, Jupiter), the **Bahamas**, **Mexico** (Yucatan flats + Baja), **Puerto Rico**, the **Seychelles**, **North Carolina**, **South Carolina**, and the **Azores**. The brief tells you **where**, **when**, and **why** fish should be on a given piece of water — and which species are actually in play.

GitHub: [rmcnally11/onthiswater](https://github.com/rmcnally11/onthiswater). Live site: [onthiswater.com](https://onthiswater.com) (Vercel project `onthiswater`). Substack bots: [SUBSTACK.md](./SUBSTACK.md). Twitter / X bots: [TWITTER.md](./TWITTER.md) (morning and calendar screenshots of `/card`). Live rules: [/for-the-letter](https://onthiswater.com/for-the-letter). Your three My Maps are imported as cream pins:

- [GULF ATLAS! - FISH](https://www.google.com/maps/d/u/0/edit?mid=1eqN2MMRViRbG4xwKDcL0Tzotogjcktw&usp=sharing)
- [FL Keys — zones, wrecks, humps, bridges](https://www.google.com/maps/d/u/0/edit?mid=1nn7DQ_IHmDLXRUFsatM4hj9zIqmaUg4&usp=sharing)
- [Texas corridors / jetties / flats](https://www.google.com/maps/d/u/0/edit?mid=18vm3y2qy_rT3-xeMZcJ1w_cv4i5FyxI&usp=sharing)

This is a conditions instrument, not a bite guarantee and not a chart for navigation.

## What it does

- Live **NOAA CO-OPS** tides, observed water level, water temperature, station wind, and **air pressure** (the glass) on Texas, Florida, Louisiana, Puerto Rico, and Carolina gauges. NDBC PRES when the dock station is quiet. Bahamas / Mexico / Seychelles / Azores use modeled Open-Meteo MSL and say so. The reading and the 3-hour trend are not a bite.
- **Wind versus the table**: observed minus predicted water. On the Texas coast the wind often *is* the tide.
- **NWS** marine/hourly weather (U.S.) and **Open-Meteo** (Bahamas, Mexico, Seychelles, Azores) — wind **and rain / thunderstorms**.
- Visual instruments on the brief: **tide curve**, **moon disk**, **wind compass**, **score ring**, water-temp bar, the **glass** (inHg + mb + rising/falling), and a **14-day upcoming strip**. Texas desks add the **TPWD long record** — in-water monitoring vs dock creel — cited, not live. Feed chips say when a gauge is live, modeled, quiet, or missing. **Today or tomorrow** sits on the same water. Windows name **first light** and **last light** when the clock is the story. The 5am mail leads with that same tide chart — and says **partial brief** if a desk you elected stayed quiet.
- **Saturday Letter** (`/newsletter`) — All coasts is the letter-water newspaper (the original seven plus Hatteras, Morehead City, Wilmington, Charleston, Hilton Head, Myrtle Beach, Horta, and São Miguel). Open a coast chip to see every water on that coast — Texas is Sabine through Lower Laguna, not Galveston only. This week’s desks are the same live `getBriefing()` as Today — not a week-old letter cache. Desk cards use the same instruments: feed chips, moon, wind, tide curve, first/last light, and today-vs-tomorrow. The Saturday email carries the tide chart, feed line, wind word, and window. A Texas-only reader does not see Andros, Seychelles, or the Azores. Peaks and harvest closures follow the same coasts. Frozen permalinks keep that Saturday’s snapshot.
- **Seasonal fundamentals** (`/fundamentals`) — doctrine by the coasts you elected, then water type (fly / spin / sight / wade / skiff / rocks / marsh / skinny), species, and month. Texas pages also name the **TPWD long record** — fish in the water vs fish across the dock. It does not move the score.
- Two-month **1–10 calendar** by micro-area: this month and next. Tap a day for that date’s brief. Copper outline = amazing day. The monthly **YOLO** day is the best remaining **dry** day with a real wind forecast. Rain and thunderstorms tax the score; a soaker cannot be a copper day. Sea outline = a catch in **The Book**, or a day that rhymes with one.
- **The Book** (`/book`) — a catch log on this phone. Write a fish and the live instruments go with it (wind, sky, moon, tide, glass, score). The calendar flags days that rhyme. Same glass, not the same fish. Not a cloud login yet; export the JSON if you change phones.
- **Stay or drive** (`/compare`) — two desks, one morning.
- **Today** (`/`) starts on **All water** — the letter waters, not Galveston. A last-desk cookie does not pull the homepage back to one coast. Pick a water to open that brief.
- **Morning line** (`/morning`) — one sentence for the water on Today. Copy it. The rest of that coast is named underneath. Join lives on `/join`, not here.
- Last theater / area / method is remembered in a cookie for calendar, morning, compare, and map.
- The species book covers the fish that actually live on these coasts — drum, snook, hogfish, the snappers, grouper, cobia, kings, billfish — not a Texas-only short list. Join lives on `/join`, not on the Saturday Letter.
- The Saturday Letter has a permalink (`/newsletter/YYYY-MM-DD`) and a short archive.
- Satellite chart (Esri imagery) with official layers and your My Maps. Pick a micro-area and the camera zooms to that water only — Flamingo does not keep Islamorada lit.
- Filters for **wade / skiff / kayak / fly / spin / jetty / offshore** (troll, edge, deep jig).
- Official map layers:
  - **USGS GNIS** — canonical names and coordinates for passes, bays, channels
  - **NOAA ENC Direct** — charted wrecks and obstructions
  - **NOAA FKNMS** — Sanctuary Preservation Areas, Ecological Reserves, Research-Only water (the legal red polygons)
  - **TPWD / Texas GLO / NPS PINS** — public ramps, beach-access corridors, Padre Island driving rules

Species doctrine follows the Flats Field Manual (Texas, Keys, Bahamas). Bag and season notes cite the **TPWD Outdoor Annual (Sep 1, 2025–Aug 31, 2026)** and **FWC**. Always verify before you keep a fish.

## Run it

```bash
npm install
npm run dev -- --port 43217 --hostname 127.0.0.1
```

Open [http://127.0.0.1:43217](http://127.0.0.1:43217). Today opens on **All water** (the letter waters). The instrument is public: today, calendar, map, compare, morning, species, method, season, letter, join, and the book. The subscriber table is not on the site — it lives in Airtable.

No API keys for the gauges. NOAA, NWS, USGS, and Open-Meteo are public. NWS requires a User-Agent, which the app sends. The 5am email needs Resend if you want it to leave the machine (see below).

## A real URL (Vercel)

This repo does **not** auto-deploy. The Preview you see in Cursor is this cloud VM. To get an `https://….vercel.app` link:

1. Import `rmcnally11/onthiswater` in [vercel.com](https://vercel.com). Production branch is `main`. The Vercel project is `onthiswater`.
2. Framework: Next.js. For the list and mail: `AIRTABLE_API_KEY` (PAT on the Airtable list base), `RESEND_API_KEY`, `RESEND_FROM`, `SUBSCRIBER_EMAILS`, `CRON_SECRET`. Set `NEXT_PUBLIC_SITE_URL=https://onthiswater.com` so cards and mail links use the brand domain.
3. After the first deploy, every `git push` to the connected branch rebuilds the site.

There is no nightly site rebuild. Code updates when someone pushes. Conditions update when someone opens a page (see below).

## How the water updates

Not a nightly batch. Each Brief / Calendar / Map load hits live gauges, then caches for a few minutes so a refresh is not a stampede:

| Feed | Freshness |
| --- | --- |
| NOAA CO-OPS tides, observed water, station wind, water temp, air pressure | ~5 minutes |
| NDBC PRES / 3-hour tendency (when the dock glass is quiet) | ~10 minutes |
| NWS hourly forecast (U.S.) — wind, sky, rain chance | ~10 minutes |
| NWS active alerts at the desk point | ~5 minutes |
| NWS point metadata | ~30 minutes |
| Open-Meteo (wind, precip, weather code; always fetched in parallel so NOAA wind never blanks the sky) | ~10 minutes |
| USGS IV discharge (`00060`) on Texas / Louisiana river mouths | ~15 minutes |
| USGS GNIS / NOAA ENC / FKNMS polygons | ~1 hour |
| FWC / TPWD red tide (K. brevis) | ~6 hours |
| Moon phase | computed from the clock, every load |
| Calendar days past the wind forecast | tide + moon + season only (labeled astronomical) |

The page stays live. Texas wind versus the table changes inside a morning. The 5am email is a snapshot of that same live brief, not a separate overnight batch.

## The list — signup, the table, and the 5am email

Others can subscribe. The family door is [`/join`](https://onthiswater.com/join?coasts=texas). Join is only on `/join` — not on Today, Morning, or the Saturday Letter. Join writes a row on the Airtable Subscribers table. Resend only sends the mail — it is not the list. Full click-by-click link: [AIRTABLE.md](./AIRTABLE.md).

There **is** a managed table: [Subscribers](https://airtable.com/app3GRvkkpJdnVIKy/tblqoCAVvAvEFYMe6) in the Costal Cavaliers workspace (the Airtable base is still named Field Brief until you rename it in Airtable). Columns: Name, Email, Home ZIP, Coasts they fish, What they receive (`Daily` = 5am brief / `Weekly` = Saturday letter / `Calendar` = Sunday month grid / `Seasonal` = first-of-month fundamentals), Status (`Active` / `Paid` / `Unsubscribed`), How they joined, Joined on, Notes. `Paid` is the monetize hook — same list, later a charge. That table is not a page on the site. Production cannot read or write it until `AIRTABLE_API_KEY` is on Vercel and you redeploy.

Signup elects **coasts** and **cadence**. Default is the water on the page (Texas / Galveston on a cold letter visit), not every letter water. A Texas-only fisherman does not get Andros, Seychelles, or the Azores in the 5am line, the Saturday letter, Sunday’s calendar, or the season page. `fb_coasts` remembers that election the same way `fb_water` remembers the last desk. Letter chips (`/newsletter?coasts=texas`) and `?theater=` on `/fundamentals` write the cookie.

**How you get the email.** You are a row on that table (operator). Nothing lands in your inbox until sending is on. Fastest path: add `RESEND_API_KEY` + a verified `RESEND_FROM` on Vercel, and `AIRTABLE_API_KEY` (an Airtable PAT scoped to this base) so the cron can read the table. You can also put your address in `SUBSCRIBER_EMAILS` as a belt-and-suspenders (that env list still receives every desk).

**How others get the email.** They submit the public form. With `AIRTABLE_API_KEY` on Vercel, the row is upserted in Airtable with the desks and cadence they picked. At 10:00 UTC the cron generates the live morning line and Resend sends each **Daily** address **one** 5am digest — a tide chart per water they elected, not one mail per desk. On Saturday (Chicago) the same Hobby cron sends **Weekly** addresses a letter that only includes those desks. On Sunday it sends **Calendar** — the month grid with scores, gold/copper rings, and the next seven days. On the 1st it sends **Seasonal** fundamentals for those coasts. Mail is laid out for a phone as well as a desktop pane. Without the Airtable token, a production signup only lives on that one Vercel instance and is lost. Without Resend, the cron writes `data/outbox/` and nobody’s inbox moves.

There is no nightly rebuild of the gauges. The mailer asks the same `getBriefing()` + `morningLine()` the `/morning` page does. Hobby cron is daily (`0 10 * * *` = 5:00 a.m. Galveston CDT). `CRON_HOURLY=1` plus an hourly ping sends each desk only at local 05:00. `?force=1` and `?desk=galveston` are daily tests. `?weekly=1`, `?calendar=1`, and `?seasonal=1` force those mails. `/api/cron/samples?send=1&to=` sends one of each as `[SAMPLE]`. No SMS on Hobby. Do not commit addresses.

## Theaters and micro-areas

**Texas:** Sabine · Galveston · Matagorda · Rockport / Aransas · Corpus · Baffin / Upper Laguna · Lower Laguna Madre

**Louisiana:** Venice / Birdfoot · Grand Isle / Barataria · Calcasieu / Cameron

**Florida:** Biscayne (Miami) · Key Largo / Pennekamp · Islamorada · Florida Bay / Flamingo · Marathon · Key West · Boca Grande / Charlotte Harbor · Jupiter / Loxahatchee

**Bahamas:** Andros · Abaco · Grand Bahama · Eleuthera

**Mexico:** Ascension Bay / Sian Ka’an · Isla Mujeres / Cancún bank · East Cape / Los Barriles · La Paz / Espíritu Santo

**Puerto Rico:** San Juan / Condado · Vieques / Culebra · La Parguera / southwest

**Seychelles:** Alphonse / St François · Farquhar Atoll · Inner islands / Mahé

**North Carolina:** Hatteras / Oregon Inlet · Morehead City / Beaufort Inlet · Wilmington / Wrightsville

**South Carolina:** Charleston / Lowcountry · Hilton Head / Port Royal · Myrtle Beach / Grand Strand

**Azores:** Horta / Faial · São Miguel / Ponta Delgada

Bahamas, Mexico, Seychelles, and the Azores tides are a modeled lunar tide, labeled as such. There is no NOAA gauge on those coasts. Puerto Rico, North Carolina, and South Carolina use live NOAA CO-OPS.

## Official sources we cite

| Source | Use |
| --- | --- |
| [NOAA CO-OPS](https://api.tidesandcurrents.noaa.gov/) | Tides, water temp, station wind |
| [NWS API](https://www.weather.gov/documentation/services-web-api) | U.S. wind, sky, rain chance, thunderstorms, active marine/flood alerts |
| [Open-Meteo](https://open-meteo.com/) | Wind and precip where NWS does not cover (Bahamas, Mexico, Seychelles, Azores) |
| [USGS GNIS](https://www.usgs.gov/tools/geographic-names-information-system-gnis) | Named-feature coordinates (pins snapped where the hydro layer has a Feature ID) |
| [USGS NWIS IV](https://waterservices.usgs.gov/) | River discharge (`00060`) — Trinity, Sabine, Colorado, Nueces, Mississippi at Belle Chasse, Calcasieu |
| [TxGIO](https://data.geographic.texas.gov/) | State clearinghouse (formerly TNRIS) for TPWD coastal GIS |
| [NOAA ENC Direct](https://gis.charttools.noaa.gov/arcgis/rest/services/encdirect) | Wrecks / obstructions |
| [NOAA FKNMS GIS](https://sanctuaries.noaa.gov/library/imast_gis.html) | Legal sanctuary zones |
| [TPWD Outdoor Annual](https://tpwd.texas.gov/regulations/outdoor-annual/) | Texas bag/season |
| [TPWD Coastal Fisheries](https://tpwd.texas.gov/landwater/water/habitats/coastal/) / [BCO-DMO 828794](https://www.bco-dmo.org/dataset/828794) | Gill-net counts by Texas bay (1982–2019 public file). 45 overnight sets per bay per spring and fall. TPWD still samples twice a year; this file does not update after 2019 until they send a new extract (`cfish@tpwd.texas.gov`). Not a live feed. Not a honey-hole map. Rebuild: `python3 scripts/build-tpwd-gill-net.py`. |
| [TPWD creel](https://tpwd.texas.gov/fishboat/fish/didyouknow/coastal/creel.phtml) / [Collins et al. 2026](https://doi.org/10.1371/journal.pone.0344688) | Dock counts: observed harvest on parties that said they were fishing for redfish, trout, or snapper (1991–2023). Public ramps and wet slips, 10:00–18:00. Not expanded landings, not discards, not every boat at the ramp. TPWD still interviews year-round; this extract does not update with the tide. Rebuild: `python3 scripts/build-tpwd-creel.py`. |
| [TPWD launches](https://tpwd.texas.gov/fishboat/boat/launch/) | Public ramps |
| [Texas GLO beach access](https://www.glo.texas.gov/coast/coastal-management/beach-access) | Drive-on beaches, county 2WD/4WD plans |
| [NPS Padre Island](https://www.nps.gov/pais/planyourvisit/beach-driving.htm) | PINS driving / camping |
| [FWC](https://myfwc.com/fishing/saltwater/recreational/) | Florida bonefish, permit, snook, redfish |
| [LDWF recreational saltwater](https://www.wlf.louisiana.gov/page/recreational-saltwater-finfish) | Louisiana bag, slot, and flounder season |
| [CONAPESCA](https://www.gob.mx/conapesca) | Mexico recreational license and harvest rules |
| [DNER Puerto Rico](https://www.drna.pr.gov/) | Puerto Rico recreational license and reserves |
| [Seychelles Fishing Authority](https://www.sfa.sc/) | Seychelles license and harvest rules |
| [NCDMF](https://www.deq.nc.gov/about/divisions/marine-fisheries) | North Carolina recreational saltwater |
| [SCDNR](https://www.dnr.sc.gov/marine/) | South Carolina recreational saltwater |

The TPWD coastal-ramp GIS and the GLO Beach & Bay Access feature service are the right legal inventories; the public TAMU ramp layer we tested is inland only, and the GLO Hub query required a token. Those go live when the open endpoints are reachable. Drop a Google My Maps **KML** into the project to add your saved structure as a layer — no matching export was in Drive.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Leaflet.
