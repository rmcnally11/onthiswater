import { getNewsletter, loadLetterTomorrows, withCoastWaters } from "@/lib/newsletter";
import { FieldLetterHeader, PrintSheet, RoomSaltWater } from "@/components/house-art";
import { LetterIssue } from "@/components/letter-issue";
import { resolveElectedCoasts } from "@/lib/coasts";
import { readCoastsPref } from "@/lib/prefs";

export const dynamic = "force-dynamic";

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ coasts?: string; desks?: string }>;
}) {
  const q = await searchParams;
  const cookie = await readCoastsPref();
  const coasts = resolveElectedCoasts({
    coastsQuery: q.coasts,
    desksQuery: q.desks,
    cookie: cookie?.join(",") ?? null,
  });

  let issue;
  let error: string | null = null;
  try {
    issue = await withCoastWaters(await getNewsletter(), coasts);
  } catch (e) {
    error = e instanceof Error ? e.message : "The letter did not set.";
  }

  if (error || !issue) {
    return (
      <div className="space-y-6">
        <PrintSheet />
        <FieldLetterHeader priority />
        <div className="rounded-2xl border border-rose-400/40 bg-rose-50 p-6 text-rose-900">
          <p className="font-heading text-xl">The letter did not set.</p>
          <p className="mt-2 text-sm opacity-80">{error}</p>
        </div>
        <RoomSaltWater />
      </div>
    );
  }

  const tomorrows = await loadLetterTomorrows(issue);
  return <LetterIssue issue={issue} coasts={coasts} tomorrows={tomorrows} />;
}
