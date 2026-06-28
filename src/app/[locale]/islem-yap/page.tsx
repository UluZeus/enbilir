import Link from "next/link";
import { randomUUID } from "crypto";
import type { Metadata } from "next";
import { AdBanner } from "@/components/AdBanner";
import { FormMessage } from "@/components/FormMessage";
import { PortfolioDonut } from "@/components/PortfolioDonut";
import { LiveMarketOverview } from "@/components/market/LiveMarketOverview";
import { TradeTicketForm } from "@/components/TradeTicketForm";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getAds } from "@/lib/ads";
import { tradeAction, updateCashModeAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { getFallbackMarketItems, getLiveMarketItems } from "@/lib/live-market";
import { formatMoney, getPortfolioSnapshot } from "@/lib/portfolio";
import { buildPageMetadata } from "@/lib/seo";
import type { DisplayAd } from "@/lib/ads";
import type { MarketItem } from "@/lib/market-data";

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
  return buildPageMetadata({ locale, path: "/islem-yap", page: "trade" });
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
  const [topAdsResult, sideAdsResult, bottomAdsResult, snapshotResult] = await Promise.allSettled([
    getAds("trade_top", locale),
    getAds("trade_right", locale),
    getAds("trade_bottom", locale),
    getPortfolioSnapshot(user.id, liveMarketItems),
  ]);
  const topAds = settledValue<DisplayAd[]>(topAdsResult, []);
  const sideAds = settledValue<DisplayAd[]>(sideAdsResult, []);
  const bottomAds = settledValue<DisplayAd[]>(bottomAdsResult, []);
  const marketItems: MarketItem[] = Array.isArray(liveMarketItems) ? liveMarketItems : fallbackMarketItems;
  const snapshot = settledValue<PortfolioSnapshot | null>(snapshotResult, null);
  const dataError = snapshotResult.status === "rejected"
    ? copy.trade.dataError
    : undefined;

  return (
    <div className="grid gap-6 overflow-x-hidden">
      <FormMessage message={query.error} />
      <FormMessage message={query.success} tone="success" />
      <FormMessage message={dataError} tone="info" />
      <AdBanner ads={topAds} locale={locale} />
      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]">
        <aside className="grid min-w-0 content-start gap-5 self-start">
          <TradePortfolioPanel snapshot={snapshot} copy={copy.trade} locale={locale} />
          <LiveMarketOverview locale={locale} initialItems={marketItems} title={copy.trade.title} variant="sidebar" />
          <AdBanner ads={sideAds} locale={locale} variant="side" />
        </aside>

        <div className="grid min-w-0 gap-5">
          <div className="trade-ticket-panel premium-card rounded-2xl p-6 shadow-sm">
            <h1 className="text-2xl font-black text-[#152033]">{copy.trade.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy.trade.description}</p>
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

          <div className="trade-cash-panel premium-card rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-black text-[#152033]">{copy.trade.cashPreference}</h2>
            <form action={updateCashModeAction} className="mt-4 flex flex-wrap gap-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="userId" value={user.id} />
              {["USD", "EUR", "CHF", "TRY_REPO"].map((mode) => (
                <button key={mode} name="cashMode" value={mode} className="rounded-md border border-slate-300 bg-white/70 px-4 py-2 text-sm font-black text-slate-700 hover:border-[#0f766e] hover:shadow-md">{mode}</button>
              ))}
            </form>
          </div>
          <AdBanner ads={bottomAds} locale={locale} variant="bottom" />
        </div>
      </section>

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

function getTradePortfolioText(isEnglish: boolean) {
  return {
    formulaTitle: isEnglish ? "Portfolio calculation" : "Portföy hesaplaması",
    performanceBase: isEnglish ? "P/L base" : "K/Z bazı",
    tradingPower: isEnglish ? "Trading power" : "İşlem gücü",
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
      <div className="trade-portfolio-panel premium-card p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{copy.totalPortfolio}</p>
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {copy.portfolioUnavailable}
        </div>
      </div>
    );
  }

  const positions = [...snapshot.positions].sort((a, b) => b.valueUsd - a.valueUsd);

  return (
    <div className="trade-portfolio-panel premium-card p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{copy.totalPortfolio}</p>
      <p className="mt-2 text-3xl font-black text-[#0f766e]">{formatMoney(snapshot.totalValueUsd)}</p>
      <p className={`mt-1 text-sm font-black ${snapshot.profitLossUsd >= 0 ? "text-emerald-700" : "text-red-600"}`}>
        {snapshot.profitLossUsd >= 0 ? "+" : ""}
        {formatMoney(snapshot.profitLossUsd)} ({formatSignedPercent(snapshot.profitLossPercent)})
      </p>

      <div className="mt-5">
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
                detail: position.name,
                value: position.valueUsd,
                profitLossPercent: costUsd > 0 ? (position.profitLossUsd / costUsd) * 100 : null,
              };
            }),
          ]}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">{panelText.formulaTitle}</p>
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-600">{panelText.performanceBase}</span>
            <span className="font-black text-[#152033]">{formatMoney(snapshot.initialCapitalUsd)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-slate-600">{panelText.tradingPower}</span>
            <span className="font-black text-[#152033]">{formatMoney(snapshot.totalTradingPowerUsd)}</span>
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

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-slate-600">{copy.remainingCash}</span>
          <span className="font-black text-[#152033]">{formatMoney(snapshot.cashValueUsd)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
          <span>{snapshot.cashCurrency}</span>
          <span>{formatPercent(snapshot.totalValueUsd > 0 ? (snapshot.cashValueUsd / snapshot.totalValueUsd) * 100 : 0)}</span>
        </div>
      </div>

      <div className="mt-4 grid max-h-[560px] gap-3 overflow-auto pr-1">
        {positions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500">
            {panelText.empty}
          </p>
        ) : positions.map((position) => {
          const allocationPercent = snapshot.totalValueUsd > 0 ? (position.valueUsd / snapshot.totalValueUsd) * 100 : 0;
          const profitLossPercent = position.competitionCostUsd > 0 ? (position.profitLossUsd / position.competitionCostUsd) * 100 : null;
          const profitTone = position.profitLossUsd >= 0 ? "text-emerald-700" : "text-red-600";

          return (
            <div key={position.symbol} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#152033]">{position.symbol}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{position.name}</p>
                  <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                    {getPositionDataStatusLabel(position.dataStatus, isEnglish)}
                  </span>
                  <span className="ml-1 mt-1 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-700">
                    {getPositionSourceLabel(position.priceSource, isEnglish)}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-black ${profitTone}`}>{formatSignedPercent(profitLossPercent)}</p>
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
                  <p className={`font-black ${profitTone}`}>
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
