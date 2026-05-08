import { mixedMarketItems, type MarketItem } from "@/lib/market-data";

type StooqQuote = {
  symbol: string;
  open: number;
  close: number;
};

type YahooChartQuote = {
  currency?: string;
  price: number;
  previousClose?: number;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value);
}

function getQuotePriceUsd(fallback: MarketItem, quote: StooqQuote, usdTryClose?: number) {
  if (fallback.symbol === "USD/TRY") {
    return 1;
  }

  if (fallback.dataSymbol.endsWith(".tr") || fallback.dataSymbol.toLowerCase().endsWith("try")) {
    return usdTryClose && usdTryClose > 0 ? quote.close / usdTryClose : fallback.priceUsd;
  }

  if (fallback.dataSymbol === "hg.f") {
    return quote.close / 100;
  }

  return quote.close;
}

function normalizeQuote(fallback: MarketItem, quote?: StooqQuote, usdTryClose?: number): MarketItem {
  if (!quote || !Number.isFinite(quote.close) || quote.close <= 0) {
    return {
      ...fallback,
      dataStatus: fallback.dataStatus === "representative" ? "representative" : "close",
      source: fallback.source === "representative" ? "representative" : "fallback",
    };
  }

  const changePercent = quote.open > 0 ? ((quote.close - quote.open) / quote.open) * 100 : fallback.changePercent;
  const priceUsd = getQuotePriceUsd(fallback, quote, usdTryClose);

  return {
    ...fallback,
    price: formatPrice(priceUsd),
    priceUsd,
    changePercent,
    dataStatus: "delayed",
    source: "stooq",
  };
}

export function getFallbackMarketItems(): MarketItem[] {
  return mixedMarketItems.map((fallback) => normalizeQuote(fallback));
}

function parseStooqCsv(csv: string): StooqQuote | null {
  const [, row] = csv.trim().split(/\r?\n/);

  if (!row) {
    return null;
  }

  const [symbol, , , open, , , close] = row.split(",");

  if (!symbol || open === "N/D" || close === "N/D") {
    return null;
  }

  return {
    symbol: symbol.toLowerCase(),
    open: Number(open),
    close: Number(close),
  };
}

function timeout<T>(milliseconds: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(fallback), milliseconds);
  });
}

function liveFetchEnabled() {
  return process.env.ENABLE_LIVE_MARKET_FETCH !== "false";
}

async function fetchStooqQuote(symbol: string): Promise<StooqQuote | null> {
  try {
    const response = await fetch(
      `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`,
      {
        headers: {
          Accept: "text/csv",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(2200),
      },
    );

    if (!response.ok) {
      return null;
    }

    return parseStooqCsv(await response.text());
  } catch {
    return null;
  }
}

function getYahooSymbol(item: MarketItem) {
  if (item.category === "BIST") {
    return `${item.symbol}.IS`;
  }

  if (item.category === "CRYPTO") {
    return `${item.symbol}-USD`;
  }

  const symbols: Record<string, string> = {
    "xauusd": "GC=F",
    "xagusd": "SI=F",
    "hg.f": "HG=F",
    "pl.f": "PL=F",
    "pa.f": "PA=F",
    "cl.f": "CL=F",
    "brn.f": "BZ=F",
    "ng.f": "NG=F",
  };

  return symbols[item.dataSymbol.toLowerCase()];
}

async function fetchYahooChartQuote(symbol: string): Promise<YahooChartQuote | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(2200),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as {
      chart?: {
        result?: Array<{
          meta?: {
            currency?: string;
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
          };
        }>;
      };
    };
    const meta = data.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;

    if (!Number.isFinite(price) || !price || price <= 0) {
      return null;
    }

    return {
      currency: meta?.currency,
      price,
      previousClose: meta?.chartPreviousClose ?? meta?.previousClose,
    };
  } catch {
    return null;
  }
}

async function fetchYahooPriceUsd(item: MarketItem, usdTryClose?: number): Promise<StooqQuote | null> {
  const yahooSymbol = getYahooSymbol(item);

  if (!yahooSymbol) {
    return null;
  }

  const quote = await fetchYahooChartQuote(yahooSymbol);

  if (!quote) {
    return null;
  }

  const priceUsd = quote.currency === "TRY" ? usdTryClose && usdTryClose > 0 ? quote.price / usdTryClose : null : quote.price;
  const previousCloseUsd = quote.previousClose && quote.previousClose > 0
    ? quote.currency === "TRY" && usdTryClose && usdTryClose > 0
      ? quote.previousClose / usdTryClose
      : quote.previousClose
    : priceUsd;

  if (!Number.isFinite(priceUsd) || !priceUsd || priceUsd <= 0) {
    return null;
  }

  return {
    symbol: item.dataSymbol.toLowerCase(),
    open: previousCloseUsd ?? priceUsd,
    close: priceUsd,
  };
}

function needsUsdTryQuote(item: MarketItem) {
  const dataSymbol = item.dataSymbol.toLowerCase();

  return item.symbol !== "USD/TRY" && (dataSymbol.endsWith(".tr") || dataSymbol.endsWith("try"));
}

async function loadQuotedItems(items: MarketItem[]): Promise<MarketItem[]> {
  const quoteableItems = items.filter((item) => item.source !== "representative");
  const dataSymbols = new Set(quoteableItems.map((item) => item.dataSymbol));

  if (quoteableItems.some(needsUsdTryQuote)) {
    dataSymbols.add("usdtry");
  }

  const quoteResults = await Promise.allSettled([...dataSymbols].map((symbol) => fetchStooqQuote(symbol)));
  const quoteMap = new Map(
    quoteResults
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter((quote): quote is StooqQuote => Boolean(quote))
      .map((quote) => [quote.symbol, quote]),
  );
  const usdTryClose = quoteMap.get("usdtry")?.close;
  const yahooUsdTry = usdTryClose ?? (await fetchYahooChartQuote("USDTRY=X"))?.price;
  const yahooResults = await Promise.allSettled(
    items
      .filter((item) => !quoteMap.has(item.dataSymbol.toLowerCase()))
      .map((item) => fetchYahooPriceUsd(item, yahooUsdTry)),
  );

  for (const quote of yahooResults
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((result): result is StooqQuote => Boolean(result))) {
    quoteMap.set(quote.symbol, quote);
  }

  return items.map((fallback) =>
    normalizeQuote(fallback, quoteMap.get(fallback.dataSymbol.toLowerCase()), yahooUsdTry),
  );
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
    return await Promise.race([loadItems(), timeout(3600, fallbackItems)]);
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
