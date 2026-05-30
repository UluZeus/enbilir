"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnalysisTable } from "@/components/ai-market/AnalysisTable";
import { AssetUniversePanel } from "@/components/ai-market/AssetUniversePanel";
import { AssetWatchlist } from "@/components/ai-market/AssetWatchlist";
import {
  AI_MARKET_FAVORITES_STORAGE_KEY,
  DEFAULT_AI_MARKET_FAVORITES,
  FavoritesPanel,
} from "@/components/ai-market/FavoritesPanel";
import { IndicatorPanel } from "@/components/ai-market/IndicatorPanel";
import { SignalCard } from "@/components/ai-market/SignalCard";
import type { MarketAnalysis, MarketExchange, WatchSymbol } from "@/lib/ai-market/types";

type MarketAssistantDashboardProps = {
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

function writeFavorites(favorites: string[]) {
  window.localStorage.setItem(AI_MARKET_FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

export function MarketAssistantDashboard({ symbols }: MarketAssistantDashboardProps) {
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

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      symbol: selectedSymbol,
      exchange,
      interval,
    });

    return `/api/ai-market/analyze?${params.toString()}`;
  }, [exchange, interval, selectedSymbol]);

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

  function addFavorite(symbol: string) {
    const normalized = symbol.trim().toUpperCase();

    if (!normalized) {
      return;
    }

    writeFavorites(favorites.includes(normalized) ? favorites : [...favorites, normalized]);
  }

  function removeFavorite(symbol: string) {
    writeFavorites(favorites.filter((item) => item !== symbol));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="grid gap-5">
        <AssetWatchlist
          symbols={symbols}
          selectedSymbol={selectedSymbol}
          exchange={exchange}
          interval={interval}
          onSymbolChange={setSelectedSymbol}
          onExchangeChange={setExchange}
          onIntervalChange={setInterval}
        />
        <FavoritesPanel
          favorites={favorites}
          symbols={symbols}
          selectedSymbol={selectedSymbol}
          onSelectSymbol={setSelectedSymbol}
          onRemoveFavorite={removeFavorite}
        />
        <AssetUniversePanel favorites={favorites} onAddFavorite={addFavorite} />
      </div>

      <div className="grid gap-5">
        <AnalysisTable interval={interval} />
        {state.status === "loading" && !state.analysis ? <LoadingPanel /> : null}
        {state.status === "error" ? <ErrorPanel message={state.error ?? "Analiz alinamadi."} /> : null}
        {state.analysis ? (
          <>
            {state.analysis.dataStatus !== "live" ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                Public veri saglayicisinda gecici sorun var. Ekran kontrollu analiz modunda calisiyor.
              </div>
            ) : null}
            <SignalCard analysis={state.analysis} />
            <IndicatorPanel indicators={state.analysis.indicators} risk={state.analysis.risk} />
            <p className="rounded-md border border-slate-200 bg-white/70 p-3 text-xs leading-5 text-slate-500">
              {state.analysis.disclaimer} API key kullanilmaz, borsa hesabina baglanilmaz ve emir gonderilmez.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="premium-card p-5">
      <p className="text-sm font-bold text-slate-600">Public piyasa verisi aliniyor...</p>
      <div className="mt-4 grid gap-3">
        <div className="h-16 animate-pulse rounded-md bg-slate-100" />
        <div className="h-32 animate-pulse rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
      <p className="font-black text-red-700">Analiz yuklenemedi</p>
      <p className="mt-1 text-sm text-red-600">{message}</p>
    </div>
  );
}
