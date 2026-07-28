import { describe, expect, it } from "vitest";
import {
  assessCandleFreshness,
  assessQuoteFreshness,
  classifyCandleFreshness,
} from "@/lib/ai-market/data-freshness";

describe("AI agent candle freshness", () => {
  const now = Date.parse("2026-07-28T04:00:00.000Z");

  it("rejects stale and future crypto candles for directional signals", () => {
    expect(classifyCandleFreshness({ candleOpenTime: now - 60 * 60 * 1000, assetClass: "CRYPTO", interval: "1h", now })).toBe("FRESH");
    expect(classifyCandleFreshness({ candleOpenTime: now - 3 * 60 * 60 * 1000, assetClass: "CRYPTO", interval: "1h", now })).toBe("STALE");
    expect(classifyCandleFreshness({ candleOpenTime: now + 10 * 60 * 1000, assetClass: "CRYPTO", interval: "1h", now })).toBe("STALE");
  });

  it("allows a recent prior-session equity candle but rejects old observations", () => {
    expect(classifyCandleFreshness({ candleOpenTime: now - 2 * 60 * 60 * 1000, assetClass: "EQUITY", interval: "1h", now })).toBe("FRESH");
    expect(classifyCandleFreshness({ candleOpenTime: now - 18 * 60 * 60 * 1000, assetClass: "EQUITY", interval: "1h", now })).toBe("STALE");
  });

  it("allows a weekend-sized gap only for daily session data", () => {
    expect(classifyCandleFreshness({
      candleOpenTime: now - 72 * 60 * 60 * 1000,
      assetClass: "EQUITY",
      interval: "1d",
      now,
    })).toBe("FRESH");
    expect(classifyCandleFreshness({
      candleOpenTime: now - 72 * 60 * 60 * 1000,
      assetClass: "CRYPTO",
      interval: "1d",
      now,
    })).toBe("STALE");
  });

  it("marks a recent prior-session equity candle as market-closed on weekends", () => {
    const weekendNow = Date.parse("2026-08-02T12:00:00.000Z");
    const fridayClose = Date.parse("2026-07-31T20:00:00.000Z");

    expect(assessCandleFreshness({
      candleOpenTime: fridayClose,
      assetClass: "EQUITY",
      interval: "1h",
      now: weekendNow,
    })).toBe("MARKET_CLOSED");
    expect(assessCandleFreshness({
      candleOpenTime: fridayClose,
      assetClass: "CRYPTO",
      interval: "1h",
      now: weekendNow,
    })).toBe("STALE");
  });

  it("distinguishes future and missing observations from stale data", () => {
    expect(assessCandleFreshness({
      candleOpenTime: now + 10 * 60 * 1000,
      assetClass: "CRYPTO",
      interval: "1h",
      now,
    })).toBe("FUTURE");
    expect(assessCandleFreshness({
      candleOpenTime: 0,
      assetClass: "CRYPTO",
      interval: "1h",
      now,
    })).toBe("MISSING");
  });

  it("does not label a closed or timestamp-less quote as live", () => {
    expect(assessQuoteFreshness({
      sourceAsOf: new Date(now - 5 * 60 * 1000).toISOString(),
      provider: "yahoo",
      marketState: "CLOSED",
      now,
    })).toBe("MARKET_CLOSED");
    expect(assessQuoteFreshness({
      sourceAsOf: new Date(0).toISOString(),
      provider: "binance",
      marketState: "REGULAR",
      now,
    })).toBe("MISSING");
  });
});
