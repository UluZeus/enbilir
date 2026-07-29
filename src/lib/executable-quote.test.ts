import { describe, expect, it } from "vitest";
import { isExecutableMarketQuote } from "@/lib/executable-quote";
import type { MarketItem } from "@/lib/market-data";

const now = new Date("2026-07-29T12:00:00.000Z").getTime();

function executableYahooItem(overrides: Partial<MarketItem> = {}): MarketItem {
  return {
    symbol: "AAPL",
    dataSymbol: "AAPL",
    name: "Apple",
    market: "NASDAQ",
    category: "NASDAQ",
    dataStatus: "live",
    source: "yahoo",
    price: "100.00",
    priceUsd: 100,
    changePercent: 0,
    sourceAsOf: new Date(now - 30_000).toISOString(),
    marketState: "REGULAR",
    marketStateSource: "provider",
    executionEligible: true,
    ...overrides,
  };
}

describe("central executable quote validation", () => {
  it("keeps Copper non-executable even with a fresh complete Yahoo futures provenance", () => {
    expect(isExecutableMarketQuote(executableYahooItem({
      symbol: "COPPER",
      dataSymbol: "hg.f",
      category: "COMMODITY",
      providerSymbol: "HG=F",
      instrumentType: "FUTURE",
      exchange: "CMX",
      marketState: "INFERRED_REGULAR",
      marketStateSource: "inferred-commodity-session",
      regularSessionStart: new Date(now - 60_000).toISOString(),
      regularSessionEnd: new Date(now + 60_000).toISOString(),
    }), { now })).toBe(false);
  });

  it.each([
    ["malformed price", { priceUsd: Number.NaN }],
    ["future timestamp", { sourceAsOf: new Date(now + 1).toISOString() }],
    ["stale timestamp", { sourceAsOf: new Date(now - 20 * 60_000 - 1).toISOString() }],
    ["closed state", { marketState: "CLOSED" }],
    ["halted state", { marketState: "HALTED" }],
    ["delayed status", { dataStatus: "delayed" as const }],
    ["closing-price status", { dataStatus: "close" as const }],
    ["reported provider delay", { exchangeDataDelayedBy: 1 }],
  ])("rejects a quote with %s", (_case, overrides) => {
    expect(isExecutableMarketQuote(executableYahooItem(overrides), { now })).toBe(false);
  });

  it("requires complete provider and session provenance for Yahoo commodities", () => {
    const commodity = executableYahooItem({
      symbol: "XAU/USD",
      dataSymbol: "xauusd",
      name: "Altın Ons",
      market: "Emtia",
      category: "COMMODITY",
    });

    expect(isExecutableMarketQuote(commodity, { now })).toBe(false);
    expect(isExecutableMarketQuote({
      ...commodity,
      providerSymbol: "GC=F",
      instrumentType: "FUTURE",
      exchange: "CMX",
      regularSessionStart: new Date(now - 60 * 60_000).toISOString(),
      regularSessionEnd: new Date(now + 60 * 60_000).toISOString(),
      exchangeDataDelayedBy: 0,
    }, { now })).toBe(true);
  });
});
