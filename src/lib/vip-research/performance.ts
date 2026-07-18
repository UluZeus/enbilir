import "server-only";
import { getAssetPerformance } from "@/lib/ai-market/asset-performance";
import { prisma } from "@/lib/prisma";

export async function evaluateDueVipIdeas(now = new Date()) {
  const pending = await prisma.vipResearchIdeaEvaluation.findMany({
    where: { status: "PENDING", dueAt: { lte: now } },
    include: { idea: { select: { symbol: true, priceAtRecommendation: true } } },
    orderBy: { dueAt: "asc" },
    take: 200,
  });
  const symbols = Array.from(new Set(pending.map((evaluation) => evaluation.idea.symbol)));
  const prices = new Map<string, number | null>();

  await Promise.all(symbols.map(async (symbol) => {
    const performance = await getAssetPerformance(symbol, "yahoo");
    prices.set(symbol, performance.price);
  }));

  let completed = 0;
  let unavailable = 0;

  for (const evaluation of pending) {
    const price = prices.get(evaluation.idea.symbol) ?? null;

    if (price === null || evaluation.idea.priceAtRecommendation <= 0) {
      unavailable += 1;
      continue;
    }

    await prisma.vipResearchIdeaEvaluation.update({
      where: { id: evaluation.id },
      data: {
        status: "COMPLETED",
        evaluatedAt: now,
        priceAtEvaluation: price,
        returnPercent: ((price - evaluation.idea.priceAtRecommendation) / evaluation.idea.priceAtRecommendation) * 100,
      },
    });
    completed += 1;
  }

  return { due: pending.length, completed, unavailable };
}
