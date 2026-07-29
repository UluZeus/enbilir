import { fetchJsonWithFallback } from "@/lib/http-json";
import { formatMarketItemValue, mixedMarketItems, type MarketItem } from "@/lib/market-data";
import { assessQuoteFreshness } from "@/lib/ai-market/data-freshness";
import {
  canInferYahooCommodityOpen,
  gateCommodityContracts,
  gateCommodityPriceUnits,
  isExecutableMarketQuote,
} from "@/lib/executable-quote";
import {
  mapSettledWithConcurrency,
  ProviderRequestBudget,
  withProviderRetry,
} from "@/lib/ai-market/provider-resilience";

type LiveQuote = {
  symbol: string;
  open: number;
  close: number;
  provider: "binance" | "yahoo" | "gate";
  currency: string;
  sourceAsOf: string;
  marketState: string;
  marketStateSource: "provider" | "inferred-commodity-session" | "gate-contract-status";
  retrievedAt?: string;
  priceNative?: number;
  providerSymbol?: string;
  providerStatus?: string;
  providerDelisting?: boolean;
  settleCurrency?: string;
  priceType?: "MARK";
  priceUnit?: MarketItem["priceUnit"];
  instrumentType?: string;
  exchange?: string;
  regularSessionStart?: string;
  regularSessionEnd?: string;
  exchangeDataDelayedBy?: number;
  markPriceNative?: number;
  indexPriceNative?: number;
  lastPriceNative?: number;
  bidPriceNative?: number;
  askPriceNative?: number;
  markPriceUsd?: number;
  indexPriceUsd?: number;
  lastPriceUsd?: number;
  bidPriceUsd?: number;
  askPriceUsd?: number;
  stablecoinRate?: number;
  stablecoinAsOf?: string;
  stablecoinProvider?: "coinbase";
};

type BinanceTicker = {
  symbol: string;
  openPrice: string;
  lastPrice: string;
  closeTime?: number;
};

type YahooSparkResponse = {
  spark?: {
    result?: Array<{
      symbol?: string;
      response?: Array<{
        meta?: {
          currency?: string;
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
          regularMarketTime?: number;
          marketState?: string;
          instrumentType?: string;
          exchange?: string;
          exchangeName?: string;
          currentTradingPeriod?: {
            regular?: {
              start?: number;
              end?: number;
            };
          };
          exchangeDataDelayedBy?: number;
        };
      }>;
    }>;
  };
};

type GateContract = {
  name?: string;
  status?: string;
  in_delisting?: boolean;
  type?: string;
};

type GateTicker = {
  contract?: string;
  mark_price?: string;
  index_price?: string;
  last?: string;
  highest_bid?: string;
  lowest_ask?: string;
};

type GateTrade = {
  contract?: string;
  price?: string;
  create_time?: number | string;
  create_time_ms?: number | string;
};

type CoinbaseTicker = {
  price?: string;
  bid?: string;
  ask?: string;
  time?: string;
};

const liveMarketCacheTtlMs = 30_000;
const gramTroyOunceDivisor = 31.1034768;
let liveMarketItemsCache: { items: MarketItem[]; expiresAt: number } | null = null;
let liveMarketItemsRequest: Promise<MarketItem[]> | null = null;

function liveFetchEnabled() {
  return process.env.ENABLE_LIVE_MARKET_FETCH !== "false";
}

function timeout<T>(milliseconds: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(fallback), milliseconds);
  });
}

async function fetchJson<T>(url: string, timeoutMs = 12_000): Promise<T | null> {
  try {
    return await withProviderRetry(
      () => fetchJsonWithFallback<T>(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        timeoutMs,
      }),
      { maxAttempts: 2 },
    );
  } catch {
    return null;
  }
}

async function fetchJsonBatch<T>(urls: string[], timeoutMs = 12_000): Promise<Array<T | null>> {
  const budget = new ProviderRequestBudget(urls.length);
  const settled = await mapSettledWithConcurrency(urls, 4, async (url) => {
    budget.consume();
    return fetchJson<T>(url, timeoutMs);
  });

  return settled.map((result) => result.status === "fulfilled" ? result.value : null);
}

function isBinanceTicker(value: unknown): value is BinanceTicker {
  if (!value || typeof value !== "object") {
    return false;
  }

  const ticker = value as Record<string, unknown>;

  return (
    typeof ticker.symbol === "string" &&
    typeof ticker.openPrice === "string" &&
    typeof ticker.lastPrice === "string"
  );
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCryptoQuoteSymbol(item: MarketItem) {
  return `${item.symbol.trim().toUpperCase()}USDT`;
}

function getYahooQuoteSymbol(item: MarketItem) {
  if (item.category === "BIST") {
    const normalized = item.symbol.trim().toUpperCase();
    return normalized.endsWith(".IS") ? normalized : `${normalized}.IS`;
  }

  if (item.category === "NASDAQ" || item.category === "DOW") {
    return item.symbol.trim().toUpperCase();
  }

  if (item.category === "INDEX") {
    const indexSymbols: Record<string, string> = {
      "s&p 500": "^GSPC",
      nasdaq: "^IXIC",
      djia: "^DJI",
    };

    return indexSymbols[item.symbol.trim().toLowerCase()];
  }

  const commoditySymbols: Record<string, string> = {
    "XAU/USD": "GC=F",
    "XAG/USD": "SI=F",
    GRAM_GOLD_USD: "GC=F",
    GRAM_SILVER_USD: "SI=F",
    COPPER: "HG=F",
    PALLADIUM: "PA=F",
    PLATIN: "PL=F",
    WTI: "CL=F",
    BRENT: "BZ=F",
    NATGAS: "NG=F",
  };

  const fxSymbols: Record<string, string> = {
    "USD/TRY": "USDTRY=X",
    "EUR/TRY": "EURTRY=X",
    "GBP/TRY": "GBPTRY=X",
    "CHF/TRY": "CHFTRY=X",
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "USD/JPY": "USDJPY=X",
    "USD/CHF": "USDCHF=X",
    "AUD/USD": "AUDUSD=X",
    "USD/CAD": "USDCAD=X",
  };

  return commoditySymbols[item.symbol.trim().toUpperCase()] ?? fxSymbols[item.symbol.trim().toUpperCase()];
}

function getYahooBatchSymbols(items: MarketItem[]) {
  const derivedQuoteDependencies: Readonly<Record<string, string[]>> = {
    GRAM_GOLD_USD: ["GC=F"],
    GRAM_SILVER_USD: ["SI=F"],
  };
  const symbols = Array.from(
    new Set(
      items.flatMap((item) => [
        ...(item.source !== "representative" && item.category !== "CRYPTO"
          ? [getYahooQuoteSymbol(item)]
          : []),
        ...(derivedQuoteDependencies[item.symbol] ?? []),
      ])
        .filter((symbol): symbol is string => Boolean(symbol)),
    ),
  );

  if (items.some((item) => item.category === "BIST") && !symbols.includes("USDTRY=X")) {
    symbols.push("USDTRY=X");
  }

  return symbols;
}

function getQuoteKey(item: MarketItem) {
  if (item.symbol === "GRAM_GOLD_USD") {
    return "GRAM_GOLD_USD";
  }

  if (item.symbol === "GRAM_SILVER_USD") {
    return "GRAM_SILVER_USD";
  }

  if (item.category === "CRYPTO") {
    return getCryptoQuoteSymbol(item);
  }

  const yahooSymbol = getYahooQuoteSymbol(item);
  return yahooSymbol ? yahooSymbol.toUpperCase() : item.dataSymbol.toUpperCase();
}

function isFreshQuote(quote: LiveQuote, now = Date.now()) {
  return assessQuoteFreshness({
    sourceAsOf: quote.sourceAsOf,
    provider: quote.provider,
    marketState: quote.marketState,
    now,
  }) === "FRESH";
}

function normalizeUsdPrice(fallback: MarketItem, quote: LiveQuote, quoteMap: Map<string, LiveQuote>) {
  if (fallback.category !== "BIST") {
    return quote.close;
  }

  const usdTry = quoteMap.get("USDTRY=X");
  if (!usdTry || usdTry.close <= 0 || !isFreshQuote(usdTry)) {
    return null;
  }

  return quote.close / usdTry.close;
}

function normalizeLiveQuote(fallback: MarketItem, quoteMap: Map<string, LiveQuote>, quote?: LiveQuote): MarketItem {
  const retrievedAt = new Date().toISOString();

  if (!quote || !Number.isFinite(quote.close) || quote.close <= 0) {
    return {
      ...fallback,
      dataStatus: fallback.dataStatus === "representative" ? "representative" : "close",
      source: fallback.source === "representative" ? "representative" : "fallback",
      sourceAsOf: null,
      retrievedAt,
      marketState: "UNAVAILABLE",
      executionEligible: false,
    };
  }

  const changePercent = quote.open > 0 ? ((quote.close - quote.open) / quote.open) * 100 : 0;
  const priceUsd = normalizeUsdPrice(fallback, quote, quoteMap);
  const freshness = assessQuoteFreshness({
    sourceAsOf: quote.sourceAsOf,
    provider: quote.provider,
    marketState: quote.marketState,
    isCommodity: fallback.category === "COMMODITY",
  });
  const quoteProvenance = {
    marketStateSource: quote.marketStateSource,
    providerSymbol: quote.providerSymbol,
    providerStatus: quote.providerStatus,
    providerDelisting: quote.providerDelisting,
    settleCurrency: quote.settleCurrency,
    priceType: quote.priceType,
    priceUnit: quote.priceUnit,
    instrumentType: quote.instrumentType,
    exchange: quote.exchange,
    regularSessionStart: quote.regularSessionStart,
    regularSessionEnd: quote.regularSessionEnd,
    exchangeDataDelayedBy: quote.exchangeDataDelayedBy,
    markPriceNative: quote.markPriceNative,
    indexPriceNative: quote.indexPriceNative,
    lastPriceNative: quote.lastPriceNative,
    bidPriceNative: quote.bidPriceNative,
    askPriceNative: quote.askPriceNative,
    markPriceUsd: quote.markPriceUsd,
    indexPriceUsd: quote.indexPriceUsd,
    lastPriceUsd: quote.lastPriceUsd,
    bidPriceUsd: quote.bidPriceUsd,
    askPriceUsd: quote.askPriceUsd,
    stablecoinRate: quote.stablecoinRate,
    stablecoinAsOf: quote.stablecoinAsOf,
    stablecoinProvider: quote.stablecoinProvider,
  };

  if (priceUsd === null) {
    return {
      ...fallback,
      dataStatus: "close",
      source: "fallback",
      quoteCurrency: quote.currency,
      priceNative: quote.priceNative ?? quote.close,
      sourceAsOf: quote.sourceAsOf,
      retrievedAt: quote.retrievedAt ?? retrievedAt,
      marketState: "FX_CONVERSION_UNAVAILABLE",
      ...quoteProvenance,
      executionEligible: false,
    };
  }

  const normalizedItem: MarketItem = {
    ...fallback,
    price: formatMarketItemValue(priceUsd, fallback.category),
    priceUsd,
    changePercent,
    dataStatus: freshness === "FRESH" ? "live" : "close",
    source: quote.provider,
    quoteCurrency: quote.currency,
    priceNative: quote.priceNative ?? quote.close,
    sourceAsOf: quote.sourceAsOf,
    retrievedAt: quote.retrievedAt ?? retrievedAt,
    marketState: quote.marketState,
    ...quoteProvenance,
    executionEligible: false,
  };

  normalizedItem.executionEligible =
    freshness === "FRESH" &&
    isExecutableMarketQuote(normalizedItem, { requireEligibilityFlag: false });

  return normalizedItem;
}

export function getFallbackMarketItems(): MarketItem[] {
  const emptyQuoteMap = new Map<string, LiveQuote>();
  return mixedMarketItems.map((fallback) => normalizeLiveQuote(fallback, emptyQuoteMap));
}

async function fetchBinanceQuotes(items: MarketItem[]) {
  const targetSymbols = new Set(
    items
      .filter((item) => item.category === "CRYPTO" && item.source !== "representative")
      .map((item) => getCryptoQuoteSymbol(item)),
  );

  if (targetSymbols.size === 0) {
    return new Map<string, LiveQuote>();
  }

  const payload = await fetchJson<unknown[]>("https://api.binance.com/api/v3/ticker/24hr", 12_000);

  if (!Array.isArray(payload)) {
    return new Map<string, LiveQuote>();
  }

  const quoteMap = new Map<string, LiveQuote>();

  for (const entry of payload) {
    if (!isBinanceTicker(entry)) {
      continue;
    }

    const symbol = entry.symbol.toUpperCase();

    if (!targetSymbols.has(symbol)) {
      continue;
    }

    const open = toFiniteNumber(entry.openPrice);
    const close = toFiniteNumber(entry.lastPrice);

    if (!Number.isFinite(close) || close === null || close <= 0) {
      continue;
    }

    quoteMap.set(symbol, {
      symbol,
      open: open && open > 0 ? open : close,
      close,
      provider: "binance",
      currency: "USDT",
      sourceAsOf: new Date(
        Number.isFinite(entry.closeTime) && Number(entry.closeTime) > 0 ? Number(entry.closeTime) : 0,
      ).toISOString(),
      marketState: "REGULAR",
      marketStateSource: "provider",
    });
  }

  return quoteMap;
}

function parseGateTradeTime(value: GateTrade) {
  const milliseconds = toFiniteNumber(value.create_time_ms);

  if (milliseconds !== null && milliseconds > 0) {
    return milliseconds >= 1_000_000_000_000 ? milliseconds : milliseconds * 1000;
  }

  const seconds = toFiniteNumber(value.create_time);
  return seconds !== null && seconds > 0 ? seconds * 1000 : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

async function fetchGateCommodityQuotes(items: MarketItem[]) {
  const targets = items
    .map((item) => ({ item, contract: gateCommodityContracts[item.symbol] }))
    .filter((target): target is { item: MarketItem; contract: string } => Boolean(target.contract));
  const requestedContracts = Array.from(new Set(targets.map((target) => target.contract)));

  if (requestedContracts.length === 0) {
    return new Map<string, LiveQuote>();
  }

  const [contractPayload, tickerResult, stablecoinPayload] = await Promise.all([
    fetchJson<unknown>("https://api.gateio.ws/api/v4/futures/usdt/contracts", 5_000),
    fetchJson<unknown>("https://api.gateio.ws/api/v4/futures/usdt/tickers", 5_000)
      .then((payload) => ({ payload, retrievedAt: new Date().toISOString() })),
    fetchJson<unknown>("https://api.exchange.coinbase.com/products/USDT-USD/ticker", 5_000),
  ]);
  const tickerPayload = tickerResult.payload;

  if (!Array.isArray(contractPayload) || !Array.isArray(tickerPayload) || !isRecord(stablecoinPayload)) {
    return new Map<string, LiveQuote>();
  }

  const stablecoin = stablecoinPayload as CoinbaseTicker;
  const stablecoinRate = toFiniteNumber(stablecoin.price);
  const stablecoinBid = toFiniteNumber(stablecoin.bid);
  const stablecoinAsk = toFiniteNumber(stablecoin.ask);
  const stablecoinTime = Date.parse(String(stablecoin.time ?? ""));
  const stablecoinAge = Date.now() - stablecoinTime;

  if (
    stablecoinRate === null ||
    stablecoinBid === null ||
    stablecoinAsk === null ||
    stablecoinBid <= 0 ||
    stablecoinBid > stablecoinRate ||
    stablecoinRate > stablecoinAsk ||
    stablecoinRate < 0.995 ||
    stablecoinRate > 1.005 ||
    !Number.isFinite(stablecoinTime) ||
    stablecoinAge < 0 ||
    stablecoinAge > 120_000
  ) {
    return new Map<string, LiveQuote>();
  }

  const tradePayloads = await fetchJsonBatch<unknown[]>(
    requestedContracts.map((contract) =>
      `https://api.gateio.ws/api/v4/futures/usdt/trades?contract=${encodeURIComponent(contract)}&limit=1`),
    5_000,
  );
  const contractsByName = new Map(
    contractPayload
      .filter(isRecord)
      .map((entry) => [String(entry.name ?? "").toUpperCase(), entry as GateContract]),
  );
  const tickersByContract = new Map(
    tickerPayload
      .filter(isRecord)
      .map((entry) => [String(entry.contract ?? "").toUpperCase(), entry as GateTicker]),
  );
  const tradesByContract = new Map<string, GateTrade>();

  requestedContracts.forEach((contract, index) => {
    const latest = (tradePayloads[index] ?? [])
      .filter((entry): entry is GateTrade =>
        isRecord(entry) && String(entry.contract ?? "").toUpperCase() === contract)
      .map((trade) => ({ trade, time: parseGateTradeTime(trade) }))
      .filter((entry): entry is { trade: GateTrade; time: number } =>
        entry.time !== null && Number.isFinite(entry.time))
      .sort((left, right) => right.time - left.time)[0];

    if (latest) {
      tradesByContract.set(contract, latest.trade);
    }
  });

  const retrievedAt = tickerResult.retrievedAt;
  const quoteMap = new Map<string, LiveQuote>();

  for (const { item, contract } of targets) {
    const contractMeta = contractsByName.get(contract);
    const ticker = tickersByContract.get(contract);
    const trade = tradesByContract.get(contract);
    const tradeTime = trade ? parseGateTradeTime(trade) : null;
    const tradePrice = toFiniteNumber(trade?.price);
    const mark = toFiniteNumber(ticker?.mark_price);
    const index = toFiniteNumber(ticker?.index_price);
    const last = toFiniteNumber(ticker?.last);
    const bid = toFiniteNumber(ticker?.highest_bid);
    const ask = toFiniteNumber(ticker?.lowest_ask);

    if (
      !contractMeta ||
      !ticker ||
      !trade ||
      String(contractMeta.name ?? "").toUpperCase() !== contract ||
      String(ticker.contract ?? "").toUpperCase() !== contract ||
      contractMeta.status !== "trading" ||
      contractMeta.in_delisting !== false ||
      contractMeta.type !== "direct" ||
      tradeTime === null ||
      tradePrice === null ||
      tradePrice <= 0 ||
      mark === null ||
      index === null ||
      last === null ||
      bid === null ||
      ask === null
    ) {
      continue;
    }

    if (last <= 0 || Math.abs(tradePrice - last) / last > 0.01) {
      continue;
    }

    const divisor = item.symbol.startsWith("GRAM_") ? gramTroyOunceDivisor : 1;
    const toUsd = (price: number) => price * stablecoinRate / divisor;
    const quote: LiveQuote = {
      symbol: item.symbol,
      open: toUsd(mark),
      close: toUsd(mark),
      provider: "gate",
      currency: "USDT",
      sourceAsOf: new Date(tradeTime).toISOString(),
      retrievedAt,
      marketState: "REGULAR",
      marketStateSource: "gate-contract-status",
      priceNative: mark / divisor,
      providerSymbol: contract,
      providerStatus: contractMeta.status,
      providerDelisting: contractMeta.in_delisting,
      settleCurrency: "USDT",
      priceType: "MARK",
      priceUnit: gateCommodityPriceUnits[item.symbol],
      instrumentType: "PERPETUAL_FUTURE",
      exchange: "GATE_USDT_FUTURES",
      markPriceNative: mark,
      indexPriceNative: index,
      lastPriceNative: tradePrice,
      bidPriceNative: bid,
      askPriceNative: ask,
      markPriceUsd: toUsd(mark),
      indexPriceUsd: toUsd(index),
      lastPriceUsd: toUsd(tradePrice),
      bidPriceUsd: toUsd(bid),
      askPriceUsd: toUsd(ask),
      stablecoinRate,
      stablecoinAsOf: new Date(stablecoinTime).toISOString(),
      stablecoinProvider: "coinbase",
    };
    const normalized = normalizeLiveQuote(item, new Map(), quote);

    if (normalized.executionEligible) {
      quoteMap.set(item.symbol, quote);
    }
  }

  return quoteMap;
}

async function fetchYahooSparkQuotes(symbols: string[]) {
  const batches: string[][] = [];
  const batchSize = 10;

  for (let index = 0; index < symbols.length; index += batchSize) {
    batches.push(symbols.slice(index, index + batchSize));
  }

  const payloads = await fetchJsonBatch<YahooSparkResponse>(
    batches.map((batch) => `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(batch.join(","))}&range=1d&interval=1d`),
    12_000,
  );

  const merged = new Map<string, LiveQuote>();
  for (const payload of payloads) {
    for (const entry of payload?.spark?.result ?? []) {
      const meta = entry.response?.[0]?.meta;
      const symbol = entry.symbol?.toUpperCase();
      const price = toFiniteNumber(meta?.regularMarketPrice);
      const previousClose = toFiniteNumber(meta?.chartPreviousClose ?? meta?.previousClose);

      if (!symbol || price === null || price <= 0) {
        continue;
      }

      const providerMarketState = String(meta?.marketState ?? "UNKNOWN").toUpperCase();
      const providerSymbol = symbol;
      const instrumentType = String(meta?.instrumentType ?? "").toUpperCase();
      const exchange = String(meta?.exchangeName ?? meta?.exchange ?? "").toUpperCase();
      const regularSessionStart = meta?.currentTradingPeriod?.regular?.start
        ? new Date(meta.currentTradingPeriod.regular.start * 1000).toISOString()
        : "";
      const regularSessionEnd = meta?.currentTradingPeriod?.regular?.end
        ? new Date(meta.currentTradingPeriod.regular.end * 1000).toISOString()
        : "";
      const sourceAsOf = meta?.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date(0).toISOString();
      const exchangeDataDelayedBy = toFiniteNumber(meta?.exchangeDataDelayedBy) ?? undefined;
      const inferredOpen =
        providerMarketState === "UNKNOWN" &&
        canInferYahooCommodityOpen({
          providerSymbol,
          instrumentType,
          exchange,
          sourceAsOf,
          regularSessionStart,
          regularSessionEnd,
          exchangeDataDelayedBy,
        });
      const nextQuote: LiveQuote = {
        symbol,
        open: previousClose && previousClose > 0 ? previousClose : price,
        close: price,
        provider: "yahoo",
        currency: String(meta?.currency ?? "USD").toUpperCase(),
        sourceAsOf,
        marketState: inferredOpen ? "INFERRED_REGULAR" : providerMarketState,
        marketStateSource: inferredOpen ? "inferred-commodity-session" : "provider",
        providerSymbol,
        instrumentType,
        exchange,
        regularSessionStart,
        regularSessionEnd,
        exchangeDataDelayedBy,
      };
      const currentQuote = merged.get(symbol);

      if (
        !currentQuote ||
        Date.parse(nextQuote.sourceAsOf) > Date.parse(currentQuote.sourceAsOf)
      ) {
        merged.set(symbol, nextQuote);
      }
    }
  }

  return merged;
}

function deriveGramMetalQuotes(quoteMap: Map<string, LiveQuote>) {
  const gold = quoteMap.get("GC=F");
  const silver = quoteMap.get("SI=F");

  if (gold && Number.isFinite(gold.close) && gold.close > 0) {
    quoteMap.set("GRAM_GOLD_USD", {
      symbol: "GRAM_GOLD_USD",
      open: gold.open / gramTroyOunceDivisor,
      close: gold.close / gramTroyOunceDivisor,
      provider: "yahoo",
      currency: gold.currency,
      sourceAsOf: gold.sourceAsOf,
      marketState: gold.marketState,
      marketStateSource: gold.marketStateSource,
      providerSymbol: gold.providerSymbol,
      instrumentType: gold.instrumentType,
      exchange: gold.exchange,
      regularSessionStart: gold.regularSessionStart,
      regularSessionEnd: gold.regularSessionEnd,
      exchangeDataDelayedBy: gold.exchangeDataDelayedBy,
    });
  }

  if (silver && Number.isFinite(silver.close) && silver.close > 0) {
    quoteMap.set("GRAM_SILVER_USD", {
      symbol: "GRAM_SILVER_USD",
      open: silver.open / gramTroyOunceDivisor,
      close: silver.close / gramTroyOunceDivisor,
      provider: "yahoo",
      currency: silver.currency,
      sourceAsOf: silver.sourceAsOf,
      marketState: silver.marketState,
      marketStateSource: silver.marketStateSource,
      providerSymbol: silver.providerSymbol,
      instrumentType: silver.instrumentType,
      exchange: silver.exchange,
      regularSessionStart: silver.regularSessionStart,
      regularSessionEnd: silver.regularSessionEnd,
      exchangeDataDelayedBy: silver.exchangeDataDelayedBy,
    });
  }
}

async function loadQuotedItems(items: MarketItem[]): Promise<MarketItem[]> {
  const quoteMap = new Map<string, LiveQuote>();
  const [binanceQuotes, gateQuotes, yahooQuotes] = await Promise.all([
    fetchBinanceQuotes(items),
    fetchGateCommodityQuotes(items),
    fetchYahooSparkQuotes(getYahooBatchSymbols(items)),
  ]);

  for (const [symbol, quote] of binanceQuotes) {
    quoteMap.set(symbol, quote);
  }

  for (const [symbol, quote] of yahooQuotes) {
    quoteMap.set(symbol, quote);
  }

  deriveGramMetalQuotes(quoteMap);

  return items.map((fallback) => {
    const key = getQuoteKey(fallback).toUpperCase();
    return normalizeLiveQuote(
      fallback,
      quoteMap,
      gateQuotes.get(fallback.symbol) ?? quoteMap.get(key),
    );
  });
}

export async function getLiveMarketItems(): Promise<MarketItem[]> {
  const fallbackItems = getFallbackMarketItems();

  if (!liveFetchEnabled()) {
    return fallbackItems;
  }

  const now = Date.now();

  if (liveMarketItemsCache && liveMarketItemsCache.expiresAt > now) {
    return liveMarketItemsCache.items;
  }

  async function loadItems() {
    return loadQuotedItems(mixedMarketItems);
  }

  try {
    if (!liveMarketItemsRequest) {
      liveMarketItemsRequest = Promise.race([loadItems(), timeout(7500, fallbackItems)])
        .then((items) => {
          liveMarketItemsCache = {
            items,
            expiresAt: Date.now() + liveMarketCacheTtlMs,
          };
          return items;
        })
        .finally(() => {
          liveMarketItemsRequest = null;
        });
    }

    return await liveMarketItemsRequest;
  } catch {
    return fallbackItems;
  }
}

export async function getLiveMarketItemsForSymbols(symbols: string[]): Promise<MarketItem[]> {
  const requestedSymbols = new Set(symbols);
  const fallbackItems = getFallbackMarketItems().filter((item) => requestedSymbols.has(item.symbol));

  if (!liveFetchEnabled() || fallbackItems.length === 0) {
    return fallbackItems;
  }

  try {
    return await loadQuotedItems(fallbackItems);
  } catch {
    return fallbackItems;
  }
}

export async function getLiveMarketItem(symbol: string): Promise<MarketItem | undefined> {
  const fallbackItem = getFallbackMarketItems().find((item) => item.symbol === symbol);

  if (!liveFetchEnabled()) {
    return fallbackItem;
  }

  try {
    const items = await getLiveMarketItemsForSymbols([symbol]);
    return items.find((item) => item.symbol === symbol) ?? fallbackItem;
  } catch {
    return fallbackItem;
  }
}

export function getTopRisersFrom(items: MarketItem[]) {
  return [...items].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
}

export function getTopFallersFrom(items: MarketItem[]) {
  return [...items].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
}
