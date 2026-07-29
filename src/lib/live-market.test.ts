import { beforeEach, describe, expect, it, vi } from "vitest";

const liveMarketMocks = vi.hoisted(() => ({
  fetchJson: vi.fn(),
}));

vi.mock("@/lib/http-json", () => ({
  fetchJsonWithFallback: liveMarketMocks.fetchJson,
}));

import {
  getLiveMarketItem,
  getLiveMarketItems,
  getLiveMarketItemsForSymbols,
  resetLiveMarketCachesForTests,
} from "@/lib/live-market";

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
    resetLiveMarketCachesForTests();
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

describe("server-owned executable quote cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    process.env.ENABLE_LIVE_MARKET_FETCH = "true";
    resetLiveMarketCachesForTests();
  });

  it("falls back to a still-executable cached snapshot after a transient provider miss", async () => {
    let yahooAvailable = true;
    liveMarketMocks.fetchJson.mockImplementation(async (urlValue: string) => {
      const url = new URL(urlValue);

      if (url.hostname === "api.binance.com") return [];
      if (!url.hostname.includes("finance.yahoo.com")) return null;
      if (!yahooAvailable) return null;

      return {
        spark: {
          result: [{
            symbol: "AAPL",
            response: [{
              meta: yahooMeta({
                regularMarketPrice: 200,
                chartPreviousClose: 198,
                marketState: "REGULAR",
                instrumentType: "EQUITY",
                exchangeName: "NMS",
              }),
            }],
          }],
        },
      };
    });

    const [first] = await getLiveMarketItemsForSymbols(["AAPL"]);
    yahooAvailable = false;
    const cached = await getLiveMarketItem("AAPL");
    const forcedRefresh = await getLiveMarketItem("AAPL", { refresh: true });

    expect(first).toMatchObject({ source: "yahoo", priceUsd: 200, executionEligible: true });
    expect(cached).toEqual(first);
    expect(forcedRefresh).toMatchObject({
      symbol: "AAPL",
      source: "fallback",
      executionEligible: false,
    });
  });

  it("rejects a cached snapshot once its executable freshness window expires", async () => {
    let yahooAvailable = true;
    liveMarketMocks.fetchJson.mockImplementation(async (urlValue: string) => {
      const url = new URL(urlValue);

      if (url.hostname === "api.binance.com") return [];
      if (!url.hostname.includes("finance.yahoo.com")) return null;
      if (!yahooAvailable) return null;

      return {
        spark: {
          result: [{
            symbol: "MSFT",
            response: [{
              meta: yahooMeta({
                regularMarketPrice: 500,
                chartPreviousClose: 495,
                marketState: "REGULAR",
                instrumentType: "EQUITY",
                exchangeName: "NMS",
              }),
            }],
          }],
        },
      };
    });

    const first = await getLiveMarketItem("MSFT");
    yahooAvailable = false;
    vi.setSystemTime(new Date(now.getTime() + 20 * 60_000 + 1));
    const rejected = await getLiveMarketItem("MSFT");

    expect(first?.executionEligible).toBe(true);
    expect(rejected).toMatchObject({
      symbol: "MSFT",
      source: "fallback",
      executionEligible: false,
    });
  });

  it("does not roll the executable cache back to an older out-of-order quote", async () => {
    let sourceAsOf = now.getTime() - 10_000;
    let yahooAvailable = true;
    liveMarketMocks.fetchJson.mockImplementation(async (urlValue: string) => {
      const url = new URL(urlValue);

      if (url.hostname === "api.binance.com") return [];
      if (!url.hostname.includes("finance.yahoo.com") || !yahooAvailable) return null;

      return {
        spark: {
          result: [{
            symbol: "NVDA",
            response: [{
              meta: yahooMeta({
                regularMarketPrice: sourceAsOf === now.getTime() - 10_000 ? 200 : 190,
                regularMarketTime: Math.floor(sourceAsOf / 1000),
                marketState: "REGULAR",
                instrumentType: "EQUITY",
                exchangeName: "NMS",
              }),
            }],
          }],
        },
      };
    });

    const [newer] = await getLiveMarketItemsForSymbols(["NVDA"]);
    sourceAsOf = now.getTime() - 20_000;
    await getLiveMarketItemsForSymbols(["NVDA"]);
    yahooAvailable = false;
    const cached = await getLiveMarketItem("NVDA");

    expect(newer.priceUsd).toBe(200);
    expect(cached).toMatchObject({
      priceUsd: 200,
      sourceAsOf: new Date(now.getTime() - 10_000).toISOString(),
    });
  });

  it("uses a verified UNKNOWN USD/TRY quote to normalize delayed BIST without making it executable", async () => {
    liveMarketMocks.fetchJson.mockImplementation(async (urlValue: string) => {
      const url = new URL(urlValue);

      if (!url.hostname.includes("finance.yahoo.com")) return [];

      return {
        spark: {
          result: [
            {
              symbol: "THYAO.IS",
              response: [{
                meta: yahooMeta({
                  currency: "TRY",
                  regularMarketPrice: 320,
                  chartPreviousClose: 318,
                  marketState: "REGULAR",
                  instrumentType: "EQUITY",
                  exchangeName: "IST",
                  exchangeDataDelayedBy: 15,
                }),
              }],
            },
            {
              symbol: "USDTRY=X",
              response: [{
                meta: yahooMeta({
                  currency: "TRY",
                  regularMarketPrice: 32,
                  chartPreviousClose: 31.9,
                  marketState: "UNKNOWN",
                  instrumentType: "CURRENCY",
                  exchangeName: "CCY",
                  exchangeDataDelayedBy: 0,
                }),
              }],
            },
          ],
        },
      };
    });

    const [thyao] = await getLiveMarketItemsForSymbols(["THYAO.IS"]);

    expect(thyao).toMatchObject({
      source: "yahoo",
      priceNative: 320,
      priceUsd: 10,
      exchangeDataDelayedBy: 15,
      executionEligible: false,
    });
  });

  it("keeps a REGULAR BIST quote fail-closed when delay evidence is missing", async () => {
    liveMarketMocks.fetchJson.mockImplementation(async (urlValue: string) => {
      const url = new URL(urlValue);

      if (!url.hostname.includes("finance.yahoo.com")) return [];

      return {
        spark: {
          result: [
            {
              symbol: "THYAO.IS",
              response: [{
                meta: yahooMeta({
                  currency: "TRY",
                  regularMarketPrice: 320,
                  marketState: "REGULAR",
                  instrumentType: "EQUITY",
                  exchangeName: "IST",
                  exchangeDataDelayedBy: undefined,
                }),
              }],
            },
            {
              symbol: "USDTRY=X",
              response: [{
                meta: yahooMeta({
                  currency: "TRY",
                  regularMarketPrice: 32,
                  marketState: "UNKNOWN",
                  instrumentType: "CURRENCY",
                  exchangeName: "CCY",
                  exchangeDataDelayedBy: 0,
                }),
              }],
            },
          ],
        },
      };
    });

    const [thyao] = await getLiveMarketItemsForSymbols(["THYAO.IS"]);

    expect(thyao).toMatchObject({
      source: "yahoo",
      priceUsd: 10,
      marketState: "REGULAR",
      executionEligible: false,
    });
    expect(thyao.exchangeDataDelayedBy).toBeUndefined();
  });
});
