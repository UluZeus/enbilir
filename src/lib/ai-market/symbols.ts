import type { WatchSymbol } from "@/lib/ai-market/types";

export const AI_MARKET_SYMBOLS: WatchSymbol[] = [
  {
    symbol: "BTCUSDT",
    name: "Bitcoin",
    baseAsset: "BTC",
    quoteAsset: "USDT",
    assetClass: "CRYPTO",
    binanceSymbol: "BTCUSDT",
    gateSymbol: "BTC_USDT",
  },
  {
    symbol: "ETHUSDT",
    name: "Ethereum",
    baseAsset: "ETH",
    quoteAsset: "USDT",
    assetClass: "CRYPTO",
    binanceSymbol: "ETHUSDT",
    gateSymbol: "ETH_USDT",
  },
  {
    symbol: "SOLUSDT",
    name: "Solana",
    baseAsset: "SOL",
    quoteAsset: "USDT",
    assetClass: "CRYPTO",
    binanceSymbol: "SOLUSDT",
    gateSymbol: "SOL_USDT",
  },
  {
    symbol: "BNBUSDT",
    name: "BNB",
    baseAsset: "BNB",
    quoteAsset: "USDT",
    assetClass: "CRYPTO",
    binanceSymbol: "BNBUSDT",
    gateSymbol: "BNB_USDT",
  },
  {
    symbol: "XRPUSDT",
    name: "XRP",
    baseAsset: "XRP",
    quoteAsset: "USDT",
    assetClass: "CRYPTO",
    binanceSymbol: "XRPUSDT",
    gateSymbol: "XRP_USDT",
  },
  {
    symbol: "XAUUSD",
    name: "Ons Altın",
    baseAsset: "XAU",
    quoteAsset: "USD",
    assetClass: "COMMODITY",
    binanceSymbol: "",
    gateSymbol: "",
    yahooSymbol: "GC=F",
  },
  {
    symbol: "XAGUSD",
    name: "Ons Gümüş",
    baseAsset: "XAG",
    quoteAsset: "USD",
    assetClass: "COMMODITY",
    binanceSymbol: "",
    gateSymbol: "",
    yahooSymbol: "SI=F",
  },
  {
    symbol: "USDTRY",
    name: "Dolar/TL",
    baseAsset: "USD",
    quoteAsset: "TRY",
    assetClass: "FX",
    binanceSymbol: "",
    gateSymbol: "",
    yahooSymbol: "USDTRY=X",
  },
];

export function getWatchSymbol(symbolValue: string | null) {
  const normalized = (symbolValue ?? "").toUpperCase();

  return AI_MARKET_SYMBOLS.find((item) => item.symbol === normalized) ?? AI_MARKET_SYMBOLS[0];
}
