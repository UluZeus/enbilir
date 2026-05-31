import { NextResponse } from "next/server";
import { isBuySignal, isDirectionalSignal, isSellSignal } from "@/lib/ai-market/signal-evaluator";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const validPeriods = new Set(["daily", "weekly", "monthly", "quarterly", "yearly"]);
const validIntervals = new Set(["15m", "1h", "4h", "1d"]);
const horizonOrder = ["1h", "1d", "1w", "1m", "3m", "1y"];

type EvaluationRow = {
  horizon: string;
  priceAtEvaluation: number | null;
  priceChangePercent: number | null;
  directionCorrect: boolean | null;
  score: number | null;
  resultLabel: string | null;
  status: string | null;
  evaluatedAt: Date;
};

type SignalRow = {
  id: string;
  createdAt: Date;
  symbol: string;
  displayName: string | null;
  exchange: string | null;
  interval: string;
  signalType: string;
  recommendationText: string | null;
  confidence: number | null;
  riskScore: number | null;
  opportunityScore: number | null;
  priceAtSignal: number | null;
  currency: string | null;
  source: string | null;
  reason: string | null;
  evaluations: EvaluationRow[];
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDateRange(period: string) {
  const now = new Date();
  const to = now;

  if (period === "daily") {
    return { from: startOfDay(now), to };
  }

  if (period === "weekly") {
    return { from: addDays(startOfDay(now), -6), to };
  }

  if (period === "monthly") {
    return { from: addDays(startOfDay(now), -29), to };
  }

  if (period === "quarterly") {
    return { from: addDays(startOfDay(now), -89), to };
  }

  return { from: addDays(startOfDay(now), -364), to };
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function roundMetric(value: number | null) {
  return value === null ? null : Math.round(value * 100) / 100;
}

function percent(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 10000) / 100 : null;
}

function getPrimaryEvaluation(signal: SignalRow) {
  return [...signal.evaluations]
    .filter((evaluation) => evaluation.status === "EVALUATED" || evaluation.status === "NEUTRAL")
    .sort((left, right) => horizonOrder.indexOf(left.horizon) - horizonOrder.indexOf(right.horizon))[0];
}

function buildSignalDto(signal: SignalRow, evaluation = getPrimaryEvaluation(signal)) {
  return {
    id: signal.id,
    createdAt: signal.createdAt.toISOString(),
    symbol: signal.symbol,
    displayName: signal.displayName,
    exchange: signal.exchange,
    interval: signal.interval,
    signalType: signal.signalType,
    recommendationText: signal.recommendationText,
    confidence: signal.confidence,
    riskScore: signal.riskScore,
    opportunityScore: signal.opportunityScore,
    priceAtSignal: signal.priceAtSignal,
    currency: signal.currency,
    source: signal.source,
    reason: signal.reason,
    evaluation: evaluation
      ? {
          horizon: evaluation.horizon,
          evaluatedAt: evaluation.evaluatedAt.toISOString(),
          priceAtEvaluation: evaluation.priceAtEvaluation,
          priceChangePercent: evaluation.priceChangePercent,
          directionCorrect: evaluation.directionCorrect,
          score: evaluation.score,
          resultLabel: evaluation.resultLabel,
          status: evaluation.status,
        }
      : null,
  };
}

function summarizeSignals(signals: SignalRow[]) {
  const directionalEvaluated = signals
    .map((signal) => ({ signal, evaluation: getPrimaryEvaluation(signal) }))
    .filter(({ signal, evaluation }) => evaluation?.directionCorrect !== null && evaluation?.directionCorrect !== undefined && isDirectionalSignal(signal.signalType));
  const returns = directionalEvaluated
    .map(({ evaluation }) => evaluation?.priceChangePercent)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const buyEvaluated = directionalEvaluated.filter(({ signal }) => isBuySignal(signal.signalType));
  const sellEvaluated = directionalEvaluated.filter(({ signal }) => isSellSignal(signal.signalType));
  const correct = directionalEvaluated.filter(({ evaluation }) => evaluation?.directionCorrect === true).length;
  const buyCorrect = buyEvaluated.filter(({ evaluation }) => evaluation?.directionCorrect === true).length;
  const sellCorrect = sellEvaluated.filter(({ evaluation }) => evaluation?.directionCorrect === true).length;

  return {
    totalSignals: signals.length,
    evaluatedSignals: directionalEvaluated.length,
    pendingSignals: signals.filter((signal) => !getPrimaryEvaluation(signal)).length,
    successRate: percent(correct, directionalEvaluated.length),
    averageReturn: roundMetric(average(returns)),
    medianReturn: roundMetric(median(returns)),
    buySignalSuccessRate: percent(buyCorrect, buyEvaluated.length),
    sellSignalSuccessRate: percent(sellCorrect, sellEvaluated.length),
  };
}

function breakdownByInterval(signals: SignalRow[]) {
  return ["15m", "1h", "4h", "1d"].map((interval) => {
    const scoped = signals.filter((signal) => signal.interval === interval);
    const summary = summarizeSignals(scoped);

    return {
      interval,
      signals: scoped.length,
      successRate: summary.successRate,
      averageReturn: summary.averageReturn,
    };
  });
}

function breakdownByHorizon(signals: SignalRow[]) {
  return horizonOrder.map((horizon) => {
    const evaluations = signals
      .filter((signal) => isDirectionalSignal(signal.signalType))
      .flatMap((signal) => signal.evaluations.filter((evaluation) => evaluation.horizon === horizon && evaluation.directionCorrect !== null));
    const returns = evaluations
      .map((evaluation) => evaluation.priceChangePercent)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    return {
      horizon,
      signals: evaluations.length,
      successRate: percent(evaluations.filter((evaluation) => evaluation.directionCorrect === true).length, evaluations.length),
      averageReturn: roundMetric(average(returns)),
    };
  });
}

function topSymbols(signals: SignalRow[]) {
  const grouped = new Map<string, SignalRow[]>();

  for (const signal of signals) {
    grouped.set(signal.symbol, [...(grouped.get(signal.symbol) ?? []), signal]);
  }

  return Array.from(grouped.entries())
    .map(([symbol, rows]) => {
      const summary = summarizeSignals(rows);
      return {
        symbol,
        signals: rows.length,
        successRate: summary.successRate,
        averageReturn: summary.averageReturn,
      };
    })
    .sort((left, right) => right.signals - left.signals)
    .slice(0, 10);
}

function chartData(signals: SignalRow[]) {
  const grouped = new Map<string, SignalRow[]>();

  for (const signal of signals) {
    const key = signal.createdAt.toISOString().slice(0, 10);
    grouped.set(key, [...(grouped.get(key) ?? []), signal]);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, rows]) => {
      const summary = summarizeSignals(rows);

      return {
        date,
        successRate: summary.successRate,
        averageReturn: summary.averageReturn,
        signals: rows.length,
      };
    });
}

function bestAndWorst(signals: SignalRow[]) {
  const evaluated = signals
    .map((signal) => ({ signal, evaluation: getPrimaryEvaluation(signal) }))
    .filter(({ evaluation }) => typeof evaluation?.priceChangePercent === "number")
    .sort((left, right) => (right.evaluation?.priceChangePercent ?? 0) - (left.evaluation?.priceChangePercent ?? 0));

  return {
    bestSignal: evaluated[0] ? buildSignalDto(evaluated[0].signal, evaluated[0].evaluation) : null,
    worstSignal: evaluated[evaluated.length - 1] ? buildSignalDto(evaluated[evaluated.length - 1].signal, evaluated[evaluated.length - 1].evaluation) : null,
    bestSignals: evaluated.slice(0, 10).map(({ signal, evaluation }) => buildSignalDto(signal, evaluation)),
    worstSignals: evaluated
      .slice(-10)
      .reverse()
      .map(({ signal, evaluation }) => buildSignalDto(signal, evaluation)),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = validPeriods.has(url.searchParams.get("period") ?? "") ? url.searchParams.get("period")! : "weekly";
  const interval = url.searchParams.get("interval") ?? "all";
  const symbol = url.searchParams.get("symbol")?.trim().toUpperCase();
  const signalType = url.searchParams.get("signalType")?.trim().toUpperCase() ?? "ALL";
  const range = getDateRange(period);
  const signals = (await prisma.aiSignalLog.findMany({
    where: {
      createdAt: {
        gte: range.from,
        lte: range.to,
      },
      ...(validIntervals.has(interval) ? { interval } : {}),
      ...(symbol ? { symbol } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      evaluations: {
        orderBy: { evaluatedAt: "desc" },
      },
    },
  })) as SignalRow[];
  const filteredSignals = signals.filter((signal) => {
    if (signalType === "BUY") {
      return isBuySignal(signal.signalType);
    }

    if (signalType === "SELL") {
      return isSellSignal(signal.signalType);
    }

    return true;
  });
  const summary = summarizeSignals(filteredSignals);
  const signalExtremes = bestAndWorst(filteredSignals);

  return NextResponse.json({
    period,
    dateRange: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    filters: {
      interval,
      symbol: symbol ?? "all",
      signalType,
    },
    summary: {
      ...summary,
      bestSignal: signalExtremes.bestSignal,
      worstSignal: signalExtremes.worstSignal,
    },
    intervalBreakdown: breakdownByInterval(filteredSignals),
    horizonBreakdown: breakdownByHorizon(filteredSignals),
    topSymbols: topSymbols(filteredSignals),
    recentSignals: filteredSignals.slice(0, 50).map((signal) => buildSignalDto(signal)),
    bestSignals: signalExtremes.bestSignals,
    worstSignals: signalExtremes.worstSignals,
    chartData: chartData(filteredSignals),
  });
}
