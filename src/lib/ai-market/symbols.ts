import type { WatchSymbol } from "@/lib/ai-market/types";
import { getAssetUniverseItem, toWatchSymbol } from "@/lib/ai-market/asset-universe";
import { resolveYahooProviderSymbol } from "@/lib/ai-market/yahoo-symbols";

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
    symbol: "DOGEUSDT",
    name: "Dogecoin",
    baseAsset: "DOGE",
    quoteAsset: "USDT",
    assetClass: "CRYPTO",
    binanceSymbol: "DOGEUSDT",
    gateSymbol: "DOGE_USDT",
  },
  {
    symbol: "AVAXUSDT",
    name: "Avalanche",
    baseAsset: "AVAX",
    quoteAsset: "USDT",
    assetClass: "CRYPTO",
    binanceSymbol: "AVAXUSDT",
    gateSymbol: "AVAX_USDT",
  },
  {
    symbol: "XAUUSD",
    name: "Ons Altın",
    baseAsset: "XAU",
    quoteAsset: "USD",
    assetClass: "COMMODITY",
    binanceSymbol: "",
    gateSymbol: "",
    yahooSymbol: resolveYahooProviderSymbol("XAUUSD"),
  },
  {
    symbol: "XAGUSD",
    name: "Ons Gümüş",
    baseAsset: "XAG",
    quoteAsset: "USD",
    assetClass: "COMMODITY",
    binanceSymbol: "",
    gateSymbol: "",
    yahooSymbol: resolveYahooProviderSymbol("XAGUSD"),
  },
  {
    symbol: "USDTRY",
    name: "Dolar/TL",
    baseAsset: "USD",
    quoteAsset: "TRY",
    assetClass: "FX",
    binanceSymbol: "",
    gateSymbol: "",
    yahooSymbol: resolveYahooProviderSymbol("USDTRY"),
  },
];

export function getWatchSymbol(symbolValue: string | null) {
  const normalized = (symbolValue ?? "").toUpperCase();

  const watchSymbol = AI_MARKET_SYMBOLS.find((item) => item.symbol === normalized);

  if (watchSymbol) {
    return watchSymbol;
  }

  const universeAsset = getAssetUniverseItem(normalized);

  return universeAsset ? toWatchSymbol(universeAsset) : AI_MARKET_SYMBOLS[0];
}
