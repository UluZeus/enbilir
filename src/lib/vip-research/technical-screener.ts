import { NASDAQ_SEED, SP500_SEED, getAssetUniverseItem } from "@/lib/ai-market/asset-universe";
import { calculateAtr, calculateMacd, calculateRsi } from "@/lib/ai-market/indicators";
import type { Candle } from "@/lib/ai-market/types";
import { fetchYahooDailyCandles } from "@/lib/ai-market/yahoo-public";
import type {
  VipAssetClass,
  VipCrowdingLevel,
  VipFundamentalFramework,
  VipTechnicalSnapshot,
} from "@/lib/vip-research/types";

const MIN_DAILY_CANDLES = 205;
const MAX_EQUITY_UNIVERSE_SIZE = 130;
const MAX_SHORTLIST_SIZE = 30;
const DIVERSIFICATION_RESERVE_PER_CLASS = 2;

type VipUniverseAsset = {
  symbol: string;
  providerSymbol: string;
  displayName: string;
  assetClass: VipAssetClass;
  currency: string;
  fundamentalFramework: VipFundamentalFramework;
};

export type ScreenedVipAsset = VipUniverseAsset & {
  marketDataSourceUrl: string;
  technical: VipTechnicalSnapshot;
};

type CrowdingInput = Pick<
  VipTechnicalSnapshot,
  | "distanceFromSma50Pct"
  | "distanceFromSma200Pct"
  | "distanceFrom52WeekHighPct"
  | "momentum20dPct"
  | "momentum60dPct"
  | "rsi14"
  | "volumeRatio20d"
  | "rsiDivergence"
  | "macdDivergence"
>;

export const VIP_NON_EQUITY_UNIVERSE: VipUniverseAsset[] = [
  { symbol: "SPY", providerSymbol: "SPY", displayName: "SPDR S&P 500 ETF", assetClass: "BROAD_MARKET", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "VT", providerSymbol: "VT", displayName: "Vanguard Total World Stock ETF", assetClass: "BROAD_MARKET", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "IWM", providerSymbol: "IWM", displayName: "iShares Russell 2000 ETF", assetClass: "BROAD_MARKET", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "EEM", providerSymbol: "EEM", displayName: "iShares MSCI Emerging Markets ETF", assetClass: "BROAD_MARKET", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "QQQ", providerSymbol: "QQQ", displayName: "Invesco QQQ Trust", assetClass: "BROAD_MARKET", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "GC=F", providerSymbol: "GC=F", displayName: "Altın Vadeli", assetClass: "COMMODITY", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "SI=F", providerSymbol: "SI=F", displayName: "Gümüş Vadeli", assetClass: "COMMODITY", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "HG=F", providerSymbol: "HG=F", displayName: "Bakır Vadeli", assetClass: "COMMODITY", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "CL=F", providerSymbol: "CL=F", displayName: "WTI Petrol Vadeli", assetClass: "COMMODITY", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "BZ=F", providerSymbol: "BZ=F", displayName: "Brent Petrol Vadeli", assetClass: "COMMODITY", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "NG=F", providerSymbol: "NG=F", displayName: "Doğal Gaz Vadeli", assetClass: "COMMODITY", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "SHY", providerSymbol: "SHY", displayName: "1-3 Yıl ABD Hazine Tahvili ETF", assetClass: "BOND", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "IEF", providerSymbol: "IEF", displayName: "7-10 Yıl ABD Hazine Tahvili ETF", assetClass: "BOND", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "TLT", providerSymbol: "TLT", displayName: "20+ Yıl ABD Hazine Tahvili ETF", assetClass: "BOND", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "TIP", providerSymbol: "TIP", displayName: "ABD Enflasyona Endeksli Tahvil ETF", assetClass: "BOND", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "LQD", providerSymbol: "LQD", displayName: "Yatırım Notlu Şirket Tahvili ETF", assetClass: "BOND", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "HYG", providerSymbol: "HYG", displayName: "Yüksek Getirili Şirket Tahvili ETF", assetClass: "BOND", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "EURUSD=X", providerSymbol: "EURUSD=X", displayName: "EUR/USD", assetClass: "FX", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "GBPUSD=X", providerSymbol: "GBPUSD=X", displayName: "GBP/USD", assetClass: "FX", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "USDJPY=X", providerSymbol: "USDJPY=X", displayName: "USD/JPY", assetClass: "FX", currency: "JPY", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "USDCHF=X", providerSymbol: "USDCHF=X", displayName: "USD/CHF", assetClass: "FX", currency: "CHF", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "AUDUSD=X", providerSymbol: "AUDUSD=X", displayName: "AUD/USD", assetClass: "FX", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "BTC-USD", providerSymbol: "BTC-USD", displayName: "Bitcoin / USD", assetClass: "CRYPTO", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "ETH-USD", providerSymbol: "ETH-USD", displayName: "Ethereum / USD", assetClass: "CRYPTO", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "SOL-USD", providerSymbol: "SOL-USD", displayName: "Solana / USD", assetClass: "CRYPTO", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
  { symbol: "XRP-USD", providerSymbol: "XRP-USD", displayName: "XRP / USD", assetClass: "CRYPTO", currency: "USD", fundamentalFramework: "MACRO_MARKET_STRUCTURE" },
];

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function seriesAt<T>(values: T[], index: number) {
  return values[Math.max(0, Math.min(values.length - 1, index))];
}

function momentum(closes: number[], tradingDays: number) {
  const latest = closes.at(-1);
  const previous = closes.at(-(tradingDays + 1));

  return latest && previous ? ((latest - previous) / previous) * 100 : 0;
}

function scaledExcess(value: number, startsAt: number, fullyPricedAt: number, maximumPoints: number) {
  if (value <= startsAt) {
    return 0;
  }

  return clamp((value - startsAt) / (fullyPricedAt - startsAt), 0, 1) * maximumPoints;
}

export function calculateVipCrowding(input: CrowdingInput) {
  let score = 0;
  const signals: string[] = [];

  const sma50Points = scaledExcess(input.distanceFromSma50Pct, 5, 25, 20);
  const sma200Points = scaledExcess(input.distanceFromSma200Pct, 15, 60, 20);
  const rsiPoints = scaledExcess(input.rsi14, 60, 82, 16);
  const momentum20Points = scaledExcess(input.momentum20dPct, 7, 30, 14);
  const momentum60Points = scaledExcess(input.momentum60dPct, 15, 65, 12);

  score += sma50Points + sma200Points + rsiPoints + momentum20Points + momentum60Points;
  if (sma50Points > 0) signals.push("SMA50_UZAKLIK");
  if (sma200Points > 0) signals.push("SMA200_UZAKLIK");
  if (rsiPoints > 0) signals.push("RSI_SISME");
  if (momentum20Points > 0 || momentum60Points > 0) signals.push("MOMENTUM_KOVALAMA");

  if (input.distanceFrom52WeekHighPct >= -5 && input.momentum60dPct > 10) {
    score += scaledExcess(input.distanceFrom52WeekHighPct, -5, 0, 6);
    signals.push("52H_ZIRVE_YAKINLIGI");
  }

  if (input.volumeRatio20d > 1.5 && input.momentum20dPct > 5) {
    score += scaledExcess(input.volumeRatio20d, 1.5, 3, 6);
    signals.push("HACIMLI_KOVALAMA");
  }

  if (input.rsiDivergence === "BEARISH") {
    score += 4;
    signals.push("RSI_NEGATIF_UYUMSUZLUK");
  }

  if (input.macdDivergence === "BEARISH") {
    score += 4;
    signals.push("MACD_NEGATIF_UYUMSUZLUK");
  }

  const crowdingScore = Math.round(clamp(score, 0, 100));
  const crowdingLevel: VipCrowdingLevel = crowdingScore >= 72
    ? "EXTREME"
    : crowdingScore >= 55
      ? "HIGH"
      : crowdingScore >= 35
        ? "MODERATE"
        : "LOW";

  return {
    crowdingScore,
    crowdingLevel,
    crowdingSignals: signals,
    crowdingVeto: crowdingScore >= 72,
  };
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

export function calculateVipTechnicalSnapshot(candles: Candle[]): VipTechnicalSnapshot {
  if (candles.length < MIN_DAILY_CANDLES) {
    throw new Error(`VIP teknik hesaplama için en az ${MIN_DAILY_CANDLES} günlük mum gerekir.`);
  }

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
  const momentum20dPct = momentum(closes, 20);
  const momentum60dPct = momentum(closes, 60);
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

  const crowding = calculateVipCrowding({
    distanceFromSma50Pct,
    distanceFromSma200Pct,
    distanceFrom52WeekHighPct,
    momentum20dPct,
    momentum60dPct,
    rsi14,
    volumeRatio20d,
    rsiDivergence,
    macdDivergence,
  });

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
    momentum20dPct: round(momentum20dPct, 2),
    momentum60dPct: round(momentum60dPct, 2),
    atr14Pct: round(latest.close > 0 ? (atr14 / latest.close) * 100 : 0, 2),
    rsiDivergence,
    macdDivergence,
    support: round(Math.min(...candles.slice(-20).map((candle) => candle.low))),
    resistance: round(Math.max(...candles.slice(-60).map((candle) => candle.high))),
    technicalScore: Math.max(0, Math.min(100, Math.round(score))),
    ...crowding,
  };
}

function crowdingAdjustedTechnicalScore(item: ScreenedVipAsset) {
  return item.technical.technicalScore - Math.max(0, item.technical.crowdingScore - 30) * 0.45;
}

export function rankScreenedVipAssets(items: ScreenedVipAsset[]) {
  return [...items]
    .filter((item) => !item.technical.crowdingVeto)
    .sort((left, right) => crowdingAdjustedTechnicalScore(right) - crowdingAdjustedTechnicalScore(left));
}

export function selectDiversifiedVipShortlist(items: ScreenedVipAsset[], limit = MAX_SHORTLIST_SIZE) {
  const ranked = rankScreenedVipAssets(items);
  const selected = new Map<string, ScreenedVipAsset>();
  const globalSlots = Math.max(0, limit - DIVERSIFICATION_RESERVE_PER_CLASS * 5);

  for (const item of ranked.slice(0, globalSlots)) {
    selected.set(item.symbol, item);
  }

  for (const assetClass of ["BROAD_MARKET", "COMMODITY", "BOND", "FX", "CRYPTO"] satisfies VipAssetClass[]) {
    for (const item of ranked.filter((candidate) => candidate.assetClass === assetClass).slice(0, DIVERSIFICATION_RESERVE_PER_CLASS)) {
      selected.set(item.symbol, item);
    }
  }

  for (const item of ranked) {
    if (selected.size >= limit) break;
    selected.set(item.symbol, item);
  }

  return rankScreenedVipAssets(Array.from(selected.values())).slice(0, limit);
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

function equityUniverse(): VipUniverseAsset[] {
  return Array.from(new Set([...NASDAQ_SEED, ...SP500_SEED]))
    .slice(0, MAX_EQUITY_UNIVERSE_SIZE)
    .map((symbol) => {
      const asset = getAssetUniverseItem(symbol);

      return {
        symbol,
        providerSymbol: asset?.providerSymbol ?? symbol,
        displayName: asset?.displayName ?? symbol,
        assetClass: "EQUITY" as const,
        currency: asset?.currency ?? "USD",
        fundamentalFramework: "CORPORATE_FINANCIALS" as const,
      };
    });
}

export async function screenVipAssets(): Promise<ScreenedVipAsset[]> {
  const universe = [...equityUniverse(), ...VIP_NON_EQUITY_UNIVERSE];
  const screened = await mapWithConcurrency(universe, 8, async (asset): Promise<ScreenedVipAsset | null> => {
    try {
      const candles = await fetchYahooDailyCandles(asset.providerSymbol);

      if (candles.length < MIN_DAILY_CANDLES) {
        return null;
      }

      return {
        ...asset,
        marketDataSourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(asset.providerSymbol)}/history/`,
        technical: calculateVipTechnicalSnapshot(candles),
      };
    } catch {
      return null;
    }
  });

  return selectDiversifiedVipShortlist(screened.filter((item): item is ScreenedVipAsset => item !== null));
}
