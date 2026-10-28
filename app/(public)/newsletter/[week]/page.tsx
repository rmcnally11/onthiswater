import { getNewsletter, loadLetterTomorrows, withCoastWaters } from "@/lib/newsletter";
import { LetterIssue } from "@/components/letter-issue";
import { isYmd } from "@/lib/time";
import { readCoastsPref } from "@/lib/prefs";
import { resolveElectedCoasts } from "@/lib/coasts";
import type { Metadata } from "next";
import { letterWeekMeta } from "@/lib/letter-copy";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  const date = isYmd(week) ? week : "this Saturday";
  const meta = letterWeekMeta(date);
  return pageMeta({
    title: meta.title,
    description: meta.description,
    path: `/newsletter/${isYmd(week) ? week : ""}`.replace(/\/$/, ""),
    imageAlt: meta.imageAlt,
  });
}

export default async function WeekLetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ week: string }>;
  searchParams: Promise<{ coasts?: string; desks?: string }>;
}) {
  const [{ week }, q] = await Promise.all([params, searchParams]);
  const cookie = await readCoastsPref();
  const coasts = resolveElectedCoasts({
    coastsQuery: q.coasts,
    desksQuery: q.desks,
    cookie: cookie?.join(",") ?? null,
  });

  let issue;
  let error: string | null = null;
  try {
    issue = await withCoastWaters(await getNewsletter(isYmd(week) ? week : null), coasts);
  } catch (e) {
    error = e instanceof Error ? e.message : "The letter did not set.";
  }

  if (error || !issue) {
    return (
      <div className="rounded-2xl border border-rose-400/40 bg-rose-50 p-6 text-rose-900">
        <p className="font-heading text-xl">The letter did not set.</p>
        <p className="mt-2 text-sm opacity-80">{error}</p>
      </div>
    );
  }

  const tomorrows = await loadLetterTomorrows(issue);
  return <LetterIssue issue={issue} coasts={coasts} weekPath tomorrows={tomorrows} />;
}
