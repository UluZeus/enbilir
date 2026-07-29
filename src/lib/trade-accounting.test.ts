import { describe, expect, it } from "vitest";
import { calculateRealizedTradePnl, getVirtualExecutionCosts } from "@/lib/trade-accounting";

describe("virtual trade accounting", () => {
  it("applies adverse slippage to the supplied side-specific ask/bid reference", () => {
    const buy = getVirtualExecutionCosts({
      category: "COMMODITY",
      side: "BUY",
      quotePriceUsd: 101,
      requestedAmountUsd: 1_000,
    });
    const sell = getVirtualExecutionCosts({
      category: "COMMODITY",
      side: "SELL",
      quotePriceUsd: 99,
      requestedAmountUsd: 990,
    });

    expect(buy.executionPriceUsd).toBeGreaterThan(101);
    expect(sell.executionPriceUsd).toBeLessThan(99);
    expect(sell.quantity).toBe(10);
  });

  it("keeps a buy cash budget inclusive of fee and adverse slippage", () => {
    const result = getVirtualExecutionCosts({
      category: "NASDAQ",
      side: "BUY",
      quotePriceUsd: 100,
      requestedAmountUsd: 10_000,
    });

    expect(result.cashDeltaUsd).toBe(10_000);
    expect(result.executionPriceUsd).toBe(100.02);
    expect(result.feeUsd).toBeGreaterThan(0);
    expect(result.executionNotionalUsd + result.feeUsd).toBeCloseTo(10_000, 8);
    expect(result.quantity * result.executionPriceUsd).toBeCloseTo(result.executionNotionalUsd, 8);
  });

  it("deducts sell fee and slippage before calculating realized result", () => {
    const execution = getVirtualExecutionCosts({
      category: "CRYPTO",
      side: "SELL",
      quotePriceUsd: 110,
      requestedAmountUsd: 11_000,
    });
    const pnl = calculateRealizedTradePnl({
      quantity: execution.quantity,
      averagePriceUsd: 100,
      netProceedsUsd: execution.cashDeltaUsd,
    });

    expect(execution.executionPriceUsd).toBeCloseTo(109.945, 8);
    expect(pnl.costBasisUsd).toBe(10_000);
    expect(pnl.realizedPnlUsd).toBeLessThan(1_000);
    expect(pnl.realizedPnlUsd).toBeGreaterThan(980);
    expect(pnl.realizedPnlPercent).toBeCloseTo(pnl.realizedPnlUsd / 100, 8);
  });
});
