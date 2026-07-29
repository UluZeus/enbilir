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

  it("accepts a fresh Yahoo UNKNOWN quote only for a canonical FX conversion session", () => {
    expect(isExecutableMarketQuote(executableYahooItem({
      symbol: "USD/TRY",
      dataSymbol: "usdtry",
      category: "FX",
      providerSymbol: "USDTRY=X",
      priceUsd: 32,
      priceNative: 32,
      marketState: "UNKNOWN",
      instrumentType: "CURRENCY",
      exchange: "CCY",
      regularSessionStart: new Date(now - 60 * 60_000).toISOString(),
      regularSessionEnd: new Date(now + 60 * 60_000).toISOString(),
      exchangeDataDelayedBy: 0,
    }), { now })).toBe(true);
  });

  it.each([
    ["stale", { sourceAsOf: new Date(now - 120_001).toISOString() }],
    ["mismatched symbol", { providerSymbol: "EURTRY=X" }],
    ["wrong instrument", { instrumentType: "EQUITY" }],
    ["wrong exchange", { exchange: "IST" }],
    ["outside provider session", {
      regularSessionStart: new Date(now + 60_000).toISOString(),
      regularSessionEnd: new Date(now + 120_000).toISOString(),
    }],
    ["delayed", { exchangeDataDelayedBy: 15 }],
  ])("rejects a Yahoo UNKNOWN FX conversion quote when %s", (_case, overrides) => {
    expect(isExecutableMarketQuote(executableYahooItem({
      symbol: "USD/TRY",
      dataSymbol: "usdtry",
      category: "FX",
      providerSymbol: "USDTRY=X",
      priceUsd: 32,
      priceNative: 32,
      marketState: "UNKNOWN",
      instrumentType: "CURRENCY",
      exchange: "CCY",
      regularSessionStart: new Date(now - 60 * 60_000).toISOString(),
      regularSessionEnd: new Date(now + 60 * 60_000).toISOString(),
      exchangeDataDelayedBy: 0,
      ...overrides,
    }), { now })).toBe(false);
  });

  it.each([
    ["summer Friday before close", "2026-07-31T20:59:00.000Z", true],
    ["summer Friday at close", "2026-07-31T21:00:00.000Z", false],
    ["summer Sunday before open", "2026-08-02T20:59:00.000Z", false],
    ["summer Sunday at open", "2026-08-02T21:00:00.000Z", true],
    ["winter Friday before close", "2026-01-30T21:59:00.000Z", true],
    ["winter Friday at close", "2026-01-30T22:00:00.000Z", false],
    ["winter Sunday before open", "2026-02-01T21:59:00.000Z", false],
    ["winter Sunday at open", "2026-02-01T22:00:00.000Z", true],
  ])("applies the New York FX 24/5 boundary at %s", (_case, nowIso, expected) => {
    const boundaryNow = Date.parse(nowIso);

    expect(isExecutableMarketQuote(executableYahooItem({
      symbol: "USD/TRY",
      dataSymbol: "usdtry",
      category: "FX",
      providerSymbol: "USDTRY=X",
      priceUsd: 32,
      priceNative: 32,
      sourceAsOf: new Date(boundaryNow).toISOString(),
      marketState: "UNKNOWN",
      instrumentType: "CURRENCY",
      exchange: "CCY",
      regularSessionStart: new Date(boundaryNow - 60 * 60_000).toISOString(),
      regularSessionEnd: new Date(boundaryNow + 60 * 60_000).toISOString(),
      exchangeDataDelayedBy: 0,
    }), { now: boundaryNow })).toBe(expected);
  });

  it.each([
    ["missing delay evidence", undefined],
    ["reported 15-minute delay", 15],
  ])("keeps a REGULAR BIST quote non-executable with %s", (_case, exchangeDataDelayedBy) => {
    expect(isExecutableMarketQuote(executableYahooItem({
      symbol: "THYAO",
      dataSymbol: "thyao.tr",
      category: "BIST",
      providerSymbol: "THYAO.IS",
      priceUsd: 10,
      priceNative: 320,
      marketState: "REGULAR",
      exchangeDataDelayedBy,
    }), { now })).toBe(false);
  });

  it("allows a REGULAR BIST quote only with explicit zero-delay evidence", () => {
    expect(isExecutableMarketQuote(executableYahooItem({
      symbol: "THYAO",
      dataSymbol: "thyao.tr",
      category: "BIST",
      providerSymbol: "THYAO.IS",
      priceUsd: 10,
      priceNative: 320,
      marketState: "REGULAR",
      exchangeDataDelayedBy: 0,
    }), { now })).toBe(true);
  });
});
