import { fetchBinanceCandles } from "@/lib/ai-market/binance-public";
import { fetchGateCandles } from "@/lib/ai-market/gate-public";
import type { Candle } from "@/lib/ai-market/types";
import { fetchYahooCandles } from "@/lib/ai-market/yahoo-public";

export const evaluationHorizons = [
  { horizon: "1h", ms: 60 * 60 * 1000, interval: "1h" },
  { horizon: "1d", ms: 24 * 60 * 60 * 1000, interval: "1h" },
  { horizon: "1w", ms: 7 * 24 * 60 * 60 * 1000, interval: "1d" },
  { horizon: "1m", ms: 30 * 24 * 60 * 60 * 1000, interval: "1d" },
  { horizon: "3m", ms: 90 * 24 * 60 * 60 * 1000, interval: "1d" },
  { horizon: "1y", ms: 365 * 24 * 60 * 60 * 1000, interval: "1d" },
] as const;

const bullishSignals = new Set(["BUY", "STRONG_BUY", "BULLISH"]);
const bearishSignals = new Set(["SELL", "STRONG_SELL", "BEARISH"]);
const neutralSignals = new Set(["HOLD", "NEUTRAL"]);

export type EvaluationHorizon = (typeof evaluationHorizons)[number]["horizon"];

function getCloseAtOrAfter(candles: Candle[], targetTime: number) {
  const candle = candles.find((item) => item.openTime >= targetTime);
  return candle?.close ?? candles[candles.length - 1]?.close ?? null;
}

function getCandleLimit(horizon: EvaluationHorizon) {
  if (horizon === "1h") {
    return 48;
  }

  if (horizon === "1d") {
    return 96;
  }

  if (horizon === "1w") {
    return 30;
  }

  if (horizon === "1m") {
    return 80;
  }

  if (horizon === "3m") {
    return 140;
  }

  return 380;
}

async function fetchEvaluationCandles(symbol: string, exchange: string | null, interval: string, horizon: EvaluationHorizon) {
  if (symbol.endsWith("USDT")) {
    if (exchange === "gate") {
      const baseAsset = symbol.slice(0, -4);
      return fetchGateCandles(`${baseAsset}_USDT`, interval, getCandleLimit(horizon), 7000);
    }

    return fetchBinanceCandles(symbol, interval, getCandleLimit(horizon), 7000);
  }

  return fetchYahooCandles(symbol, interval, 7000);
}

export function calculateSignalEvaluation(signalType: string, priceAtSignal: number | null, priceAtEvaluation: number | null) {
  if (priceAtSignal === null || priceAtSignal <= 0 || priceAtEvaluation === null || priceAtEvaluation <= 0) {
    return {
      priceChangePercent: null,
      directionCorrect: null,
      score: null,
      resultLabel: "DATA_UNAVAILABLE",
      status: "DATA_UNAVAILABLE",
    };
  }

  const priceChangePercent = ((priceAtEvaluation - priceAtSignal) / priceAtSignal) * 100;
  const normalized = signalType.toUpperCase();

  if (neutralSignals.has(normalized)) {
    return {
      priceChangePercent,
      directionCorrect: null,
      score: 0,
      resultLabel: "NEUTRAL",
      status: "NEUTRAL",
    };
  }

  const directionCorrect =
    (bullishSignals.has(normalized) && priceChangePercent > 0) || (bearishSignals.has(normalized) && priceChangePercent < 0);
  const magnitude = Math.min(Math.abs(priceChangePercent), 25);
  const score = directionCorrect ? magnitude : -magnitude;

  return {
    priceChangePercent,
    directionCorrect,
    score,
    resultLabel: directionCorrect ? "CORRECT" : "WRONG",
    status: "EVALUATED",
  };
}

export async function getEvaluationPrice(input: {
  symbol: string;
  exchange: string | null;
  createdAt: Date;
  horizon: EvaluationHorizon;
}) {
  const horizonConfig = evaluationHorizons.find((item) => item.horizon === input.horizon);

  if (!horizonConfig) {
    return null;
  }

  const targetTime = input.createdAt.getTime() + horizonConfig.ms;
  const candles = await fetchEvaluationCandles(input.symbol, input.exchange, horizonConfig.interval, input.horizon);

  return getCloseAtOrAfter(candles, targetTime);
}

export function isDirectionalSignal(signalType: string) {
  const normalized = signalType.toUpperCase();
  return bullishSignals.has(normalized) || bearishSignals.has(normalized);
}

export function isBuySignal(signalType: string) {
  return bullishSignals.has(signalType.toUpperCase());
}

export function isSellSignal(signalType: string) {
  return bearishSignals.has(signalType.toUpperCase());
}
