import { NextResponse } from "next/server";
import { GITHUB_REPO } from "@/lib/brand";
import { ORIGIN, buildTweetFeed } from "@/lib/tweet";

export const dynamic = "force-dynamic";

export async function GET() {
  const { mornings, calendars } = await buildTweetFeed();

  return NextResponse.json({
    source: `${ORIGIN}/for-the-letter`,
    instructions: `${ORIGIN}/for-the-letter`,
    github: `${GITHUB_REPO}/blob/main/TWITTER.md`,
    rule: "Post text verbatim — the last line is the live site so readers can open the brief. Screenshot image only. Do not generate pictures. Skip any desk with skip=true.",
    mornings,
    calendars,
  }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
