import { describe, expect, it } from "vitest";
import { buildVipEmailChartSet } from "@/lib/vip-research/email-charts";

function sourcePayload(closes: number[]) {
  const latestTime = 1_750_000_000_000;
  return {
    technicalSeries: {
      points: closes.map((close, index) => ({
        time: latestTime - (closes.length - index - 1) * 3_600_000,
        close,
      })),
    },
  };
}

describe("VIP email chart set", () => {
  it("keeps the requested 11-asset order and creates inline PNG charts when data exists", async () => {
    const result = await buildVipEmailChartSet("report-1", [
      { symbol: "NVDA", displayName: "Nvidia", lastPrice: 132, sourcePayload: sourcePayload([100, 108, 115]) },
      {
        symbol: "XAGUSD",
        displayName: "Silver",
        lastPrice: 30,
        sourcePayload: {
          technicalSeries: {
            points: [
              { time: 1_750_000_000_000 - 96 * 3_600_000, close: 10 },
              { time: 1_750_000_000_000 - 48 * 3_600_000, close: 31 },
              { time: 1_750_000_000_000, close: 30 },
            ],
          },
        },
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
    expect(result.charts[0]).toMatchObject({ direction: "ASAGI" });
    expect(result.charts[0].changePercent3d).toBeCloseTo((30 / 31 - 1) * 100, 5);
    expect(result.charts[2]).toMatchObject({ direction: "YUKARI" });
    expect(result.charts.find((chart) => chart.label === "XAU/USD")).toMatchObject({ direction: "VERI_YOK", imageSrc: null });
    expect(result.charts.some((chart) => chart.label === "AMD")).toBe(false);
    expect(result.attachments).toHaveLength(2);
    expect(result.renderedChartCount).toBe(2);
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
    expect(result.attachments[0].content.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(result.attachments.every((attachment) => attachment.contentDisposition === "inline")).toBe(true);
    expect(result.charts[0].imageSrc).toBe(`cid:${result.attachments[0].cid}`);
  });
});
