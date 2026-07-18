import Link from "next/link";
import { randomUUID } from "crypto";
import type { Metadata } from "next";
import { AdBanner } from "@/components/AdBanner";
import { FormMessage } from "@/components/FormMessage";
import { PortfolioDonut } from "@/components/PortfolioDonut";
import { PortfolioPerformanceDashboard, type PortfolioPerformancePosition } from "@/components/portfolio/PortfolioPerformanceDashboard";
import { LiveMarketOverview } from "@/components/market/LiveMarketOverview";
import { SiteMotion } from "@/components/SiteMotion";
import { TradeTicketForm } from "@/components/TradeTicketForm";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getAds } from "@/lib/ads";
import { tradeAction, updateCashModeAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { getFallbackMarketItems, getLiveMarketItems } from "@/lib/live-market";
import { formatMoney, getPortfolioSnapshot } from "@/lib/portfolio";
import { getPortfolioPerformancePeriods } from "@/lib/portfolio-history";
import { buildPageMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { getTradeAnalysisTarget } from "@/lib/trade-watch";
import type { DisplayAd } from "@/lib/ads";
import { localizeMarketText, type MarketItem } from "@/lib/market-data";

type PortfolioSnapshot = Awaited<ReturnType<typeof getPortfolioSnapshot>>;
type TradeCategory = MarketItem["category"] | "ALL";

const tradeCategories: TradeCategory[] = [
  "ALL",
  "BIST",
  "NASDAQ",
  "DOW",
  "FX",
  "CRYPTO",
  "COMMODITY",
  "TR_BOND",
  "US_BOND",
  "EUROBOND",
  "INDEX",
];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return {
    ...buildPageMetadata({ locale, path: "/islem-yap", page: "trade" }),
    robots: { index: false, follow: false },
  };
}

function getInitialTradeCategory(value: string | undefined): TradeCategory {
  return tradeCategories.includes(value as TradeCategory) ? value as TradeCategory : "ALL";
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T) {
  return result.status === "fulfilled" ? result.value : fallback;
}

export default async function TradePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; success?: string; category?: string; symbol?: string; q?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const initialCategory = getInitialTradeCategory(query.category);
  const initialSymbol = typeof query.symbol === "string" && query.symbol.trim() ? query.symbol.trim().toUpperCase() : undefined;
  const initialSearch = typeof query.q === "string" ? query.q : "";
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale);
  const user = await getSessionUser();

  if (!user) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-2xl font-black">{copy.common.loginRequiredTitle}</h1>
        <p className="mt-2 text-sm">{copy.trade.loginBody}</p>
        <Link href={`/${locale}/giris`} className="premium-cta mt-5 inline-flex px-4 py-2 text-sm font-bold">{copy.common.signIn}</Link>
      </section>
    );
  }

  const fallbackMarketItems = getFallbackMarketItems();
  const liveMarketItems = await getLiveMarketItems();
  const [topAdsResult, sideAdsResult, bottomAdsResult, snapshotResult, tradeCountResult] = await Promise.allSettled([
    getAds("trade_top", locale),
    getAds("trade_right", locale),
    getAds("trade_bottom", locale),
    getPortfolioSnapshot(user.id, liveMarketItems),
    prisma.virtualTrade.count({ where: { userId: user.id } }),
  ]);
  const topAds = settledValue<DisplayAd[]>(topAdsResult, []);
  const sideAds = settledValue<DisplayAd[]>(sideAdsResult, []);
  const bottomAds = settledValue<DisplayAd[]>(bottomAdsResult, []);
  const marketItems: MarketItem[] = Array.isArray(liveMarketItems) ? liveMarketItems : fallbackMarketItems;
  const snapshot = settledValue<PortfolioSnapshot | null>(snapshotResult, null);
  const tradeCount = settledValue<number>(tradeCountResult, 0);
  const dataError = snapshotResult.status === "rejected"
    ? copy.trade.dataError
    : undefined;
  const portfolioPeriods = snapshot
    ? await getPortfolioPerformancePeriods(user.id, snapshot.totalValueUsd)
    : [];
  const performancePositions: PortfolioPerformancePosition[] = snapshot
    ? snapshot.positions
        .filter((position) => position.valueUsd > 0)
        .sort((left, right) => right.valueUsd - left.valueUsd)
        .map((position) => {
          const marketItem = marketItems.find((item) => item.symbol.toUpperCase() === position.symbol.toUpperCase());
          const target = marketItem ? getTradeAnalysisTarget(marketItem) : null;

          return {
            symbol: position.symbol,
            name: localizeMarketText(position.name, locale),
            performanceSymbol: target?.symbol,
            exchange: target?.exchange,
            currentValueUsd: position.valueUsd,
            currentProfitLossUsd: position.profitLossUsd,
            currentProfitLossPercent: position.competitionCostUsd > 0
              ? (position.profitLossUsd / position.competitionCostUsd) * 100
              : null,
          };
        })
    : [];

  return (
    <div className="grid gap-6 overflow-x-hidden">
      <FormMessage message={query.error} />
      <FormMessage message={query.success} tone="success" />
      <FormMessage message={dataError} tone="info" />
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#101827] px-4 py-3 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f5c96b]">
            {locale === "tr" ? "Sanal işlem laboratuvarı" : "Virtual trading lab"}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-200">
            {locale === "tr" ? "Gerçek para kullanılmaz; her karar öğrenme günlüğüne kaydedilir." : "No real money is used; every decision is saved to your learning journal."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5">1.000.000 USD {locale === "tr" ? "performans bazı" : "performance base"}</span>
          <span className="rounded-full border border-[#f5c96b]/35 bg-[#f5c96b]/10 px-3 py-1.5 text-[#f9dfaa]">1.100.000 USD {locale === "tr" ? "işlem gücü" : "trading power"}</span>
        </div>
      </section>
      {tradeCount === 0 ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <p className="text-xs font-black uppercase text-emerald-800">{locale === "tr" ? "İlk sanal işlem" : "First virtual trade"}</p>
          <h1 className="mt-1 text-lg font-black">{locale === "tr" ? "Küçük başla, gerekçeni yaz, sonucu izle" : "Start small, write your reason, and observe the result"}</h1>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <p><strong>1.</strong> {locale === "tr" ? "Bir varlık seç." : "Choose one asset."}</p>
            <p><strong>2.</strong> {locale === "tr" ? "Küçük bir tutar gir." : "Enter a small amount."}</p>
            <p><strong>3.</strong> {locale === "tr" ? "Karar nedenini not et." : "Note why you decided."}</p>
          </div>
        </section>
      ) : null}
      {snapshot ? (
        <PortfolioPerformanceDashboard
          locale={locale}
          totalValueUsd={snapshot.totalValueUsd}
          totalPeriods={portfolioPeriods}
          positions={performancePositions}
          variant="detailed"
        />
      ) : null}
      <div className="hidden md:block">
        <AdBanner ads={topAds} locale={locale} />
      </div>
      <section className="grid min-w-0 gap-4 md:gap-6 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
        <aside className="order-1 grid min-w-0 content-start gap-5 self-start xl:sticky xl:top-24 xl:col-start-1 xl:row-start-1">
          <TradePortfolioPanel snapshot={snapshot} copy={copy.trade} locale={locale} />
        </aside>

        <div className="order-2 grid min-w-0 gap-4 md:gap-5 xl:col-start-2 xl:row-span-3 xl:row-start-1">
          <div className="trade-ticket-panel premium-card rounded-2xl p-4 shadow-sm md:p-6">
            <div className="site-page-hero-grid site-page-hero-grid--compact gap-3 md:gap-5">
              <div>
                <h1 className="text-xl font-black text-[#152033] md:text-2xl">{copy.trade.title}</h1>
                <p className="mt-1 hidden text-sm leading-6 text-slate-600 md:mt-2 md:block">{copy.trade.description}</p>
              </div>
              <div className="site-page-hero-motion hidden md:block">
                <SiteMotion variant="bars" />
              </div>
            </div>
            <TradeTicketForm
              key={`${initialCategory}:${initialSymbol ?? ""}:${initialSearch}`}
              locale={locale}
              userId={user.id}
              marketItems={marketItems}
              idempotencyKey={randomUUID()}
              action={tradeAction}
              initialCategory={initialCategory}
              initialSymbol={initialSymbol}
              initialSearch={initialSearch}
            />
          </div>

          <div className="trade-cash-panel premium-card rounded-2xl p-4 shadow-sm md:p-6">
            <h2 className="text-lg font-black text-[#152033] md:text-xl">{copy.trade.cashPreference}</h2>
            <form action={updateCashModeAction} className="mt-3 flex flex-wrap gap-2 md:mt-4 md:gap-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="userId" value={user.id} />
              {["USD", "EUR", "CHF", "TRY_REPO"].map((mode) => {
                const isActive = snapshot?.account.cashMode === mode;

                return (
                <button
                  key={mode}
                  name="cashMode"
                  value={mode}
                  aria-pressed={isActive}
                  className={`rounded-md border px-3 py-2 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] md:px-4 md:text-sm ${
                    isActive
                      ? "border-[#0f766e] bg-[#0f766e] text-white shadow-sm"
                      : "border-slate-300 bg-white/70 text-slate-700 hover:border-[#0f766e] hover:shadow-md"
                  }`}
                >
                  {mode}
                </button>
                );
              })}
            </form>
          </div>
          <AdBanner ads={bottomAds} locale={locale} variant="bottom" />
        </div>

        <aside className="order-3 grid min-w-0 content-start gap-5 self-start xl:col-start-1 xl:row-start-2">
          <LiveMarketOverview locale={locale} initialItems={marketItems} title={copy.trade.title} variant="sidebar" />
        </aside>

        <aside className="order-4 grid min-w-0 content-start gap-5 self-start xl:col-start-1 xl:row-start-3">
          <AdBanner ads={sideAds} locale={locale} variant="side" />
        </aside>
      </section>
      <div className="md:hidden">
        <AdBanner ads={topAds} locale={locale} variant="bottom" />
      </div>

    </div>
  );
}

function formatPercent(value: number) {
  const absValue = Math.abs(value);
  const decimals = absValue > 0 && absValue < 1 ? 4 : 2;

  return `${value.toFixed(decimals)}%`;
}

function formatSignedPercent(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${value >= 0 ? "+" : ""}${formatPercent(value)}`;
}

function getProfitLossColor(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "#64748b";
  }

  return value >= 0 ? "#064e3b" : "#991b1b";
}

function getProfitLossToneClass(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "portfolio-neutral-text";
  }

  return value >= 0 ? "portfolio-profit-text" : "portfolio-loss-text";
}

function getTradePortfolioText(isEnglish: boolean) {
  return {
    formulaTitle: isEnglish ? "Portfolio calculation" : "Portföy hesaplaması",
    performanceBase: isEnglish ? "P/L base" : "K/Z bazı",
    cash: isEnglish ? "Cash" : "Nakit",
    positions: isEnglish ? "Positions" : "Pozisyonlar",
    positionCount: isEnglish ? "Position count" : "Pozisyon adedi",
    total: isEnglish ? "Total" : "Toplam",
    dataNote: isEnglish
      ? "Position prices use live market data when available; otherwise the last safe source or average cost protects the calculation from empty prices."
      : "Pozisyon fiyatları canlı veri varsa canlı veriden; yoksa son güvenli kaynak veya ortalama maliyet üzerinden hesaplanır. Boş fiyatla portföy şişirilmez.",
    empty: isEnglish
      ? "Your portfolio does not have an investment product yet. Asset-level profit/loss will appear here after your first buy."
      : "Portföyünde henüz yatırım ürünü yok. İlk alımından sonra varlık bazlı kar/zarar burada görünecek.",
    currentValue: isEnglish ? "Current value" : "Güncel değer",
    profitLoss: isEnglish ? "Profit / Loss" : "Kar / Zarar",
    profitLossPercent: isEnglish ? "P/L %" : "K/Z %",
    allocation: isEnglish ? "Weight" : "Ağırlık",
    price: isEnglish ? "Price" : "Fiyat",
    source: isEnglish ? "Source" : "Kaynak",
  };
}

function getPositionDataStatusLabel(status: string, isEnglish: boolean) {
  if (status === "live") {
    return isEnglish ? "Live price" : "Canlı fiyat";
  }

  if (status === "close") {
    return isEnglish ? "Last close" : "Son kapanış";
  }

  if (status === "delayed") {
    return isEnglish ? "Delayed data" : "Gecikmeli veri";
  }

  if (status === "representative") {
    return isEnglish ? "Representative" : "Temsili";
  }

  if (status === "average-cost") {
    return isEnglish ? "Average cost" : "Ortalama maliyet";
  }

  return isEnglish ? "Checked" : "Kontrollü";
}

function getPositionSourceLabel(source: string, isEnglish: boolean) {
  if (source === "yahoo") {
    return isEnglish ? "Yahoo Finance" : "Yahoo Finance";
  }

  if (source === "binance") {
    return isEnglish ? "Binance" : "Binance";
  }

  if (source === "representative") {
    return isEnglish ? "Representative feed" : "Temsili veri";
  }

  if (source === "average-cost") {
    return isEnglish ? "Average cost fallback" : "Ortalama maliyet yedeği";
  }

  return isEnglish ? "Fallback feed" : "Yedek veri";
}

function TradePortfolioPanel({ snapshot, copy, locale }: { snapshot: PortfolioSnapshot | null; copy: ReturnType<typeof getUiCopy>["trade"]; locale: string }) {
  const isEnglish = locale === "en";
  const panelText = getTradePortfolioText(isEnglish);

  if (!snapshot) {
    return (
      <div className="trade-portfolio-panel premium-card p-4 shadow-sm md:p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{copy.totalPortfolio}</p>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {copy.portfolioUnavailable}
        </div>
      </div>
    );
  }

  const positions = [...snapshot.positions].sort((a, b) => b.valueUsd - a.valueUsd);

  return (
    <div className="trade-portfolio-panel premium-card p-4 shadow-sm md:p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{copy.totalPortfolio}</p>
      <p className="mt-2 text-2xl font-black text-[#0f766e] md:text-3xl">{formatMoney(snapshot.totalValueUsd)}</p>
      <p className={`mt-1 text-sm font-black ${getProfitLossToneClass(snapshot.profitLossUsd)}`} style={{ color: getProfitLossColor(snapshot.profitLossUsd) }}>
        {snapshot.profitLossUsd >= 0 ? "+" : ""}
        {formatMoney(snapshot.profitLossUsd)} ({formatSignedPercent(snapshot.profitLossPercent)})
      </p>

      <div className="mt-4 grid gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-sm md:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-slate-600">{panelText.cash}</span>
          <span className="font-black text-[#152033]">{formatMoney(snapshot.cashValueUsd)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-slate-600">{panelText.positions}</span>
          <span className="font-black text-[#152033]">{positions.length}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-emerald-100 pt-2">
          <span className="font-black text-[#0f766e]">{panelText.total}</span>
          <span className="font-black text-[#0f766e]">{formatMoney(snapshot.totalValueUsd)}</span>
        </div>
      </div>

      <div className="mt-4 hidden md:mt-5 md:block">
        <PortfolioDonut
          total={snapshot.totalValueUsd}
          animated
          labels={{
            allocation: copy.cash === "Cash" ? "Weight" : "Ağırlık",
            profitLoss: copy.cash === "Cash" ? "P/L" : "K/Z",
          }}
          otherLabel={isEnglish ? "Other" : "Diğer"}
          items={[
            { label: copy.cash, detail: snapshot.cashCurrency, value: snapshot.cashValueUsd, profitLossPercent: null },
            ...positions.map((position) => {
              const costUsd = position.competitionCostUsd;

              return {
                label: position.symbol,
                detail: localizeMarketText(position.name, locale),
                value: position.valueUsd,
                profitLossPercent: costUsd > 0 ? (position.profitLossUsd / costUsd) * 100 : null,
              };
            }),
          ]}
        />
      </div>

      <div className="mt-4 hidden rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 md:mt-5 md:block md:p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">{panelText.formulaTitle}</p>
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-600">{panelText.performanceBase}</span>
            <span className="font-black text-[#152033]">{formatMoney(snapshot.initialCapitalUsd)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-600">{panelText.cash}</span>
            <span className="font-black text-[#152033]">{formatMoney(snapshot.cashValueUsd)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-600">{panelText.positions}</span>
            <span className="font-black text-[#152033]">{formatMoney(snapshot.positionsValueUsd)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-600">{panelText.positionCount}</span>
            <span className="font-black text-[#152033]">{positions.length}</span>
          </div>
          <div className="border-t border-emerald-100 pt-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-black text-[#0f766e]">{panelText.total}</span>
              <span className="font-black text-[#0f766e]">{formatMoney(snapshot.totalValueUsd)}</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-600">{panelText.dataNote}</p>
      </div>

      <div className="mt-4 hidden rounded-xl border border-slate-200 bg-slate-50 p-3 md:mt-5 md:block">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-slate-600">{copy.remainingCash}</span>
          <span className="font-black text-[#152033]">{formatMoney(snapshot.cashValueUsd)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
          <span>{snapshot.cashCurrency}</span>
          <span>{formatPercent(snapshot.totalValueUsd > 0 ? (snapshot.cashValueUsd / snapshot.totalValueUsd) * 100 : 0)}</span>
        </div>
      </div>

      <div className="mt-4 hidden max-h-[360px] gap-2 overflow-auto pr-1 md:grid md:max-h-[560px] md:gap-3">
        {positions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500">
            {panelText.empty}
          </p>
        ) : positions.map((position) => {
          const allocationPercent = snapshot.totalValueUsd > 0 ? (position.valueUsd / snapshot.totalValueUsd) * 100 : 0;
          const profitLossPercent = position.competitionCostUsd > 0 ? (position.profitLossUsd / position.competitionCostUsd) * 100 : null;
          const profitColor = getProfitLossColor(position.profitLossUsd);

          return (
            <div key={position.symbol} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm md:p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#152033]">{position.symbol}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{localizeMarketText(position.name, locale)}</p>
                  <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                    {getPositionDataStatusLabel(position.dataStatus, isEnglish)}
                  </span>
                  <span className="ml-1 mt-1 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-700">
                    {getPositionSourceLabel(position.priceSource, isEnglish)}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-black ${getProfitLossToneClass(profitLossPercent)}`} style={{ color: getProfitLossColor(profitLossPercent) }}>{formatSignedPercent(profitLossPercent)}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{panelText.profitLossPercent}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-bold text-slate-500">{panelText.currentValue}</p>
                  <p className="font-black text-[#152033]">{formatMoney(position.valueUsd)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-500">{panelText.profitLoss}</p>
                  <p className={`font-black ${getProfitLossToneClass(position.profitLossUsd)}`} style={{ color: profitColor }}>
                    {position.profitLossUsd >= 0 ? "+" : ""}
                    {formatMoney(position.profitLossUsd)}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500">
                <span>{panelText.price}</span>
                <span>{formatMoney(position.currentPriceUsd)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 px-2 text-[11px] font-bold text-slate-500">
                <span>{panelText.source}</span>
                <span>{getPositionSourceLabel(position.priceSource, isEnglish)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 px-2 text-[11px] font-bold text-slate-500">
                <span>{panelText.allocation}</span>
                <span>{formatPercent(allocationPercent)}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${Math.min(100, Math.max(0, allocationPercent))}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
