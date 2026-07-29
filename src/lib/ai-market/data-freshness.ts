import type {
  AssetClass,
  MarketDataFreshness,
  MarketDataProvenance,
  MarketExchange,
} from "@/lib/ai-market/types";

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const intervalPattern = /^(\d+)([mhd])$/;

export type CandleFreshness = "FRESH" | "MARKET_CLOSED" | "STALE" | "FUTURE" | "MISSING";

function intervalMilliseconds(interval: string) {
  const match = interval.match(intervalPattern);

  if (!match) {
    return 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === "m"
    ? 60 * 1000
    : unit === "h"
      ? 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

  return amount * multiplier;
}

function isExpectedOpenSession(assetClass: AssetClass, now: number) {
  if (assetClass === "CRYPTO") {
    return true;
  }

  const date = new Date(now);
  const day = date.getUTCDay();
  const hour = date.getUTCHours();

  if (assetClass === "FX") {
    return !(
      (day === 5 && hour >= 22) ||
      day === 6 ||
      (day === 0 && hour < 22)
    );
  }

  return day !== 0 && day !== 6;
}

export function assessCandleFreshness({
  candleOpenTime,
  assetClass,
  interval,
  now = Date.now(),
}: {
  candleOpenTime: number;
  assetClass: AssetClass;
  interval: string;
  now?: number;
}): CandleFreshness {
  if (!Number.isFinite(candleOpenTime) || candleOpenTime <= 0) {
    return "MISSING";
  }

  const age = now - candleOpenTime;

  if (age < -MAX_FUTURE_SKEW_MS) {
    return "FUTURE";
  }

  const intervalMs = intervalMilliseconds(interval);
  const maximumAge = interval.endsWith("d")
    ? assetClass === "CRYPTO" ? 36 * 60 * 60 * 1000 : 84 * 60 * 60 * 1000
    : Math.max(3 * 60 * 1000, intervalMs * 2.5);

  if (
    assetClass !== "CRYPTO" &&
    !isExpectedOpenSession(assetClass, now) &&
    age <= 96 * 60 * 60 * 1000
  ) {
    return "MARKET_CLOSED";
  }

  if (age <= maximumAge) {
    return "FRESH";
  }

  return "STALE";
}

export function classifyCandleFreshness(input: {
  candleOpenTime: number;
  assetClass: AssetClass;
  interval: string;
  now?: number;
}) {
  return assessCandleFreshness(input) === "FRESH" ? "FRESH" as const : "STALE" as const;
}

function toPublicFreshness(value: CandleFreshness): MarketDataFreshness {
  if (value === "FRESH") {
    return "fresh";
  }

  if (value === "MARKET_CLOSED") {
    return "market-closed";
  }

  return value.toLowerCase() as MarketDataFreshness;
}

export function buildMarketDataProvenance({
  provider,
  primaryProvider = provider,
  candleOpenTime,
  assetClass,
  interval,
  isFallback = false,
  now = Date.now(),
}: {
  provider: MarketExchange;
  primaryProvider?: MarketExchange;
  candleOpenTime: number;
  assetClass: AssetClass;
  interval: string;
  isFallback?: boolean;
  now?: number;
}): MarketDataProvenance {
  const assessed = assessCandleFreshness({ candleOpenTime, assetClass, interval, now });
  const freshness = toPublicFreshness(assessed);

  return {
    provider,
    primaryProvider,
    sourceAsOf: candleOpenTime > 0 && Number.isFinite(candleOpenTime)
      ? new Date(candleOpenTime).toISOString()
      : null,
    retrievedAt: new Date(now).toISOString(),
    freshness,
    marketState: freshness === "fresh"
      ? "open"
      : freshness === "market-closed"
        ? "closed"
        : "unknown",
    isFallback,
  };
}

export function toAnalysisDataStatus(
  freshness: CandleFreshness,
  isFallback = false,
): "live" | "closed" | "stale" | "fallback" | "error" {
  if (isFallback) {
    return "fallback";
  }

  if (freshness === "FRESH") {
    return "live";
  }

  if (freshness === "MARKET_CLOSED") {
    return "closed";
  }

  if (freshness === "MISSING") {
    return "error";
  }

  return "stale";
}

export function assessQuoteFreshness({
  sourceAsOf,
  provider,
  marketState,
  isCommodity = false,
  now = Date.now(),
}: {
  sourceAsOf: string;
  provider: "binance" | "yahoo";
  marketState: string;
  isCommodity?: boolean;
  now?: number;
}): CandleFreshness {
  const sourceTime = Date.parse(sourceAsOf);

  if (!Number.isFinite(sourceTime) || sourceTime <= 0) {
    return "MISSING";
  }

  const age = now - sourceTime;

  if (age < -60_000) {
    return "FUTURE";
  }

  const normalizedMarketState = marketState.toUpperCase();
  const providerMarketOpen =
    provider === "binance" ||
    normalizedMarketState === "REGULAR" ||
    (isCommodity && normalizedMarketState === "INFERRED_REGULAR");

  if (!providerMarketOpen && age <= 96 * 60 * 60 * 1000) {
    return "MARKET_CLOSED";
  }

  const maximumAgeMs = provider === "binance"
    ? 5 * 60_000
    : isCommodity
      ? 2 * 60_000
      : 20 * 60_000;
  return age <= maximumAgeMs ? "FRESH" : "STALE";
}
