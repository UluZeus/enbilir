import { NextResponse } from "next/server";
import { getAssetUniverseItem } from "@/lib/ai-market/asset-universe";
import { fetchBinanceCandles } from "@/lib/ai-market/binance-public";
import { AI_MARKET_DISCLAIMER, buildExplanation } from "@/lib/ai-market/explanation-engine";
import { fetchGateCandles } from "@/lib/ai-market/gate-public";
import { calculateIndicators, calculateTechnicalSeries } from "@/lib/ai-market/indicators";
import { assessRisk } from "@/lib/ai-market/risk-engine";
import { analyzeSignal } from "@/lib/ai-market/signal-engine";
import { logMarketAnalysisSignal } from "@/lib/ai-market/signal-logger";
import type { AssetClass, Candle, MarketAnalysis, MarketExchange } from "@/lib/ai-market/types";
import { fetchYahooCandles } from "@/lib/ai-market/yahoo-public";

export const dynamic = "force-dynamic";

const MAX_BATCH_SYMBOLS = 30;
const MIN_CANDLE_COUNT = 30;
const allowedIntervals = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);
const allowedExchanges = new Set(["binance", "gate"]);

type BatchSymbol = {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  binanceSymbol?: string;
  gateSymbol?: string;
  yahooSymbol?: string;
};

type BatchAnalyzeBody = {
  symbols?: unknown;
  exchange?: unknown;
  interval?: unknown;
};

type BatchAnalyzeSuccess = {
  symbol: string;
  ok: true;
  analysis: MarketAnalysis & {
    technicalSeries: ReturnType<typeof calculateTechnicalSeries>;
  };
};

type BatchAnalyzeFailure = {
  symbol: string;
  ok: false;
  error: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeExchange(value: unknown): MarketExchange {
  return typeof value === "string" && allowedExchanges.has(value) ? (value as MarketExchange) : "binance";
}

function normalizeInterval(value: unknown) {
  return typeof value === "string" && allowedIntervals.has(value) ? value : "1h";
}

function normalizeSymbols(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

function getCryptoSymbol(symbol: string): BatchSymbol | null {
  if (!symbol.endsWith("USDT") || symbol.length <= 4) {
    return null;
  }

  const baseAsset = symbol.slice(0, -4);

  return {
    symbol,
    name: baseAsset,
    assetClass: "CRYPTO",
    binanceSymbol: symbol,
    gateSymbol: `${baseAsset}_USDT`,
  };
}

function getBatchSymbol(symbol: string) {
  const universeAsset = getAssetUniverseItem(symbol);

  if (universeAsset) {
    const baseAsset = universeAsset.symbol.endsWith("USDT") ? universeAsset.symbol.slice(0, -4) : universeAsset.symbol;

    return {
      symbol: universeAsset.symbol,
      name: universeAsset.name,
      assetClass: universeAsset.assetClass,
      binanceSymbol: universeAsset.assetClass === "CRYPTO" ? universeAsset.providerSymbol : undefined,
      gateSymbol: universeAsset.assetClass === "CRYPTO" ? `${baseAsset}_USDT` : undefined,
      yahooSymbol: universeAsset.assetClass === "CRYPTO" ? undefined : universeAsset.providerSymbol,
    };
  }

  return getCryptoSymbol(symbol);
}

function getChangePercent(candles: Candle[]) {
  const first = candles[0];
  const latest = candles[candles.length - 1];

  if (!first || !latest || first.open <= 0) {
    return null;
  }

  return ((latest.close - first.open) / first.open) * 100;
}

async function loadCandles(symbol: BatchSymbol, exchange: MarketExchange, interval: string) {
  if (symbol.assetClass !== "CRYPTO") {
    return {
      candles: await fetchYahooCandles(symbol.yahooSymbol ?? symbol.symbol, interval),
      exchange,
    };
  }

  if (exchange === "gate") {
    return {
      candles: await fetchGateCandles(symbol.gateSymbol ?? symbol.symbol, interval),
      exchange,
    };
  }

  return {
    candles: await fetchBinanceCandles(symbol.binanceSymbol ?? symbol.symbol, interval),
    exchange,
  };
}

function buildAnalysis(
  symbol: BatchSymbol,
  exchange: MarketExchange,
  interval: string,
  candles: Candle[],
): BatchAnalyzeSuccess["analysis"] {
  const indicators = calculateIndicators(candles);
  const signal = analyzeSignal(candles, indicators);
  const risk = assessRisk(candles, indicators);
  const latest = candles[candles.length - 1];
  const base = {
    symbol: symbol.symbol,
    name: symbol.name,
    exchange,
    interval,
    lastPrice: latest?.close ?? null,
    changePercent: getChangePercent(candles),
    volume: latest?.volume ?? null,
    indicators,
    signal,
    risk,
    updatedAt: new Date().toISOString(),
    dataStatus: "live" as const,
  };

  return {
    ...base,
    technicalSeries: calculateTechnicalSeries(candles, 100),
    explanation: buildExplanation(base),
    disclaimer: AI_MARKET_DISCLAIMER,
  };
}

async function analyzeOne(symbolValue: string, exchange: MarketExchange, interval: string): Promise<BatchAnalyzeSuccess | BatchAnalyzeFailure> {
  const symbol = getBatchSymbol(symbolValue);

  if (!symbol) {
    return {
      symbol: symbolValue,
      ok: false,
      error: "Gecersiz veya desteklenmeyen sembol.",
    };
  }

  try {
    const { candles, exchange: dataExchange } = await loadCandles(symbol, exchange, interval);

    if (candles.length < MIN_CANDLE_COUNT) {
      return {
        symbol: symbol.symbol,
        ok: false,
        error: "Analiz icin yeterli public mum verisi bulunamadi.",
      };
    }

    return {
      symbol: symbol.symbol,
      ok: true,
      analysis: buildAnalysis(symbol, dataExchange, interval, candles),
    };
  } catch (error) {
    return {
      symbol: symbol.symbol,
      ok: false,
      error: error instanceof Error ? error.message : "Public piyasa verisi alinamadi.",
    };
  }
}

export async function POST(request: Request) {
  let body: BatchAnalyzeBody;

  try {
    body = (await request.json()) as BatchAnalyzeBody;
  } catch {
    return jsonError("Gecersiz JSON body.", 400);
  }

  const normalizedSymbols = normalizeSymbols(body.symbols);

  if (!normalizedSymbols || normalizedSymbols.length === 0) {
    return jsonError("symbols alani en az bir sembol icermeli.", 400);
  }

  const requested = normalizedSymbols.length;
  const symbols = normalizedSymbols.slice(0, MAX_BATCH_SYMBOLS);
  const exchange = normalizeExchange(body.exchange);
  const interval = normalizeInterval(body.interval);
  const results = await Promise.all(symbols.map((symbol) => analyzeOne(symbol, exchange, interval)));

  await Promise.all(
    results.map((result) => {
      if (!result.ok) {
        return Promise.resolve();
      }

      return logMarketAnalysisSignal(result.analysis, "batch-analyze");
    }),
  );

  return NextResponse.json({
    requested,
    processed: symbols.length,
    limit: MAX_BATCH_SYMBOLS,
    truncated: requested > MAX_BATCH_SYMBOLS,
    interval,
    exchange,
    results,
  });
}
