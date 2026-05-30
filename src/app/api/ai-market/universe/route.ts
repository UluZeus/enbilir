import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr";
const REQUEST_TIMEOUT_MS = 5000;
const QUOTE_ASSET = "USDT";

const excludedBaseAssets = new Set([
  "USDT",
  "USDC",
  "FDUSD",
  "TUSD",
  "BUSD",
  "DAI",
  "USDP",
  "USDD",
  "UST",
  "USTC",
  "EUR",
  "GBP",
  "TRY",
  "BRL",
  "AUD",
  "BIDR",
  "NGN",
  "RUB",
  "UAH",
  "ZAR",
  "PLN",
  "RON",
  "ARS",
  "MXN",
  "JPY",
]);

const excludedBaseSuffixes = ["BULL", "BEAR"];

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
};

type UniverseAsset = {
  symbol: string;
  displayName: string;
  price: number;
  change24h: number;
  volume24h: number;
  assetClass: "CRYPTO";
  exchange: "binance";
};

function isTicker(value: unknown): value is BinanceTicker {
  if (!value || typeof value !== "object") {
    return false;
  }

  const ticker = value as Record<string, unknown>;

  return (
    typeof ticker.symbol === "string" &&
    typeof ticker.lastPrice === "string" &&
    typeof ticker.priceChangePercent === "string" &&
    typeof ticker.volume === "string" &&
    typeof ticker.quoteVolume === "string"
  );
}

function getBaseAsset(symbol: string) {
  return symbol.endsWith(QUOTE_ASSET) ? symbol.slice(0, -QUOTE_ASSET.length) : null;
}

function isMeaningfulUsdtPair(ticker: BinanceTicker) {
  const baseAsset = getBaseAsset(ticker.symbol);

  if (!baseAsset || excludedBaseAssets.has(baseAsset)) {
    return false;
  }

  return !excludedBaseSuffixes.some((suffix) => baseAsset.endsWith(suffix));
}

function toFiniteNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toUniverseAsset(ticker: BinanceTicker): UniverseAsset | null {
  const baseAsset = getBaseAsset(ticker.symbol);
  const price = toFiniteNumber(ticker.lastPrice);
  const change24h = toFiniteNumber(ticker.priceChangePercent);
  const volume24h = toFiniteNumber(ticker.quoteVolume) ?? toFiniteNumber(ticker.volume);

  if (!baseAsset || price === null || change24h === null || volume24h === null || volume24h <= 0) {
    return null;
  }

  return {
    symbol: ticker.symbol,
    displayName: `${baseAsset}/${QUOTE_ASSET}`,
    price,
    change24h,
    volume24h,
    assetClass: "CRYPTO",
    exchange: "binance",
  };
}

function buildErrorResponse(message: string, status = 502) {
  return NextResponse.json(
    {
      data: [],
      error: message,
      exchange: "binance",
      updatedAt: new Date().toISOString(),
    },
    { status },
  );
}

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(BINANCE_TICKER_URL, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return buildErrorResponse(`Binance ticker verisi alinamadi. HTTP ${response.status}.`, response.status);
    }

    const payload: unknown = await response.json();

    if (!Array.isArray(payload)) {
      return buildErrorResponse("Binance ticker yaniti beklenen formatta degil.");
    }

    const data = payload
      .filter(isTicker)
      .filter(isMeaningfulUsdtPair)
      .map(toUniverseAsset)
      .filter((asset): asset is UniverseAsset => asset !== null)
      .sort((left, right) => right.volume24h - left.volume24h)
      .slice(0, 100);

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return buildErrorResponse("Binance ticker istegi zaman asimina ugradi.", 504);
    }

    return buildErrorResponse(error instanceof Error ? error.message : "Binance ticker verisi alinirken hata olustu.");
  } finally {
    clearTimeout(timeout);
  }
}
