import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingVisitTracker } from "@/components/onboarding/OnboardingVisitTracker";
import { SiteMotion } from "@/components/SiteMotion";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { getCompetitionResults } from "@/lib/competition-results";
import { buildPageMetadata } from "@/lib/seo";
import { CompetitionResultsView, resolveCompetitionPeriodKey } from "./CompetitionResultsView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);

  return {
    ...buildPageMetadata({ locale, path: "/liderlik-tablosu", page: "leaderboard" }),
    robots: { index: false, follow: false },
  };
}

export default async function CompetitionResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ donem?: string | string[] }>;
}) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale = getSafeLocale(rawLocale);
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(`/${locale}/giris`);
  }

  const selectedPeriodKey = resolveCompetitionPeriodKey(query.donem);
  const results = await getCompetitionResults(sessionUser.id, selectedPeriodKey);
  const isEnglish = locale === "en";

  return (
    <div className="grid min-w-0 gap-6">
      <OnboardingVisitTracker step="ranking" locale={locale} />

      <section className="premium-card premium-card--interactive min-w-0 p-5 sm:p-6">
        <div className="site-page-hero-grid min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
              {isEnglish ? "Virtual portfolio competition" : "Sanal portföy yarışması"}
            </p>
            <h1 className="mt-2 break-words text-3xl font-black text-[#152033] sm:text-4xl">
              {isEnglish ? "Competition Results" : "Yarışma Sonuçları"}
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
              {isEnglish
                ? "Compare percentage returns across six periods, see your own virtual portfolio result, and follow your place in active leagues. Equal returns keep the same rank."
                : "Altı dönemdeki yüzdesel getirileri karşılaştır, kendi sanal portföy sonucunu ve aktif liglerdeki sıranı izle. Eşit getiriler aynı sırayı korur."}
            </p>
          </div>
          <div className="site-page-hero-motion" aria-hidden="true">
            <SiteMotion variant="compare" />
          </div>
        </div>
      </section>

      <CompetitionResultsView
        locale={locale}
        periods={results.periods}
        selectedPeriodKey={selectedPeriodKey}
        leagues={results.leagues}
      />
    </div>
  );
}
