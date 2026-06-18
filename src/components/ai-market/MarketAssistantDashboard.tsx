"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AiInsightPanel } from "@/components/ai-market/AiInsightPanel";
import { AnalysisTable } from "@/components/ai-market/AnalysisTable";
import { AI_MARKET_FAVORITES_STORAGE_KEY, DEFAULT_AI_MARKET_FAVORITES, getKnownAsset } from "@/components/ai-market/FavoritesPanel";
import { IndicatorPanel } from "@/components/ai-market/IndicatorPanel";
import { MarketRadarPanel } from "@/components/ai-market/MarketRadarPanel";
import { QuickWatchlistPanel } from "@/components/ai-market/QuickWatchlistPanel";
import { TerminalChartArea } from "@/components/ai-market/TerminalChartArea";
import { TerminalHeader } from "@/components/ai-market/TerminalHeader";
import { getSafeLocale, type Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import type { AssetPerformance } from "@/lib/ai-market/asset-performance";
import type { MarketAnalysis, MarketExchange, WatchSymbol } from "@/lib/ai-market/types";

type MarketAssistantDashboardProps = {
  locale: Locale | string;
  symbols: WatchSymbol[];
};

type LoadState = {
  status: "idle" | "loading" | "success" | "error";
  analysis: MarketAnalysis | null;
  error: string | null;
};

const FAVORITES_CHANGED_EVENT = "ai-market-favorites-changed";

function normalizeFavorites(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_AI_MARKET_FAVORITES;
  }

  const favorites = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return Array.from(new Set(favorites.map((item) => item.trim().toUpperCase())));
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

async function syncFavoritesToServer(favorites: string[]) {
  try {
    await fetch("/api/ai-market/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ symbols: favorites }),
    });
  } catch {
    // The terminal remains usable with local favorites when a session is not available.
  }
}

export function MarketAssistantDashboard({ locale, symbols }: MarketAssistantDashboardProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale).ai;
  const analysisServiceUnavailable = copy.analysisServiceUnavailable;
  const unexpectedAnalysisError = copy.unexpectedAnalysisError;
  const performanceServiceUnavailable = copy.performanceServiceUnavailable;
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0]?.symbol ?? "BTCUSDT");
  const [exchange, setExchange] = useState<MarketExchange>("binance");
  const [interval, setInterval] = useState("1h");
  const [state, setState] = useState<LoadState>({ status: "idle", analysis: null, error: null });
  const [performance, setPerformance] = useState<AssetPerformance | null>(null);
  const favoritesSnapshot = useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    () => JSON.stringify(DEFAULT_AI_MARKET_FAVORITES),
  );
  const favorites = useMemo(() => normalizeFavorites(JSON.parse(favoritesSnapshot)), [favoritesSnapshot]);
  const focusSymbols = useMemo(() => (favorites.length > 0 ? favorites : symbols.map((item) => item.symbol)), [favorites, symbols]);
  const effectiveSelectedSymbol = focusSymbols.includes(selectedSymbol) ? selectedSymbol : (focusSymbols[0] ?? symbols[0]?.symbol ?? "BTCUSDT");
  const isCryptoSelected = effectiveSelectedSymbol.endsWith("USDT");

  useEffect(() => {
    void syncFavoritesToServer(favorites);
  }, [favorites]);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      symbol: effectiveSelectedSymbol,
      exchange,
      interval,
    });

    return `/api/ai-market/analyze?${params.toString()}`;
  }, [effectiveSelectedSymbol, exchange, interval]);

  const performanceRequestUrl = useMemo(() => {
    const params = new URLSearchParams({
      symbol: effectiveSelectedSymbol,
      exchange,
    });

    return `/api/ai-market/performance?${params.toString()}`;
  }, [effectiveSelectedSymbol, exchange]);

  function getAssetLabel(symbol: string) {
    const asset = getKnownAsset(symbol, symbols);
    return asset.displayName;
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnalysis() {
      setState((current) => ({ ...current, status: "loading", error: null }));

      try {
        const response = await fetch(requestUrl, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(analysisServiceUnavailable);
        }

        const analysis = (await response.json()) as MarketAnalysis;
        setState({ status: "success", analysis, error: null });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          analysis: null,
          error: error instanceof Error ? error.message : unexpectedAnalysisError,
        });
      }
    }

    loadAnalysis();

    return () => controller.abort();
  }, [analysisServiceUnavailable, requestUrl, unexpectedAnalysisError]);

  useEffect(() => {
    let isActive = true;
    let controller: AbortController | null = null;

    async function loadPerformance() {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;

      try {
        const response = await fetch(performanceRequestUrl, {
          signal: requestController.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(performanceServiceUnavailable);
        }

        const nextPerformance = (await response.json()) as AssetPerformance;

        if (isActive) {
          setPerformance(nextPerformance);
        }
      } catch {
        if (isActive && !requestController.signal.aborted) {
          setPerformance(null);
        }
      }
    }

    loadPerformance();
    const refreshId = window.setInterval(loadPerformance, 10000);

    return () => {
      isActive = false;
      controller?.abort();
      window.clearInterval(refreshId);
    };
  }, [performanceRequestUrl, performanceServiceUnavailable]);

  return (
    <div className="rounded-md border border-slate-900 bg-[#050812] p-3 text-slate-100 shadow-2xl md:p-4">
      <div className="grid min-w-0 gap-4">
        <MarketRadarPanel locale={safeLocale} />

        <TerminalHeader
          locale={safeLocale}
          selectedSymbol={effectiveSelectedSymbol}
          focusSymbols={focusSymbols}
          interval={interval}
          exchange={exchange}
          isCryptoSelected={isCryptoSelected}
          favoritesCount={favorites.length}
          analysis={state.analysis}
          performance={performance}
          onSymbolChange={setSelectedSymbol}
          onIntervalChange={setInterval}
          onExchangeChange={setExchange}
          getAssetLabel={getAssetLabel}
        />

        {state.status === "error" ? <ErrorPanel title={copy.loadErrorTitle} message={state.error ?? copy.analysisUnavailable} /> : null}
        {state.analysis?.dataStatus !== "live" && state.analysis ? (
          <div className="rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
            {copy.providerIssue}
          </div>
        ) : null}

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-4">
            <TerminalChartArea locale={safeLocale} analysis={state.analysis} status={state.status} />
            <AiInsightPanel locale={safeLocale} analysis={state.analysis} />
          </div>

          <aside className="grid min-w-0 content-start gap-4">
            <QuickWatchlistPanel
              locale={safeLocale}
              favorites={focusSymbols}
              selectedSymbol={effectiveSelectedSymbol}
              onSelectSymbol={setSelectedSymbol}
              getAssetLabel={getAssetLabel}
            />
          </aside>
        </div>

        {state.status === "loading" && !state.analysis ? <LoadingPanel label={copy.loadingData} /> : null}

        {state.analysis ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <IndicatorPanel locale={safeLocale} indicators={state.analysis.indicators} risk={state.analysis.risk} />
            <div className="rounded-md border border-slate-800 bg-[#0b111d] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{copy.responsibleUse}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {state.analysis.disclaimer} {copy.disclaimerSuffix}
              </p>
            </div>
          </section>
        ) : null}

        <section className="rounded-md border border-slate-800 bg-[#080d16] p-2 md:p-3">
          <div className="mb-3 flex flex-col gap-1 px-1 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{copy.lowerTerminal}</p>
              <h2 className="text-lg font-black text-white">{copy.favoriteAnalyses}</h2>
            </div>
            <p className="text-xs font-bold text-slate-500">{copy.favoriteRefresh}</p>
          </div>
          <AnalysisTable locale={safeLocale} interval={interval} />
        </section>
      </div>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-[#0b111d] p-5">
      <p className="text-sm font-bold text-slate-300">{label}</p>
      <div className="mt-4 grid gap-3">
        <div className="h-16 animate-pulse rounded-md bg-slate-800" />
        <div className="h-32 animate-pulse rounded-md bg-slate-800" />
      </div>
    </div>
  );
}

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-md border border-red-400/30 bg-red-400/10 p-4">
      <p className="font-black text-red-200">{title}</p>
      <p className="mt-1 text-sm text-red-100">{message}</p>
    </div>
  );
}
