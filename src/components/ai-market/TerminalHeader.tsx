"use client";

import Link from "next/link";
import { getSafeLocale, type Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import type { AssetPerformance } from "@/lib/ai-market/asset-performance";
import type { MarketAnalysis, MarketExchange } from "@/lib/ai-market/types";

type TerminalHeaderProps = {
  locale: Locale | string;
  selectedSymbol: string;
  focusSymbols: string[];
  interval: string;
  exchange: MarketExchange;
  isCryptoSelected: boolean;
  favoritesCount: number;
  analysis: MarketAnalysis | null;
  performance: AssetPerformance | null;
  onSymbolChange: (symbol: string) => void;
  onIntervalChange: (interval: string) => void;
  onExchangeChange: (exchange: MarketExchange) => void;
  getAssetLabel: (symbol: string) => string;
};

function getIntervals(locale: Locale) {
  return locale === "en"
    ? [
        { value: "1m", label: "1 min" },
        { value: "5m", label: "5 min" },
        { value: "15m", label: "15 min" },
        { value: "1h", label: "1 hour" },
        { value: "4h", label: "4 hours" },
        { value: "1d", label: "1 day" },
      ]
    : [
        { value: "1m", label: "1 dk" },
        { value: "5m", label: "5 dk" },
        { value: "15m", label: "15 dk" },
        { value: "1h", label: "1 saat" },
        { value: "4h", label: "4 saat" },
        { value: "1d", label: "1 gün" },
      ];
}

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  if (value >= 1000) {
    return value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  }

  if (value >= 1) {
    return value.toLocaleString("tr-TR", { maximumFractionDigits: 4 });
  }

  return value.toLocaleString("tr-TR", { maximumSignificantDigits: 5 });
}

function formatPerformancePercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value >= 0 ? "+" : ""}${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatVolume(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function getTrendLabel(analysis: MarketAnalysis | null, copy: ReturnType<typeof getUiCopy>["ai"]) {
  if (!analysis || analysis.lastPrice === null || analysis.indicators.ema20 === null || analysis.indicators.ema50 === null) {
    return copy.neutral;
  }

  if (analysis.lastPrice > analysis.indicators.ema20 && analysis.indicators.ema20 >= analysis.indicators.ema50) {
    return copy.up;
  }

  if (analysis.lastPrice < analysis.indicators.ema20 && analysis.indicators.ema20 <= analysis.indicators.ema50) {
    return copy.down;
  }

  return copy.sideways;
}

function getVolatility(analysis: MarketAnalysis | null) {
  if (!analysis || analysis.lastPrice === null || analysis.lastPrice <= 0 || analysis.indicators.atr === null) {
    return "-";
  }

  return `%${((analysis.indicators.atr / analysis.lastPrice) * 100).toFixed(2)}`;
}

function getSignalLabel(analysis: MarketAnalysis | null, copy: ReturnType<typeof getUiCopy>["ai"]) {
  if (!analysis) {
    return copy.waiting;
  }

  const signal = analysis.signal.signal.toUpperCase();

  if (signal.includes("BUY")) {
    return analysis.signal.confidence >= 80 ? copy.strongBuy : copy.buyWatch;
  }

  if (signal.includes("SELL")) {
    return analysis.signal.confidence >= 80 ? copy.strongSell : copy.sellWatch;
  }

  if (signal.includes("HOLD") || signal.includes("NEUTRAL")) {
    return copy.hold;
  }

  return copy.neutral;
}

export function TerminalHeader({
  locale,
  selectedSymbol,
  focusSymbols,
  interval,
  exchange,
  isCryptoSelected,
  favoritesCount,
  analysis,
  performance,
  onSymbolChange,
  onIntervalChange,
  onExchangeChange,
  getAssetLabel,
}: TerminalHeaderProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale).ai;
  const intervals = getIntervals(safeLocale);
  const signalText = getSignalLabel(analysis, copy);
  const currentPrice = performance?.price ?? analysis?.lastPrice ?? null;
  const tradeHref = `/${safeLocale}/islem-yap?symbol=${encodeURIComponent(selectedSymbol)}&q=${encodeURIComponent(selectedSymbol)}`;

  return (
    <section className="terminal-header-panel rounded-md border border-slate-800 bg-[#0b111d] shadow-2xl">
      <div className="grid gap-3 border-b border-slate-800 p-4 xl:grid-cols-[minmax(320px,1fr)_minmax(520px,1.4fr)_auto] xl:items-end">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">{copy.terminal}</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <p className="text-3xl font-black tracking-normal text-white md:text-4xl">{selectedSymbol}</p>
          </div>
          <p className="mt-1 text-2xl font-black tabular-nums text-white">{currentPrice === null ? "—" : `$${formatPrice(currentPrice)}`}</p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
            <PerformanceChip label="1s" value={performance?.changes["1h"] ?? null} />
            <PerformanceChip label="1g" value={performance?.changes["1d"] ?? null} />
            <PerformanceChip label="1a" value={performance?.changes["1m"] ?? null} />
            <PerformanceChip label="1y" value={performance?.changes["1y"] ?? null} />
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-stone-200">{analysis?.name ?? getAssetLabel(selectedSymbol)}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Metric label={copy.lastPrice} value={formatPrice(currentPrice)} strong />
          <Metric label={copy.volume24h} value={formatVolume(analysis?.volume ?? null)} />
          <Metric label={copy.volatility} value={getVolatility(analysis)} />
          <Metric label={copy.trend} value={getTrendLabel(analysis, copy)} />
          <Metric label={copy.aiSignal} value={signalText} />
          <Metric
            label={copy.confidence}
            value={analysis ? `%${analysis.signal.confidence}` : "-"}
            tooltip={safeLocale === "tr" ? "Güven metriği, sinyalin teknik verilerle ne kadar uyumlu göründüğünü gösterir." : "Confidence shows how strongly the technical inputs support the current signal."}
          />
        </div>

        <div className="grid gap-2">
          <Link
            href={tradeHref}
            className="rounded-md border border-emerald-300/45 bg-emerald-300/14 px-4 py-2 text-center text-sm font-black text-emerald-100 hover:bg-emerald-300/18"
          >
            {safeLocale === "tr" ? "Sanal portföyde dene" : "Try in virtual portfolio"}
          </Link>
          <Link
            href={`/${safeLocale}/ai-piyasa-asistani/varlik-yonetimi`}
            className="rounded-md border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-center text-sm font-black text-amber-100 hover:bg-amber-300/15"
          >
            {copy.manageAssets}
          </Link>
        </div>
      </div>

      <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_minmax(200px,1fr)]">
        <label className="terminal-control-label grid gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-stone-300">
          {copy.focusAsset}
          <select
            value={selectedSymbol}
            onChange={(event) => onSymbolChange(event.target.value)}
            className="terminal-control-input rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-100"
          >
            {focusSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {getAssetLabel(symbol)}
              </option>
            ))}
          </select>
        </label>

        <label className="terminal-control-label grid gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-stone-300">
          {copy.interval}
          <select
            value={interval}
            onChange={(event) => onIntervalChange(event.target.value)}
            className="terminal-control-input rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-100"
          >
            {intervals.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="terminal-control-label grid gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-stone-300">
          {copy.exchange}
          <select
            value={exchange}
            onChange={(event) => onExchangeChange(event.target.value as MarketExchange)}
            disabled={!isCryptoSelected}
            className="terminal-control-input rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-100 disabled:opacity-45"
          >
            <option value="binance">Binance</option>
            <option value="gate">Gate.io</option>
          </select>
        </label>

        <div className="grid grid-cols-3 gap-2">
          <Status label={copy.marketRadar} value={copy.radarStatus} />
          <Status label={copy.favorites} value={copy.favoritesCount(favoritesCount)} />
          <Status
            label={copy.risk}
            value={analysis ? `${Math.round(analysis.risk.score)}/100` : "-"}
            tooltip={safeLocale === "tr" ? "Risk metriği, oynaklık ve teknik dengesizlik arttıkça yükselir. Yüksek değer daha temkinli yorum gerektirir." : "Risk rises as volatility and technical imbalance increase. A higher value calls for more caution."}
          />
        </div>
      </div>
    </section>
  );
}

function PerformanceChip({ label, value }: { label: string; value: number | null }) {
  const tone =
    value === null || !Number.isFinite(value)
      ? "border-slate-700 bg-slate-950 text-stone-300"
      : value >= 0
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
        : "border-rose-400/30 bg-rose-400/10 text-rose-200";

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-black tabular-nums ${tone}`}>
      {label} {formatPerformancePercent(value)}
    </span>
  );
}

function Metric({ label, value, strong = false, tooltip }: { label: string; value: string; strong?: boolean; tooltip?: string }) {
  return (
    <div className="terminal-header-metric min-w-0 rounded-md border border-slate-800 bg-slate-950/70 p-2">
      <div className="flex items-center gap-1">
        <p className="terminal-header-metric-label truncate text-[10px] font-black uppercase tracking-[0.12em] text-stone-300">{label}</p>
        {tooltip ? <InfoTooltip text={tooltip} /> : null}
      </div>
      <p className={`terminal-header-metric-value mt-1 truncate font-black ${strong ? "text-lg text-white" : "text-sm text-slate-200"}`}>{value}</p>
    </div>
  );
}

function Status({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div className="terminal-header-status rounded-md border border-slate-800 bg-slate-950/70 p-2">
      <div className="flex items-center gap-1">
        <p className="terminal-header-metric-label text-[10px] font-black uppercase tracking-[0.12em] text-stone-300">{label}</p>
        {tooltip ? <InfoTooltip text={tooltip} /> : null}
      </div>
      <p className="terminal-header-metric-value mt-1 text-xs font-black text-slate-200">{value}</p>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="Info"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-600 text-[10px] font-black text-stone-300 hover:border-cyan-300/40 hover:text-cyan-100"
      >
        i
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-52 -translate-x-1/2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-semibold normal-case tracking-normal text-slate-200 shadow-2xl group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}
