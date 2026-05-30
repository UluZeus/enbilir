import type { Candle, IndicatorSnapshot } from "@/lib/ai-market/types";

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function last<T>(values: T[]) {
  return values.length > 0 ? values[values.length - 1] : null;
}

export function ema(values: number[], period: number) {
  if (values.length < period) {
    return [];
  }

  const smoothing = 2 / (period + 1);
  const results: number[] = [];
  let previous = average(values.slice(0, period)) ?? values[0];
  results.push(previous);

  for (let index = period; index < values.length; index += 1) {
    previous = values[index] * smoothing + previous * (1 - smoothing);
    results.push(previous);
  }

  return results;
}

export function calculateRsi(closes: number[], period = 14) {
  if (closes.length <= period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = closes[index] - closes[index - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < closes.length; index += 1) {
    const change = closes[index] - closes[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

export function calculateMacd(closes: number[]) {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const offset = ema12.length - ema26.length;
  const macdLine = ema26.map((value, index) => ema12[index + offset] - value);
  const signalLine = ema(macdLine, 9);
  const macdValue = last(macdLine);
  const signalValue = last(signalLine);

  return {
    macd: macdValue,
    signal: signalValue,
    histogram: macdValue !== null && signalValue !== null ? macdValue - signalValue : null,
  };
}

export function calculateBollinger(closes: number[], period = 20) {
  const slice = closes.slice(-period);
  const middle = average(slice);

  if (middle === null || slice.length < period) {
    return { upper: null, middle: null, lower: null, bandwidth: null };
  }

  const variance = average(slice.map((value) => (value - middle) ** 2)) ?? 0;
  const deviation = Math.sqrt(variance);
  const upper = middle + deviation * 2;
  const lower = middle - deviation * 2;

  return {
    upper,
    middle,
    lower,
    bandwidth: middle > 0 ? ((upper - lower) / middle) * 100 : null,
  };
}

export function calculateAtr(candles: Candle[], period = 14) {
  if (candles.length <= period) {
    return null;
  }

  const trueRanges = candles.slice(1).map((candle, index) => {
    const previousClose = candles[index].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    );
  });

  return average(trueRanges.slice(-period));
}

export function calculateIndicators(candles: Candle[]): IndicatorSnapshot {
  const closes = candles.map((candle) => candle.close).filter((value) => value > 0);
  const volumes = candles.map((candle) => candle.volume).filter((value) => value >= 0);
  const lastVolume = last(volumes);
  const averageVolume = average(volumes.slice(-21, -1));
  const volumeRatio = lastVolume !== null && averageVolume && averageVolume > 0 ? lastVolume / averageVolume : null;

  return {
    rsi: calculateRsi(closes),
    macd: calculateMacd(closes),
    ema20: last(ema(closes, 20)),
    ema50: last(ema(closes, 50)),
    ema200: last(ema(closes, 200)),
    bollinger: calculateBollinger(closes),
    atr: calculateAtr(candles),
    volumeAnomaly: {
      ratio: volumeRatio,
      isAnomaly: volumeRatio !== null && volumeRatio >= 1.8,
    },
  };
}
