import { describe, expect, it } from "vitest";
import {
  calculateVipAsymmetryRank,
  calculateVipQuantitativeScore,
  hasRequiredVipResearchInputs,
} from "@/lib/vip-research/candidate-policy";
import type { VipResearchCandidate, VipTechnicalSnapshot } from "@/lib/vip-research/types";

const technical: VipTechnicalSnapshot = {
  asOf: new Date().toISOString(), lastPrice: 100, sma50: 98, sma200: 90,
  distanceFromSma50Pct: 2, distanceFromSma200Pct: 11, rsi14: 55,
  macd: 1, macdSignal: 0.8, macdHistogram: 0.2, volumeRatio20d: 1.2,
  volumeBreakout: false, breakoutLevel: 105, high52Week: 110,
  distanceFrom52WeekHighPct: -9, momentum20dPct: 4, momentum60dPct: 10,
  atr14Pct: 2, rsiDivergence: "NONE", macdDivergence: "NONE", support: 94,
  resistance: 108, technicalScore: 78, crowdingScore: 10, crowdingLevel: "LOW",
  crowdingSignals: [], crowdingVeto: false,
};

function candidate(assetClass: VipResearchCandidate["assetClass"], withFundamentals: boolean): VipResearchCandidate {
  return {
    symbol: assetClass === "EQUITY" ? "TEST" : "TEST-USD",
    providerSymbol: assetClass === "EQUITY" ? "TEST" : "TEST-USD",
    displayName: "Test",
    assetClass,
    currency: "USD",
    fundamentalFramework: assetClass === "EQUITY" ? "CORPORATE_FINANCIALS" : "MACRO_MARKET_STRUCTURE",
    marketDataSourceUrl: "https://finance.yahoo.com/quote/TEST",
    technical,
    fundamental: withFundamentals ? {
      periodEnd: "2026-06-30", revenue: 1_000, revenueGrowthPct: 12,
      freeCashFlow: 200, freeCashFlowGrowthPct: 18, netMarginPct: 20,
      netMarginExpansionBps: 150, totalDebt: 100, debtToAssetsPct: 15,
      debtToFreeCashFlow: 0.5, researchAndDevelopment: 50,
      researchAndDevelopmentGrowthPct: 10, sourceUrl: "https://example.com/financials",
    } : null,
    institutional: null,
    shortInterest: null,
    quantitativeScore: 0,
  };
}

describe("VIP asset-type research policy", () => {
  it("never relaxes mandatory corporate fundamentals for an equity", () => {
    expect(hasRequiredVipResearchInputs(candidate("EQUITY", false))).toBe(false);
    expect(hasRequiredVipResearchInputs(candidate("EQUITY", true))).toBe(true);
  });

  it("rejects an equity when debt is missing instead of treating it as zero", () => {
    const item = candidate("EQUITY", true);
    item.fundamental!.totalDebt = null;
    item.fundamental!.debtToAssetsPct = 0;
    item.fundamental!.debtToFreeCashFlow = 0;

    expect(hasRequiredVipResearchInputs(item)).toBe(false);
  });

  it.each(["BROAD_MARKET", "COMMODITY", "BOND", "FX", "CRYPTO"] as const)(
    "does not fabricate corporate financials for %s",
    (assetClass) => {
      const item = candidate(assetClass, false);
      expect(hasRequiredVipResearchInputs(item)).toBe(true);
      expect(calculateVipQuantitativeScore(item)).toBeGreaterThan(0);
    },
  );

  it("orders stronger confidence and lower risk ahead when quantitative merit is equal", () => {
    const item = { quantitativeScore: 75 };
    const strong = calculateVipAsymmetryRank(item, { confidenceScore: 82, riskScore: 35, stance: "AL" });
    const weak = calculateVipAsymmetryRank(item, { confidenceScore: 60, riskScore: 70, stance: "IZLE" });

    expect(strong).toBeGreaterThan(weak);
  });
});
