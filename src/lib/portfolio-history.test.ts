import { describe, expect, it } from "vitest";
import {
  calculatePercentChange,
  calculatePortfolioPeriodCoverage,
  getPortfolioSeriesForRange,
  normalizePortfolioHistory,
} from "@/lib/portfolio-history";

describe("portfolio history", () => {
  it("calculates signed percent change without inventing a zero baseline", () => {
    expect(calculatePercentChange(1_000_000, 1_025_000)).toBe(2.5);
    expect(calculatePercentChange(1_000_000, 975_000)).toBe(-2.5);
    expect(calculatePercentChange(0, 975_000)).toBeNull();
  });

  it("keeps historical baselines ordered and appends the live value", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");
    const history = normalizePortfolioHistory(
      [],
      [
        { portfolioValueUsd: 1_000_000, capturedAt: new Date("2026-07-11T11:00:00.000Z") },
        { portfolioValueUsd: 1_010_000, capturedAt: new Date("2026-07-15T11:00:00.000Z") },
      ],
    );

    const series = getPortfolioSeriesForRange(history, 7, 1_025_000, now, "WEEKLY");

    expect(series.map((point) => point.valueUsd)).toEqual([1_000_000, 1_010_000, 1_025_000]);
    expect(series.at(-1)?.source).toBe("live-current");
  });

  it("returns an empty range when no verified baseline exists", () => {
    const series = getPortfolioSeriesForRange([], 1, 1_025_000, new Date("2026-07-18T12:00:00.000Z"), "DAILY");
    expect(series).toEqual([]);
  });

  it("marks aligned hourly history as a full period and shorter history as partial", () => {
    const end = new Date("2026-07-18T12:00:00.000Z");
    const aligned = calculatePortfolioPeriodCoverage(new Date("2026-07-17T11:40:00.000Z"), end, 1);
    const short = calculatePortfolioPeriodCoverage(new Date("2026-07-18T06:00:00.000Z"), end, 1);

    expect(aligned.coveragePercent).toBeGreaterThan(97.5);
    expect(aligned.isPartial).toBe(false);
    expect(short.coveragePercent).toBe(25);
    expect(short.observedDays).toBe(0.25);
    expect(short.isPartial).toBe(true);
  });

  it("keeps a nearly aligned range partial when its first snapshot is after the requested start", () => {
    const end = new Date("2026-07-18T12:00:00.000Z");
    const coverage = calculatePortfolioPeriodCoverage(new Date("2026-07-17T12:20:00.000Z"), end, 1);

    expect(coverage.coveragePercent).toBeGreaterThan(97.5);
    expect(coverage.isPartial).toBe(true);
  });

  it("does not call a stale, overlong baseline a full-period return", () => {
    const coverage = calculatePortfolioPeriodCoverage(
      new Date("2026-07-10T12:00:00.000Z"),
      new Date("2026-07-18T12:00:00.000Z"),
      7,
    );

    expect(coverage.coveragePercent).toBe(87.5);
    expect(coverage.isPartial).toBe(true);
  });

  it("uses the history point nearest the requested cutoff", () => {
    const now = new Date("2026-07-18T12:00:00.000Z");
    const history = normalizePortfolioHistory([], [
      { portfolioValueUsd: 990_000, capturedAt: new Date("2026-07-16T12:00:00.000Z") },
      { portfolioValueUsd: 1_000_000, capturedAt: new Date("2026-07-17T11:45:00.000Z") },
      { portfolioValueUsd: 1_002_000, capturedAt: new Date("2026-07-17T12:10:00.000Z") },
      { portfolioValueUsd: 1_010_000, capturedAt: new Date("2026-07-18T06:00:00.000Z") },
    ]);

    const series = getPortfolioSeriesForRange(history, 1, 1_015_000, now, "DAILY");

    expect(series[0].valueUsd).toBe(1_002_000);
    expect(series.at(-1)?.valueUsd).toBe(1_015_000);
  });
});
