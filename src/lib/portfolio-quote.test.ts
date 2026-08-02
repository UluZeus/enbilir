import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isExecutableMarketQuote } from "@/lib/executable-quote";
import { getCashModeUsdRate, hasVerifiedPortfolioQuote } from "@/lib/portfolio";
import type { MarketItem } from "@/lib/market-data";

const now = new Date("2026-07-29T12:00:00.000Z").getTime();
const sundayNoon = new Date("2026-08-02T12:00:00.000Z").getTime();

function gateQuote(overrides: Partial<MarketItem> = {}): MarketItem {
  return {
    symbol: "XAU/USD",
    dataSymbol: "xauusd",
    name: "Gold",
    market: "Emtia",
    category: "COMMODITY",
    dataStatus: "live",
    source: "gate",
    price: "2400",
    priceUsd: 2_400,
    changePercent: 0,
    quoteCurrency: "USDT",
    sourceAsOf: new Date(now - 30_000).toISOString(),
    retrievedAt: new Date(now - 1_000).toISOString(),
    marketState: "REGULAR",
    marketStateSource: "gate-contract-status",
    providerSymbol: "XAU_USDT",
    providerStatus: "trading",
    providerDelisting: false,
    settleCurrency: "USDT",
    priceType: "MARK",
    priceUnit: "TROY_OUNCE",
    instrumentType: "PERPETUAL_FUTURE",
    exchange: "GATE_USDT_FUTURES",
    markPriceNative: 2_400,
    indexPriceNative: 2_400,
    lastPriceNative: 2_400,
    bidPriceNative: 2_397.6,
    askPriceNative: 2_402.4,
    markPriceUsd: 2_400,
    indexPriceUsd: 2_400,
    lastPriceUsd: 2_400,
    bidPriceUsd: 2_397.6,
    askPriceUsd: 2_402.4,
    stablecoinRate: 1,
    stablecoinAsOf: new Date(now - 20_000).toISOString(),
    stablecoinProvider: "coinbase",
    executionEligible: true,
    ...overrides,
  };
}

function yahooClosedQuote(overrides: Partial<MarketItem> = {}): MarketItem {
  return {
    symbol: "TEST.IS",
    dataSymbol: "test.is",
    name: "Test BIST",
    market: "BIST",
    category: "BIST",
    dataStatus: "close",
    source: "yahoo",
    price: "10",
    priceUsd: 10,
    priceNative: 400,
    changePercent: 0,
    quoteCurrency: "TRY",
    sourceAsOf: new Date("2026-07-31T18:00:00.000Z").toISOString(),
    retrievedAt: new Date(sundayNoon - 1_000).toISOString(),
    marketState: "CLOSED",
    marketStateSource: "provider",
    providerSymbol: "TEST.IS",
    instrumentType: "EQUITY",
    exchange: "IST",
    exchangeDataDelayedBy: 0,
    executionEligible: false,
    ...overrides,
  };
}

describe("portfolio Gate quote reliability", () => {
  it("accepts a Gate valuation only when centralized provenance validation passes", () => {
    expect(hasVerifiedPortfolioQuote(gateQuote(), now)).toBe(true);
  });

  it.each([
    ["stale", { sourceAsOf: new Date(now - 120_001).toISOString() }],
    ["stale retrieval", { retrievedAt: new Date(now - 15_001).toISOString() }],
    ["depegged", { stablecoinRate: 0.98 }],
    ["broken provenance", { providerSymbol: "XAG_USDT" }],
  ])("rejects a %s Gate valuation", (_case, overrides) => {
    expect(hasVerifiedPortfolioQuote(gateQuote(overrides), now)).toBe(false);
  });
});

describe("portfolio Yahoo market-closed valuation policy", () => {
  it("accepts a provider-backed Friday official close for Sunday valuation without enabling execution", () => {
    const quote = yahooClosedQuote();

    expect(hasVerifiedPortfolioQuote(quote, sundayNoon)).toBe(true);
    expect(isExecutableMarketQuote(quote, { now: sundayNoon })).toBe(false);
  });

  it.each([
    ["stale", { sourceAsOf: new Date(sundayNoon - 96 * 60 * 60_000 - 1).toISOString() }],
    ["delayed", { dataStatus: "delayed" as const }],
    ["fallback", { source: "fallback" as const }],
    ["delayed exchange evidence", { exchangeDataDelayedBy: 15 }],
    ["missing exchange delay evidence", { exchangeDataDelayedBy: undefined }],
    ["missing provider symbol", { providerSymbol: "" }],
    ["invalid source price", { priceNative: 0 }],
  ])("rejects a %s Yahoo market-closed valuation", (_case, overrides) => {
    expect(hasVerifiedPortfolioQuote(yahooClosedQuote(overrides), sundayNoon)).toBe(false);
  });
});

describe("cash conversion quote policy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function tryRepoQuote(overrides: Partial<MarketItem> = {}): MarketItem {
    return {
      symbol: "USD/TRY",
      dataSymbol: "usdtry",
      name: "Dolar TL",
      market: "Majör Döviz",
      category: "FX",
      dataStatus: "live",
      source: "yahoo",
      price: "32",
      priceUsd: 32,
      priceNative: 32,
      changePercent: 0,
      quoteCurrency: "TRY",
      sourceAsOf: new Date(now - 30_000).toISOString(),
      marketState: "UNKNOWN",
      marketStateSource: "provider",
      providerSymbol: "USDTRY=X",
      instrumentType: "CURRENCY",
      exchange: "CCY",
      regularSessionStart: new Date(now - 60 * 60_000).toISOString(),
      regularSessionEnd: new Date(now + 60 * 60_000).toISOString(),
      exchangeDataDelayedBy: 0,
      executionEligible: true,
      ...overrides,
    };
  }

  it("accepts a fresh UNKNOWN TRY_REPO conversion with strict Yahoo FX provenance", async () => {
    await expect(getCashModeUsdRate("TRY_REPO", [tryRepoQuote()], true)).resolves.toBe(1 / 32);
  });

  it("rejects a stale UNKNOWN TRY_REPO conversion", async () => {
    await expect(getCashModeUsdRate("TRY_REPO", [
      tryRepoQuote({ sourceAsOf: new Date(now - 120_001).toISOString() }),
    ], true)).resolves.toBeNull();
  });
});
