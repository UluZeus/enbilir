import { describe, expect, it } from "vitest";
import { hasVerifiedPortfolioQuote } from "@/lib/portfolio";
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
