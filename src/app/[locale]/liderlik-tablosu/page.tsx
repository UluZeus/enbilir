import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteMotion } from "@/components/SiteMotion";
import { OnboardingVisitTracker } from "@/components/onboarding/OnboardingVisitTracker";
import { getDisplayName, getSessionUser } from "@/lib/auth";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import {
  calculateCompetitionProfitLossUsd,
  calculateCompetitionReturnPercent,
  getPortfolioSnapshot,
  formatMoney,
} from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return {
    ...buildPageMetadata({ locale, path: "/liderlik-tablosu", page: "leaderboard" }),
    robots: { index: false, follow: false },
  };
}

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(`/${locale}/giris`);
  }
  const copy = getUiCopy(locale).leaderboard;
  const users = await prisma.user.findMany({
    select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true },
  });
  const heldSymbols = await prisma.portfolioPosition.findMany({
    select: { symbol: true },
    distinct: ["symbol"],
  });
  const liveMarketItems = await getLiveMarketItemsForSymbols(heldSymbols.map((position) => position.symbol));
  const rows = await Promise.all(users.map(async (user) => {
    const snapshot = await getPortfolioSnapshot(user.id, liveMarketItems);
    return { id: user.id, displayName: getDisplayName(user), totalValueUsd: snapshot.totalValueUsd };
  }));
  const rankedRows = rows.sort((a, b) => b.totalValueUsd - a.totalValueUsd);
  const currentUserRank = rankedRows.findIndex((row) => row.id === sessionUser.id) + 1;

  return (
    <div className="grid gap-6">
      <OnboardingVisitTracker step="ranking" locale={locale} />
      <section className="premium-card premium-card--interactive p-6">
        <div className="site-page-hero-grid">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{locale === "en" ? "Competition ranking" : "Yarışma sıralaması"}</p>
            <h1 className="mt-2 text-3xl font-black text-[#152033]">{copy.title}</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">{copy.description}</p>
          </div>
          <div className="site-page-hero-motion">
            <SiteMotion variant="compare" />
          </div>
        </div>
      </section>
      <section className="leaderboard-learning premium-card p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
              {locale === "en" ? "Fair learning competition" : "Adil öğrenme rekabeti"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#152033]">
              {locale === "en" ? "The best learner is not always the highest-risk portfolio." : "En iyi öğrenen her zaman en yüksek risk alan portföy değildir."}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">
              {locale === "en"
                ? "Use the ranking together with decision notes, diversification, report reading, and league participation. Enbilir rewards better process, not only a temporary result."
                : "Sıralamayı karar notu, çeşitlendirme, rapor okuma ve lig katılımıyla birlikte düşünün. Enbilir yalnızca geçici sonucu değil, daha iyi süreci de görünür kılar."}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {getLeaderboardLearningCards(locale).map((card) => (
            <div key={card.title} className="rounded-2xl border border-[#d1bfa7]/35 bg-white/75 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">{card.kicker}</p>
              <h3 className="mt-2 text-base font-black text-[#152033]">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
            </div>
          ))}
        </div>
      </section>
      {rankedRows.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-3 md:items-end" aria-label={locale === "tr" ? "İlk üç kullanıcı" : "Top three users"}>
          {[rankedRows[1], rankedRows[0], rankedRows[2]].map((row, podiumIndex) => {
            if (!row) return null;
            const rank = podiumIndex === 0 ? 2 : podiumIndex === 1 ? 1 : 3;
            const returnPercent = calculateCompetitionReturnPercent(row.totalValueUsd);
            const isCurrentUser = row.id === sessionUser.id;

            return (
              <article
                key={row.id}
                className={`relative overflow-hidden rounded-2xl border bg-white p-5 text-center shadow-sm ${
                  rank === 1 ? "border-[#d9a441] md:min-h-56 md:py-7" : "border-slate-200 md:min-h-48"
                } ${isCurrentUser ? "ring-2 ring-[#0f766e] ring-offset-2" : ""}`}
              >
                <span className={`mx-auto flex items-center justify-center rounded-full font-black ${rank === 1 ? "h-14 w-14 bg-[#101827] text-2xl text-[#f5c96b]" : "h-12 w-12 bg-slate-100 text-xl text-slate-700"}`}>#{rank}</span>
                <h2 className="mt-4 truncate text-lg font-black text-[#152033]">{row.displayName}</h2>
                {isCurrentUser ? <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#0f766e]">{locale === "tr" ? "Sen" : "You"}</p> : null}
                <p className="mt-3 text-sm font-black text-slate-700">{formatMoney(row.totalValueUsd)}</p>
                <p className={`mt-1 text-lg font-black ${returnPercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{returnPercent >= 0 ? "+" : ""}{returnPercent.toFixed(2)}%</p>
              </article>
            );
          })}
        </section>
      ) : null}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">{locale === "tr" ? "Canlı sıralama" : "Live ranking"}</p>
            <h2 className="mt-1 text-lg font-black text-[#152033]">{rankedRows.length} {locale === "tr" ? "katılımcı" : "participants"}</h2>
          </div>
          <p className="text-sm font-bold text-slate-600">{locale === "tr" ? "Sıran" : "Your rank"}: <span className="text-[#0f766e]">{currentUserRank > 0 ? `#${currentUserRank}` : "-"}</span></p>
        </div>
        <div className="hidden grid-cols-[80px_minmax(0,1fr)_180px_160px_160px] gap-3 border-b border-slate-200 bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500 md:grid">
          <span>{locale === "tr" ? "Sıra" : "Rank"}</span>
          <span>{locale === "tr" ? "Katılımcı" : "Participant"}</span>
          <span>{locale === "tr" ? "Portföy" : "Portfolio"}</span>
          <span>{locale === "tr" ? "K/Z" : "P/L"}</span>
          <span>{locale === "tr" ? "Getiri" : "Return"}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {rankedRows.map((row, index) => {
            const profitLossUsd = calculateCompetitionProfitLossUsd(row.totalValueUsd);
            const returnPercent = calculateCompetitionReturnPercent(row.totalValueUsd);
            const isCurrentUser = row.id === sessionUser.id;

            return (
              <div key={row.id} className={`grid gap-3 px-5 py-4 transition md:grid-cols-[80px_minmax(0,1fr)_180px_160px_160px] md:items-center ${isCurrentUser ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : "hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3 md:block">
                  <p className={`text-xl font-black ${index < 3 ? "text-[#b67b16]" : "text-slate-500"}`}>#{index + 1}</p>
                  {isCurrentUser ? <span className="rounded-full bg-[#0f766e] px-2 py-1 text-[10px] font-black uppercase text-white md:hidden">{locale === "tr" ? "Sen" : "You"}</span> : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black text-[#152033]">{row.displayName}</p>
                  {isCurrentUser ? <p className="mt-1 hidden text-[10px] font-black uppercase tracking-[0.12em] text-[#0f766e] md:block">{locale === "tr" ? "Senin portföyün" : "Your portfolio"}</p> : null}
                </div>
                <p className="font-black text-[#152033]"><span className="mr-2 text-xs font-bold text-slate-500 md:hidden">{locale === "tr" ? "Değer" : "Value"}</span>{formatMoney(row.totalValueUsd)}</p>
                <p className={`font-black ${profitLossUsd >= 0 ? "text-emerald-700" : "text-rose-700"}`}><span className="mr-2 text-xs font-bold text-slate-500 md:hidden">{locale === "tr" ? "K/Z" : "P/L"}</span>{profitLossUsd >= 0 ? "+" : ""}{formatMoney(profitLossUsd)}</p>
                <p className={`font-black ${returnPercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}><span className="mr-2 text-xs font-bold text-slate-500 md:hidden">{locale === "tr" ? "Getiri" : "Return"}</span>{returnPercent >= 0 ? "+" : ""}{returnPercent.toFixed(2)}%</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function getLeaderboardLearningCards(locale: string) {
  if (locale === "en") {
    return [
      { kicker: "Journal", title: "Decision quality", body: "Trades with written reasons become reviewable learning material." },
      { kicker: "Risk", title: "Balanced portfolio", body: "A slower but balanced portfolio may teach more than a lucky jump." },
      { kicker: "Community", title: "League rhythm", body: "Weekly comparison helps users discuss process, not only outcome." },
      { kicker: "AI", title: "Scenario review", body: "Use the assistant to ask what would invalidate a view." },
    ] as const;
  }

  return [
    { kicker: "Günlük", title: "Karar kalitesi", body: "Gerekçesi yazılmış işlemler sonradan incelenebilir öğrenme malzemesine dönüşür." },
    { kicker: "Risk", title: "Dengeli portföy", body: "Daha yavaş ama dengeli portföy, şanslı bir sıçramadan daha çok şey öğretebilir." },
    { kicker: "Topluluk", title: "Lig ritmi", body: "Haftalık karşılaştırma kullanıcıların sadece sonucu değil süreci konuşmasını sağlar." },
    { kicker: "AI", title: "Senaryo gözden geçirme", body: "Asistana bir görüşü hangi şartta geçersiz sayacağını sor." },
  ] as const;
}
