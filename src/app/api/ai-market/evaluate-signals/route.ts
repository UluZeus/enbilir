import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSignalEvaluation, evaluationHorizons, getEvaluationPrice } from "@/lib/ai-market/signal-evaluator";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_EVALUATIONS_PER_RUN = 40;
const EVALUATION_CONCURRENCY = 4;
const DATA_RETRY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function isAuthorized(request: Request) {
  const configuredSecret = process.env.INTERNAL_CRON_SECRET ?? process.env.AI_AGENT_CRON_SECRET;

  if (!configuredSecret && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!configuredSecret) {
    return false;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = request.headers.get("x-internal-cron-secret") ?? request.headers.get("x-ai-agent-secret");
  const authorization = request.headers.get("authorization");

  return querySecret === configuredSecret || headerSecret === configuredSecret || authorization === `Bearer ${configuredSecret}`;
}

type HorizonConfig = (typeof evaluationHorizons)[number];
type SignalCandidate = Awaited<ReturnType<typeof findSignalsForEvaluation>>[number];
type EvaluationQueueItem = { signal: SignalCandidate; horizonConfig: HorizonConfig };

async function findSignalsForEvaluation(input: {
  horizonConfig: HorizonConfig;
  now: Date;
  retry: boolean;
  take: number;
}) {
  const retryBefore = new Date(input.now.getTime() - DATA_RETRY_COOLDOWN_MS);

  return prisma.aiSignalLog.findMany({
    where: {
      createdAt: { lte: new Date(input.now.getTime() - input.horizonConfig.ms) },
      evaluations: input.retry
        ? {
            some: {
              horizon: input.horizonConfig.horizon,
              status: "DATA_UNAVAILABLE",
              evaluatedAt: { lte: retryBefore },
            },
          }
        : { none: { horizon: input.horizonConfig.horizon } },
    },
    orderBy: { createdAt: "asc" },
    take: input.take,
    select: {
      id: true,
      symbol: true,
      exchange: true,
      signalType: true,
      priceAtSignal: true,
      createdAt: true,
    },
  });
}

async function buildEvaluationQueue(now: Date) {
  const queue: EvaluationQueueItem[] = [];

  for (const retry of [false, true]) {
    for (const horizonConfig of evaluationHorizons) {
      const remaining = MAX_EVALUATIONS_PER_RUN - queue.length;

      if (remaining === 0) {
        return queue;
      }

      const signals = await findSignalsForEvaluation({ horizonConfig, now, retry, take: remaining });
      queue.push(...signals.map((signal) => ({ signal, horizonConfig })));
    }
  }

  return queue;
}

async function runWithConcurrency<T>(items: T[], worker: (item: T) => Promise<void>) {
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await worker(item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(EVALUATION_CONCURRENCY, items.length) }, () => runWorker()));
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const queue = await buildEvaluationQueue(now);
  const summary = {
    queuedEvaluations: queue.length,
    createdEvaluations: 0,
    dataUnavailable: 0,
    errors: [] as string[],
  };

  await runWithConcurrency(queue, async ({ signal, horizonConfig }) => {
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
  });

  return NextResponse.json(summary);
}
