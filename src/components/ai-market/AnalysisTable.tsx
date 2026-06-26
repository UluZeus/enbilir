"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AI_MARKET_FAVORITES_STORAGE_KEY,
  DEFAULT_AI_MARKET_FAVORITES,
  PREPARED_FAVORITE_ASSETS,
} from "@/components/ai-market/FavoritesPanel";
import { TechnicalIndicatorCharts } from "@/components/ai-market/TechnicalIndicatorCharts";
import { TopOpportunitiesPanel } from "@/components/ai-market/TopOpportunitiesPanel";
import { getSafeLocale, type Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import type { TechnicalSeries } from "@/lib/ai-market/indicators";
import { getSignalReadingGuide } from "@/lib/ai-market/signal-reading-guide";
import type { MarketAnalysis, SignalType } from "@/lib/ai-market/types";

const FAVORITES_CHANGED_EVENT = "ai-market-favorites-changed";
const MAX_FAVORITES = 30;
const AUTO_REFRESH_MS = 10_000;
const DEFAULT_EXCHANGE = "binance";
const FALLBACK_INTERVAL = "1h";

type AnalysisTableProps = {
  locale: Locale | string;
  interval?: string;
};

type BatchSuccess = {
  symbol: string;
  ok: true;
  analysis: MarketAnalysis & {
    technicalSeries?: TechnicalSeries;
  };
};

type BatchFailure = {
  symbol: string;
  ok: false;
  error: string;
};

type BatchResult = BatchSuccess | BatchFailure;

type BatchResponse = {
  requested: number;
  processed: number;
  interval: string;
  exchange: string;
  results: BatchResult[];
};

type TableState = {
  status: "idle" | "loading" | "success" | "error";
  response: BatchResponse | null;
  error: string | null;
  updatedAt: string | null;
};

const signalLabelsTr: Record<SignalType, string> = {
  STRONG_BUY: "Güçlü Al",
  BUY: "Al",
  HOLD: "Tut",
  WATCH: "Takip Et",
  TAKE_PROFIT: "Kâr Al",
  SELL: "Sat",
  AVOID: "Uzak Dur",
  NO_TRADE: "Bekle",
};

const signalLabelsEn: Record<SignalType, string> = {
  STRONG_BUY: "Strong Buy",
  BUY: "Buy",
  HOLD: "Hold",
  WATCH: "Watch",
  TAKE_PROFIT: "Take Profit",
  SELL: "Sell",
  AVOID: "Avoid",
  NO_TRADE: "No Trade",
};

function normalizeFavorites(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_AI_MARKET_FAVORITES;
  }

  const favorites = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return Array.from(new Set(favorites.map((item) => item.trim().toUpperCase()))).slice(0, MAX_FAVORITES);
}

function getStoredFavorites() {
  if (typeof window === "undefined") {
    return DEFAULT_AI_MARKET_FAVORITES;
  }

  try {
    const storedValue = window.localStorage.getItem(AI_MARKET_FAVORITES_STORAGE_KEY);
    return storedValue ? normalizeFavorites(JSON.parse(storedValue)) : DEFAULT_AI_MARKET_FAVORITES;
  } catch {
    return DEFAULT_AI_MARKET_FAVORITES;
  }
}

function getFavoritesSnapshot() {
  return JSON.stringify(getStoredFavorites());
}

function subscribeToFavorites(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(FAVORITES_CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(FAVORITES_CHANGED_EVENT, callback);
  };
}

function getAssetLabel(symbol: string, analysis?: MarketAnalysis) {
  if (analysis) {
    return {
      displayName: analysis.symbol,
      name: analysis.name,
    };
  }

  const preparedAsset = PREPARED_FAVORITE_ASSETS.find((item) => item.symbol === symbol);

  return {
    displayName: preparedAsset?.displayName ?? symbol,
    name: preparedAsset?.name ?? symbol,
  };
}

function formatNumber(value: number | null, maximumFractionDigits = 2) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("tr-TR", { maximumFractionDigits });
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

  return value.toLocaleString("tr-TR", { maximumSignificantDigits: 4 });
}

function getTrend(analysis: MarketAnalysis, copy: ReturnType<typeof getUiCopy>["ai"]) {
  const { lastPrice, indicators } = analysis;

  if (lastPrice === null || indicators.ema20 === null || indicators.ema50 === null) {
    return copy.neutral;
  }

  if (lastPrice > indicators.ema20 && indicators.ema20 > indicators.ema50) {
    return copy.up;
  }

  if (lastPrice < indicators.ema20 && indicators.ema20 < indicators.ema50) {
    return copy.down;
  }

  return copy.sideways;
}

function getSignalClass(signal: SignalType) {
  if (signal === "STRONG_BUY" || signal === "BUY") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (signal === "SELL" || signal === "AVOID") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (signal === "TAKE_PROFIT") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getRiskClass(level: MarketAnalysis["risk"]["level"]) {
  if (level === "DUSUK") {
    return "text-emerald-700";
  }

  if (level === "YUKSEK") {
    return "text-red-700";
  }

  return "text-amber-700";
}

export function AnalysisTable({ locale, interval = FALLBACK_INTERVAL }: AnalysisTableProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale).ai;
  const signalLabels = safeLocale === "en" ? signalLabelsEn : signalLabelsTr;
  const favoriteAnalysisFetchError = copy.favoriteAnalysisFetchError;
  const favoriteAnalysisLoadError = copy.favoriteAnalysisLoadError;
  const favoritesSnapshot = useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    () => JSON.stringify(DEFAULT_AI_MARKET_FAVORITES),
  );
  const favorites = useMemo(() => normalizeFavorites(JSON.parse(favoritesSnapshot)), [favoritesSnapshot]);
  const [state, setState] = useState<TableState>({ status: "idle", response: null, error: null, updatedAt: null });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const refreshId = window.setInterval(() => {
      setRefreshTick((current) => current + 1);
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(refreshId);
  }, []);

  useEffect(() => {
    if (favorites.length === 0) {
      return;
    }

    const controller = new AbortController();

    async function loadBatchAnalysis() {
      setState((current) => ({ ...current, status: "loading", error: null }));

      try {
        const response = await fetch("/api/ai-market/batch-analyze", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            symbols: favorites.slice(0, MAX_FAVORITES),
            exchange: DEFAULT_EXCHANGE,
            interval,
          }),
        });

        const payload = (await response.json()) as BatchResponse | { error?: string };

        if (!response.ok) {
          throw new Error("error" in payload && payload.error ? payload.error : favoriteAnalysisFetchError);
        }

        setState({ status: "success", response: payload as BatchResponse, error: null, updatedAt: new Date().toISOString() });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState((current) => ({
          status: "error",
          response: current.response,
          error: error instanceof Error ? error.message : favoriteAnalysisLoadError,
          updatedAt: current.updatedAt,
        }));
      }
    }

    loadBatchAnalysis();

    return () => controller.abort();
  }, [favoriteAnalysisFetchError, favoriteAnalysisLoadError, favorites, interval, refreshTick]);

  const results = favorites.length === 0 ? [] : (state.response?.results ?? []);
  const successfulAnalyses = results.filter((result): result is BatchSuccess => result.ok).map((result) => result.analysis);

  return (
    <>
      <TopOpportunitiesPanel locale={safeLocale} analyses={successfulAnalyses} isLoading={state.status === "loading"} updatedAt={state.updatedAt} />
      <section className="premium-card p-4 md:p-5">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#152033]">{copy.favoritesTable}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {interval} {copy.interval.toLowerCase()} · {DEFAULT_EXCHANGE} {copy.defaultExchange} · {copy.maxFavorites} {MAX_FAVORITES} {copy.favorites.toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-xs font-black text-slate-600">
            {copy.autoRefresh}: 10 sn
          </span>
          {state.updatedAt ? (
            <span className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-xs font-black text-slate-600">
              {copy.updateLabel}: {new Date(state.updatedAt).toLocaleTimeString("tr-TR")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setRefreshTick((current) => current + 1)}
            className="rounded-md border border-[#0f766e] bg-emerald-50 px-3 py-2 text-xs font-black text-[#0f766e] hover:bg-emerald-100"
          >
            {copy.refresh}
          </button>
          <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-xs font-black text-slate-600">
            {state.status === "loading" ? copy.updating : `${results.length || favorites.length} ${copy.assets}`}
          </div>
        </div>
      </div>

      {favorites.length === 0 ? <EmptyState message={copy.emptyFavoritesTable} /> : null}
      {favorites.length >= 20 ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
          {copy.tooManyFavorites}
        </p>
      ) : null}
      {favorites.length > 0 && state.status === "loading" && results.length === 0 ? <LoadingState /> : null}
      {favorites.length > 0 && state.status === "error" ? <ErrorState title={copy.favoriteAnalysisLoadError} message={state.error ?? copy.favoriteAnalysisLoadError} /> : null}
      {results.length > 0 ? (
        <>
          <DesktopTable copy={copy} signalLabels={signalLabels} results={results} />
          <MobileCards copy={copy} signalLabels={signalLabels} results={results} />
        </>
      ) : null}
      </section>
    </>
  );
}

function DesktopTable({
  copy,
  signalLabels,
  results,
}: {
  copy: ReturnType<typeof getUiCopy>["ai"];
  signalLabels: Record<SignalType, string>;
  results: BatchResult[];
}) {
  return (
    <div className="mt-4 hidden overflow-x-auto md:block">
      <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0 text-left text-sm">
        <colgroup>
          <col className="w-[13%]" />
          <col className="w-[8%]" />
          <col className="w-[5%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[8%]" />
          <col className="w-[6%]" />
          <col className="w-[9%]" />
          <col className="w-[37%]" />
        </colgroup>
        <thead>
          <tr className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <th className="border-b border-slate-200 px-2 py-3">{copy.asset}</th>
            <th className="border-b border-slate-200 px-2 py-3">{copy.price}</th>
            <th className="border-b border-slate-200 px-2 py-3">RSI</th>
            <th className="border-b border-slate-200 px-2 py-3">MACD</th>
            <th className="border-b border-slate-200 px-2 py-3">Trend</th>
            <th className="border-b border-slate-200 px-2 py-3">{copy.risk}</th>
            <th className="border-b border-slate-200 px-2 py-3">{copy.confidence}</th>
            <th className="border-b border-slate-200 px-2 py-3">{copy.aiSignal}</th>
            <th className="border-b border-slate-200 px-2 py-3">{copy.analystComment}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <DesktopResultRows key={result.symbol} copy={copy} signalLabels={signalLabels} result={result} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DesktopResultRows({
  copy,
  signalLabels,
  result,
}: {
  copy: ReturnType<typeof getUiCopy>["ai"];
  signalLabels: Record<SignalType, string>;
  result: BatchResult;
}) {
  if (!result.ok) {
    const asset = getAssetLabel(result.symbol);

    return (
      <tr>
        <td className="border-b border-slate-100 px-2 py-3 align-top">
          <p className="font-black text-[#152033]">{asset.displayName}</p>
          <p className="mt-1 text-xs text-slate-500">{asset.name}</p>
        </td>
        <td className="border-b border-slate-100 px-2 py-3 text-red-700" colSpan={8}>
          {result.error}
        </td>
      </tr>
    );
  }

  const analysis = result.analysis;
  const signal = analysis.signal.signal;
  const locale = copy.terminal === "AI Trading Terminal" ? "en" : "tr";
  const tradeHref = `/${locale}/islem-yap?symbol=${encodeURIComponent(analysis.symbol)}&q=${encodeURIComponent(analysis.symbol)}`;

  return (
    <>
      <tr className="hover:bg-white/50">
      <td className="border-b border-slate-100 px-2 py-3 align-top">
        <p className="font-black text-[#152033]">{analysis.symbol}</p>
        <p className="mt-1 text-xs text-slate-500">{analysis.name}</p>
        <Link href={tradeHref} className="mt-2 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-black text-[#0f766e]">
          {locale === "en" ? "Try" : "Dene"}
        </Link>
      </td>
      <td className="border-b border-slate-100 px-2 py-3 font-bold text-slate-700">{formatPrice(analysis.lastPrice)}</td>
      <td className="border-b border-slate-100 px-2 py-3 text-slate-700">{formatNumber(analysis.indicators.rsi, 1)}</td>
      <td className="border-b border-slate-100 px-2 py-3 text-slate-700">{formatNumber(analysis.indicators.macd.histogram, 3)}</td>
      <td className="border-b border-slate-100 px-2 py-3 font-bold text-slate-700">{getTrend(analysis, copy)}</td>
      <td className={`border-b border-slate-100 px-2 py-3 font-black ${getRiskClass(analysis.risk.level)}`}>
        {analysis.risk.level} · {analysis.risk.score}
      </td>
      <td className="border-b border-slate-100 px-2 py-3 font-bold text-slate-700">{analysis.signal.confidence}%</td>
      <td className="border-b border-slate-100 px-2 py-3">
        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-black ${getSignalClass(signal)}`}>
          {signalLabels[signal]}
        </span>
      </td>
      <td className="border-b border-slate-100 px-2 py-3 text-xs leading-5 text-slate-600">
        <span className="block overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {analysis.explanation}
        </span>
        <span className="mt-2 block rounded-md border border-cyan-100 bg-cyan-50 px-2 py-1.5 text-[11px] font-bold leading-4 text-cyan-900">
          {getSignalReadingGuide(signal, copy.terminal === "AI Trading Terminal" ? "en" : "tr")}
        </span>
      </td>
      </tr>
      {analysis.technicalSeries ? (
        <tr>
          <td className="border-b border-slate-200 px-2 py-3" colSpan={9}>
            <TechnicalIndicatorCharts locale={copy.terminal === "AI Trading Terminal" ? "en" : "tr"} symbol={analysis.symbol} interval={analysis.interval} series={analysis.technicalSeries} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function MobileCards({
  copy,
  signalLabels,
  results,
}: {
  copy: ReturnType<typeof getUiCopy>["ai"];
  signalLabels: Record<SignalType, string>;
  results: BatchResult[];
}) {
  return (
    <div className="mt-4 grid gap-3 md:hidden">
      {results.map((result) => (
        <MobileCard key={result.symbol} copy={copy} signalLabels={signalLabels} result={result} />
      ))}
    </div>
  );
}

function MobileCard({
  copy,
  signalLabels,
  result,
}: {
  copy: ReturnType<typeof getUiCopy>["ai"];
  signalLabels: Record<SignalType, string>;
  result: BatchResult;
}) {
  if (!result.ok) {
    const asset = getAssetLabel(result.symbol);

    return (
      <div className="rounded-md border border-red-100 bg-red-50 p-3">
        <p className="text-sm font-black text-red-800">{asset.displayName}</p>
        <p className="mt-1 text-xs text-red-700">{result.error}</p>
      </div>
    );
  }

  const analysis = result.analysis;
  const signal = analysis.signal.signal;
  const locale = copy.terminal === "AI Trading Terminal" ? "en" : "tr";
  const tradeHref = `/${locale}/islem-yap?symbol=${encodeURIComponent(analysis.symbol)}&q=${encodeURIComponent(analysis.symbol)}`;

  return (
    <div className="rounded-md border border-white/70 bg-white/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#152033]">{analysis.symbol}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{analysis.name}</p>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-black ${getSignalClass(signal)}`}>
          {signalLabels[signal]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Metric label={copy.price} value={formatPrice(analysis.lastPrice)} />
        <Metric label="RSI" value={formatNumber(analysis.indicators.rsi, 1)} />
        <Metric label="MACD" value={formatNumber(analysis.indicators.macd.histogram, 4)} />
        <Metric label="Trend" value={getTrend(analysis, copy)} />
        <Metric label={copy.risk} value={`${analysis.risk.level} · ${analysis.risk.score}`} />
        <Metric label={copy.confidence} value={`${analysis.signal.confidence}%`} />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-600">{analysis.explanation}</p>
      <Link href={tradeHref} className="mt-3 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-[#0f766e]">
        {locale === "en" ? "Try in virtual portfolio" : "Sanal portföyde dene"}
      </Link>
      <p className="mt-2 rounded-md border border-cyan-100 bg-cyan-50 px-2 py-1.5 text-xs font-bold leading-5 text-cyan-900">
        {getSignalReadingGuide(signal, copy.terminal === "AI Trading Terminal" ? "en" : "tr")}
      </p>
      {analysis.technicalSeries ? (
        <div className="mt-3">
          <TechnicalIndicatorCharts locale={copy.terminal === "AI Trading Terminal" ? "en" : "tr"} symbol={analysis.symbol} interval={analysis.interval} series={analysis.technicalSeries} />
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-white/70 p-2">
      <p className="font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-700">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-md border border-slate-200 bg-white/70 p-4 text-sm font-semibold text-slate-500">
      {message}
    </p>
  );
}

function LoadingState() {
  return (
    <div className="mt-4 grid gap-2">
      <div className="h-12 animate-pulse rounded-md bg-slate-100" />
      <div className="h-12 animate-pulse rounded-md bg-slate-100" />
      <div className="h-12 animate-pulse rounded-md bg-slate-100" />
    </div>
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
      <p className="font-black text-red-700">{title}</p>
      <p className="mt-1 text-sm text-red-600">{message}</p>
    </div>
  );
}
