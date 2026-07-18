import "server-only";
import {
  calculateYahooSplitAdjustedPriceReturn,
  fetchYahooCorporateActionQuote,
  type YahooCorporateActionQuote,
} from "@/lib/ai-market/yahoo-corporate-actions";
import { prisma } from "@/lib/prisma";

export async function evaluateDueVipIdeas(now = new Date()) {
  const pending = await prisma.vipResearchIdeaEvaluation.findMany({
    where: { status: "PENDING", dueAt: { lte: now } },
    include: {
      idea: {
        select: {
          symbol: true,
          providerSymbol: true,
          priceAtRecommendation: true,
          report: { select: { generatedAt: true } },
        },
      },
    },
    orderBy: { dueAt: "asc" },
    take: 200,
  });
  const quoteRequests = new Map<string, { symbol: string; providerSymbol: string; from: Date }>();

  for (const evaluation of pending) {
    const key = evaluation.idea.providerSymbol || evaluation.idea.symbol;
    const current = quoteRequests.get(key);

    if (!current || evaluation.idea.report.generatedAt < current.from) {
      quoteRequests.set(key, {
        symbol: evaluation.idea.symbol,
        providerSymbol: evaluation.idea.providerSymbol,
        from: evaluation.idea.report.generatedAt,
      });
    }
  }

  const quotes = new Map<string, YahooCorporateActionQuote | null>();
  await Promise.all(Array.from(quoteRequests.entries()).map(async ([key, request]) => {
    try {
      quotes.set(key, await fetchYahooCorporateActionQuote({ ...request, asOf: now }));
    } catch {
      quotes.set(key, null);
    }
  }));

  let completed = 0;
  let unavailable = 0;
  let splitAdjusted = 0;

  for (const evaluation of pending) {
    const key = evaluation.idea.providerSymbol || evaluation.idea.symbol;
    const quote = quotes.get(key) ?? null;
    const splitEvents = quote?.splitEvents.filter((event) => event.effectiveAt > evaluation.idea.report.generatedAt) ?? [];
    const result = quote ? calculateYahooSplitAdjustedPriceReturn({
      referencePrice: evaluation.idea.priceAtRecommendation,
      currentPrice: quote.price,
      splitEvents,
    }) : null;

    if (!result) {
      unavailable += 1;
      continue;
    }

    await prisma.vipResearchIdeaEvaluation.update({
      where: { id: evaluation.id },
      data: {
        status: "COMPLETED",
        evaluatedAt: now,
        priceAtEvaluation: result.currentPrice,
        returnPercent: result.returnPercent,
      },
    });
    completed += 1;
    if (result.splitFactor !== 1) splitAdjusted += 1;
  }

  return {
    due: pending.length,
    completed,
    unavailable,
    splitAdjusted,
    returnBasis: "SPLIT_ADJUSTED_PRICE_RETURN",
    dividendsIncluded: false,
  };
}
