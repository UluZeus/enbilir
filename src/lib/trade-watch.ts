import type { MarketItem } from "@/lib/market-data";

export type TradeAnalysisTarget = {
  symbol: string;
  exchange: "binance" | "gate" | "yahoo";
};

const commoditySymbolMap: Record<string, string> = {
  "XAU/USD": "XAUUSD",
  "XAG/USD": "XAGUSD",
  GRAM_GOLD_USD: "GC=F",
  GRAM_SILVER_USD: "SI=F",
  COPPER: "HG=F",
  PALLADIUM: "PA=F",
  PLATIN: "PL=F",
  WTI: "CL=F",
  BRENT: "BZ=F",
  NATGAS: "NG=F",
};

const fxSymbolMap: Record<string, string> = {
  "USD/TRY": "USDTRY",
  "EUR/TRY": "EURTRY",
  "GBP/TRY": "GBPTRY",
  "CHF/TRY": "CHFTRY",
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "USD/JPY": "USDJPY=X",
  "USD/CHF": "USDCHF=X",
  "AUD/USD": "AUDUSD=X",
  "USD/CAD": "USDCAD=X",
};

const indexSymbolMap: Record<string, string> = {
  "S&P 500": "^GSPC",
  NASDAQ: "^IXIC",
  DJIA: "^DJI",
};

function normalizeCryptoSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();

  if (normalized.endsWith("USDT")) {
    return normalized;
  }

  return `${normalized}USDT`;
}

export function getTradeAnalysisTarget(item: MarketItem): TradeAnalysisTarget | null {
  if (item.category === "CRYPTO") {
    return { symbol: normalizeCryptoSymbol(item.symbol), exchange: "binance" };
  }

  if (item.category === "BIST") {
    const normalized = item.symbol.trim().toUpperCase();
    return { symbol: normalized.endsWith(".IS") ? normalized : `${normalized}.IS`, exchange: "yahoo" };
  }

  if (item.category === "NASDAQ" || item.category === "DOW") {
    return { symbol: item.symbol.trim().toUpperCase(), exchange: "yahoo" };
  }

  if (item.category === "COMMODITY") {
    const mappedSymbol = commoditySymbolMap[item.symbol.trim().toUpperCase()];
    return mappedSymbol ? { symbol: mappedSymbol, exchange: "yahoo" } : null;
  }

  if (item.category === "FX") {
    const mappedSymbol = fxSymbolMap[item.symbol.trim().toUpperCase()];
    return mappedSymbol ? { symbol: mappedSymbol, exchange: "yahoo" } : null;
  }

  if (item.category === "INDEX") {
    const mappedSymbol = indexSymbolMap[item.symbol.trim().toUpperCase()];
    return mappedSymbol ? { symbol: mappedSymbol, exchange: "yahoo" } : null;
  }

  return null;
}
