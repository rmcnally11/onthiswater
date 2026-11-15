import { NextResponse } from "next/server";
import scout from "@/data/pytmd-scout.json";

/**
 * Internal scout snapshot. Not linked from any page. robots.txt already
 * disallows /api/. The live tide clock is still NOAA or the lunar stand-in.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(scout, {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
