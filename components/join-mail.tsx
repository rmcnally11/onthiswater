"use client";

import { useSyncExternalStore } from "react";
import { MorningMail } from "@/components/morning-mail";
import { cookieValue } from "@/lib/cookie-jar";
import { COASTS_COOKIE } from "@/lib/coasts";
import { joinDesks } from "@/lib/join-desks";
import { joinRefFromSearch } from "@/lib/join-ref";
import { WATER_COOKIE, parseWaterPref } from "@/lib/pref-codec";

let clientDesks = "galveston";
let clientDesksKey = "";
let clientRef = "";
let clientRefKey = "";

function clientRefSnapshot() {
  const key = window.location.search;
  if (key === clientRefKey) return clientRef;
  clientRefKey = key;
  clientRef = joinRefFromSearch(key);
  return clientRef;
}

function clientJoinSnapshot() {
  const key = `${window.location.search}|${document.cookie}`;
  if (key === clientDesksKey) return clientDesks;
  const q = new URLSearchParams(window.location.search);
  const water = parseWaterPref(cookieValue(document.cookie, WATER_COOKIE));
  clientDesksKey = key;
  clientDesks = joinDesks({
    coastsQuery: q.get("coasts"),
    desksQuery: q.get("desks"),
    coastsCookie: cookieValue(document.cookie, COASTS_COOKIE),
    waterAreaId: water?.areaId,
  }).join(",");
  return clientDesks;
}

export function JoinMail() {
  const desks = useSyncExternalStore(() => () => {}, clientJoinSnapshot, () => "galveston");
  const entry = useSyncExternalStore(() => () => {}, clientRefSnapshot, () => "");
  const chosen = desks.split(",");
  return (
    <MorningMail
      key={chosen.join(",")}
      source="Letter"
      entry={entry}
      defaultDesks={chosen}
      defaultDesk={chosen[0]}
      join
    />
  );
}
