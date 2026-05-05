import Link from "next/link";
import { AdBanner } from "@/components/AdBanner";
import { MiniLineChart } from "@/components/MiniLineChart";
import { PortfolioBreakdown } from "@/components/PortfolioBreakdown";
import { PortfolioDonut } from "@/components/PortfolioDonut";
import { PremiumCard } from "@/components/PremiumCard";
import { getSafeLocale } from "@/i18n/config";
import { getAds } from "@/lib/ads";
import { getSessionUser } from "@/lib/auth";
import { getLiveMarketItems, getTopFallersFrom, getTopRisersFrom } from "@/lib/live-market";
import { getUserRankingPeriods } from "@/lib/leaderboard";
import { marketNews, rotaryNews } from "@/lib/market-data";
import { getPortfolioBreakdownItems } from "@/lib/portfolio-breakdown";
import { getPortfolioPerformancePeriods, type PortfolioPerformancePeriod } from "@/lib/portfolio-history";
import { formatMoney, getPortfolioSnapshot } from "@/lib/portfolio";
import type { DisplayAd } from "@/lib/ads";
import type { MarketItem } from "@/lib/market-data";

type UserRankingPeriod = Awaited<ReturnType<typeof getUserRankingPeriods>>[number];

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, fallback: T) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), milliseconds);
    }),
  ]);
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const user = await getSessionUser();
  const [adsResult, liveItemsResult, snapshotResult] = await Promise.allSettled([
    getAds("home_top"),
    withTimeout(getLiveMarketItems(), 2200, []),
    user ? withTimeout(getPortfolioSnapshot(user.id), 2600, null) : Promise.resolve(null),
  ]);
  const ads = settledValue<DisplayAd[]>(adsResult, []);
  const liveItems = settledValue<MarketItem[]>(liveItemsResult, []);
  const snapshot = settledValue<Awaited<ReturnType<typeof getPortfolioSnapshot>> | null>(snapshotResult, null);
  const [chartPeriodsResult, rankingPeriodsResult] = await Promise.allSettled([
    user && snapshot ? withTimeout(getPortfolioPerformancePeriods(user.id, snapshot.totalValueUsd), 2600, []) : Promise.resolve([]),
    user ? withTimeout(getUserRankingPeriods(user.id), 2600, []) : Promise.resolve([]),
  ]);
  const chartPeriods = settledValue<PortfolioPerformancePeriod[]>(chartPeriodsResult, []);
  const rankingPeriods = settledValue<UserRankingPeriod[]>(rankingPeriodsResult, []);
  const breakdownItems = snapshot ? getPortfolioBreakdownItems(snapshot) : [];

  return (
    <div className="grid gap-6">
      <AdBanner ads={ads} />
      <section className="hero-visual p-6 text-white sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">Sanal portföy yarışması</p>
        <h1 className="relative mt-3 text-4xl font-black tracking-normal sm:text-6xl">enbilir.com</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Gerçek para ile işlem yaptırmayan, eğitim ve finansal okuryazarlık amaçlı yarışma platformu.
        </p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <Link href={`/${locale}/islem-yap`} className="premium-cta px-5 py-3 text-sm font-black">İşlem yap</Link>
          <Link href={`/${locale}/ligler`} className="premium-link rounded-md px-5 py-3 text-sm font-black">Ligleri gör</Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[260px_1fr_1fr_1fr]">
        <div className="grid gap-4">
          <PremiumCard interactive className="p-4">
            <h2 className="text-lg font-black text-[#152033]">Portföyüm</h2>
            <p className="mt-3 text-2xl font-black text-[#0f766e]">{snapshot ? formatMoney(snapshot.totalValueUsd) : "-"}</p>
            <p className="mt-1 text-sm text-slate-500">Giriş yapan kullanıcı için anlık sanal değer.</p>
            {snapshot ? (
              <>
                <div className="mt-4">
                  <PortfolioDonut
                    total={snapshot.totalValueUsd}
                    size="sm"
                    animated
                    items={[
                      { label: "Nakit", value: snapshot.cashValueUsd },
                      ...snapshot.positions.map((position) => ({ label: position.symbol, value: position.valueUsd })),
                    ]}
                  />
                </div>
                <div className="mt-4">
                  <PortfolioBreakdown items={breakdownItems} compact />
                </div>
                <PerformanceBadges periods={chartPeriods} />
              </>
            ) : (
              <p className="mt-4 rounded-md bg-[#f8fafc] p-3 text-xs leading-5 text-slate-500">Kar/zarar yüzdeleri için giriş yapmalısın.</p>
            )}
          </PremiumCard>
          <MarketList title="En hızlı yükselen 10" items={getTopRisersFrom(liveItems)} />
          <MarketList title="En hızlı düşen 10" items={getTopFallersFrom(liveItems)} />
        </div>

        <PremiumCard interactive className="p-5">
          <h2 className="text-lg font-black text-[#152033]">Portföy değişimi</h2>
          <div className="mt-4 grid gap-4">
            {chartPeriods.length === 0 ? <p className="text-sm text-slate-500">Grafikler için giriş yapmalısın.</p> : chartPeriods.map((period) => (
              <div key={period.label} className="rounded-md bg-[#f8fafc] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-black text-[#152033]">{period.label}</p>
                  <div className="text-right">
                    <p className={period.change === null ? "font-black text-slate-500" : period.change >= 0 ? "font-black text-[#0f766e]" : "font-black text-red-600"}>
                      {period.change === null ? "-" : formatPercent(period.change)}
                    </p>
                    {period.source === "modeled" ? <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">geçici model</p> : null}
                  </div>
                </div>
                <MiniLineChart points={period.points} />
              </div>
            ))}
          </div>
        </PremiumCard>

        <PremiumCard interactive className="p-5">
          <h2 className="text-lg font-black text-[#152033]">Sıralamalar</h2>
          <div className="mt-4 grid gap-3">
            {rankingPeriods.length === 0 ? <p className="text-sm text-slate-500">Sıralama için giriş yapmalısın.</p> : rankingPeriods.map((period) => (
              <div key={period.label} className="rounded-md bg-[#f8fafc] p-4">
                <p className="font-black text-[#152033]">{period.label}</p>
                <p className="mt-1 text-sm text-slate-600">Genel: {period.overall}/{period.totalUsers}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Arkadaşlar: {period.hasFriends && period.friends ? `${period.friends}/${period.totalFriendsScope}` : "Henüz arkadaş eklemediniz"}
                </p>
              </div>
            ))}
          </div>
        </PremiumCard>

        <div className="grid gap-5">
          <NewsList title="Güncel haberler" items={marketNews} />
          <NewsList title="Rotary haberleri" items={rotaryNews} />
        </div>
      </section>
    </div>
  );
}

function PerformanceBadges({ periods }: { periods: PortfolioPerformancePeriod[] }) {
  if (periods.length === 0) {
    return <p className="mt-4 rounded-md bg-[#f8fafc] p-3 text-xs leading-5 text-slate-500">Henüz yeterli veri yok.</p>;
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
            <span className="block text-[10px] uppercase tracking-[0.12em] opacity-70">{period.label}</span>
            <span>{period.change === null ? "Yeterli veri yok" : formatPercent(period.change, true)}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatPercent(value: number, signed = false) {
  const absValue = Math.abs(value);
  const decimals = absValue > 0 && absValue < 1 ? 4 : 2;
  const prefix = signed && value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(decimals)}%`;
}

function MarketList({ title, items }: { title: string; items: { symbol: string; name: string; changePercent: number }[] }) {
  return (
    <PremiumCard interactive className="p-4">
      <h2 className="text-sm font-black uppercase tracking-[0.14em] text-[#152033]">{title}</h2>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.symbol} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-bold text-slate-700">{item.symbol}</span>
            <span className={item.changePercent >= 0 ? "font-black text-[#0f766e]" : "font-black text-red-600"}>{item.changePercent.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}

function NewsList({ title, items }: { title: string; items: string[] }) {
  return (
    <PremiumCard interactive className="p-5">
      <h2 className="text-lg font-black text-[#152033]">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => <p key={item} className="text-sm leading-6 text-slate-600">{item}</p>)}
      </div>
    </PremiumCard>
  );
}
