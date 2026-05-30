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

export type TechnicalSeriesPoint = {
  time: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  volumeSma20: number | null;
  sma20: number | null;
  ema20: number | null;
  ema50: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  bollingerBandwidth: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  atr: number | null;
  ichimokuConversion: number | null;
  ichimokuBase: number | null;
  ichimokuSpanA: number | null;
  ichimokuSpanB: number | null;
  parabolicSar: number | null;
};

export type TechnicalSeries = {
  points: TechnicalSeriesPoint[];
  trend: {
    direction: "YUKARI" | "ASAGI" | "YATAY";
    score: number;
    note: string;
  };
};

function alignTail(values: number[], length: number) {
  const empty = Array<number | null>(length).fill(null);
  const start = length - values.length;

  values.forEach((value, index) => {
    empty[start + index] = value;
  });

  return empty;
}

function smaSeries(values: number[], period: number) {
  return values.map((_, index) => {
    if (index + 1 < period) {
      return null;
    }

    return average(values.slice(index + 1 - period, index + 1));
  });
}

function rsiSeries(values: number[], period = 14) {
  return values.map((_, index) => calculateRsi(values.slice(0, index + 1), period));
}

function macdSeries(values: number[]) {
  const ema12 = alignTail(ema(values, 12), values.length);
  const ema26 = alignTail(ema(values, 26), values.length);
  const macdLine = values.map((_, index) => {
    const short = ema12[index];
    const long = ema26[index];

    return short !== null && long !== null ? short - long : null;
  });
  const compactMacd = macdLine.filter((value): value is number => value !== null);
  const signalLine = alignTail(ema(compactMacd, 9), values.length);

  return macdLine.map((value, index) => {
    const signalValue = signalLine[index];

    return {
      macd: value,
      signal: signalValue,
      histogram: value !== null && signalValue !== null ? value - signalValue : null,
    };
  });
}

function bollingerSeries(values: number[], period = 20) {
  return values.map((_, index) => {
    if (index + 1 < period) {
      return { upper: null, middle: null, lower: null, bandwidth: null };
    }

    return calculateBollinger(values.slice(0, index + 1), period);
  });
}

function atrSeries(candles: Candle[], period = 14) {
  return candles.map((_, index) => calculateAtr(candles.slice(0, index + 1), period));
}

function rangeMidpoint(candles: Candle[], endIndex: number, period: number) {
  if (endIndex + 1 < period) {
    return null;
  }

  const window = candles.slice(endIndex + 1 - period, endIndex + 1);
  const high = Math.max(...window.map((candle) => candle.high));
  const low = Math.min(...window.map((candle) => candle.low));

  return (high + low) / 2;
}

function ichimokuSeries(candles: Candle[]) {
  return candles.map((_, index) => {
    const conversion = rangeMidpoint(candles, index, 9);
    const base = rangeMidpoint(candles, index, 26);
    const spanB = rangeMidpoint(candles, index, 52);

    return {
      conversion,
      base,
      spanA: conversion !== null && base !== null ? (conversion + base) / 2 : null,
      spanB,
    };
  });
}

function parabolicSarSeries(candles: Candle[]) {
  if (candles.length === 0) {
    return [];
  }

  const results: Array<number | null> = [null];
  let rising = true;
  let acceleration = 0.02;
  let extremePoint = candles[0].high;
  let sar = candles[0].low;

  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    sar += acceleration * (extremePoint - sar);

    if (rising) {
      if (candle.low < sar) {
        rising = false;
        sar = extremePoint;
        extremePoint = candle.low;
        acceleration = 0.02;
      } else if (candle.high > extremePoint) {
        extremePoint = candle.high;
        acceleration = Math.min(acceleration + 0.02, 0.2);
      }
    } else if (candle.high > sar) {
      rising = true;
      sar = extremePoint;
      extremePoint = candle.high;
      acceleration = 0.02;
    } else if (candle.low < extremePoint) {
      extremePoint = candle.low;
      acceleration = Math.min(acceleration + 0.02, 0.2);
    }

    results.push(sar);
  }

  return results;
}

function trendSummary(points: TechnicalSeriesPoint[]): TechnicalSeries["trend"] {
  const latest = points[points.length - 1];

  if (!latest || latest.ema20 === null || latest.ema50 === null || latest.rsi === null) {
    return {
      direction: "YATAY" as const,
      score: 50,
      note: "Trend icin yeterli veri birikimi bekleniyor.",
    };
  }

  let score = 50;

  if (latest.close > latest.ema20) {
    score += 15;
  } else {
    score -= 15;
  }

  if (latest.ema20 > latest.ema50) {
    score += 20;
  } else {
    score -= 20;
  }

  if (latest.macdHistogram !== null) {
    score += latest.macdHistogram > 0 ? 10 : -10;
  }

  if (latest.rsi >= 45 && latest.rsi <= 65) {
    score += 5;
  } else if (latest.rsi > 72 || latest.rsi < 30) {
    score -= 8;
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const direction: TechnicalSeries["trend"]["direction"] = boundedScore >= 62 ? "YUKARI" : boundedScore <= 38 ? "ASAGI" : "YATAY";

  return {
    direction,
    score: boundedScore,
    note:
      direction === "YUKARI"
        ? "Kisa vadeli ortalamalar yukari egilimi destekliyor."
        : direction === "ASAGI"
          ? "Momentum ve ortalama yapisi zayif seyrediyor."
          : "Trend belirgin bir yonde guc toplamiyor.",
  };
}

export function calculateTechnicalSeries(candles: Candle[], limit = 100): TechnicalSeries {
  const closes = candles.map((candle) => candle.close);
  const volumes = candles.map((candle) => candle.volume);
  const volumeSma20 = smaSeries(volumes, 20);
  const sma20 = smaSeries(closes, 20);
  const ema20 = alignTail(ema(closes, 20), candles.length);
  const ema50 = alignTail(ema(closes, 50), candles.length);
  const bollinger = bollingerSeries(closes);
  const rsi = rsiSeries(closes);
  const macd = macdSeries(closes);
  const atr = atrSeries(candles);
  const ichimoku = ichimokuSeries(candles);
  const sar = parabolicSarSeries(candles);
  const points = candles
    .map((candle, index) => ({
      time: candle.openTime,
      close: candle.close,
      high: candle.high,
      low: candle.low,
      volume: candle.volume,
      volumeSma20: volumeSma20[index],
      sma20: sma20[index],
      ema20: ema20[index],
      ema50: ema50[index],
      bollingerUpper: bollinger[index]?.upper ?? null,
      bollingerMiddle: bollinger[index]?.middle ?? null,
      bollingerLower: bollinger[index]?.lower ?? null,
      bollingerBandwidth: bollinger[index]?.bandwidth ?? null,
      rsi: rsi[index],
      macd: macd[index]?.macd ?? null,
      macdSignal: macd[index]?.signal ?? null,
      macdHistogram: macd[index]?.histogram ?? null,
      atr: atr[index],
      ichimokuConversion: ichimoku[index]?.conversion ?? null,
      ichimokuBase: ichimoku[index]?.base ?? null,
      ichimokuSpanA: ichimoku[index]?.spanA ?? null,
      ichimokuSpanB: ichimoku[index]?.spanB ?? null,
      parabolicSar: sar[index] ?? null,
    }))
    .slice(-limit);

  return {
    points,
    trend: trendSummary(points),
  };
}
