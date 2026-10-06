import { NextRequest, NextResponse } from "next/server";
import { getBriefing } from "@/lib/briefing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const area = request.nextUrl.searchParams.get("area");
  const activity = request.nextUrl.searchParams.get("activity");
  try {
    const date = request.nextUrl.searchParams.get("date");
    const briefing = await getBriefing(area, activity, date);
    return NextResponse.json(briefing, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Briefing failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
