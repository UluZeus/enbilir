import type { Candle, MarketExchange } from "@/lib/ai-market/types";
import { getAssetUniverseItem } from "@/lib/ai-market/asset-universe";
import { getYahooProviderSymbolCandidates, resolveYahooProviderSymbol } from "@/lib/ai-market/yahoo-symbols";

export type AssetPerformanceChanges = {
  "1h": number | null;
  "1d": number | null;
  "1m": number | null;
  "1y": number | null;
};

export type AssetPerformance = {
  symbol: string;
  providerSymbol: string;
  price: number | null;
  changes: AssetPerformanceChanges;
  updatedAt: string;
};

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

type AssetPerformanceExchange = MarketExchange | "yahoo";

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

const BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines";
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const BINANCE_TIMEOUT_MS = 5500;
const YAHOO_TIMEOUT_MS = 6500;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const emptyChanges: AssetPerformanceChanges = {
  "1h": null,
  "1d": null,
  "1m": null,
  "1y": null,
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toCandle(row: BinanceKline): Candle | null {
  const open = toNumber(row[1]);
  const high = toNumber(row[2]);
  const low = toNumber(row[3]);
  const close = toNumber(row[4]);
  const volume = toNumber(row[5]);

  if (open === null || high === null || low === null || close === null || volume === null) {
    return null;
  }

  return {
    openTime: row[0],
    open,
    high,
    low,
    close,
    volume,
  };
}

async function fetchBinancePerformanceCandles(symbol: string, interval: "1h" | "1d", limit: number) {
  const url = new URL(BINANCE_KLINES_URL);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BINANCE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Binance performance data unavailable (${response.status})`);
    }

    const rows = (await response.json()) as BinanceKline[];

    return rows.map(toCandle).filter((candle): candle is Candle => candle !== null);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchYahooPerformanceCandles(providerSymbol: string, interval: "5m" | "1h" | "1d", range: string) {
  const url = new URL(`${YAHOO_CHART_URL}/${encodeURIComponent(providerSymbol)}`);
  url.searchParams.set("range", range);
  url.searchParams.set("interval", interval);
  url.searchParams.set("includePrePost", "false");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), YAHOO_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as YahooChartResponse;
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const quote = result?.indicators?.quote?.[0];

    if (!quote || timestamps.length === 0) {
      return [];
    }

    return timestamps
      .map((timestamp, index) => {
        const open = toNumber(quote.open?.[index]);
        const high = toNumber(quote.high?.[index]);
        const low = toNumber(quote.low?.[index]);
        const close = toNumber(quote.close?.[index]);
        const volume = toNumber(quote.volume?.[index]) ?? 0;

        if (open === null || high === null || low === null || close === null || open <= 0 || high <= 0 || low <= 0 || close <= 0) {
          return null;
        }

        return {
          openTime: timestamp * 1000,
          open,
          high,
          low,
          close,
          volume,
        };
      })
      .filter((candle): candle is Candle => candle !== null)
      .sort((left, right) => left.openTime - right.openTime);
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function calculateChange(currentPrice: number | null, oldPrice: number | null) {
  if (currentPrice === null || oldPrice === null || oldPrice <= 0) {
    return null;
  }

  return ((currentPrice - oldPrice) / oldPrice) * 100;
}

function getCloseFromEnd(candles: Candle[], periodsAgo: number) {
  const index = candles.length - 1 - periodsAgo;
  const candle = candles[index];

  return candle?.close ?? null;
}

function getCloseAtOrBefore(candles: Candle[], targetTime: number) {
  for (let index = candles.length - 1; index >= 0; index -= 1) {
    if (candles[index].openTime <= targetTime) {
      return candles[index].close;
    }
  }

  return null;
}

function getLatestClose(candles: Candle[]) {
  return candles[candles.length - 1]?.close ?? null;
}

function buildEmptyPerformance(symbol: string, providerSymbol: string): AssetPerformance {
  return {
    symbol,
    providerSymbol,
    price: null,
    changes: emptyChanges,
    updatedAt: new Date().toISOString(),
  };
}

function resolveYahooPerformanceSymbol(symbol: string) {
  const asset = getAssetUniverseItem(symbol);

  return asset?.providerSymbol ?? resolveYahooProviderSymbol(symbol);
}

async function getBinanceAssetPerformance(symbol: string): Promise<AssetPerformance> {
  try {
    const [hourlyCandles, dailyCandles] = await Promise.all([
      fetchBinancePerformanceCandles(symbol, "1h", 25),
      fetchBinancePerformanceCandles(symbol, "1d", 370),
    ]);

    const currentPrice = getLatestClose(hourlyCandles) ?? getLatestClose(dailyCandles);
    const now = Date.now();

    return {
      symbol,
      providerSymbol: symbol,
      price: currentPrice,
      changes: {
        "1h": calculateChange(currentPrice, getCloseFromEnd(hourlyCandles, 1)),
        "1d": calculateChange(currentPrice, getCloseFromEnd(hourlyCandles, 24)),
        "1m": calculateChange(currentPrice, getCloseAtOrBefore(dailyCandles, now - 30 * ONE_DAY_MS)),
        "1y": calculateChange(currentPrice, getCloseAtOrBefore(dailyCandles, now - 365 * ONE_DAY_MS)),
      },
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return buildEmptyPerformance(symbol, symbol);
  }
}

async function getYahooAssetPerformance(symbol: string): Promise<AssetPerformance> {
  const providerSymbol = resolveYahooPerformanceSymbol(symbol);
  const candidates = unique([providerSymbol, ...getYahooProviderSymbolCandidates(symbol)]);

  for (const candidate of candidates) {
    const [intradayCandles, hourlyCandles, dailyCandles] = await Promise.all([
      fetchYahooPerformanceCandles(candidate, "5m", "5d"),
      fetchYahooPerformanceCandles(candidate, "1h", "1mo"),
      fetchYahooPerformanceCandles(candidate, "1d", "2y"),
    ]);

    const currentPrice = getLatestClose(intradayCandles) ?? getLatestClose(hourlyCandles) ?? getLatestClose(dailyCandles);

    if (currentPrice === null) {
      continue;
    }

    const now = Date.now();

    return {
      symbol,
      providerSymbol: candidate,
      price: currentPrice,
      changes: {
        "1h": calculateChange(currentPrice, getCloseAtOrBefore(intradayCandles.length > 0 ? intradayCandles : hourlyCandles, now - 60 * 60 * 1000)),
        "1d": calculateChange(currentPrice, getCloseAtOrBefore(hourlyCandles.length > 0 ? hourlyCandles : dailyCandles, now - ONE_DAY_MS)),
        "1m": calculateChange(currentPrice, getCloseAtOrBefore(dailyCandles, now - 30 * ONE_DAY_MS)),
        "1y": calculateChange(currentPrice, getCloseAtOrBefore(dailyCandles, now - 365 * ONE_DAY_MS)),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  return buildEmptyPerformance(symbol, providerSymbol);
}

export async function getAssetPerformance(symbol: string, exchange: AssetPerformanceExchange): Promise<AssetPerformance> {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (exchange !== "yahoo" && normalizedSymbol.endsWith("USDT")) {
    return getBinanceAssetPerformance(normalizedSymbol);
  }

  return getYahooAssetPerformance(normalizedSymbol);
}
