import { getNewsletter, letterWeekId, loadLetterTomorrows, withCoastWaters } from "@/lib/newsletter";
import { FieldLetterHeader, PrintSheet, RoomSaltWater } from "@/components/house-art";
import { JsonLd } from "@/components/json-ld";
import { LetterIssue } from "@/components/letter-issue";
import { resolveElectedCoasts } from "@/lib/coasts";
import { LETTER_SEO } from "@/lib/letter-copy";
import { readCoastsPref } from "@/lib/prefs";
import { letterArticleJsonLd, letterPageTitle } from "@/lib/seo";

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
  const jsonLd = (
    <JsonLd
      data={letterArticleJsonLd({
        headline: letterPageTitle(LETTER_SEO.title),
        description: LETTER_SEO.description,
        path: "/newsletter",
        datePublished: letterWeekId(),
      })}
    />
  );

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
        {jsonLd}
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
  return (
    <>
      {jsonLd}
      <LetterIssue issue={issue} coasts={coasts} tomorrows={tomorrows} />
    </>
  );
}
