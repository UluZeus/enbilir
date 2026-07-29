import type { MarketItem } from "@/lib/market-data";

const maximumYahooCommodityAgeMs = 2 * 60_000;
const maximumYahooAgeMs = 20 * 60_000;
const maximumBinanceAgeMs = 5 * 60_000;

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

  if (
    !["binance", "yahoo"].includes(item.source) ||
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
