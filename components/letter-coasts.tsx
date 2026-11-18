"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cookieValue } from "@/lib/cookie-jar";
import { COASTS_COOKIE, coastEditionLabel, isAllCoasts, resolveElectedCoasts } from "@/lib/coasts";
import type { TheaterId } from "@/lib/types";

/** Hide letter desks that are outside the coasts this visitor asked for. */
export function LetterCoasts() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const root = document.querySelector("[data-letter]");
    if (!root) return;
    const coasts = resolveElectedCoasts({
      coastsQuery: search.get("coasts"),
      desksQuery: search.get("desks"),
      cookie: cookieValue(document.cookie, COASTS_COOKIE),
    });
    const all = isAllCoasts(coasts);
    const wanted = new Set<TheaterId>(coasts ?? []);
    root.querySelectorAll<HTMLElement>("[data-letter-theater]").forEach((el) => {
      const theater = el.dataset.letterTheater;
      el.hidden = !all && !!theater && !wanted.has(theater as TheaterId);
    });
    const edition = root.querySelector("[data-letter-edition]");
    if (edition) edition.textContent = coastEditionLabel(all ? null : coasts);
  }, [pathname, search]);

  return null;
}
