import type { Candle } from "@/lib/ai-market/types";

const DEFAULT_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

type NormalizeCandleOptions = {
  now?: number;
  maxFutureSkewMs?: number;
};

export type CandleNormalizationResult = {
  candles: Candle[];
  rejectedCount: number;
  duplicateCount: number;
};

function isFinitePositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function isValidCandle(candle: Candle, now: number, maxFutureSkewMs: number) {
  if (
    !Number.isFinite(candle.openTime) ||
    candle.openTime <= 0 ||
    candle.openTime > now + maxFutureSkewMs ||
    !isFinitePositive(candle.open) ||
    !isFinitePositive(candle.high) ||
    !isFinitePositive(candle.low) ||
    !isFinitePositive(candle.close) ||
    !Number.isFinite(candle.volume) ||
    candle.volume < 0
  ) {
    return false;
  }

  return (
    candle.high >= Math.max(candle.open, candle.close, candle.low) &&
    candle.low <= Math.min(candle.open, candle.close, candle.high)
  );
}

export function normalizeProviderCandles(
  candles: Candle[],
  options: NormalizeCandleOptions = {},
): CandleNormalizationResult {
  const now = options.now ?? Date.now();
  const maxFutureSkewMs = options.maxFutureSkewMs ?? DEFAULT_MAX_FUTURE_SKEW_MS;
  const byOpenTime = new Map<number, Candle>();
  let rejectedCount = 0;
  let duplicateCount = 0;

  for (const candle of candles) {
    if (!isValidCandle(candle, now, maxFutureSkewMs)) {
      rejectedCount += 1;
      continue;
    }

    if (byOpenTime.has(candle.openTime)) {
      duplicateCount += 1;
    }

    byOpenTime.set(candle.openTime, candle);
  }

  return {
    candles: Array.from(byOpenTime.values()).sort((left, right) => left.openTime - right.openTime),
    rejectedCount,
    duplicateCount,
  };
}
