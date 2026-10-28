import { NextRequest, NextResponse } from "next/server";
import { DispatchError, redact, runDispatch } from "@/lib/dispatch";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  const query = request.nextUrl.searchParams.get("secret");
  return auth === `Bearer ${secret}` || query === secret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Cron is locked." }, { status: 401 });
  }
  const force = request.nextUrl.searchParams.get("force") === "1";
  const weekly = request.nextUrl.searchParams.get("weekly") === "1";
  const calendar = request.nextUrl.searchParams.get("calendar") === "1";
  const seasonal = request.nextUrl.searchParams.get("seasonal") === "1";
  const desk = request.nextUrl.searchParams.get("desk") ?? undefined;
  try {
    const result = await runDispatch({
      forceAll: force || undefined,
      desk,
      weekly: weekly || undefined,
      calendar: calendar || undefined,
      seasonal: seasonal || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DispatchError) {
      return NextResponse.json({ error: error.message, stage: error.stage }, { status: 502 });
    }
    const message = redact(error instanceof Error ? error.message : "Dispatch failed.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = GET;
