# PR 22 link verdicts

Checked on 2026-11-04 with `curl -sIL` (follow redirects, last HTTP status). A GET (`curl -sL`) was run when that HEAD status was 400 or higher. Both dead URLs returned the same status on GET.

Scope: the 11 unique external `https` URLs pull request 22 adds or rewrites, in the README and the rest of the diff, plus the two URLs this pass was told to resolve that the diff had left in place (TPWD Coastal Fisheries, LDWF boat ramps). `package-lock.json` tarball URLs are not citations and are not in this table.

Links checked: 13. Table rows: 13.

A dead link is a checked URL whose `curl -sIL` status was not 200.

Dead-link count: 2.

| URL | Date | HTTP status | Verdict | Final status |
| --- | --- | --- | --- | --- |
| https://tpwd.texas.gov/fishboat/boat/where/ | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://www.glo.texas.gov/coastal/protecting-coast/open-beaches | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://www.nps.gov/pais/planyourvisit/drivingdownisland.htm | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://myfwc.com/fishing/saltwater/recreational/dolphinfish/ | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://myfwc.com/fishing/saltwater/recreational/billfish-tuna/ | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://www.fisheries.noaa.gov/topic/atlantic-highly-migratory-species/recreational-fishermen | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://myfwc.com/fishing/saltwater/recreational/permit/ | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://myfwc.com/fishing/saltwater/recreational/tripletail/ | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://myfwc.com/fishing/saltwater/recreational/amberjack/ | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://www.nps.gov/pais/planyourvisit/boating.htm | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://www.miamidade.gov/global/recreation/park/black-point-park-and-marina.page | 2026-11-04 | 200 | keep — `curl -sIL` returned 200 | 200 |
| https://tpwd.texas.gov/landwater/water/habitats/coastal/ | 2026-11-04 | 404 | fix — https://tpwd.texas.gov/about/administration-divisions/coastal-fisheries (200). Same purpose: the Coastal Fisheries Division page. `curl -sIL` on the replacement returned 200. | 200 |
| https://www.wlf.louisiana.gov/page/boat-ramps | 2026-11-04 | 403 | remove — `curl -sIL` returned 403 and GET returned 403. A browser User-Agent (`curl -sIL` and GET) returned 404, so the link was not kept. No live wlf.louisiana.gov boat-ramp page returned 200. Renamed ramp and launch slugs returned 404. Pages that did return 200 (`/go-boating`, stocked-pond locations, the WMA directory, artificial reefs, access grants) are not a public ramp list, so they were not swapped in. The URL was removed from both Louisiana launch pins. | removed |
