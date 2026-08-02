import { describe, expect, it } from "vitest";
import { selectLatestCommonPortfolioEquityCohort } from "@/lib/portfolio-equity-cohort";

describe("portfolio equity cohort selection", () => {
  it("ignores a complete future cohort beyond the one-minute clock tolerance", () => {
    const asOf = new Date("2026-08-02T12:00:00.000Z");
    const records = [
      ...["alpha", "beta"].map((userId, index) => ({
        userId,
        periodKey: "equity-hour:2026072909",
        portfolioValueUsd: 1_000_000 + index,
        capturedAt: new Date("2026-07-29T09:00:00.000Z"),
      })),
      ...["alpha", "beta"].map((userId, index) => ({
        userId,
        periodKey: "equity-hour:2026080213",
        portfolioValueUsd: 9_000_000 + index,
        capturedAt: new Date("2026-08-02T12:01:00.001Z"),
      })),
    ];

    const cohort = selectLatestCommonPortfolioEquityCohort(["alpha", "beta"], records, asOf);

    expect(cohort?.periodKey).toBe("equity-hour:2026072909");
    expect(cohort?.capturedAt.toISOString()).toBe("2026-07-29T09:00:00.000Z");
  });

  it("rejects a future period key even when its capturedAt is backdated", () => {
    const asOf = new Date("2026-08-02T12:00:00.000Z");
    const cohort = selectLatestCommonPortfolioEquityCohort(["alpha"], [{
      userId: "alpha",
      periodKey: "equity-hour:2026080213",
      portfolioValueUsd: 9_000_000,
      capturedAt: new Date("2026-08-02T11:00:00.000Z"),
    }], asOf);

    expect(cohort).toBeNull();
  });
});
