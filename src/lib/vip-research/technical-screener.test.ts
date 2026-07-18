import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/ai-market/types";
import {
  calculateVipCrowding,
  calculateVipTechnicalSnapshot,
  rankScreenedVipAssets,
  selectDiversifiedVipShortlist,
  type ScreenedVipAsset,
} from "@/lib/vip-research/technical-screener";
import type { VipTechnicalSnapshot } from "@/lib/vip-research/types";

function dailyCandles(count = 220): Candle[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + index * 0.1;
    return {
      openTime: Date.UTC(2025, 0, index + 1),
      open: close - 0.2,
      high: close + 0.4,
      low: close - 0.5,
      close,
      volume: index === count - 1 ? 2_000 : 1_000,
    };
  }).map((candle, index, candles) => index === candles.length - 1
    ? { ...candle, close: candle.close + 2, high: candle.high + 2 }
    : candle);
}

function technical(overrides: Partial<VipTechnicalSnapshot> = {}): VipTechnicalSnapshot {
  return {
    asOf: new Date().toISOString(),
    lastPrice: 100,
    sma50: 98,
    sma200: 92,
    distanceFromSma50Pct: 2,
    distanceFromSma200Pct: 8,
    rsi14: 55,
    macd: 1,
    macdSignal: 0.8,
    macdHistogram: 0.2,
    volumeRatio20d: 1.1,
    volumeBreakout: false,
    breakoutLevel: 102,
    high52Week: 110,
    distanceFrom52WeekHighPct: -9,
    momentum20dPct: 3,
    momentum60dPct: 8,
    atr14Pct: 2,
    rsiDivergence: "NONE",
    macdDivergence: "NONE",
    support: 94,
    resistance: 108,
    technicalScore: 75,
    crowdingScore: 5,
    crowdingLevel: "LOW",
    crowdingSignals: [],
    crowdingVeto: false,
    ...overrides,
  };
}

function screened(symbol: string, assetClass: ScreenedVipAsset["assetClass"], snapshot: VipTechnicalSnapshot): ScreenedVipAsset {
  return {
    symbol,
    providerSymbol: symbol,
    displayName: symbol,
    assetClass,
    currency: "USD",
    fundamentalFramework: assetClass === "EQUITY" ? "CORPORATE_FINANCIALS" : "MACRO_MARKET_STRUCTURE",
    marketDataSourceUrl: `https://finance.yahoo.com/quote/${symbol}`,
    technical: snapshot,
  };
}

describe("VIP technical calculations", () => {
  it("calculates 50/200-day averages and confirms a volume-backed breakout", () => {
    const snapshot = calculateVipTechnicalSnapshot(dailyCandles());

    expect(snapshot.sma50).toBeGreaterThan(snapshot.sma200);
    expect(snapshot.lastPrice).toBeGreaterThan(snapshot.breakoutLevel);
    expect(snapshot.volumeRatio20d).toBe(2);
    expect(snapshot.volumeBreakout).toBe(true);
    expect(snapshot.momentum20dPct).toBeGreaterThan(0);
    expect(snapshot.momentum60dPct).toBeGreaterThan(0);
  });

  it("assigns crowding from market data rather than from a ticker name", () => {
    const calm = calculateVipCrowding({
      distanceFromSma50Pct: 2,
      distanceFromSma200Pct: 8,
      distanceFrom52WeekHighPct: -10,
      momentum20dPct: 3,
      momentum60dPct: 8,
      rsi14: 55,
      volumeRatio20d: 1,
      rsiDivergence: "NONE",
      macdDivergence: "NONE",
    });
    const chased = calculateVipCrowding({
      distanceFromSma50Pct: 30,
      distanceFromSma200Pct: 80,
      distanceFrom52WeekHighPct: -0.2,
      momentum20dPct: 35,
      momentum60dPct: 80,
      rsi14: 84,
      volumeRatio20d: 3.2,
      rsiDivergence: "BEARISH",
      macdDivergence: "BEARISH",
    });

    expect(calm.crowdingLevel).toBe("LOW");
    expect(calm.crowdingVeto).toBe(false);
    expect(chased.crowdingScore).toBeGreaterThanOrEqual(72);
    expect(chased.crowdingLevel).toBe("EXTREME");
    expect(chased.crowdingVeto).toBe(true);
  });
});

describe("VIP asset filtering", () => {
  it("keeps a formerly hard-coded mega-cap when its data is not crowded and rejects any extreme chase", () => {
    const ranked = rankScreenedVipAssets([
      screened("AAPL", "EQUITY", technical({ technicalScore: 70, crowdingScore: 8 })),
      screened("UNKNOWN", "EQUITY", technical({ technicalScore: 99, crowdingScore: 90, crowdingLevel: "EXTREME", crowdingVeto: true })),
    ]);

    expect(ranked.map((item) => item.symbol)).toEqual(["AAPL"]);
  });

  it("reserves technically valid coverage for every non-equity asset class", () => {
    const items = [
      ...Array.from({ length: 25 }, (_, index) => screened(`EQ${index}`, "EQUITY", technical({ technicalScore: 95 - index }))),
      screened("SPY", "BROAD_MARKET", technical({ technicalScore: 60 })),
      screened("GC=F", "COMMODITY", technical({ technicalScore: 59 })),
      screened("TLT", "BOND", technical({ technicalScore: 58 })),
      screened("EURUSD=X", "FX", technical({ technicalScore: 57 })),
      screened("BTC-USD", "CRYPTO", technical({ technicalScore: 56 })),
    ];
    const shortlist = selectDiversifiedVipShortlist(items, 15);

    for (const assetClass of ["BROAD_MARKET", "COMMODITY", "BOND", "FX", "CRYPTO"] as const) {
      expect(shortlist.some((item) => item.assetClass === assetClass)).toBe(true);
    }
  });
});
