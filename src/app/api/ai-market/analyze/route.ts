import { NextResponse } from "next/server";
import { fetchBinanceCandles } from "@/lib/ai-market/binance-public";
import { fetchGateCandles } from "@/lib/ai-market/gate-public";
import { calculateIndicators } from "@/lib/ai-market/indicators";
import { AI_MARKET_DISCLAIMER, buildExplanation } from "@/lib/ai-market/explanation-engine";
import { assessRisk } from "@/lib/ai-market/risk-engine";
import { analyzeSignal } from "@/lib/ai-market/signal-engine";
import { getWatchSymbol } from "@/lib/ai-market/symbols";
import type { Candle, MarketAnalysis, MarketExchange } from "@/lib/ai-market/types";

export const dynamic = "force-dynamic";

const allowedIntervals = new Set(["15m", "1h", "4h", "1d"]);

function getExchange(value: string | null): MarketExchange {
  return value === "gate" ? "gate" : "binance";
}

function getInterval(value: string | null) {
  return value && allowedIntervals.has(value) ? value : "1h";
}

function getChangePercent(candles: Candle[]) {
  const first = candles[0];
  const latest = candles[candles.length - 1];

  if (!first || !latest || first.open <= 0) {
    return null;
  }

  return ((latest.close - first.open) / first.open) * 100;
}

async function loadCandles(exchange: MarketExchange, binanceSymbol: string, gateSymbol: string, interval: string) {
  if (exchange === "gate") {
    return fetchGateCandles(gateSymbol, interval);
  }

  return fetchBinanceCandles(binanceSymbol, interval);
}

async function loadCandlesWithFallback(exchange: MarketExchange, binanceSymbol: string, gateSymbol: string, interval: string) {
  try {
    return {
      candles: await loadCandles(exchange, binanceSymbol, gateSymbol, interval),
      exchange,
      error: null,
    };
  } catch (error) {
    const fallbackExchange: MarketExchange = exchange === "binance" ? "gate" : "binance";

    try {
      return {
        candles: await loadCandles(fallbackExchange, binanceSymbol, gateSymbol, interval),
        exchange: fallbackExchange,
        error: error instanceof Error ? error.message : "Birincil veri saglayici yanit vermedi.",
      };
    } catch (fallbackError) {
      return {
        candles: [],
        exchange,
        error: fallbackError instanceof Error ? fallbackError.message : "Public piyasa verisi alinamadi.",
      };
    }
  }
}

function buildFallbackAnalysis(symbol: ReturnType<typeof getWatchSymbol>, exchange: MarketExchange, interval: string, error: string): MarketAnalysis {
  const indicators = calculateIndicators([]);
  const signal = analyzeSignal([], indicators);
  const risk = assessRisk([], indicators);
  const base = {
    symbol: symbol.symbol,
    name: symbol.name,
    exchange,
    interval,
    lastPrice: null,
    changePercent: null,
    volume: null,
    indicators,
    signal,
    risk,
    updatedAt: new Date().toISOString(),
    dataStatus: "error" as const,
    error,
  };

  return {
    ...base,
    explanation: buildExplanation(base),
    disclaimer: AI_MARKET_DISCLAIMER,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = getWatchSymbol(url.searchParams.get("symbol"));
  const requestedExchange = getExchange(url.searchParams.get("exchange"));
  const interval = getInterval(url.searchParams.get("interval"));
  const { candles, exchange, error } = await loadCandlesWithFallback(
    requestedExchange,
    symbol.binanceSymbol,
    symbol.gateSymbol,
    interval,
  );

  if (candles.length < 30) {
    return NextResponse.json(buildFallbackAnalysis(symbol, exchange, interval, error ?? "Yeterli public mum verisi bulunamadi."));
  }

  const indicators = calculateIndicators(candles);
  const signal = analyzeSignal(candles, indicators);
  const risk = assessRisk(candles, indicators);
  const latest = candles[candles.length - 1];
  const base = {
    symbol: symbol.symbol,
    name: symbol.name,
    exchange,
    interval,
    lastPrice: latest.close,
    changePercent: getChangePercent(candles),
    volume: latest.volume,
    indicators,
    signal,
    risk,
    updatedAt: new Date().toISOString(),
    dataStatus: error ? ("fallback" as const) : ("live" as const),
    error: error ?? undefined,
  };

  const analysis: MarketAnalysis = {
    ...base,
    explanation: buildExplanation(base),
    disclaimer: AI_MARKET_DISCLAIMER,
  };

  return NextResponse.json(analysis);
}
