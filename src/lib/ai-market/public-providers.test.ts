import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchJsonWithFallback = vi.hoisted(() => vi.fn());

vi.mock("@/lib/http-json", () => ({
  fetchJsonWithFallback,
}));

import { fetchBinanceCandles } from "@/lib/ai-market/binance-public";
import { fetchYahooCandles } from "@/lib/ai-market/yahoo-public";

describe("public candle providers", () => {
  beforeEach(() => {
    fetchJsonWithFallback.mockReset();
  });

  it("normalizes malformed, duplicate and out-of-order Binance rows", async () => {
    const now = Date.now();
    fetchJsonWithFallback.mockResolvedValue([
      [now - 60_000, "10", "12", "9", "11", "4", now, "0", 1, "0", "0", "0"],
      [now - 120_000, "9", "10", "8", "9.5", "3", now, "0", 1, "0", "0", "0"],
      [now - 60_000, "10", "13", "9", "12", "5", now, "0", 1, "0", "0", "0"],
      [now - 30_000, "10", "9", "8", "10", "1", now, "0", 1, "0", "0", "0"],
      null,
    ]);

    const candles = await fetchBinanceCandles("BTCUSDT");

    expect(candles).toHaveLength(2);
    expect(candles[0].openTime).toBe(now - 120_000);
    expect(candles[1]).toMatchObject({ openTime: now - 60_000, close: 12, high: 13 });
  });

  it("applies the same quality gate to Yahoo series", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    fetchJsonWithFallback.mockResolvedValue({
      chart: {
        result: [{
          timestamp: [nowSeconds - 60, nowSeconds - 120, nowSeconds - 60],
          indicators: {
            quote: [{
              open: [10, 9, 10],
              high: [12, 10, 13],
              low: [9, 8, 9],
              close: [11, 9.5, 12],
              volume: [4, 3, 5],
            }],
          },
        }],
      },
    });

    const candles = await fetchYahooCandles("AAPL");

    expect(candles).toHaveLength(2);
    expect(candles[0].openTime).toBe((nowSeconds - 120) * 1000);
    expect(candles[1].close).toBe(12);
  });
});
