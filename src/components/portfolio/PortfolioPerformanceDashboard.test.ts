import { describe, expect, it } from "vitest";
import { calculateCurrentPositionMarketImpactUsd } from "./PortfolioPerformanceDashboard";

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
