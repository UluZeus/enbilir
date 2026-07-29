import { beforeEach, describe, expect, it, vi } from "vitest";

const gateMocks = vi.hoisted(() => ({
  fetchJson: vi.fn(),
}));

vi.mock("@/lib/http-json", () => ({
  fetchJsonWithFallback: gateMocks.fetchJson,
}));

import { getLiveMarketItemsForSymbols } from "@/lib/live-market";

const now = new Date("2026-07-29T12:00:00.000Z");
const mappings = {
  "XAU/USD": "XAU_USDT",
  GRAM_GOLD_USD: "XAU_USDT",
  "XAG/USD": "XAG_USDT",
  GRAM_SILVER_USD: "XAG_USDT",
  WTI: "CL_USDT",
  BRENT: "BZ_USDT",
  NATGAS: "NG_USDT",
  PLATIN: "XPT_USDT",
  PALLADIUM: "XPD_USDT",
} as const;
const priceUnits = {
  "XAU/USD": "TROY_OUNCE",
  GRAM_GOLD_USD: "GRAM",
  "XAG/USD": "TROY_OUNCE",
  GRAM_SILVER_USD: "GRAM",
  WTI: "BARREL",
  BRENT: "BARREL",
  NATGAS: "MMBTU",
  PLATIN: "TROY_OUNCE",
  PALLADIUM: "TROY_OUNCE",
} as const;

const contractPrices: Record<string, number> = {
  XAU_USDT: 2_400,
  XAG_USDT: 30,
  CL_USDT: 80,
  BZ_USDT: 84,
  NG_USDT: 2.5,
  XPT_USDT: 950,
  XPD_USDT: 1_000,
};

type ProviderOptions = {
  contractOverrides?: Record<string, unknown>;
  tickerOverrides?: Record<string, unknown>;
  trades?: unknown[];
  coinbaseOverrides?: Record<string, unknown>;
  rejectGate?: boolean;
  rejectCoinbase?: boolean;
  tradeDelayMs?: number;
};

function installProviders(options: ProviderOptions = {}) {
  gateMocks.fetchJson.mockImplementation(async (urlValue: string) => {
    const url = new URL(urlValue);

    if (url.hostname === "api.gateio.ws" && options.rejectGate) {
      return null;
    }

    if (url.pathname.endsWith("/contracts")) {
      return Object.entries(contractPrices).map(([name, price]) => ({
        name,
        status: "trading",
        in_delisting: false,
        type: "direct",
        settle: "usdt",
        mark_price: String(price),
        index_price: String(price * 0.999),
        last_price: String(price * 1.001),
        ...options.contractOverrides,
      }));
    }

    if (url.pathname.endsWith("/tickers")) {
      return Object.entries(contractPrices).map(([contract, price]) => ({
        contract,
        mark_price: String(price),
        index_price: String(price * 0.999),
        last: String(price * 1.001),
        highest_bid: String(price * 0.999),
        lowest_ask: String(price * 1.001),
        ...options.tickerOverrides,
      }));
    }

    if (url.pathname.endsWith("/trades")) {
      if (options.tradeDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.tradeDelayMs));
      }
      const contract = url.searchParams.get("contract");
      const price = contract ? contractPrices[contract] : undefined;
      return options.trades ?? [{
        contract,
        price: String(price),
        create_time: now.getTime() / 1000 - 30.125,
      }];
    }

    if (url.hostname === "api.exchange.coinbase.com") {
      if (options.rejectCoinbase) {
        return null;
      }

      return {
        price: "1.0000",
        bid: "0.9999",
        ask: "1.0001",
        time: new Date(now.getTime() - 20_000).toISOString(),
        ...options.coinbaseOverrides,
      };
    }

    if (url.hostname === "api.binance.com") {
      return [];
    }

    if (url.hostname.includes("finance.yahoo.com")) {
      const symbols = url.searchParams.get("symbols")?.split(",") ?? [];
      return {
        spark: {
          result: symbols.map((symbol) => ({
            symbol,
            response: [{
              meta: {
                currency: "USD",
                regularMarketPrice: 2_350,
                chartPreviousClose: 2_340,
                regularMarketTime: Math.floor((now.getTime() - 10 * 60_000) / 1000),
                marketState: "REGULAR",
              },
            }],
          })),
        },
      };
    }

    throw new Error(`Unexpected URL: ${urlValue}`);
  });
}

describe("Gate commodity adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    process.env.ENABLE_LIVE_MARKET_FETCH = "true";
  });

  it("uses explicit semantic mappings and prefers valid Gate quotes over stale Yahoo", async () => {
    installProviders();

    const items = await getLiveMarketItemsForSymbols([
      ...Object.keys(mappings),
      "COPPER",
      "BRONZE",
    ]);

    for (const [symbol, providerSymbol] of Object.entries(mappings)) {
      expect(items.find((item) => item.symbol === symbol)).toMatchObject({
        source: "gate",
        providerSymbol,
        executionEligible: true,
        marketState: "REGULAR",
        marketStateSource: "gate-contract-status",
        instrumentType: "PERPETUAL_FUTURE",
        exchange: "GATE_USDT_FUTURES",
        priceType: "MARK",
        priceUnit: priceUnits[symbol as keyof typeof priceUnits],
        stablecoinProvider: "coinbase",
      });
      expect(items.find((item) => item.symbol === symbol)?.lastPriceNative).toBe(
        contractPrices[providerSymbol],
      );
    }

    expect(items.find((item) => item.symbol === "COPPER")?.executionEligible).toBe(false);
    expect(items.find((item) => item.symbol === "BRONZE")).toMatchObject({
      source: "representative",
      executionEligible: false,
    });
  });

  it("derives gram metals with the exact troy-ounce divisor and inherited provenance", async () => {
    installProviders();

    const [gram] = await getLiveMarketItemsForSymbols(["GRAM_GOLD_USD"]);
    const batch = await getLiveMarketItemsForSymbols(["GRAM_GOLD_USD", "XAU/USD", "WTI"]);

    expect(gram.priceUsd).toBeCloseTo(2_400 / 31.1034768, 10);
    expect(batch.find((item) => item.symbol === "GRAM_GOLD_USD")?.priceUsd).toBe(gram.priceUsd);
    expect(gram.askPriceUsd).toBeCloseTo(2_400 * 1.001 / 31.1034768, 10);
    expect(gram).toMatchObject({
      source: "gate",
      providerSymbol: "XAU_USDT",
      providerStatus: "trading",
      settleCurrency: "USDT",
      executionEligible: true,
    });
  });

  it.each([
    ["wrong contract", { contractOverrides: { name: "WRONG_USDT" } }],
    ["delisting", { contractOverrides: { in_delisting: true } }],
    ["not trading", { contractOverrides: { status: "prelaunch" } }],
    ["wrong type", { contractOverrides: { type: "quanto" } }],
    ["malformed book", { tickerOverrides: { lowest_ask: "not-a-number" } }],
    ["empty trades", { trades: [] }],
    ["future trade", { trades: [{ contract: "XAU_USDT", price: "2400", create_time_ms: String(now.getTime() + 1) }] }],
    ["stale trade", { trades: [{ contract: "XAU_USDT", price: "2400", create_time: now.getTime() / 1000 - 120.001 }] }],
    ["wide book", { tickerOverrides: { highest_bid: "2380", lowest_ask: "2420" } }],
    ["mark divergence", { tickerOverrides: { mark_price: "2400", index_price: "2300" } }],
    ["last divergence", { tickerOverrides: { mark_price: "2400", last: "2300" } }],
    ["latest trade/ticker mismatch", {
      trades: [{ contract: "XAU_USDT", price: "2300", create_time: now.getTime() / 1000 - 30 }],
    }],
    ["stale USDT", { coinbaseOverrides: { time: new Date(now.getTime() - 120_001).toISOString() } }],
    ["depegged USDT", { coinbaseOverrides: { price: "0.98", bid: "0.979", ask: "0.981" } }],
    ["unavailable USDT conversion", { rejectCoinbase: true }],
  ])("fails Gate closed for %s without stitching provider fields", async (_case, options) => {
    installProviders(options);

    const [gold] = await getLiveMarketItemsForSymbols(["XAU/USD"]);

    expect(gold.source).not.toBe("gate");
    expect(gold.executionEligible).toBe(false);
    expect(gold.providerStatus).toBeUndefined();
    expect(gold.stablecoinRate).toBeUndefined();
  });

  it("accepts the exact 120-second trade boundary and fractional seconds", async () => {
    installProviders({
      trades: [{
        contract: "XAU_USDT",
        price: "2400",
        create_time: now.getTime() / 1000 - 120,
      }],
    });

    const [gold] = await getLiveMarketItemsForSymbols(["XAU/USD"]);

    expect(gold.source).toBe("gate");
    expect(gold.sourceAsOf).toBe("2026-07-29T11:58:00.000Z");
    expect(gold.executionEligible).toBe(true);
  });

  it("uses the verified USDT/USD rate instead of silently assuming parity", async () => {
    installProviders({
      coinbaseOverrides: {
        price: "0.999",
        bid: "0.9989",
        ask: "0.9991",
      },
    });

    const [gold] = await getLiveMarketItemsForSymbols(["XAU/USD"]);

    expect(gold.priceUsd).toBeCloseTo(2_400 * 0.999, 10);
    expect(gold.priceNative).toBe(2_400);
    expect(gold.stablecoinRate).toBe(0.999);
    expect(gold.executionEligible).toBe(true);
  });

  it("falls back independently when Gate requests fail", async () => {
    installProviders({ rejectGate: true });

    const [gold] = await getLiveMarketItemsForSymbols(["XAU/USD"]);

    expect(gold.source).toBe("yahoo");
    expect(gold.executionEligible).toBe(false);
    expect(gold.providerSymbol).toBe("GC=F");
    expect(gold.providerStatus).toBeUndefined();
  });

  it("does not hide an old ticker retrieval behind delayed trade requests", async () => {
    installProviders({ tradeDelayMs: 16_000 });

    const request = getLiveMarketItemsForSymbols(["XAU/USD"]);
    await vi.advanceTimersByTimeAsync(16_000);
    const [gold] = await request;

    expect(gold.source).not.toBe("gate");
    expect(gold.executionEligible).toBe(false);
  });
});
