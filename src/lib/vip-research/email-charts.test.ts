import { describe, expect, it } from "vitest";
import { buildVipEmailChartSet } from "@/lib/vip-research/email-charts";

const REPORT_TIME = new Date("2026-07-18T04:00:00.000Z");

function sourcePayload(closes: number[], latestTime = REPORT_TIME.getTime(), sourceAsOf = latestTime) {
  return {
    sourceAsOf: new Date(sourceAsOf).toISOString(),
    technicalSeries: {
      points: closes.map((close, index) => ({
        time: latestTime - (closes.length - index - 1) * 3_600_000,
        close,
      })),
    },
  };
}

describe("VIP email chart set", () => {
  it("keeps all 11 assets ordered and prepares attachment-free HTML chart samples", async () => {
    const result = await buildVipEmailChartSet("report-1", REPORT_TIME, [
      { symbol: "NVDA", displayName: "Nvidia", lastPrice: 132, sourcePayload: sourcePayload([100, 108, 115]) },
      {
        symbol: "XAGUSD",
        displayName: "Silver",
        lastPrice: 30,
        sourcePayload: sourcePayload([10, 31, 30], REPORT_TIME.getTime()),
      },
      { symbol: "AMD", displayName: "AMD", lastPrice: 150, sourcePayload: sourcePayload([140, 150]) },
    ]);

    expect(result.charts.map((chart) => chart.label)).toEqual([
      "XAG/USD",
      "XAU/USD",
      "NVDA",
      "BTC",
      "ETH",
      "Brent",
      "USD/TRY",
      "CCJ",
      "BIST 100",
      "Dow Jones",
      "Nasdaq",
    ]);
    expect(result.charts[0]).toMatchObject({ direction: "YUKARI", freshness: "CURRENT" });
    expect(result.charts[0].changePercent3d).toBeCloseTo((30 / 10 - 1) * 100, 5);
    expect(result.charts[0].normalizedSamples).toEqual([0, 100, 95]);
    expect(result.charts[2]).toMatchObject({ direction: "YUKARI", freshness: "CURRENT" });
    expect(result.charts.find((chart) => chart.label === "XAU/USD")).toMatchObject({
      direction: "VERI_YOK",
      freshness: "UNAVAILABLE",
      normalizedSamples: [],
    });
    expect(result.charts.some((chart) => chart.label === "AMD")).toBe(false);
    expect(result.expectedChartCount).toBe(11);
    expect(result.renderedChartCount).toBe(2);
    expect(result.attachments).toEqual([]);
    expect(result.failedSymbols).toEqual([]);
    expect(result.unavailableSymbols).toEqual([
      "XAUUSD",
      "BTCUSDT",
      "ETHUSDT",
      "BZ=F",
      "USDTRY",
      "CCJ",
      "XU100.IS",
      "^DJI",
      "^IXIC",
    ]);
  });

  it("accepts the 96-hour closure boundary and rejects older or implausibly future data", async () => {
    const boundary = await buildVipEmailChartSet("boundary", REPORT_TIME, [
      {
        symbol: "XAGUSD",
        displayName: "Silver",
        lastPrice: 30,
        sourcePayload: sourcePayload([29, 30], REPORT_TIME.getTime() - 96 * 3_600_000),
      },
      {
        symbol: "XAUUSD",
        displayName: "Gold",
        lastPrice: 2400,
        sourcePayload: sourcePayload([2390, 2400], REPORT_TIME.getTime() - 96 * 3_600_000 - 1),
      },
      {
        symbol: "NVDA",
        displayName: "Nvidia",
        lastPrice: 132,
        sourcePayload: sourcePayload([130, 132], REPORT_TIME.getTime() + 15 * 60_000 + 1),
      },
    ]);

    expect(boundary.charts[0]).toMatchObject({ freshness: "CURRENT" });
    expect(boundary.charts[0].asOf).toBe(new Date(REPORT_TIME.getTime() - 96 * 3_600_000).toISOString());
    expect(boundary.charts[1]).toMatchObject({
      freshness: "STALE",
      lastPrice: null,
      changePercent3d: null,
      normalizedSamples: [],
    });
    expect(boundary.charts[2]).toMatchObject({
      freshness: "FUTURE",
      lastPrice: null,
      changePercent3d: null,
      normalizedSamples: [],
    });
    expect(boundary.renderedChartCount).toBe(1);
    expect(boundary.unavailableSymbols).toContain("XAUUSD");
    expect(boundary.unavailableSymbols).toContain("NVDA");
  });
});
