import { describe, expect, it } from "vitest";
import { normalizeProviderCandles } from "@/lib/ai-market/candle-quality";

describe("provider candle normalization", () => {
  const now = Date.parse("2026-07-28T12:00:00.000Z");

  it("sorts, de-duplicates and rejects invalid OHLC, volume and future rows", () => {
    const firstTime = now - 2 * 60 * 60 * 1000;
    const secondTime = now - 60 * 60 * 1000;
    const result = normalizeProviderCandles([
      { openTime: secondTime, open: 102, high: 105, low: 101, close: 104, volume: 12 },
      { openTime: firstTime, open: 100, high: 103, low: 99, close: 101, volume: 10 },
      { openTime: secondTime, open: 102, high: 106, low: 101, close: 105, volume: 14 },
      { openTime: now - 30_000, open: 100, high: 99, low: 98, close: 100, volume: 5 },
      { openTime: now - 20_000, open: 100, high: 101, low: 99, close: 100, volume: -1 },
      { openTime: now + 10 * 60 * 1000, open: 100, high: 101, low: 99, close: 100, volume: 5 },
    ], { now });

    expect(result.candles).toEqual([
      { openTime: firstTime, open: 100, high: 103, low: 99, close: 101, volume: 10 },
      { openTime: secondTime, open: 102, high: 106, low: 101, close: 105, volume: 14 },
    ]);
    expect(result.duplicateCount).toBe(1);
    expect(result.rejectedCount).toBe(3);
  });

  it("rejects non-finite and non-positive price fields", () => {
    const result = normalizeProviderCandles([
      { openTime: now - 1000, open: Number.NaN, high: 10, low: 9, close: 9.5, volume: 1 },
      { openTime: now - 2000, open: 10, high: 11, low: 0, close: 10.5, volume: 1 },
    ], { now });

    expect(result.candles).toHaveLength(0);
    expect(result.rejectedCount).toBe(2);
  });
});
