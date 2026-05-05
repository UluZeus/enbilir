import Link from "next/link";
import { AdBanner } from "@/components/AdBanner";
import { MiniLineChart } from "@/components/MiniLineChart";
import { PremiumCard } from "@/components/PremiumCard";
import { getSafeLocale } from "@/i18n/config";
import { getAds } from "@/lib/ads";
import { getSessionUser } from "@/lib/auth";
import { getLiveMarketItems, getTopFallersFrom, getTopRisersFrom } from "@/lib/live-market";
import { getPortfolioChartPeriods, getUserRankingPeriods } from "@/lib/leaderboard";
import { marketNews, rotaryNews } from "@/lib/market-data";
import { formatMoney, getPortfolioSnapshot } from "@/lib/portfolio";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const user = await getSessionUser();
  const [ads, liveItems] = await Promise.all([getAds("home_top"), getLiveMarketItems()]);
  const snapshot = user ? await getPortfolioSnapshot(user.id) : null;
  const chartPeriods = snapshot ? getPortfolioChartPeriods(snapshot.totalValueUsd) : [];
  const rankingPeriods = user ? await getUserRankingPeriods(user.id) : [];

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
          </PremiumCard>
          <MarketList title="En hızlı yükselen 10" items={getTopRisersFrom(liveItems)} />
          <MarketList title="En hızlı düşen 10" items={getTopFallersFrom(liveItems)} />
        </div>

        <PremiumCard interactive className="p-5">
          <h2 className="text-lg font-black text-[#152033]">Portföy değişimi</h2>
          <div className="mt-4 grid gap-4">
            {chartPeriods.length === 0 ? <p className="text-sm text-slate-500">Grafikler için giriş yapmalısın.</p> : chartPeriods.map((period) => (
              <div key={period.label} className="rounded-md bg-[#f8fafc] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-black text-[#152033]">{period.label}</p>
                  <p className={period.change >= 0 ? "font-black text-[#0f766e]" : "font-black text-red-600"}>{period.change.toFixed(2)}%</p>
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
