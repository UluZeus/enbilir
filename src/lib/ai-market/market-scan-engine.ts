import { getImportantSignalAlerts, type SignalAlert } from "@/lib/ai-market/alert-engine";
import { fetchBinanceCandles } from "@/lib/ai-market/binance-public";
import { calculateIndicators } from "@/lib/ai-market/indicators";
import { assessRisk } from "@/lib/ai-market/risk-engine";
import { analyzeSignal } from "@/lib/ai-market/signal-engine";
import type { Candle, MarketAnalysis, MarketExchange } from "@/lib/ai-market/types";

export type MarketScanExchange = "binance";

export type MarketScanAlert = {
  key: string;
  symbol: string;
  displayName: string;
  exchange: MarketExchange;
  interval: string;
  alertType: SignalAlert["alertType"];
  label: string;
  confidence: number;
  recommendationScore: number;
  riskScore: number;
  price: number | null;
  reason: string;
  message: string;
  timestamp: string;
  soundLevel: SignalAlert["soundLevel"];
  priority: number;
};

export type MarketScanResult = {
  scannedAt: string;
  exchange: MarketScanExchange;
  candidateCount: number;
  processedCount: number;
  intervalsChecked: string[];
  alerts: MarketScanAlert[];
  errors: string[];
};

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
};

type ScanCandidate = {
  symbol: string;
  displayName: string;
  exchange: MarketExchange;
  providerSymbol: string;
  price: number;
  changePercent: number;
  quoteVolume: number;
  volatilityPercent: number;
  score: number;
};

const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr";
const QUOTE_ASSET = "USDT";
const MAX_CANDIDATES = 30;
const TICKER_TIMEOUT_MS = 6500;
const CANDLE_TIMEOUT_MS = 5500;
const CANDLE_LIMIT = 160;

const excludedBaseAssets = new Set([
  "USDT",
  "USDC",
  "FDUSD",
  "TUSD",
  "BUSD",
  "DAI",
  "USDP",
  "USD1",
  "USDD",
  "UST",
  "USTC",
  "EUR",
  "AEUR",
  "EURI",
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

const excludedBaseSuffixes = ["UP", "DOWN", "BULL", "BEAR", "3L", "3S", "5L", "5S"];
const allowedIntervals = new Set(["1m", "5m", "15m", "1h", "4h"]);

function toFiniteNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getBaseFromBinanceSymbol(symbol: string) {
  return symbol.endsWith(QUOTE_ASSET) ? symbol.slice(0, -QUOTE_ASSET.length) : null;
}

function isAllowedBaseAsset(baseAsset: string | null) {
  if (!baseAsset || excludedBaseAssets.has(baseAsset)) {
    return false;
  }

  return !excludedBaseSuffixes.some((suffix) => baseAsset.endsWith(suffix));
}

function candidateScore(quoteVolume: number, changePercent: number, volatilityPercent: number) {
  return Math.log10(Math.max(quoteVolume, 1)) * 12 + Math.abs(changePercent) * 2.2 + volatilityPercent * 1.6;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Public ticker data unavailable (${response.status})`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isBinanceTicker(value: unknown): value is BinanceTicker {
  if (!value || typeof value !== "object") {
    return false;
  }

  const ticker = value as Record<string, unknown>;
  return (
    typeof ticker.symbol === "string" &&
    typeof ticker.lastPrice === "string" &&
    typeof ticker.priceChangePercent === "string" &&
    typeof ticker.quoteVolume === "string" &&
    typeof ticker.volume === "string" &&
    typeof ticker.highPrice === "string" &&
    typeof ticker.lowPrice === "string"
  );
}

function toBinanceCandidate(ticker: BinanceTicker): ScanCandidate | null {
  const baseAsset = getBaseFromBinanceSymbol(ticker.symbol);

  if (!isAllowedBaseAsset(baseAsset)) {
    return null;
  }

  const price = toFiniteNumber(ticker.lastPrice);
  const changePercent = toFiniteNumber(ticker.priceChangePercent);
  const quoteVolume = toFiniteNumber(ticker.quoteVolume) ?? toFiniteNumber(ticker.volume);
  const high = toFiniteNumber(ticker.highPrice);
  const low = toFiniteNumber(ticker.lowPrice);

  if (!baseAsset || price === null || changePercent === null || quoteVolume === null || quoteVolume <= 0 || high === null || low === null || price <= 0) {
    return null;
  }

  const volatilityPercent = ((high - low) / price) * 100;

  return {
    symbol: ticker.symbol,
    displayName: `${baseAsset}/${QUOTE_ASSET}`,
    exchange: "binance",
    providerSymbol: ticker.symbol,
    price,
    changePercent,
    quoteVolume,
    volatilityPercent,
    score: candidateScore(quoteVolume, changePercent, volatilityPercent),
  };
}

async function loadCandidates() {
  const errors: string[] = [];
  const candidateResult = await Promise.allSettled([
    fetchJsonWithTimeout<unknown[]>(BINANCE_TICKER_URL, TICKER_TIMEOUT_MS).then((payload) =>
      payload.filter(isBinanceTicker).map(toBinanceCandidate).filter((candidate): candidate is ScanCandidate => candidate !== null),
    ),
  ]);

  const candidates = candidateResult.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    errors.push(`Binance ticker verisi alınamadı: ${result.reason instanceof Error ? result.reason.message : "Bilinmeyen hata"}`);
    return [];
  });

  return {
    candidates: candidates.sort((left, right) => right.score - left.score).slice(0, MAX_CANDIDATES),
    errors,
  };
}

function getChangePercent(candles: Candle[]) {
  const first = candles[0];
  const latest = candles[candles.length - 1];

  if (!first || !latest || first.open <= 0) {
    return null;
  }

  return ((latest.close - first.open) / first.open) * 100;
}

function loadCandidateCandles(candidate: ScanCandidate, interval: string) {
  return fetchBinanceCandles(candidate.providerSymbol, interval, CANDLE_LIMIT, CANDLE_TIMEOUT_MS);
}

function buildAnalysis(candidate: ScanCandidate, interval: string, candles: Candle[]): MarketAnalysis {
  const indicators = calculateIndicators(candles);
  const signal = analyzeSignal(candles, indicators);
  const risk = assessRisk(candles, indicators);
  const latest = candles[candles.length - 1];

  return {
    symbol: candidate.symbol,
    name: candidate.displayName,
    exchange: candidate.exchange,
    interval,
    lastPrice: latest?.close ?? candidate.price,
    changePercent: getChangePercent(candles),
    volume: latest?.volume ?? null,
    indicators,
    signal,
    risk,
    explanation: "",
    disclaimer: "",
    updatedAt: new Date().toISOString(),
    dataStatus: "live",
  };
}

function toMarketScanAlert(alert: SignalAlert): MarketScanAlert {
  return {
    key: alert.key,
    symbol: alert.symbol,
    displayName: alert.name,
    exchange: alert.exchange as MarketExchange,
    interval: alert.interval,
    alertType: alert.alertType,
    label: alert.label,
    confidence: alert.confidence,
    recommendationScore: alert.recommendationScore,
    riskScore: alert.riskScore,
    price: alert.lastPrice,
    reason: alert.rationale,
    message: alert.message,
    timestamp: alert.updatedAt,
    soundLevel: alert.soundLevel,
    priority: alert.priority,
  };
}

export function normalizeMarketScanExchange(value: string | null): MarketScanExchange {
  void value;
  return "binance";
}

export function normalizeMarketScanIntervals(value: string | null) {
  if (value && allowedIntervals.has(value)) {
    return [value];
  }

  return ["1m"];
}

export async function runMarketScan(exchange: MarketScanExchange, intervals: string[]): Promise<MarketScanResult> {
  const scannedAt = new Date().toISOString();
  const { candidates, errors } = await loadCandidates();
  const analyses: MarketAnalysis[] = [];
  let processedCount = 0;

  const settled = await Promise.allSettled(
    candidates.flatMap((candidate) =>
      intervals.map(async (interval) => {
        const candles = await loadCandidateCandles(candidate, interval);

        if (candles.length < 50) {
          throw new Error(`${candidate.displayName} ${interval} için yeterli mum verisi yok.`);
        }

        return buildAnalysis(candidate, interval, candles);
      }),
    ),
  );

  settled.forEach((result) => {
    processedCount += 1;

    if (result.status === "fulfilled") {
      analyses.push(result.value);
    } else {
      errors.push(result.reason instanceof Error ? result.reason.message : "Derin analiz sırasında hata oluştu.");
    }
  });

  const alerts = getImportantSignalAlerts(analyses, 8).map(toMarketScanAlert);

  return {
    scannedAt,
    exchange,
    candidateCount: candidates.length,
    processedCount,
    intervalsChecked: intervals,
    alerts,
    errors: errors.slice(0, 12),
  };
}
