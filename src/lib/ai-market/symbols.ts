import type { WatchSymbol } from "@/lib/ai-market/types";

export const AI_MARKET_SYMBOLS: WatchSymbol[] = [
  {
    symbol: "BTCUSDT",
    name: "Bitcoin",
    baseAsset: "BTC",
    quoteAsset: "USDT",
    binanceSymbol: "BTCUSDT",
    gateSymbol: "BTC_USDT",
  },
  {
    symbol: "ETHUSDT",
    name: "Ethereum",
    baseAsset: "ETH",
    quoteAsset: "USDT",
    binanceSymbol: "ETHUSDT",
    gateSymbol: "ETH_USDT",
  },
  {
    symbol: "SOLUSDT",
    name: "Solana",
    baseAsset: "SOL",
    quoteAsset: "USDT",
    binanceSymbol: "SOLUSDT",
    gateSymbol: "SOL_USDT",
  },
  {
    symbol: "BNBUSDT",
    name: "BNB",
    baseAsset: "BNB",
    quoteAsset: "USDT",
    binanceSymbol: "BNBUSDT",
    gateSymbol: "BNB_USDT",
  },
  {
    symbol: "XRPUSDT",
    name: "XRP",
    baseAsset: "XRP",
    quoteAsset: "USDT",
    binanceSymbol: "XRPUSDT",
    gateSymbol: "XRP_USDT",
  },
];

export function getWatchSymbol(symbolValue: string | null) {
  const normalized = (symbolValue ?? "").toUpperCase();

  return AI_MARKET_SYMBOLS.find((item) => item.symbol === normalized) ?? AI_MARKET_SYMBOLS[0];
}
