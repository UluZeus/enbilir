"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetWatchlist } from "@/components/ai-market/AssetWatchlist";
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

export function MarketAssistantDashboard({ symbols }: MarketAssistantDashboardProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0]?.symbol ?? "BTCUSDT");
  const [exchange, setExchange] = useState<MarketExchange>("binance");
  const [interval, setInterval] = useState("1h");
  const [state, setState] = useState<LoadState>({ status: "idle", analysis: null, error: null });

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

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <AssetWatchlist
        symbols={symbols}
        selectedSymbol={selectedSymbol}
        exchange={exchange}
        interval={interval}
        onSymbolChange={setSelectedSymbol}
        onExchangeChange={setExchange}
        onIntervalChange={setInterval}
      />

      <div className="grid gap-5">
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
