import Link from "next/link";
import { AdBanner } from "@/components/AdBanner";
import { MiniLineChart } from "@/components/MiniLineChart";
import { LiveMarketOverview } from "@/components/market/LiveMarketOverview";
import { MarketPulse } from "@/components/market/MarketPulse";
import { PortfolioBreakdown } from "@/components/PortfolioBreakdown";
import { PortfolioDonut } from "@/components/PortfolioDonut";
import { PremiumCard } from "@/components/PremiumCard";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getAds } from "@/lib/ads";
import { getSessionUser } from "@/lib/auth";
import { getFallbackMarketItems, getLiveMarketItems } from "@/lib/live-market";
import { getUserRankingPeriods } from "@/lib/leaderboard";
import { getPortfolioBreakdownItems } from "@/lib/portfolio-breakdown";
import { getPortfolioPerformancePeriods, type PortfolioPerformancePeriod } from "@/lib/portfolio-history";
import { formatMoney, getPortfolioSnapshot } from "@/lib/portfolio";
import type { DisplayAd } from "@/lib/ads";
import type { MarketItem } from "@/lib/market-data";

type UserRankingPeriod = Awaited<ReturnType<typeof getUserRankingPeriods>>[number];

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale);
  const user = await getSessionUser();
  const fallbackMarketItems = getFallbackMarketItems();
  const [adsResult, liveItemsResult, snapshotResult] = await Promise.allSettled([
    getAds("home_top"),
    getLiveMarketItems(),
    user ? getPortfolioSnapshot(user.id, fallbackMarketItems) : Promise.resolve(null),
  ]);
  const ads = settledValue<DisplayAd[]>(adsResult, []);
  const liveItems = settledValue<MarketItem[]>(liveItemsResult, fallbackMarketItems);
  const snapshot = settledValue<Awaited<ReturnType<typeof getPortfolioSnapshot>> | null>(snapshotResult, null);
  const [chartPeriodsResult, rankingPeriodsResult] = await Promise.allSettled([
    user && snapshot ? getPortfolioPerformancePeriods(user.id, snapshot.totalValueUsd) : Promise.resolve([]),
    user ? getUserRankingPeriods(user.id) : Promise.resolve([]),
  ]);
  const chartPeriods = settledValue<PortfolioPerformancePeriod[]>(chartPeriodsResult, []);
  const rankingPeriods = settledValue<UserRankingPeriod[]>(rankingPeriodsResult, []);
  const breakdownItems = snapshot ? getPortfolioBreakdownItems(snapshot) : [];
  const marketSubtitle = locale === "en"
    ? "A wider universe is scanned in the background every 30 seconds, while the pages remain fixed and responsive."
    : "Daha geniş bir piyasa evreni 30 saniyede bir arka planda taranır, sayfalar sabit ve akıcı kalır.";

  return (
    <div className="grid gap-6">
      <AdBanner ads={ads} />
      <section className="hero-visual p-6 text-white sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">{copy.home.eyebrow}</p>
        <h1 className="relative mt-3 text-4xl font-black tracking-normal sm:text-6xl">enbilir.com</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          {copy.home.description}
        </p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <Link href={`/${locale}/islem-yap`} className="premium-cta px-5 py-3 text-sm font-black">{copy.home.trade}</Link>
          <Link href={`/${locale}/ligler`} className="premium-link rounded-md px-5 py-3 text-sm font-black">{copy.home.leagues}</Link>
        </div>
      </section>

      <MarketPulse
        locale={locale}
        items={liveItems}
        title={locale === "en" ? "Market cockpit" : "Piyasa kokpiti"}
        subtitle={marketSubtitle}
        accentLabel={copy.home.eyebrow}
      />

      <LiveMarketOverview locale={locale} initialItems={liveItems} title={copy.home.topRisers} />

      <section className="grid gap-5 xl:grid-cols-[260px_1fr_1fr_1fr]">
        <div className="grid gap-4">
          <PremiumCard interactive className="p-4">
            <h2 className="text-lg font-black text-[#152033]">{copy.home.portfolio}</h2>
            <p className="mt-3 text-2xl font-black text-[#0f766e]">{snapshot ? formatMoney(snapshot.totalValueUsd) : "-"}</p>
            <p className="mt-1 text-sm text-slate-500">{copy.home.portfolioBody}</p>
            {snapshot ? (
              <>
                <div className="mt-4">
                  <PortfolioDonut
                    total={snapshot.totalValueUsd}
                    size="sm"
                    animated
                    items={[
                      { label: copy.trade.cash, value: snapshot.cashValueUsd },
                      ...snapshot.positions.map((position) => ({ label: position.symbol, value: position.valueUsd })),
                    ]}
                  />
                </div>
                <div className="mt-4">
                  <PortfolioBreakdown items={breakdownItems} compact />
                </div>
                <PerformanceBadges periods={chartPeriods} copy={copy.home} />
              </>
            ) : (
              <p className="mt-4 rounded-md bg-[#f8fafc] p-3 text-xs leading-5 text-slate-500">
                {user ? copy.home.noEnoughData : copy.home.profitLogin}
              </p>
            )}
          </PremiumCard>
        </div>

        <PremiumCard interactive className="p-5">
          <h2 className="text-lg font-black text-[#152033]">{copy.home.portfolioChange}</h2>
          <div className="mt-4 grid gap-4">
            {chartPeriods.length === 0 ? (
              <p className="text-sm text-slate-500">{user ? copy.home.noEnoughData : copy.home.chartLogin}</p>
            ) : chartPeriods.map((period) => (
              <div key={period.label} className="rounded-md bg-[#f8fafc] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-black text-[#152033]">{copy.home.periodLabels[period.key]}</p>
                  <div className="text-right">
                    <p className={period.change === null ? "font-black text-slate-500" : period.change >= 0 ? "font-black text-[#0f766e]" : "font-black text-red-600"}>
                      {period.change === null ? "-" : formatPercent(period.change)}
                    </p>
                    {period.source === "modeled" ? <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{copy.home.modeled}</p> : null}
                  </div>
                </div>
                <MiniLineChart points={period.points} />
              </div>
            ))}
          </div>
        </PremiumCard>

        <PremiumCard interactive className="p-5">
          <h2 className="text-lg font-black text-[#152033]">{copy.home.rankings}</h2>
          <div className="mt-4 grid gap-3">
            {rankingPeriods.length === 0 ? (
              <p className="text-sm text-slate-500">{user ? copy.home.noEnoughData : copy.home.rankingLogin}</p>
            ) : rankingPeriods.map((period) => (
              <div key={period.label} className="rounded-md bg-[#f8fafc] p-4">
                <p className="font-black text-[#152033]">{translateRankingPeriod(period.label, copy.home.periodLabels)}</p>
                <p className="mt-1 text-sm text-slate-600">{copy.home.overall}: {period.overall}/{period.totalUsers}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {copy.home.friends}: {period.hasFriends && period.friends ? `${period.friends}/${period.totalFriendsScope}` : copy.home.noFriends}
                </p>
              </div>
            ))}
          </div>
        </PremiumCard>

        <div className="grid gap-5">
          <NewsList title={copy.home.marketNewsTitle} items={copy.home.marketNews} />
          <NewsList title={copy.home.rotaryNewsTitle} items={copy.home.rotaryNews} />
        </div>
      </section>
    </div>
  );
}

function PerformanceBadges({ periods, copy }: { periods: PortfolioPerformancePeriod[]; copy: ReturnType<typeof getUiCopy>["home"] }) {
  if (periods.length === 0) {
    return <p className="mt-4 rounded-md bg-[#f8fafc] p-3 text-xs leading-5 text-slate-500">{copy.noEnoughData}</p>;
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {periods.map((period) => {
        const tone =
          period.change === null || Math.abs(period.change) < 0.0000001
            ? "bg-slate-100 text-slate-600"
            : period.change > 0
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-red-50 text-red-700 ring-red-200";

        return (
          <div key={period.key} className={`rounded-md px-2.5 py-2 text-xs font-black ring-1 ring-inset ${tone}`}>
            <span className="block text-[10px] uppercase tracking-[0.12em] opacity-70">{copy.periodLabels[period.key]}</span>
            <span>{period.change === null ? copy.noEnoughDataShort : formatPercent(period.change, true)}</span>
          </div>
        );
      })}
    </div>
  );
}

function translateRankingPeriod(label: string, periodLabels: ReturnType<typeof getUiCopy>["home"]["periodLabels"]) {
  const normalized = label.toLowerCase();

  if (normalized.includes("haft") || normalized.includes("week")) {
    return periodLabels.WEEKLY;
  }

  if (normalized.includes("3")) {
    return periodLabels.QUARTERLY;
  }

  if (normalized.includes("6")) {
    return periodLabels.SEMI_ANNUAL;
  }

  if (normalized.includes("yıl") || normalized.includes("year")) {
    return periodLabels.YEARLY;
  }

  if (normalized.includes("ay") || normalized.includes("month")) {
    return periodLabels.MONTHLY;
  }

  return label;
}

function formatPercent(value: number, signed = false) {
  const absValue = Math.abs(value);
  const decimals = absValue > 0 && absValue < 1 ? 4 : 2;
  const prefix = signed && value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(decimals)}%`;
}

function NewsList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <PremiumCard interactive className="p-5">
      <h2 className="text-lg font-black text-[#152033]">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => <p key={item} className="text-sm leading-6 text-slate-600">{item}</p>)}
      </div>
    </PremiumCard>
  );
}
