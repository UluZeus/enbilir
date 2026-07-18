import { NASDAQ_SEED, SP500_SEED, getAssetUniverseItem } from "@/lib/ai-market/asset-universe";
import { calculateAtr, calculateMacd, calculateRsi } from "@/lib/ai-market/indicators";
import type { Candle } from "@/lib/ai-market/types";
import { fetchYahooDailyCandles } from "@/lib/ai-market/yahoo-public";
import type { VipTechnicalSnapshot } from "@/lib/vip-research/types";

const CROWDED_TICKERS = new Set(["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "GOOG", "AVGO"]);
const MIN_DAILY_CANDLES = 205;
const MAX_UNIVERSE_SIZE = 130;
const MAX_SHORTLIST_SIZE = 14;

type ScreenedEquity = {
  symbol: string;
  providerSymbol: string;
  displayName: string;
  technical: VipTechnicalSnapshot;
};

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function seriesAt<T>(values: T[], index: number) {
  return values[Math.max(0, Math.min(values.length - 1, index))];
}

function oscillatorSeries(closes: number[]) {
  return closes.map((_, index) => {
    const slice = closes.slice(0, index + 1);
    return {
      rsi: calculateRsi(slice),
      macdHistogram: calculateMacd(slice).histogram,
    };
  });
}

function detectDivergence(candles: Candle[], oscillator: Array<number | null>) {
  const recentStart = Math.max(0, candles.length - 15);
  const previousStart = Math.max(0, candles.length - 30);
  const previousEnd = recentStart;
  const recent = candles.slice(recentStart);
  const previous = candles.slice(previousStart, previousEnd);

  if (recent.length < 8 || previous.length < 8) {
    return "NONE" as const;
  }

  const recentLowOffset = recent.reduce((best, candle, index) => candle.low < recent[best].low ? index : best, 0);
  const previousLowOffset = previous.reduce((best, candle, index) => candle.low < previous[best].low ? index : best, 0);
  const recentHighOffset = recent.reduce((best, candle, index) => candle.high > recent[best].high ? index : best, 0);
  const previousHighOffset = previous.reduce((best, candle, index) => candle.high > previous[best].high ? index : best, 0);
  const recentLowIndex = recentStart + recentLowOffset;
  const previousLowIndex = previousStart + previousLowOffset;
  const recentHighIndex = recentStart + recentHighOffset;
  const previousHighIndex = previousStart + previousHighOffset;
  const recentLowOsc = seriesAt(oscillator, recentLowIndex);
  const previousLowOsc = seriesAt(oscillator, previousLowIndex);
  const recentHighOsc = seriesAt(oscillator, recentHighIndex);
  const previousHighOsc = seriesAt(oscillator, previousHighIndex);

  if (
    recent[recentLowOffset].low < previous[previousLowOffset].low &&
    recentLowOsc !== null && previousLowOsc !== null && recentLowOsc > previousLowOsc
  ) {
    return "BULLISH" as const;
  }

  if (
    recent[recentHighOffset].high > previous[previousHighOffset].high &&
    recentHighOsc !== null && previousHighOsc !== null && recentHighOsc < previousHighOsc
  ) {
    return "BEARISH" as const;
  }

  return "NONE" as const;
}

function calculateTechnicalSnapshot(candles: Candle[]): VipTechnicalSnapshot {
  const closes = candles.map((candle) => candle.close);
  const latest = candles[candles.length - 1];
  const previous20 = candles.slice(-21, -1);
  const previousVolumes = previous20.map((candle) => candle.volume).filter((value) => value > 0);
  const sma50 = average(closes.slice(-50));
  const sma200 = average(closes.slice(-200));
  const rsi14 = calculateRsi(closes) ?? 50;
  const macd = calculateMacd(closes);
  const atr14 = calculateAtr(candles) ?? 0;
  const breakoutLevel = Math.max(...previous20.map((candle) => candle.high));
  const averageVolume20 = average(previousVolumes);
  const volumeRatio20d = averageVolume20 > 0 ? latest.volume / averageVolume20 : 0;
  const high52Week = Math.max(...candles.slice(-252).map((candle) => candle.high));
  const oscillator = oscillatorSeries(closes);
  const rsiDivergence = detectDivergence(candles, oscillator.map((point) => point.rsi));
  const macdDivergence = detectDivergence(candles, oscillator.map((point) => point.macdHistogram));
  const distanceFromSma50Pct = ((latest.close - sma50) / sma50) * 100;
  const distanceFromSma200Pct = ((latest.close - sma200) / sma200) * 100;
  const distanceFrom52WeekHighPct = ((latest.close - high52Week) / high52Week) * 100;
  const volumeBreakout = latest.close > breakoutLevel && volumeRatio20d >= 1.25;
  let score = 45;

  score += latest.close > sma50 ? 10 : -8;
  score += sma50 > sma200 ? 14 : -10;
  score += latest.close > sma200 ? 8 : -12;
  score += volumeBreakout ? 14 : volumeRatio20d >= 1.15 ? 4 : 0;
  score += rsiDivergence === "BULLISH" ? 8 : rsiDivergence === "BEARISH" ? -10 : 0;
  score += macdDivergence === "BULLISH" ? 8 : macdDivergence === "BEARISH" ? -10 : 0;
  score += macd.histogram !== null && macd.histogram > 0 ? 5 : -3;

  if (rsi14 > 72 || distanceFromSma50Pct > 18 || distanceFromSma200Pct > 40) {
    score -= 22;
  } else if (rsi14 >= 42 && rsi14 <= 66 && distanceFromSma50Pct >= -6 && distanceFromSma50Pct <= 12) {
    score += 10;
  }

  return {
    asOf: new Date(latest.openTime).toISOString(),
    lastPrice: round(latest.close),
    sma50: round(sma50),
    sma200: round(sma200),
    distanceFromSma50Pct: round(distanceFromSma50Pct, 2),
    distanceFromSma200Pct: round(distanceFromSma200Pct, 2),
    rsi14: round(rsi14, 2),
    macd: round(macd.macd ?? 0),
    macdSignal: round(macd.signal ?? 0),
    macdHistogram: round(macd.histogram ?? 0),
    volumeRatio20d: round(volumeRatio20d, 2),
    volumeBreakout,
    breakoutLevel: round(breakoutLevel),
    high52Week: round(high52Week),
    distanceFrom52WeekHighPct: round(distanceFrom52WeekHighPct, 2),
    atr14Pct: round(latest.close > 0 ? (atr14 / latest.close) * 100 : 0, 2),
    rsiDivergence,
    macdDivergence,
    support: round(Math.min(...candles.slice(-20).map((candle) => candle.low))),
    resistance: round(Math.max(...candles.slice(-60).map((candle) => candle.high))),
    technicalScore: Math.max(0, Math.min(100, Math.round(score))),
  };
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results: R[] = [];
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

export async function screenVipEquities(): Promise<ScreenedEquity[]> {
  const symbols = Array.from(new Set([...NASDAQ_SEED, ...SP500_SEED]))
    .filter((symbol) => !CROWDED_TICKERS.has(symbol))
    .slice(0, MAX_UNIVERSE_SIZE);
  const screened = await mapWithConcurrency(symbols, 8, async (symbol): Promise<ScreenedEquity | null> => {
    try {
      const asset = getAssetUniverseItem(symbol);
      const providerSymbol = asset?.providerSymbol ?? symbol;
      const candles = await fetchYahooDailyCandles(providerSymbol);

      if (candles.length < MIN_DAILY_CANDLES) {
        return null;
      }

      return {
        symbol,
        providerSymbol,
        displayName: asset?.displayName ?? symbol,
        technical: calculateTechnicalSnapshot(candles),
      };
    } catch {
      return null;
    }
  });

  return screened
    .filter((item): item is ScreenedEquity => item !== null)
    .sort((left, right) => right.technical.technicalScore - left.technical.technicalScore)
    .slice(0, MAX_SHORTLIST_SIZE);
}
