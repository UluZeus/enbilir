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
import type { MarketAnalysis, MarketExchange, WatchSymbol } from "@/lib/ai-market/types";

type MarketAssistantDashboardProps = {
  locale: string;
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

export function MarketAssistantDashboard({ locale, symbols }: MarketAssistantDashboardProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0]?.symbol ?? "BTCUSDT");
  const [exchange, setExchange] = useState<MarketExchange>("binance");
  const [interval, setInterval] = useState("1h");
  const [state, setState] = useState<LoadState>({ status: "idle", analysis: null, error: null });
  const favoritesSnapshot = useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    () => JSON.stringify(DEFAULT_AI_MARKET_FAVORITES),
  );
  const favorites = useMemo(() => normalizeFavorites(JSON.parse(favoritesSnapshot)), [favoritesSnapshot]);
  const focusSymbols = useMemo(() => (favorites.length > 0 ? favorites : symbols.map((item) => item.symbol)), [favorites, symbols]);
  const effectiveSelectedSymbol = focusSymbols.includes(selectedSymbol) ? selectedSymbol : (focusSymbols[0] ?? symbols[0]?.symbol ?? "BTCUSDT");
  const isCryptoSelected = effectiveSelectedSymbol.endsWith("USDT");

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      symbol: effectiveSelectedSymbol,
      exchange,
      interval,
    });

    return `/api/ai-market/analyze?${params.toString()}`;
  }, [effectiveSelectedSymbol, exchange, interval]);

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
          throw new Error("Analiz servisi su anda yanit vermiyor.");
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
          error: error instanceof Error ? error.message : "Beklenmeyen bir analiz hatasi olustu.",
        });
      }
    }

    loadAnalysis();

    return () => controller.abort();
  }, [requestUrl]);

  return (
    <div className="rounded-md border border-slate-900 bg-[#050812] p-3 text-slate-100 shadow-2xl md:p-4">
      <div className="grid min-w-0 gap-4">
        <TerminalHeader
          locale={locale}
          selectedSymbol={effectiveSelectedSymbol}
          focusSymbols={focusSymbols}
          interval={interval}
          exchange={exchange}
          isCryptoSelected={isCryptoSelected}
          favoritesCount={favorites.length}
          analysis={state.analysis}
          onSymbolChange={setSelectedSymbol}
          onIntervalChange={setInterval}
          onExchangeChange={setExchange}
          getAssetLabel={getAssetLabel}
        />

        {state.status === "error" ? <ErrorPanel message={state.error ?? "Analiz alinamadi."} /> : null}
        {state.analysis?.dataStatus !== "live" && state.analysis ? (
          <div className="rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
            Public veri saglayicisinda gecici sorun var. Ekran kontrollu analiz modunda calisiyor.
          </div>
        ) : null}

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-4">
            <TerminalChartArea analysis={state.analysis} status={state.status} />
            <AiInsightPanel analysis={state.analysis} />
          </div>

          <aside className="grid min-w-0 content-start gap-4">
            <MarketRadarPanel analysis={state.analysis} />
            <QuickWatchlistPanel
              favorites={focusSymbols}
              selectedSymbol={effectiveSelectedSymbol}
              onSelectSymbol={setSelectedSymbol}
              getAssetLabel={getAssetLabel}
            />
          </aside>
        </div>

        {state.status === "loading" && !state.analysis ? <LoadingPanel /> : null}

        {state.analysis ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <IndicatorPanel indicators={state.analysis.indicators} risk={state.analysis.risk} />
            <div className="rounded-md border border-slate-800 bg-[#0b111d] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Sorumlu Kullanım</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {state.analysis.disclaimer} API key kullanilmaz, borsa hesabina baglanilmaz ve emir gonderilmez.
              </p>
            </div>
          </section>
        ) : null}

        <section className="rounded-md border border-slate-800 bg-[#080d16] p-2 md:p-3">
          <div className="mb-3 flex flex-col gap-1 px-1 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Alt Terminal</p>
              <h2 className="text-lg font-black text-white">Favori Analizleri ve Teknik Paneller</h2>
            </div>
            <p className="text-xs font-bold text-slate-500">10 saniyelik favori yenileme korunur</p>
          </div>
          <AnalysisTable interval={interval} />
        </section>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-md border border-slate-800 bg-[#0b111d] p-5">
      <p className="text-sm font-bold text-slate-300">Public piyasa verisi aliniyor...</p>
      <div className="mt-4 grid gap-3">
        <div className="h-16 animate-pulse rounded-md bg-slate-800" />
        <div className="h-32 animate-pulse rounded-md bg-slate-800" />
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-400/30 bg-red-400/10 p-4">
      <p className="font-black text-red-200">Analiz yuklenemedi</p>
      <p className="mt-1 text-sm text-red-100">{message}</p>
    </div>
  );
}
