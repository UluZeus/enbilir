import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSignalEvaluation, evaluationHorizons, getEvaluationPrice } from "@/lib/ai-market/signal-evaluator";

export const dynamic = "force-dynamic";

const MAX_SIGNALS_PER_RUN = 100;

function isAuthorized(request: Request) {
  const configuredSecret = process.env.INTERNAL_CRON_SECRET;

  if (!configuredSecret && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!configuredSecret) {
    return false;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = request.headers.get("x-internal-cron-secret");
  const authorization = request.headers.get("authorization");

  return querySecret === configuredSecret || headerSecret === configuredSecret || authorization === `Bearer ${configuredSecret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const signals = await prisma.aiSignalLog.findMany({
    orderBy: { createdAt: "asc" },
    take: MAX_SIGNALS_PER_RUN,
    include: {
      evaluations: {
        select: { horizon: true },
      },
    },
  });
  const summary = {
    scannedSignals: signals.length,
    createdEvaluations: 0,
    dataUnavailable: 0,
    skippedPending: 0,
    skippedExisting: 0,
    errors: [] as string[],
  };

  for (const signal of signals) {
    const existingHorizons = new Set(signal.evaluations.map((evaluation) => evaluation.horizon));

    for (const horizonConfig of evaluationHorizons) {
      if (existingHorizons.has(horizonConfig.horizon)) {
        summary.skippedExisting += 1;
        continue;
      }

      if (signal.createdAt.getTime() + horizonConfig.ms > now) {
        summary.skippedPending += 1;
        continue;
      }

      try {
        const priceAtSignal = typeof signal.priceAtSignal === "number" && Number.isFinite(signal.priceAtSignal) ? signal.priceAtSignal : null;
        const priceAtEvaluation = await getEvaluationPrice({
          symbol: signal.symbol,
          exchange: signal.exchange,
          createdAt: signal.createdAt,
          horizon: horizonConfig.horizon,
        });
        const evaluation = calculateSignalEvaluation(signal.signalType, priceAtSignal, priceAtEvaluation);

        await prisma.aiSignalEvaluation.upsert({
          where: {
            signalLogId_horizon: {
              signalLogId: signal.id,
              horizon: horizonConfig.horizon,
            },
          },
          update: {
            evaluatedAt: new Date(),
            priceAtEvaluation,
            priceChangePercent: evaluation.priceChangePercent,
            directionCorrect: evaluation.directionCorrect,
            score: evaluation.score,
            resultLabel: evaluation.resultLabel,
            status: evaluation.status,
          },
          create: {
            signalLogId: signal.id,
            horizon: horizonConfig.horizon,
            priceAtEvaluation,
            priceChangePercent: evaluation.priceChangePercent,
            directionCorrect: evaluation.directionCorrect,
            score: evaluation.score,
            resultLabel: evaluation.resultLabel,
            status: evaluation.status,
          },
        });

        if (evaluation.status === "DATA_UNAVAILABLE") {
          summary.dataUnavailable += 1;
        } else {
          summary.createdEvaluations += 1;
        }
      } catch (error) {
        summary.errors.push(`${signal.symbol} ${horizonConfig.horizon}: ${error instanceof Error ? error.message : "Evaluation failed"}`);
      }
    }
  }

  return NextResponse.json(summary);
}
