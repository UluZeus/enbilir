import type { Metadata } from "next";
import { SiteMotion } from "@/components/SiteMotion";
import { getDisplayName } from "@/lib/auth";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { getPortfolioSnapshot, formatMoney } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/liderlik-tablosu", page: "leaderboard" });
}

export default async function LeaderboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
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

  return (
    <div className="grid gap-6">
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
      <section className="glass-card overflow-hidden rounded-lg shadow-sm">
        {rankedRows.map((row, index) => (
          <div key={row.id} className="grid gap-3 border-b border-white/60 p-5 transition hover:bg-white/45 md:grid-cols-[80px_1fr_180px] md:items-center">
            <p className="text-2xl font-black text-[#f5a623]">#{index + 1}</p>
            <p className="font-black text-[#152033]">{row.displayName}</p>
            <p className="font-black text-[#0f766e]">{formatMoney(row.totalValueUsd)}</p>
          </div>
        ))}
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
