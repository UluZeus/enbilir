"use client";

import Link from "next/link";
import type { AssetPerformance } from "@/lib/ai-market/asset-performance";
import type { MarketAnalysis, MarketExchange } from "@/lib/ai-market/types";

type TerminalHeaderProps = {
  locale: string;
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

const intervals = [
  { value: "1m", label: "1 dk" },
  { value: "5m", label: "5 dk" },
  { value: "15m", label: "15 dk" },
  { value: "1h", label: "1 saat" },
  { value: "4h", label: "4 saat" },
  { value: "1d", label: "1 gün" },
];

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

function getTrendLabel(analysis: MarketAnalysis | null) {
  if (!analysis || analysis.lastPrice === null || analysis.indicators.ema20 === null || analysis.indicators.ema50 === null) {
    return "Nötr";
  }

  if (analysis.lastPrice > analysis.indicators.ema20 && analysis.indicators.ema20 >= analysis.indicators.ema50) {
    return "Yukarı";
  }

  if (analysis.lastPrice < analysis.indicators.ema20 && analysis.indicators.ema20 <= analysis.indicators.ema50) {
    return "Aşağı";
  }

  return "Yatay";
}

function getVolatility(analysis: MarketAnalysis | null) {
  if (!analysis || analysis.lastPrice === null || analysis.lastPrice <= 0 || analysis.indicators.atr === null) {
    return "-";
  }

  return `%${((analysis.indicators.atr / analysis.lastPrice) * 100).toFixed(2)}`;
}

function getSignalLabel(analysis: MarketAnalysis | null) {
  if (!analysis) {
    return "Bekleniyor";
  }

  const signal = analysis.signal.signal.toUpperCase();

  if (signal.includes("BUY")) {
    return analysis.signal.confidence >= 80 ? "Güçlü Al" : "Alış İçin Takip";
  }

  if (signal.includes("SELL")) {
    return analysis.signal.confidence >= 80 ? "Güçlü Sat" : "Satış İçin Takip";
  }

  if (signal.includes("HOLD") || signal.includes("NEUTRAL")) {
    return "Bekle";
  }

  return "Nötr";
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
  const signalText = getSignalLabel(analysis);
  const currentPrice = performance?.price ?? analysis?.lastPrice ?? null;

  return (
    <section className="rounded-md border border-slate-800 bg-[#0b111d] shadow-2xl">
      <div className="grid gap-3 border-b border-slate-800 p-4 xl:grid-cols-[minmax(320px,1fr)_minmax(520px,1.4fr)_auto] xl:items-end">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">AI Trading Terminal</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <h1 className="text-3xl font-black tracking-normal text-white md:text-4xl">{selectedSymbol}</h1>
          </div>
          <p className="mt-1 text-2xl font-black tabular-nums text-white">{currentPrice === null ? "—" : `$${formatPrice(currentPrice)}`}</p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
            <PerformanceChip label="1s" value={performance?.changes["1h"] ?? null} />
            <PerformanceChip label="1g" value={performance?.changes["1d"] ?? null} />
            <PerformanceChip label="1a" value={performance?.changes["1m"] ?? null} />
            <PerformanceChip label="1y" value={performance?.changes["1y"] ?? null} />
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-slate-400">{analysis?.name ?? getAssetLabel(selectedSymbol)}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Metric label="Son fiyat" value={formatPrice(currentPrice)} strong />
          <Metric label="24s hacim" value={formatVolume(analysis?.volume ?? null)} />
          <Metric label="Volatilite" value={getVolatility(analysis)} />
          <Metric label="Trend" value={getTrendLabel(analysis)} />
          <Metric label="AI sinyali" value={signalText} />
          <Metric label="Güven" value={analysis ? `%${analysis.signal.confidence}` : "-"} />
        </div>

        <Link
          href={`/${locale}/ai-piyasa-asistani/varlik-yonetimi`}
          className="rounded-md border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-center text-sm font-black text-amber-100 hover:bg-amber-300/15"
        >
          Varlıkları Yönet
        </Link>
      </div>

      <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_minmax(200px,1fr)]">
        <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          Odak Varlık
          <select
            value={selectedSymbol}
            onChange={(event) => onSymbolChange(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-100"
          >
            {focusSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {getAssetLabel(symbol)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          Periyot
          <select
            value={interval}
            onChange={(event) => onIntervalChange(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-100"
          >
            {intervals.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          Borsa
          <select
            value={exchange}
            onChange={(event) => onExchangeChange(event.target.value as MarketExchange)}
            disabled={!isCryptoSelected}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-100 disabled:opacity-45"
          >
            <option value="binance">Binance</option>
            <option value="gate">Gate.io</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <Status label="Piyasa radarı" value="Binance / 30 sn" />
          <Status label="Favoriler" value={`${favoritesCount} varlık`} />
        </div>
      </div>
    </section>
  );
}

function PerformanceChip({ label, value }: { label: string; value: number | null }) {
  const tone =
    value === null || !Number.isFinite(value)
      ? "border-slate-700 bg-slate-950 text-slate-400"
      : value >= 0
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
        : "border-rose-400/30 bg-rose-400/10 text-rose-200";

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-black tabular-nums ${tone}`}>
      {label} {formatPerformancePercent(value)}
    </span>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-800 bg-slate-950/70 p-2">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-1 truncate font-black ${strong ? "text-lg text-white" : "text-sm text-slate-200"}`}>{value}</p>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-black text-slate-200">{value}</p>
    </div>
  );
}
