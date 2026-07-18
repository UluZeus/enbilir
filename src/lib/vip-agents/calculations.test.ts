import { describe, expect, it } from "vitest";
import {
  calculateVipAgentTradePnl,
  calculateVipAgentMaximumDrawdown,
  calculateVipAgentAccount,
  calculateVipAgentPeriods,
  calculateVipAgentSplitAdjustment,
  getVipAgentBuyIneligibilityReason,
  getVipAgentHistoryPagination,
  getVipAgentPortfolioDecision,
  getVipAgentPositionExitReason,
  isVipAgentTerminalDailyAction,
  shouldReuseVipAgentDailyRun,
} from "./calculations";
import {
  VIP_AGENT_PERFORMANCE_BASE_USD,
  VIP_AGENT_RESERVE_USD,
  VIP_AGENT_STARTING_BALANCE_USD,
  VIP_AGENT_STRATEGIES,
} from "./config";

describe("VIP agent capital invariants", () => {
  it("keeps USD 100k reserved and measures the USD 1.1m account on a USD 1m base", () => {
    expect(VIP_AGENT_STARTING_BALANCE_USD).toBe(1_100_000);
    expect(VIP_AGENT_RESERVE_USD).toBe(100_000);
    expect(VIP_AGENT_PERFORMANCE_BASE_USD).toBe(1_000_000);
    expect(VIP_AGENT_STARTING_BALANCE_USD - VIP_AGENT_RESERVE_USD).toBe(VIP_AGENT_PERFORMANCE_BASE_USD);

    expect(calculateVipAgentAccount({
      cashUsd: VIP_AGENT_STARTING_BALANCE_USD,
      positionsValueUsd: 0,
      reserveUsd: VIP_AGENT_RESERVE_USD,
      performanceBaseUsd: VIP_AGENT_PERFORMANCE_BASE_USD,
    })).toEqual({
      totalBalanceUsd: 1_100_000,
      performanceEquityUsd: 1_000_000,
      pnlUsd: 0,
      returnPercent: 0,
    });
  });

  it("reports account profit in both USD and percent of the fixed USD 1m base", () => {
    expect(calculateVipAgentAccount({
      cashUsd: 610_000,
      positionsValueUsd: 515_000,
      reserveUsd: 100_000,
      performanceBaseUsd: 1_000_000,
    })).toEqual({
      totalBalanceUsd: 1_125_000,
      performanceEquityUsd: 1_025_000,
      pnlUsd: 25_000,
      returnPercent: 2.5,
    });
  });
});

describe("VIP agent period P/L", () => {
  it("measures drawdown from the fixed performance base and keeps the historic peak", () => {
    const snapshots = [
      { capturedAt: new Date("2026-01-01T00:00:00.000Z"), performanceEquityUsd: 950_000 },
      { capturedAt: new Date("2026-02-01T00:00:00.000Z"), performanceEquityUsd: 1_100_000 },
      { capturedAt: new Date("2026-03-01T00:00:00.000Z"), performanceEquityUsd: 990_000 },
    ];

    expect(calculateVipAgentMaximumDrawdown(snapshots, 1_000_000)).toBe(10);
  });

  it("uses the latest snapshot before each cutoff and the fixed performance base", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");
    const snapshots = [
      ["2025-07-01T12:00:00.000Z", 950_000],
      ["2026-01-01T12:00:00.000Z", 990_000],
      ["2026-04-01T12:00:00.000Z", 1_010_000],
      ["2026-06-01T12:00:00.000Z", 1_030_000],
      ["2026-07-10T12:00:00.000Z", 1_040_000],
      ["2026-07-18T12:00:00.000Z", 1_050_000],
    ].map(([capturedAt, performanceEquityUsd]) => ({
      capturedAt: new Date(capturedAt),
      performanceEquityUsd: Number(performanceEquityUsd),
    }));

    const periods = calculateVipAgentPeriods(snapshots, 1_000_000, new Date("2025-01-01T00:00:00.000Z"), now);
    expect(periods.map(({ key, pnlUsd, returnPercent }) => ({ key, pnlUsd, returnPercent }))).toEqual([
      { key: "daily", pnlUsd: 10_000, returnPercent: 1 },
      { key: "weekly", pnlUsd: 10_000, returnPercent: 1 },
      { key: "monthly", pnlUsd: 20_000, returnPercent: 2 },
      { key: "threeMonth", pnlUsd: 40_000, returnPercent: 4 },
      { key: "sixMonth", pnlUsd: 60_000, returnPercent: 6 },
      { key: "yearly", pnlUsd: 100_000, returnPercent: 10 },
    ]);
    expect(periods.every((period) => period.isPartial === false)).toBe(true);
  });

  it("marks a period partial when the agent did not exist at its cutoff", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");
    const periods = calculateVipAgentPeriods(
      [{ capturedAt: now, performanceEquityUsd: 1_020_000 }],
      1_000_000,
      new Date("2026-07-17T12:00:00.000Z"),
      now,
    );
    expect(periods.find((period) => period.key === "weekly")).toMatchObject({
      pnlUsd: 20_000,
      returnPercent: 2,
      isPartial: true,
    });
  });
});

describe("VIP agent trade decisions", () => {
  const sabit = VIP_AGENT_STRATEGIES.find((strategy) => strategy.slug === "sabit")!;
  const olgun = VIP_AGENT_STRATEGIES.find((strategy) => strategy.slug === "olgun")!;
  const yildirim = VIP_AGENT_STRATEGIES.find((strategy) => strategy.slug === "yildirim")!;
  const eligibleIdea = {
    stance: "AL",
    confidenceScore: 90,
    riskScore: 30,
    entryLow: 90,
    entryHigh: 110,
    stopLoss: 80,
  };

  it("accepts an eligible BUY and turns failed rules into SKIP reasons", () => {
    expect(getVipAgentBuyIneligibilityReason(sabit, eligibleIdea, 100)).toBeNull();
    expect(getVipAgentBuyIneligibilityReason(sabit, { ...eligibleIdea, stance: "TUT" }, 100)).toContain("yalnızca AL");
    expect(getVipAgentBuyIneligibilityReason(sabit, { ...eligibleIdea, confidenceScore: 81 }, 100)).toContain("ajan eşiği 82");
    expect(getVipAgentBuyIneligibilityReason(sabit, { ...eligibleIdea, riskScore: 39 }, 100)).toContain("ajan tavanı 38");
    expect(getVipAgentBuyIneligibilityReason(sabit, eligibleIdea, 111)).toContain("giriş bandının dışında");
    expect(getVipAgentBuyIneligibilityReason(sabit, { ...eligibleIdea, entryLow: 75, entryHigh: 90 }, 80)).toContain("stop seviyesinde");
  });

  it("applies conservative, balanced, and aggressive thresholds independently", () => {
    const idea = { ...eligibleIdea, confidenceScore: 75, riskScore: 50 };
    expect(getVipAgentBuyIneligibilityReason(sabit, idea, 100)).toContain("ajan eşiği 82");
    expect(getVipAgentBuyIneligibilityReason(olgun, idea, 100)).toBeNull();
    expect(getVipAgentBuyIneligibilityReason(yildirim, idea, 100)).toBeNull();
    expect(getVipAgentBuyIneligibilityReason(olgun, eligibleIdea, 111)).toBeNull();
  });

  it("selects SELL for stop, target, or UZAK_DUR and otherwise leaves the position on HOLD", () => {
    expect(getVipAgentPositionExitReason({ price: 79, stopLossUsd: 80, targetPriceUsd: 120 })).toContain("Stop çalıştı");
    expect(getVipAgentPositionExitReason({ price: 121, stopLossUsd: 80, targetPriceUsd: 120 })).toContain("hedef gerçekleşti");
    expect(getVipAgentPositionExitReason({ price: 100, stopLossUsd: 80, targetPriceUsd: 120, currentStance: "UZAK_DUR" })).toContain("UZAK DUR");
    expect(getVipAgentPositionExitReason({ price: 100, stopLossUsd: 80, targetPriceUsd: 120, currentStance: "TUT" })).toBeNull();
  });
});

describe("VIP agent per-cycle trade P/L", () => {
  it("keeps a closed BUY tied to its own SELL after the same symbol is reopened", () => {
    const oldBuy = { side: "BUY", positionCycleId: "cycle-old" };
    const oldSell = {
      positionCycleId: "cycle-old",
      realizedPnlUsd: 250,
      realizedPnlPercent: 25,
    };
    const reopenedPosition = {
      positionCycleId: "cycle-new",
      quantity: 5,
      averagePriceUsd: 200,
      lastPriceUsd: 220,
    };

    expect(calculateVipAgentTradePnl(oldBuy, reopenedPosition, oldSell)).toEqual({
      pnlUsd: 250,
      pnlPercent: 25,
      pnlState: "CLOSED",
    });
  });

  it("shows unrealized P/L only for the matching open cycle", () => {
    const newBuy = { side: "BUY", positionCycleId: "cycle-new" };
    const reopenedPosition = {
      positionCycleId: "cycle-new",
      quantity: 5,
      averagePriceUsd: 200,
      lastPriceUsd: 220,
    };

    expect(calculateVipAgentTradePnl(newBuy, reopenedPosition)).toEqual({
      pnlUsd: 100,
      pnlPercent: 10,
      pnlState: "OPEN",
    });
    expect(calculateVipAgentTradePnl(
      { side: "BUY", positionCycleId: "another-cycle" },
      reopenedPosition,
    )).toEqual({ pnlUsd: null, pnlPercent: null, pnlState: "UNKNOWN" });
  });

  it("uses the realized result directly on a SELL row", () => {
    expect(calculateVipAgentTradePnl({
      side: "SELL",
      positionCycleId: "cycle-old",
      realizedPnlUsd: -125.5,
      realizedPnlPercent: -12.55,
    })).toEqual({ pnlUsd: -125.5, pnlPercent: -12.55, pnlState: "CLOSED" });
  });
});

describe("VIP agent stock-split adjustments", () => {
  const position = {
    quantity: 10,
    averagePriceUsd: 2_000,
    lastPriceUsd: 2_100,
    stopLossUsd: 1_800,
    targetPriceUsd: 2_400,
    secondaryTarget: 2_600,
    appliedSplitFactor: 1,
  };

  it("preserves economic value across a forward split", () => {
    expect(calculateVipAgentSplitAdjustment(position, 20)).toEqual({
      adjustmentFactor: 20,
      hasAdjustment: true,
      appliedSplitFactor: 20,
      quantity: 200,
      averagePriceUsd: 100,
      lastPriceUsd: 105,
      stopLossUsd: 90,
      targetPriceUsd: 120,
      secondaryTarget: 130,
    });
  });

  it("handles reverse splits and cumulative incremental factors", () => {
    expect(calculateVipAgentSplitAdjustment({ ...position, appliedSplitFactor: 2 }, 0.2)).toMatchObject({
      adjustmentFactor: 0.1,
      quantity: 1,
      averagePriceUsd: 20_000,
      stopLossUsd: 18_000,
    });
    expect(calculateVipAgentSplitAdjustment({ ...position, appliedSplitFactor: 2 }, 6)).toMatchObject({
      adjustmentFactor: 3,
      quantity: 30,
      averagePriceUsd: 666.66666667,
    });
  });

  it("is idempotent when the already-applied cumulative factor is unchanged", () => {
    expect(calculateVipAgentSplitAdjustment({ ...position, appliedSplitFactor: 20 }, 20)).toMatchObject({
      adjustmentFactor: 1,
      hasAdjustment: false,
      quantity: position.quantity,
      averagePriceUsd: position.averagePriceUsd,
    });
    expect(calculateVipAgentSplitAdjustment(position, 0)).toBeNull();
  });
});

describe("VIP agent forced daily reruns", () => {
  it("reuses a daily snapshot normally but recomputes it when force is set", () => {
    expect(shouldReuseVipAgentDailyRun(true, false)).toBe(true);
    expect(shouldReuseVipAgentDailyRun(true, true)).toBe(false);
    expect(shouldReuseVipAgentDailyRun(false, false)).toBe(false);
  });

  it("treats same-day BUY and SELL decisions as terminal to prevent duplicate cycles", () => {
    expect(isVipAgentTerminalDailyAction("BUY")).toBe(true);
    expect(isVipAgentTerminalDailyAction("SELL")).toBe(true);
    expect(isVipAgentTerminalDailyAction("HOLD")).toBe(false);
    expect(isVipAgentTerminalDailyAction("SKIP")).toBe(false);
    expect(isVipAgentTerminalDailyAction("ERROR")).toBe(false);
  });

  it("replaces a stale no-report portfolio decision after a forced report run", () => {
    expect(getVipAgentPortfolioDecision({ hasReport: false, ideaCount: 0, tradeCount: 0 }))
      .toEqual({ action: "HOLD", reason: "Henüz VIP sabah raporu bulunmadığı için nakitte bekleniyor." });

    const refreshed = getVipAgentPortfolioDecision({ hasReport: true, ideaCount: 4, tradeCount: 0 });
    expect(refreshed.action).toBe("SUMMARY");
    expect(refreshed.reason).toContain("4 VIP fikri değerlendirildi");
    expect(refreshed.reason).not.toContain("raporu bulunmadığı");
  });
});

describe("VIP agent history pagination", () => {
  it("makes every trade reachable without overlapping page ranges", () => {
    expect(getVipAgentHistoryPagination(1, 501, 250)).toMatchObject({ page: 1, skip: 0, firstItem: 1, lastItem: 250, hasPreviousPage: false, hasNextPage: true });
    expect(getVipAgentHistoryPagination(2, 501, 250)).toMatchObject({ page: 2, skip: 250, firstItem: 251, lastItem: 500, hasPreviousPage: true, hasNextPage: true });
    expect(getVipAgentHistoryPagination(3, 501, 250)).toMatchObject({ page: 3, skip: 500, firstItem: 501, lastItem: 501, hasPreviousPage: true, hasNextPage: false });
  });

  it("normalizes malformed, repeated, negative, and out-of-range pages safely", () => {
    expect(getVipAgentHistoryPagination("not-a-page", 501, 250).page).toBe(1);
    expect(getVipAgentHistoryPagination("-2", 501, 250).page).toBe(1);
    expect(getVipAgentHistoryPagination(["2", "3"], 501, 250).page).toBe(2);
    expect(getVipAgentHistoryPagination("999999", 501, 250).page).toBe(3);
    expect(getVipAgentHistoryPagination("999999999999999999999", 501, 250).page).toBe(1);
  });
});
