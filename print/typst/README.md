# Typst field-letter scout

This folder is a trial of [Typst](https://github.com/typst/typst) (Apache-2.0) as a print engine for one Saturday letter. It does not replace `PrintSheet` in `components/house-art.tsx` or the `@media print` rules in `app/globals.css`. Nothing here is a public route.

## Rebuild the sample

From the repo root, using the saved letter (no network):

```bash
node --experimental-strip-types --import ./scripts/register-alias.mjs print/typst/build-letter.ts
```

`--live` refetches `https://www.onthiswater.com/api/letter` and rewrites `sample/letter.json`. The script pins Typst 0.15.1 (`typst-x86_64-unknown-linux-musl.tar.xz`, sha256 `a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c`) and downloads it into `print/typst/.cache` when `TYPST` is unset. Set `TYPST` to skip the download. Fonts are Newsreader and Geist, both OFL, in `fonts/`.

The sheet leads with Galveston, prints no desk scores (`letterHasScore` checks the print view and the PDF text), uses the house palette, embeds `public/art/logo-v2-128.png` and `logo-v2-64.png`, and links to `https://www.onthiswater.com/newsletter`. Words and numbers come from that letter payload. The script drops confidence and the raw gauge floats; the sentences the letter already published (`conditions`, `why`, wind, water, tide) are what the sheet prints.

## This sample

Fetched 2026-11-15 from `https://www.onthiswater.com/api/letter`. Week of November 9, `weekId` `2026-11-14`, No. 46, `generatedAt` `2026-11-15T01:41:09.448Z`. Compile of that snapshot: Typst 0.15.1, 62 ms, 233,478 bytes, 5 US Letter pages. A second compile of the same snapshot matched byte for byte (`--creation-timestamp` is the letter's `generatedAt`).

## Against the current print sheet

The live print sheet is not a PDF template. `.print-sheet` is `display: none` on screen and `display: block` in print, and it only reveals `public/art/sheet-header.jpg` (82,383 bytes, 1200×420). The heroes hide. The rest of `/newsletter` prints as the page.

Headless Chrome print of `https://www.onthiswater.com/newsletter` on 2026-11-15, same week: the PDF existed in 1.4 s, 1,786,657 bytes, 18 pages. Page one still has the join strip, the coast chips, and the week chips. The permalink prints as `/newsletter/2026-11-14`. The page underneath is the screen palette (white ground, navy type), not the house pencil colors.

| | Current print | Typst scout |
| --- | --- | --- |
| What it is | Browser print of the letter page, plus the banner JPEG | One `.typ` file fed by `/api/letter` |
| File | 1,786,657 bytes, 18 pages (banner alone is 82,383 bytes) | 233,478 bytes, 5 pages |
| Time | 1.4 s until Chrome wrote the PDF | 62 ms to compile the saved letter |
| Fidelity | Same DOM as the screen, including join and chips. Tide, wind, and moon instruments survive. Palette stays the screen palette. | Galveston leads. Same published sentences and counts (15 of 15 waters, +0.97 ft, 10 mph E, 72° water). House palette, logo-v2, the same banner. No tide curve, wind compass, or moon disk. |
| Templating | Change the React page and hope print follows. | Change `field-letter.typ`. The build script rejects a score or an off-site link before the PDF is written. |

## CI and Vercel

Do not compile this inside a Vercel function or the Next build. The preview build does not run the script, and `vercel.json` is unchanged. The pinned compiler is a native binary of about 17 MB; the build image does not have it.

When a downloadable sheet is actually wanted, run this script in GitHub Actions (this repo has no workflow yet) or by hand. Ubuntu can fetch the pinned tarball, check the sha256, and compile. Store the PDF as a job artifact or commit a snapshot the way this sample is committed. A request-time compile would mean shipping the binary, or a WASM port, on a route this scout does not add.

## Recommendation

Adopt later.

The engine can carry this letter: fast, small, byte-stable, and easier to template than a print stylesheet wrapped around the screen. It is not the current print sheet, and it should not replace that sheet until someone wants a file a person can download. Adopting it now would put a native compiler on the web path for a page that is still the screen. Dropping it would throw away a compile that already holds the week's words without a desk score.
