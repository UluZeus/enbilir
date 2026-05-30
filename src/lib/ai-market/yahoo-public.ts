import type { Candle } from "@/lib/ai-market/types";
import { getYahooProviderSymbolCandidates } from "@/lib/ai-market/yahoo-symbols";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

const intervalRanges: Record<string, string> = {
  "1m": "1d",
  "5m": "5d",
  "15m": "5d",
  "1h": "1mo",
  "4h": "6mo",
  "1d": "1y",
};

const yahooIntervals: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "1h",
  "1d": "1d",
};

function toNumber(value: number | null | undefined) {
  return Number.isFinite(value) && value !== null && value !== undefined ? value : 0;
}

function aggregateCandles(candles: Candle[], groupSize: number) {
  if (groupSize <= 1) {
    return candles;
  }

  const aggregated: Candle[] = [];

  for (let index = 0; index < candles.length; index += groupSize) {
    const group = candles.slice(index, index + groupSize);
    const first = group[0];
    const last = group[group.length - 1];

    if (!first || !last || group.length < groupSize) {
      continue;
    }

    aggregated.push({
      openTime: first.openTime,
      open: first.open,
      high: Math.max(...group.map((candle) => candle.high)),
      low: Math.min(...group.map((candle) => candle.low)),
      close: last.close,
      volume: group.reduce((sum, candle) => sum + candle.volume, 0),
    });
  }

  return aggregated;
}

async function fetchYahooCandlesForProviderSymbol(symbol: string, interval: string, timeoutMs: number): Promise<Candle[]> {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("range", intervalRanges[interval] ?? "1mo");
  url.searchParams.set("interval", yahooIntervals[interval] ?? "1h");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      next: { revalidate: 60 },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Yahoo public data unavailable (${response.status})`);
    }

    const data = (await response.json()) as YahooChartResponse;
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];

    if (!quote || timestamps.length === 0) {
      return [];
    }

    const candles = timestamps
      .map((timestamp, index) => ({
        openTime: timestamp * 1000,
        open: toNumber(quote.open?.[index]),
        high: toNumber(quote.high?.[index]),
        low: toNumber(quote.low?.[index]),
        close: toNumber(quote.close?.[index]),
        volume: toNumber(quote.volume?.[index]),
      }))
      .filter((candle) => candle.open > 0 && candle.high > 0 && candle.low > 0 && candle.close > 0)
      .sort((a, b) => a.openTime - b.openTime);

    return aggregateCandles(candles, interval === "4h" ? 4 : 1);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchYahooCandles(symbol: string, interval = "1h", timeoutMs = 5000): Promise<Candle[]> {
  const candidates = getYahooProviderSymbolCandidates(symbol);
  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      return await fetchYahooCandlesForProviderSymbol(candidate, interval, timeoutMs);
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : "Yahoo public data unavailable"}`);
    }
  }

  throw new Error(errors.length > 0 ? errors.join("; ") : "Yahoo public data unavailable");
}
