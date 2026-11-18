import type { Metadata } from "next";
import { LetterIssue } from "@/components/letter-issue";
import { withFetchRevalidate, withHistoricalFetches } from "@/lib/external-fetch";
import { letterWeekMeta } from "@/lib/letter-copy";
import { getNewsletter, letterWeekId, loadLetterTomorrows, withCoastWaters } from "@/lib/newsletter";
import { pageMeta } from "@/lib/seo";
import { isPastYmd, isYmd } from "@/lib/time";

// Dynamic segments otherwise render per request and send `private, no-store`.
// A passed Saturday is cached 30 days. This week's URL is redirected to /newsletter.
export const revalidate = 2592000;
export const fetchCache = "force-cache";
export const dynamic = "error";

function pastIssue(week: string) {
  return isYmd(week) && isPastYmd(week, letterWeekId());
}

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
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  if (!pastIssue(week)) {
    return withFetchRevalidate(300, async () => {
      let issue;
      let error: string | null = null;
      try {
        issue = await withCoastWaters(await getNewsletter(isYmd(week) ? week : null), null);
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
      return <LetterIssue issue={issue} coasts={null} weekPath tomorrows={tomorrows} />;
    });
  }

  return withHistoricalFetches(async () => {
    const issue = { ...(await getNewsletter(week)), frozen: true as const };
    const tomorrows = await loadLetterTomorrows(issue);
    return <LetterIssue issue={issue} coasts={null} weekPath tomorrows={tomorrows} />;
  });
}
