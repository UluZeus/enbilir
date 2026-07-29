import { describe, expect, it } from "vitest";
import {
  calculateCurrentPositionMarketImpactUsd,
  resolveTotalPeriod,
  type PortfolioPeriodSnapshot,
} from "./PortfolioPerformanceDashboard";

const positionWithLargeLongPeriodChanges = {
  symbol: "TEST",
  name: "Test asset",
  currentValueUsd: 1_000,
  currentProfitLossUsd: 0,
  currentProfitLossPercent: 0,
  performance: {
    symbol: "TEST",
    providerSymbol: "TEST",
    price: 100,
    changes: {
      "1h": null,
      "1d": null,
      "1w": 900,
      "1m": 900,
      "3m": 900,
      "6m": 900,
      "1y": 900,
    },
    updatedAt: "2026-07-29T00:00:00.000Z",
  },
};

describe("current-position market impact", () => {
  it("reconstructs the prior value before calculating the USD impact", () => {
    expect(calculateCurrentPositionMarketImpactUsd(110, 10)).toBeCloseTo(10, 8);
    expect(calculateCurrentPositionMarketImpactUsd(90, -10)).toBeCloseTo(-10, 8);
    expect(calculateCurrentPositionMarketImpactUsd(1_000, 0)).toBe(0);
  });

  it("does not turn impossible or missing market changes into portfolio history", () => {
    expect(calculateCurrentPositionMarketImpactUsd(100, null)).toBeNull();
    expect(calculateCurrentPositionMarketImpactUsd(100, -100)).toBeNull();
    expect(calculateCurrentPositionMarketImpactUsd(-1, 10)).toBeNull();
  });
});

describe("total portfolio period resolution", () => {
  it.each([
    ["1w", "WEEKLY"],
    ["1m", "MONTHLY"],
    ["3m", "QUARTERLY"],
    ["6m", "SEMI_ANNUAL"],
    ["1y", "YEARLY"],
  ] as const)("keeps empty %s history unavailable despite large asset-level changes", (period, historyKey) => {
    const emptyHistory: PortfolioPeriodSnapshot = {
      key: historyKey,
      change: null,
      changeUsd: null,
      source: "empty",
    };

    const result = resolveTotalPeriod(period, 1_000, emptyHistory, [positionWithLargeLongPeriodChanges]);

    expect(result).toMatchObject({
      percent: null,
      usd: null,
      source: "unavailable",
    });
  });

  it("preserves genuine partial portfolio history instead of replacing it with asset performance", () => {
    const partialYearlyHistory: PortfolioPeriodSnapshot = {
      key: "YEARLY",
      change: 4,
      changeUsd: 40,
      coveragePercent: 25,
      isPartial: true,
      source: "history",
    };

    const result = resolveTotalPeriod("1y", 1_000, partialYearlyHistory, [positionWithLargeLongPeriodChanges]);

    expect(result).toMatchObject({
      percent: 4,
      usd: 40,
      source: "history-partial",
      coveragePercent: 25,
      isPartial: true,
    });
  });
});
