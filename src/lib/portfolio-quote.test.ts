import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCashModeUsdRate, hasVerifiedPortfolioQuote } from "@/lib/portfolio";
import type { MarketItem } from "@/lib/market-data";

const now = new Date("2026-07-29T12:00:00.000Z").getTime();

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
