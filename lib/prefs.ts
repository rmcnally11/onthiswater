import { cookies } from "next/headers";
import { COASTS_COOKIE, parseCoasts } from "@/lib/coasts";
import { parseWaterPref, WATER_COOKIE } from "@/lib/pref-codec";
import type { TheaterId } from "@/lib/types";

export { COASTS_COOKIE };
export {
  WATER_COOKIE,
  encodeWaterPref,
  isAllWaterQuery,
  parseWaterPref,
  resolveDesk,
  resolveDeskForTheater,
  waterCookieOptions,
  type WaterPref,
} from "@/lib/pref-codec";

export async function readWaterPref() {
  const jar = await cookies();
  return parseWaterPref(jar.get(WATER_COOKIE)?.value);
}

export async function readCoastsPref(): Promise<TheaterId[] | null> {
  const jar = await cookies();
  const coasts = parseCoasts(jar.get(COASTS_COOKIE)?.value);
  return coasts.length ? coasts : null;
}
