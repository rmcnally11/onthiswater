# Cursor lessons

Notes from scheduled upkeep. Newest first.

## 2026-11-01

- In a React href, `&` is just `&`. Writing `&amp;` inside the quote does not become an ampersand. The link goes out with the word `amp` in the query, so `theater` never arrives. The bot rules page was doing this on `/card`, `/calendar`, and `/card/calendar`.
- This site is a light page: navy text on white. Text set to about half strength (`/40` through `/55`) is too faint to read, and a white wash (`bg-white/8`) disappears on the white background. Off months on the species year-bar were blank for that reason. Darken the type instead of reaching for a redesign.
- `npm audit fix` will not move a package that is pinned to an exact version. Next was pinned at 16.3.2, so the security fixes in 16.4.3 needed an explicit minor bump. Do not use `npm audit fix --force` here. It wants to downgrade ESLint to version 4 and shadcn to version 1.
