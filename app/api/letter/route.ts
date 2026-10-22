import { NextResponse } from "next/server";
import { GITHUB_REPO, siteOrigin } from "@/lib/brand";
import { letterIssueFields } from "@/lib/letter-copy";
import { getNewsletter, withCoastWaters } from "@/lib/newsletter";
import { isYmd } from "@/lib/time";
import { resolveElectedCoasts } from "@/lib/coasts";

export const dynamic = "force-dynamic";

const ORIGIN = siteOrigin();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const week = url.searchParams.get("week");
  const coasts = resolveElectedCoasts({
    coastsQuery: url.searchParams.get("coasts"),
    desksQuery: url.searchParams.get("desks"),
  });
  try {
    const issue = await withCoastWaters(await getNewsletter(isYmd(week) ? week : null), coasts);
    return NextResponse.json({
      source: `${ORIGIN}/newsletter`,
      permalink: `${ORIGIN}/newsletter/${issue.weekId}`,
      github: GITHUB_REPO,
      instructions: `${ORIGIN}/for-the-letter`,
      ...letterIssueFields(issue, ORIGIN),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The letter did not set.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
