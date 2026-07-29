import type { MarketItem } from "@/lib/market-data";

const maximumYahooCommodityAgeMs = 2 * 60_000;
const maximumYahooAgeMs = 20 * 60_000;
const maximumBinanceAgeMs = 5 * 60_000;
const maximumGateAgeMs = 2 * 60_000;
const maximumGateRetrievalAgeMs = 15_000;
const gramTroyOunceDivisor = 31.1034768;
export const nonExecutableCommoditySymbols = new Set(["COPPER", "BRONZE"]);

export const gateCommodityContracts: Readonly<Record<string, string>> = {
  "XAU/USD": "XAU_USDT",
  GRAM_GOLD_USD: "XAU_USDT",
  "XAG/USD": "XAG_USDT",
  GRAM_SILVER_USD: "XAG_USDT",
  WTI: "CL_USDT",
  BRENT: "BZ_USDT",
  NATGAS: "NG_USDT",
  PLATIN: "XPT_USDT",
  PALLADIUM: "XPD_USDT",
};

export const gateCommodityPriceUnits: Readonly<Record<string, MarketItem["priceUnit"]>> = {
  "XAU/USD": "TROY_OUNCE",
  GRAM_GOLD_USD: "GRAM",
  "XAG/USD": "TROY_OUNCE",
  GRAM_SILVER_USD: "GRAM",
  WTI: "BARREL",
  BRENT: "BARREL",
  NATGAS: "MMBTU",
  PLATIN: "TROY_OUNCE",
  PALLADIUM: "TROY_OUNCE",
};

export const knownYahooCommodityFutures: Readonly<Record<string, string>> = {
  "GC=F": "CMX",
  "SI=F": "CMX",
  "HG=F": "CMX",
  "PA=F": "NYM",
  "PL=F": "NYM",
  "CL=F": "NYM",
  "BZ=F": "NYM",
  "NG=F": "NYM",
};

type YahooCommoditySessionMetadata = {
  providerSymbol: string;
  instrumentType: string;
  exchange: string;
  sourceAsOf: string;
  regularSessionStart: string;
  regularSessionEnd: string;
  exchangeDataDelayedBy?: number;
};

export function canInferYahooCommodityOpen(
  metadata: YahooCommoditySessionMetadata,
  now = Date.now(),
) {
  const providerSymbol = metadata.providerSymbol.toUpperCase();
  const expectedExchange = knownYahooCommodityFutures[providerSymbol];
  const sourceTime = Date.parse(metadata.sourceAsOf);
  const sessionStart = Date.parse(metadata.regularSessionStart);
  const sessionEnd = Date.parse(metadata.regularSessionEnd);
  const age = now - sourceTime;

  return (
    Boolean(expectedExchange) &&
    metadata.instrumentType.toUpperCase() === "FUTURE" &&
    metadata.exchange.toUpperCase() === expectedExchange &&
    Number.isFinite(sourceTime) &&
    age >= 0 &&
    age <= maximumYahooCommodityAgeMs &&
    (!Number.isFinite(metadata.exchangeDataDelayedBy) || Number(metadata.exchangeDataDelayedBy) <= 0) &&
    Number.isFinite(sessionStart) &&
    Number.isFinite(sessionEnd) &&
    sessionStart < sessionEnd &&
    now >= sessionStart &&
    now <= sessionEnd
  );
}

export function isExecutableMarketQuote(
  item: MarketItem,
  options: { now?: number; requireEligibilityFlag?: boolean } = {},
) {
  const now = options.now ?? Date.now();

  if (options.requireEligibilityFlag !== false && item.executionEligible !== true) {
    return false;
  }

  if (item.category === "COMMODITY" && nonExecutableCommoditySymbols.has(item.symbol)) {
    return false;
  }

  if (
    !["binance", "yahoo", "gate"].includes(item.source) ||
    !Number.isFinite(item.priceUsd) ||
    item.priceUsd <= 0 ||
    !item.sourceAsOf ||
    item.dataStatus !== "live"
  ) {
    return false;
  }

  const sourceTime = Date.parse(item.sourceAsOf);
  const age = now - sourceTime;

  if (!Number.isFinite(sourceTime) || sourceTime <= 0 || age < 0) {
    return false;
  }

  if (Number.isFinite(item.exchangeDataDelayedBy) && Number(item.exchangeDataDelayedBy) > 0) {
    return false;
  }

  const marketState = String(item.marketState ?? "UNKNOWN").toUpperCase();
  const isInferredCommodityState =
    item.source === "yahoo" &&
    item.category === "COMMODITY" &&
    marketState === "INFERRED_REGULAR" &&
    item.marketStateSource === "inferred-commodity-session";
  const isExplicitOpenState = marketState === "REGULAR";

  if (item.source === "gate") {
    const expectedContract = gateCommodityContracts[item.symbol];
    const expectedPriceUnit = gateCommodityPriceUnits[item.symbol];
    const retrievedTime = Date.parse(String(item.retrievedAt ?? ""));
    const stablecoinTime = Date.parse(String(item.stablecoinAsOf ?? ""));
    const retrievedAge = now - retrievedTime;
    const stablecoinAge = now - stablecoinTime;
    const nativePrices = [
      item.markPriceNative,
      item.indexPriceNative,
      item.lastPriceNative,
      item.bidPriceNative,
      item.askPriceNative,
    ];
    const usdPrices = [
      item.markPriceUsd,
      item.indexPriceUsd,
      item.lastPriceUsd,
      item.bidPriceUsd,
      item.askPriceUsd,
    ];

    if (
      !expectedContract ||
      !expectedPriceUnit ||
      item.providerSymbol !== expectedContract ||
      item.priceUnit !== expectedPriceUnit ||
      item.category !== "COMMODITY" ||
      !isExplicitOpenState ||
      item.marketStateSource !== "gate-contract-status" ||
      item.providerStatus !== "trading" ||
      item.providerDelisting !== false ||
      item.settleCurrency !== "USDT" ||
      item.priceType !== "MARK" ||
      item.instrumentType !== "PERPETUAL_FUTURE" ||
      item.exchange !== "GATE_USDT_FUTURES" ||
      item.quoteCurrency !== "USDT" ||
      item.stablecoinProvider !== "coinbase" ||
      !Number.isFinite(retrievedTime) ||
      retrievedAge < 0 ||
      retrievedAge > maximumGateRetrievalAgeMs ||
      !Number.isFinite(stablecoinTime) ||
      stablecoinAge < 0 ||
      stablecoinAge > maximumGateAgeMs ||
      !Number.isFinite(item.stablecoinRate) ||
      item.stablecoinRate! < 0.995 ||
      item.stablecoinRate! > 1.005 ||
      nativePrices.some((price) => !Number.isFinite(price) || Number(price) <= 0) ||
      usdPrices.some((price) => !Number.isFinite(price) || Number(price) <= 0)
    ) {
      return false;
    }

    const bid = item.bidPriceNative!;
    const ask = item.askPriceNative!;
    const mark = item.markPriceNative!;
    const index = item.indexPriceNative!;
    const last = item.lastPriceNative!;
    const mid = (bid + ask) / 2;
    const semanticDivisor = item.symbol.startsWith("GRAM_") ? gramTroyOunceDivisor : 1;
    const expectedUsd = (native: number) => native * item.stablecoinRate! / semanticDivisor;
    const pricesMatchConversion = [
      [item.markPriceUsd!, expectedUsd(mark)],
      [item.indexPriceUsd!, expectedUsd(index)],
      [item.lastPriceUsd!, expectedUsd(last)],
      [item.bidPriceUsd!, expectedUsd(bid)],
      [item.askPriceUsd!, expectedUsd(ask)],
      [item.priceUsd, expectedUsd(mark)],
    ].every(([actual, expected]) =>
      Math.abs(actual - expected) <= Math.max(1e-8, Math.abs(expected) * 1e-10));

    return (
      age <= maximumGateAgeMs &&
      bid <= ask &&
      (ask - bid) / mid <= 0.005 &&
      Math.abs(mark - index) / index <= 0.01 &&
      Math.abs(last - mark) / mark <= 0.01 &&
      pricesMatchConversion
    );
  }

  if (item.source === "binance") {
    return isExplicitOpenState && age <= maximumBinanceAgeMs;
  }

  if (item.category === "COMMODITY") {
    if (
      (!isExplicitOpenState && !isInferredCommodityState) ||
      !item.providerSymbol ||
      !item.instrumentType ||
      !item.exchange ||
      !item.regularSessionStart ||
      !item.regularSessionEnd ||
      !canInferYahooCommodityOpen({
        providerSymbol: item.providerSymbol,
        instrumentType: item.instrumentType,
        exchange: item.exchange,
        sourceAsOf: item.sourceAsOf,
        regularSessionStart: item.regularSessionStart,
        regularSessionEnd: item.regularSessionEnd,
        exchangeDataDelayedBy: item.exchangeDataDelayedBy,
      }, now)
    ) {
      return false;
    }

    return age <= maximumYahooCommodityAgeMs;
  }

  if (!isExplicitOpenState) {
    return false;
  }

  return age <= maximumYahooAgeMs;
}
