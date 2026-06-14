import { fetchJsonWithFallback } from "@/lib/http-json";
import { formatMarketItemValue, mixedMarketItems, type MarketItem } from "@/lib/market-data";

type LiveQuote = {
  symbol: string;
  open: number;
  close: number;
  provider: "binance" | "yahoo";
};

type BinanceTicker = {
  symbol: string;
  openPrice: string;
  lastPrice: string;
};

type YahooSparkResponse = {
  spark?: {
    result?: Array<{
      symbol?: string;
      response?: Array<{
        meta?: {
          currency?: string;
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
        };
      }>;
    }>;
  };
};

function liveFetchEnabled() {
  return process.env.ENABLE_LIVE_MARKET_FETCH !== "false";
}

function timeout<T>(milliseconds: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(fallback), milliseconds);
  });
}

async function fetchJson<T>(url: string, timeoutMs = 12_000): Promise<T | null> {
  try {
    return await fetchJsonWithFallback<T>(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      timeoutMs,
    });
  } catch {
    return null;
  }
}

async function fetchJsonBatch<T>(urls: string[], timeoutMs = 12_000): Promise<Array<T | null>> {
  return Promise.all(urls.map((url) => fetchJson<T>(url, timeoutMs)));
}

function isBinanceTicker(value: unknown): value is BinanceTicker {
  if (!value || typeof value !== "object") {
    return false;
  }

  const ticker = value as Record<string, unknown>;

  return (
    typeof ticker.symbol === "string" &&
    typeof ticker.openPrice === "string" &&
    typeof ticker.lastPrice === "string"
  );
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCryptoQuoteSymbol(item: MarketItem) {
  return `${item.symbol.trim().toUpperCase()}USDT`;
}

function getYahooQuoteSymbol(item: MarketItem) {
  if (item.category === "BIST") {
    const normalized = item.symbol.trim().toUpperCase();
    return normalized.endsWith(".IS") ? normalized : `${normalized}.IS`;
  }

  if (item.category === "NASDAQ" || item.category === "DOW") {
    return item.symbol.trim().toUpperCase();
  }

  if (item.category === "INDEX") {
    const indexSymbols: Record<string, string> = {
      "s&p 500": "^GSPC",
      nasdaq: "^IXIC",
      djia: "^DJI",
    };

    return indexSymbols[item.symbol.trim().toLowerCase()];
  }

  const commoditySymbols: Record<string, string> = {
    "XAU/USD": "GC=F",
    "XAG/USD": "SI=F",
    GRAM_GOLD_USD: "GC=F",
    GRAM_SILVER_USD: "SI=F",
    COPPER: "HG=F",
    PALLADIUM: "PA=F",
    PLATIN: "PL=F",
    WTI: "CL=F",
    BRENT: "BZ=F",
    NATGAS: "NG=F",
  };

  const fxSymbols: Record<string, string> = {
    "USD/TRY": "USDTRY=X",
    "EUR/TRY": "EURTRY=X",
    "GBP/TRY": "GBPTRY=X",
    "CHF/TRY": "CHFTRY=X",
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "USD/JPY": "USDJPY=X",
    "USD/CHF": "USDCHF=X",
    "AUD/USD": "AUDUSD=X",
    "USD/CAD": "USDCAD=X",
  };

  return commoditySymbols[item.symbol.trim().toUpperCase()] ?? fxSymbols[item.symbol.trim().toUpperCase()];
}

function getYahooBatchSymbols(items: MarketItem[]) {
  return Array.from(
    new Set(
      items
        .filter((item) => item.source !== "representative" && item.category !== "CRYPTO")
        .map((item) => getYahooQuoteSymbol(item))
        .filter((symbol): symbol is string => Boolean(symbol)),
    ),
  );
}

function getQuoteKey(item: MarketItem) {
  if (item.symbol === "GRAM_GOLD_USD") {
    return "GRAM_GOLD_USD";
  }

  if (item.symbol === "GRAM_SILVER_USD") {
    return "GRAM_SILVER_USD";
  }

  if (item.category === "CRYPTO") {
    return getCryptoQuoteSymbol(item);
  }

  const yahooSymbol = getYahooQuoteSymbol(item);
  return yahooSymbol ? yahooSymbol.toUpperCase() : item.dataSymbol.toUpperCase();
}

function normalizeLiveQuote(fallback: MarketItem, quote?: LiveQuote): MarketItem {
  if (!quote || !Number.isFinite(quote.close) || quote.close <= 0) {
    return {
      ...fallback,
      dataStatus: fallback.dataStatus === "representative" ? "representative" : "close",
      source: fallback.source === "representative" ? "representative" : "fallback",
    };
  }

  const changePercent = quote.open > 0 ? ((quote.close - quote.open) / quote.open) * 100 : 0;

  return {
    ...fallback,
    price: formatMarketItemValue(quote.close, fallback.category),
    priceUsd: quote.close,
    changePercent,
    dataStatus: "live",
    source: quote.provider,
  };
}

export function getFallbackMarketItems(): MarketItem[] {
  return mixedMarketItems.map((fallback) => normalizeLiveQuote(fallback));
}

async function fetchBinanceQuotes(items: MarketItem[]) {
  const targetSymbols = new Set(
    items
      .filter((item) => item.category === "CRYPTO" && item.source !== "representative")
      .map((item) => getCryptoQuoteSymbol(item)),
  );

  if (targetSymbols.size === 0) {
    return new Map<string, LiveQuote>();
  }

  const payload = await fetchJson<unknown[]>("https://api.binance.com/api/v3/ticker/24hr", 12_000);

  if (!Array.isArray(payload)) {
    return new Map<string, LiveQuote>();
  }

  const quoteMap = new Map<string, LiveQuote>();

  for (const entry of payload) {
    if (!isBinanceTicker(entry)) {
      continue;
    }

    const symbol = entry.symbol.toUpperCase();

    if (!targetSymbols.has(symbol)) {
      continue;
    }

    const open = toFiniteNumber(entry.openPrice);
    const close = toFiniteNumber(entry.lastPrice);

    if (!Number.isFinite(close) || close === null || close <= 0) {
      continue;
    }

    quoteMap.set(symbol, {
      symbol,
      open: open && open > 0 ? open : close,
      close,
      provider: "binance",
    });
  }

  return quoteMap;
}

async function fetchYahooSparkQuotes(symbols: string[]) {
  const batches: string[][] = [];
  const batchSize = 10;

  for (let index = 0; index < symbols.length; index += batchSize) {
    batches.push(symbols.slice(index, index + batchSize));
  }

  const payloads = await fetchJsonBatch<YahooSparkResponse>(
    batches.map((batch) => `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(batch.join(","))}&range=1d&interval=1d`),
    12_000,
  );

  const merged = new Map<string, LiveQuote>();
  for (const payload of payloads) {
    for (const entry of payload?.spark?.result ?? []) {
      const meta = entry.response?.[0]?.meta;
      const symbol = entry.symbol?.toUpperCase();
      const price = toFiniteNumber(meta?.regularMarketPrice);
      const previousClose = toFiniteNumber(meta?.chartPreviousClose ?? meta?.previousClose);

      if (!symbol || price === null || price <= 0) {
        continue;
      }

      merged.set(symbol, {
        symbol,
        open: previousClose && previousClose > 0 ? previousClose : price,
        close: price,
        provider: "yahoo",
      });
    }
  }

  return merged;
}

function deriveGramMetalQuotes(quoteMap: Map<string, LiveQuote>) {
  const gold = quoteMap.get("GC=F");
  const silver = quoteMap.get("SI=F");

  if (gold && Number.isFinite(gold.close) && gold.close > 0) {
    quoteMap.set("GRAM_GOLD_USD", {
      symbol: "GRAM_GOLD_USD",
      open: gold.open / 31.1035,
      close: gold.close / 31.1035,
      provider: "yahoo",
    });
  }

  if (silver && Number.isFinite(silver.close) && silver.close > 0) {
    quoteMap.set("GRAM_SILVER_USD", {
      symbol: "GRAM_SILVER_USD",
      open: silver.open / 31.1035,
      close: silver.close / 31.1035,
      provider: "yahoo",
    });
  }
}

async function loadQuotedItems(items: MarketItem[]): Promise<MarketItem[]> {
  const quoteMap = new Map<string, LiveQuote>();
  const [binanceQuotes, yahooQuotes] = await Promise.all([
    fetchBinanceQuotes(items),
    fetchYahooSparkQuotes(getYahooBatchSymbols(items)),
  ]);

  for (const [symbol, quote] of binanceQuotes) {
    quoteMap.set(symbol, quote);
  }

  for (const [symbol, quote] of yahooQuotes) {
    quoteMap.set(symbol, quote);
  }

  deriveGramMetalQuotes(quoteMap);

  return items.map((fallback) => {
    const key = getQuoteKey(fallback).toUpperCase();
    return normalizeLiveQuote(fallback, quoteMap.get(key));
  });
}

export async function getLiveMarketItems(): Promise<MarketItem[]> {
  const fallbackItems = getFallbackMarketItems();

  if (!liveFetchEnabled()) {
    return fallbackItems;
  }

  async function loadItems() {
    return loadQuotedItems(mixedMarketItems);
  }

  try {
    return await Promise.race([loadItems(), timeout(7500, fallbackItems)]);
  } catch {
    return fallbackItems;
  }
}

export async function getLiveMarketItemsForSymbols(symbols: string[]): Promise<MarketItem[]> {
  const requestedSymbols = new Set(symbols);
  const fallbackItems = getFallbackMarketItems().filter((item) => requestedSymbols.has(item.symbol));

  if (!liveFetchEnabled() || fallbackItems.length === 0) {
    return fallbackItems;
  }

  try {
    return await loadQuotedItems(fallbackItems);
  } catch {
    return fallbackItems;
  }
}

export async function getLiveMarketItem(symbol: string): Promise<MarketItem | undefined> {
  const fallbackItem = getFallbackMarketItems().find((item) => item.symbol === symbol);

  if (!liveFetchEnabled()) {
    return fallbackItem;
  }

  try {
    const items = await getLiveMarketItemsForSymbols([symbol]);
    return items.find((item) => item.symbol === symbol) ?? fallbackItem;
  } catch {
    return fallbackItem;
  }
}

export function getTopRisersFrom(items: MarketItem[]) {
  return [...items].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
}

export function getTopFallersFrom(items: MarketItem[]) {
  return [...items].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
}
