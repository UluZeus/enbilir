import { mixedMarketItems, type MarketItem } from "@/lib/market-data";

type StooqQuote = {
  symbol: string;
  open: number;
  close: number;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 10 ? 4 : 2,
  }).format(value);
}

function normalizeQuote(fallback: MarketItem, quote?: StooqQuote): MarketItem {
  if (!quote || !Number.isFinite(quote.close) || quote.close <= 0) {
    return {
      ...fallback,
      dataStatus: fallback.dataStatus === "representative" ? "representative" : "close",
      source: fallback.source === "representative" ? "representative" : "fallback",
    };
  }

  const changePercent = quote.open > 0 ? ((quote.close - quote.open) / quote.open) * 100 : fallback.changePercent;

  return {
    ...fallback,
    price: formatPrice(quote.close),
    priceUsd: quote.close,
    changePercent,
    dataStatus: "delayed",
    source: "stooq",
  };
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
        next: { revalidate: 60 },
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

export async function getLiveMarketItems(): Promise<MarketItem[]> {
  try {
    const quoteableItems = mixedMarketItems.filter((item) => item.source !== "representative");
    const quoteResults = await Promise.allSettled(
      quoteableItems.map((item) => fetchStooqQuote(item.dataSymbol)),
    );
    const quoteMap = new Map(
      quoteResults
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter((quote): quote is StooqQuote => Boolean(quote))
        .map((quote) => [quote.symbol, quote]),
    );

    return mixedMarketItems.map((fallback) =>
      normalizeQuote(fallback, quoteMap.get(fallback.dataSymbol.toLowerCase())),
    );
  } catch {
    return mixedMarketItems.map((fallback) => normalizeQuote(fallback));
  }
}

export async function getLiveMarketItem(symbol: string): Promise<MarketItem | undefined> {
  try {
    const items = await getLiveMarketItems();
    return items.find((item) => item.symbol === symbol);
  } catch {
    return mixedMarketItems.find((item) => item.symbol === symbol);
  }
}

export function getTopRisersFrom(items: MarketItem[]) {
  return [...items].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
}

export function getTopFallersFrom(items: MarketItem[]) {
  return [...items].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
}
