"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnalysisTable } from "@/components/ai-market/AnalysisTable";
import { AI_MARKET_FAVORITES_STORAGE_KEY, DEFAULT_AI_MARKET_FAVORITES, getKnownAsset } from "@/components/ai-market/FavoritesPanel";
import { IndicatorPanel } from "@/components/ai-market/IndicatorPanel";
import { SignalCard } from "@/components/ai-market/SignalCard";
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
const intervals = [
  { value: "1m", label: "1 dk" },
  { value: "5m", label: "5 dk" },
  { value: "15m", label: "15 dk" },
  { value: "1h", label: "1 saat" },
  { value: "4h", label: "4 saat" },
  { value: "1d", label: "1 gün" },
];

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
  const selectedAsset = getKnownAsset(effectiveSelectedSymbol, symbols);
  const isCryptoSelected = effectiveSelectedSymbol.endsWith("USDT");

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      symbol: effectiveSelectedSymbol,
      exchange,
      interval,
    });

    return `/api/ai-market/analyze?${params.toString()}`;
  }, [effectiveSelectedSymbol, exchange, interval]);

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
    <div className="grid min-w-0 gap-5">
      <section className="premium-card p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Analiz Kontrolü</p>
            <h2 className="mt-1 text-lg font-black text-[#152033]">{selectedAsset.displayName} odak sinyali</h2>
            <p className="mt-1 text-xs text-slate-500">
              {favorites.length} favori izleniyor · favori listesi varlık yönetiminden güncellenir
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_140px_140px_auto]">
            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Odak Varlık
              <select
                value={effectiveSelectedSymbol}
                onChange={(event) => setSelectedSymbol(event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-700"
              >
                {focusSymbols.map((symbol) => {
                  const asset = getKnownAsset(symbol, symbols);

                  return (
                    <option key={symbol} value={symbol}>
                      {asset.displayName}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Periyot
              <select
                value={interval}
                onChange={(event) => setInterval(event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-700"
              >
                {intervals.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Borsa
              <select
                value={exchange}
                onChange={(event) => setExchange(event.target.value as MarketExchange)}
                disabled={!isCryptoSelected}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="binance">Binance</option>
                <option value="gate">Gate.io</option>
              </select>
            </label>

            <Link
              href={`/${locale}/ai-piyasa-asistani/varlik-yonetimi`}
              className="self-end rounded-md border border-[#0f766e] bg-emerald-50 px-3 py-2 text-center text-sm font-black text-[#0f766e] hover:bg-emerald-100"
            >
              Varlıkları Yönet
            </Link>
          </div>
        </div>
      </section>

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
