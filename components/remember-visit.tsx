"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseActivity } from "@/lib/activity";
import { cookieValue, documentCookie } from "@/lib/cookie-jar";
import {
  COASTS_COOKIE,
  coastsCookieOptions,
  encodeCoasts,
  parseCoasts,
} from "@/lib/coasts";
import { COAST_HUB_BY_SLUG } from "@/lib/coast-hubs";
import { AREA_BY_ID } from "@/lib/data/areas";
import { THEATER_IDS } from "@/lib/data/theaters";
import { encodeWaterPref, WATER_COOKIE, waterCookieOptions } from "@/lib/pref-codec";

function write(name: string, value: string, maxAge: number) {
  const next = documentCookie(name, value, maxAge);
  const current = cookieValue(document.cookie, name);
  if (current === value) return;
  document.cookie = next;
}

/**
 * Remember the water and the coasts in the browser.
 * The proxy used to `Set-Cookie` on the document response, and Vercel's CDN
 * will not cache a response that sets a cookie.
 */
export function RememberVisit() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const morning = pathname.match(/^\/morning\/([^/]+)(?:\/\d{4}-\d{2}-\d{2})?$/);
    const areaId = search.get("area") ?? search.get("a") ?? morning?.[1];
    const area = areaId ? AREA_BY_ID[areaId] : null;
    if (area) {
      write(
        WATER_COOKIE,
        encodeWaterPref({
          areaId: area.id,
          theater: search.get("theater") ?? area.theater,
          activity: parseActivity(search.get("activity")),
        }),
        waterCookieOptions().maxAge,
      );
    }

    const raw = search.get("coasts");
    if (raw) {
      if (raw === "all") {
        write(COASTS_COOKIE, encodeCoasts([...THEATER_IDS]), coastsCookieOptions().maxAge);
        return;
      }
      const coasts = parseCoasts(raw);
      if (coasts.length) write(COASTS_COOKIE, encodeCoasts(coasts), coastsCookieOptions().maxAge);
      return;
    }

    const slug = pathname.replace(/^\//, "");
    const hub = !slug.includes("/") ? COAST_HUB_BY_SLUG[slug] : null;
    if (hub) write(COASTS_COOKIE, encodeCoasts([hub.theater]), coastsCookieOptions().maxAge);
  }, [pathname, search]);

  return null;
}
