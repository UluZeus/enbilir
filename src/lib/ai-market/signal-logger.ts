import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { IndicatorSnapshot, MarketAnalysis, SignalType } from "@/lib/ai-market/types";

const LOGGED_INTERVALS = new Set(["15m", "1h", "4h", "1d"]);
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

type LogAiSignalInput = {
  symbol: string;
  displayName?: string | null;
  exchange?: string | null;
  interval: string;
  signalType: string;
  recommendationText?: string | null;
  confidence?: number | null;
  riskScore?: number | null;
  opportunityScore?: number | null;
  priceAtSignal?: number | null;
  currency?: string | null;
  source?: string | null;
  reason?: string | null;
  indicatorsSnapshot?: Prisma.InputJsonValue | null;
  rawPayload?: Prisma.InputJsonValue | null;
};

function toFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeAiSignalType(signalType: string): string {
  const normalized = signalType.trim().toUpperCase();

  if (normalized === "WATCH" || normalized === "BUY_WATCH" || normalized === "BULLISH_MOMENTUM") {
    return "BULLISH";
  }

  if (normalized === "AVOID" || normalized === "TAKE_PROFIT" || normalized === "SELL_WATCH" || normalized === "BEARISH_MOMENTUM") {
    return "BEARISH";
  }

  if (normalized === "NO_TRADE") {
    return "NEUTRAL";
  }

  return normalized;
}

export function getRecommendationText(signalType: string) {
  const normalized = normalizeAiSignalType(signalType);

  if (normalized === "STRONG_BUY") {
    return "Güçlü AL önerisi";
  }

  if (normalized === "BUY") {
    return "AL önerisi";
  }

  if (normalized === "STRONG_SELL") {
    return "Güçlü SAT önerisi";
  }

  if (normalized === "SELL") {
    return "SAT önerisi";
  }

  if (normalized === "BULLISH") {
    return "Yükseliş fırsatı";
  }

  if (normalized === "BEARISH") {
    return "Düşüş fırsatı";
  }

  if (normalized === "HOLD") {
    return "Bekle";
  }

  return "Nötr";
}

function sanitizeJson(value: Prisma.InputJsonValue | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return undefined;
  }

  return value;
}

export async function logAiSignal(input: LogAiSignalInput) {
  try {
    const interval = input.interval.trim();

    if (!LOGGED_INTERVALS.has(interval)) {
      return { logged: false, reason: "interval-not-logged" };
    }

    const symbol = input.symbol.trim().toUpperCase();
    const signalType = normalizeAiSignalType(input.signalType);

    if (!symbol || !signalType) {
      return { logged: false, reason: "invalid-signal" };
    }

    const duplicateSince = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const duplicate = await prisma.aiSignalLog.findFirst({
      where: {
        symbol,
        interval,
        signalType,
        createdAt: { gte: duplicateSince },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (duplicate) {
      return { logged: false, reason: "duplicate", duplicateId: duplicate.id };
    }

    const created = await prisma.aiSignalLog.create({
      data: {
        symbol,
        displayName: input.displayName ?? undefined,
        exchange: input.exchange ?? undefined,
        interval,
        signalType,
        recommendationText: input.recommendationText ?? getRecommendationText(signalType),
        confidence: toFiniteNumber(input.confidence),
        riskScore: toFiniteNumber(input.riskScore),
        opportunityScore: toFiniteNumber(input.opportunityScore),
        priceAtSignal: toFiniteNumber(input.priceAtSignal),
        currency: input.currency ?? (symbol.endsWith("USDT") ? "USDT" : undefined),
        source: input.source ?? undefined,
        reason: input.reason ?? undefined,
        indicatorsSnapshot: sanitizeJson(input.indicatorsSnapshot),
        rawPayload: sanitizeJson(input.rawPayload),
      },
      select: { id: true },
    });

    return { logged: true, id: created.id };
  } catch (error) {
    console.warn("[ai-signal-logger] signal log skipped", error);
    return { logged: false, reason: "error" };
  }
}

export function buildIndicatorsSnapshot(indicators: IndicatorSnapshot, extra?: Record<string, Prisma.InputJsonValue>): Prisma.InputJsonObject {
  return {
    rsi: indicators.rsi,
    macd: indicators.macd,
    ema20: indicators.ema20,
    ema50: indicators.ema50,
    ema200: indicators.ema200,
    bollinger: indicators.bollinger,
    atr: indicators.atr,
    volume: indicators.volumeAnomaly,
    trend: extra?.trend ?? null,
    ichimoku: extra?.ichimoku ?? null,
    parabolicSar: extra?.parabolicSar ?? null,
    ...extra,
  };
}

export async function logMarketAnalysisSignal(analysis: MarketAnalysis, source: string, opportunityScore?: number | null) {
  return logAiSignal({
    symbol: analysis.symbol,
    displayName: analysis.name,
    exchange: analysis.exchange,
    interval: analysis.interval,
    signalType: analysis.signal.signal as SignalType,
    recommendationText: getRecommendationText(analysis.signal.signal),
    confidence: analysis.signal.confidence,
    riskScore: analysis.risk.score,
    opportunityScore,
    priceAtSignal: analysis.lastPrice,
    currency: analysis.symbol.endsWith("USDT") ? "USDT" : undefined,
    source,
    reason: analysis.signal.reasons[0] ?? analysis.risk.reasons[0] ?? undefined,
    indicatorsSnapshot: buildIndicatorsSnapshot(analysis.indicators),
    rawPayload: {
      signal: analysis.signal,
      risk: analysis.risk,
      dataStatus: analysis.dataStatus,
      changePercent: analysis.changePercent,
      volume: analysis.volume,
    },
  });
}

export const loggedAiSignalIntervals = Array.from(LOGGED_INTERVALS);
