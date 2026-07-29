import { beforeEach, describe, expect, it, vi } from "vitest";

const liveMarketMocks = vi.hoisted(() => ({
  fetchJson: vi.fn(),
}));

vi.mock("@/lib/http-json", () => ({
  fetchJsonWithFallback: liveMarketMocks.fetchJson,
}));

import { getLiveMarketItems, getLiveMarketItemsForSymbols } from "@/lib/live-market";

const now = new Date("2026-07-29T12:00:00.000Z");
const regularStart = Math.floor((now.getTime() - 60 * 60_000) / 1000);
const regularEnd = Math.floor((now.getTime() + 60 * 60_000) / 1000);

function yahooMeta(overrides: Record<string, unknown> = {}) {
  return {
    currency: "USD",
    regularMarketPrice: 2_400,
    chartPreviousClose: 2_390,
    regularMarketTime: Math.floor((now.getTime() - 30_000) / 1000),
    instrumentType: "FUTURE",
    exchangeName: "CMX",
    currentTradingPeriod: {
      regular: {
        start: regularStart,
        end: regularEnd,
      },
    },
    exchangeDataDelayedBy: 0,
    ...overrides,
  };
}

function installYahooResponse(metaOverrides: Record<string, unknown> = {}) {
  liveMarketMocks.fetchJson.mockImplementation(async (url: string) => {
    if (url.includes("api.binance.com")) {
      return [];
    }

    const symbols = new URL(url).searchParams.get("symbols")?.split(",") ?? [];

    return {
      spark: {
        result: symbols
          .filter((symbol) => symbol === "GC=F" || symbol === "SI=F")
          .map((symbol) => ({
            symbol,
            response: [{
              meta: yahooMeta({
                ...metaOverrides,
                regularMarketPrice: symbol === "GC=F" ? 2_400 : 30,
                chartPreviousClose: symbol === "GC=F" ? 2_390 : 29,
              }),
            }],
          })),
      },
    };
  });
}

describe("live commodity quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    process.env.ENABLE_LIVE_MARKET_FETCH = "true";
  });

  it("requests explicit gram-metal dependencies and gives single/full-universe parity", async () => {
    installYahooResponse();

    const single = await getLiveMarketItemsForSymbols(["GRAM_GOLD_USD"]);
    const full = await getLiveMarketItems();
    const yahooUrls = liveMarketMocks.fetchJson.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.includes("finance.yahoo.com"));

    expect(yahooUrls[0]).toContain("GC%3DF");
    expect(yahooUrls.some((url) => url.includes("SI%3DF"))).toBe(true);
    expect(single[0]).toMatchObject({
      symbol: "GRAM_GOLD_USD",
      priceUsd: full.find((item) => item.symbol === "GRAM_GOLD_USD")?.priceUsd,
      source: "yahoo",
      executionEligible: true,
    });
  });

  it("keeps bronze fail-closed without inventing an underlying request", async () => {
    installYahooResponse();

    const [bronze] = await getLiveMarketItemsForSymbols(["BRONZE"]);

    expect(bronze).toMatchObject({
      symbol: "BRONZE",
      source: "representative",
      executionEligible: false,
    });
    expect(liveMarketMocks.fetchJson).not.toHaveBeenCalled();
  });

  it("infers an open session only for a current, matching, non-delayed commodity future", async () => {
    installYahooResponse();

    const [gold] = await getLiveMarketItemsForSymbols(["XAU/USD"]);

    expect(gold).toMatchObject({
      source: "yahoo",
      marketState: "INFERRED_REGULAR",
      marketStateSource: "inferred-commodity-session",
      providerSymbol: "GC=F",
      instrumentType: "FUTURE",
      exchange: "CMX",
      exchangeDataDelayedBy: 0,
      executionEligible: true,
    });
  });

  it("accepts the observed Yahoo futures payload when delay metadata is omitted", async () => {
    installYahooResponse({ exchangeDataDelayedBy: undefined });

    const [gold] = await getLiveMarketItemsForSymbols(["XAU/USD"]);

    expect(gold).toMatchObject({
      marketState: "INFERRED_REGULAR",
      providerSymbol: "GC=F",
      exchange: "CMX",
      executionEligible: true,
    });
    expect(gold.exchangeDataDelayedBy).toBeUndefined();
  });

  it.each([
    ["stale", { regularMarketTime: Math.floor((now.getTime() - 121_000) / 1000) }],
    ["outside session", {
      currentTradingPeriod: {
        regular: {
          start: Math.floor((now.getTime() + 60_000) / 1000),
          end: Math.floor((now.getTime() + 120_000) / 1000),
        },
      },
    }],
    ["delayed", { exchangeDataDelayedBy: 10 }],
    ["unknown instrument", { instrumentType: "EQUITY" }],
  ])("does not infer an open commodity quote when metadata is %s", async (_case, overrides) => {
    installYahooResponse(overrides);

    const [gold] = await getLiveMarketItemsForSymbols(["XAU/USD"]);

    expect(gold.executionEligible).toBe(false);
    expect(gold.marketState).toBe("UNKNOWN");
  });
});
