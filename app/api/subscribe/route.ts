import { after, NextRequest, NextResponse } from "next/server";
import { airtableConfigured, listAirtableSubscribers, type ListSource } from "@/lib/airtable-list";
import { addSubscriber, parseDesks, validEmail, validName, validPostal } from "@/lib/subscribers";
import { sendWelcomeEmails } from "@/lib/samples";
import { enqueueWelcome, subscribeNote } from "@/lib/welcome-queue";
import {
  COASTS_COOKIE,
  coastsCookieOptions,
  coastsForDesks,
  encodeCoasts,
  parseCadence,
} from "@/lib/coasts";

const SOURCES = new Set<ListSource>(["Brief", "Letter", "Morning", "Operator"]);

/** Background welcome has to finish inside this invocation. One desk is well under it; the old full fleet was not. */
export const maxDuration = 300;

export async function GET() {
  if (!airtableConfigured()) {
    return NextResponse.json({ list: "unlinked", airtable: false, ok: false });
  }
  try {
    const rows = await listAirtableSubscribers();
    return NextResponse.json({
      list: "airtable",
      airtable: true,
      ok: true,
      count: rows.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        list: "airtable",
        airtable: true,
        ok: false,
        error: error instanceof Error ? error.message : "Airtable did not answer.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: { email?: string; name?: string; zip?: string; desks?: unknown; cadence?: unknown; source?: string };
  try {
    body = (await request.json()) as {
      email?: string;
      name?: string;
      zip?: string;
      desks?: unknown;
      cadence?: unknown;
      source?: string;
    };
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  const zip = body.zip?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  if (!validName(name)) {
    return NextResponse.json({ error: "Leave the name you go by." }, { status: 400 });
  }
  if (!validEmail(email)) {
    return NextResponse.json({ error: "That is not an email." }, { status: 400 });
  }
  if (!validPostal(zip)) {
    return NextResponse.json({ error: "Leave a home ZIP or postal code." }, { status: 400 });
  }
  const desks = parseDesks(body.desks);
  if (!desks.length) {
    return NextResponse.json({ error: "Pick at least one piece of water." }, { status: 400 });
  }
  const cadence = parseCadence(body.cadence);
  const source = SOURCES.has(body.source as ListSource) ? (body.source as ListSource) : "Brief";
  try {
    const result = await addSubscriber(email, desks, source, cadence, { name, zip });
    const coasts = coastsForDesks(result.subscriber.desks);
    enqueueWelcome(after, () =>
      sendWelcomeEmails(result.subscriber.email, {
        desks: result.subscriber.desks,
        cadence: result.subscriber.cadence,
      }).then(() => undefined),
    );
    const note = subscribeNote(coasts, result.via);
    const res = NextResponse.json({
      ok: true,
      desks: result.subscriber.desks,
      cadence: result.subscriber.cadence,
      coasts,
      via: result.via,
      sentNow: false,
      note,
    });
    res.cookies.set(COASTS_COOKIE, encodeCoasts(coasts), coastsCookieOptions());
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not subscribe." },
      { status: 500 },
    );
  }
}
