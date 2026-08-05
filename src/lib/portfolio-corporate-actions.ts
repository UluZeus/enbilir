import "server-only";

import { fetchYahooCorporateActionQuote, getYahooCumulativeSplitFactor } from "@/lib/ai-market/yahoo-corporate-actions";
import { prisma } from "@/lib/prisma";
import type { DecimalValue } from "@/lib/decimal";
import { decimal, decimalToNumber } from "@/lib/decimal";

type PositionForCorporateAction = {
  id: string;
  userId?: string;
  positionCycleId?: string | null;
  symbol: string;
  providerSymbol: string | null;
  market: string;
  quantity: DecimalValue;
  averagePriceUsd: DecimalValue;
  appliedSplitFactor: DecimalValue;
  corporateActionsCheckedAt: Date | null;
  createdAt: Date;
};

export function isYahooEquityMarket(market: string) {
  return /borsa|bist|nasdaq|dow|hisse|stock/i.test(market);
}

export function calculatePortfolioSplitAdjustment(
  position: Pick<PositionForCorporateAction, "quantity" | "averagePriceUsd" | "appliedSplitFactor">,
  cumulativeSplitFactor: number,
) {
  if (
    !Number.isFinite(cumulativeSplitFactor) ||
    cumulativeSplitFactor <= 0 ||
    !decimal(position.appliedSplitFactor).isFinite() ||
    decimal(position.appliedSplitFactor).lessThanOrEqualTo(0)
  ) {
    return null;
  }

  const adjustmentFactor = decimal(cumulativeSplitFactor).div(position.appliedSplitFactor);
  if (!adjustmentFactor.isFinite() || adjustmentFactor.lessThanOrEqualTo(0)) return null;

  return {
    adjustmentFactor: decimalToNumber(adjustmentFactor),
    appliedSplitFactor: cumulativeSplitFactor,
    quantity: decimalToNumber(decimal(position.quantity).times(adjustmentFactor)),
    averagePriceUsd: decimalToNumber(decimal(position.averagePriceUsd).div(adjustmentFactor)),
  };
}

export function shouldSyncPortfolioCorporateAction(
  position: Pick<PositionForCorporateAction, "market" | "corporateActionsCheckedAt">,
  now: Date,
  force = false,
) {
  return (
    isYahooEquityMarket(position.market) &&
    (
      force ||
      !position.corporateActionsCheckedAt ||
      now.getTime() - position.corporateActionsCheckedAt.getTime() >= 86_400_000
    )
  );
}

export function shouldForceCorporateActionSyncForPrice(
  corporateActionsCheckedAt: Date | null,
  marketPriceAsOf: Date | null,
) {
  return Boolean(
    marketPriceAsOf &&
    (!corporateActionsCheckedAt || corporateActionsCheckedAt.getTime() < marketPriceAsOf.getTime()),
  );
}

export async function syncPortfolioPositionCorporateAction(
  position: PositionForCorporateAction,
  now = new Date(),
  options: { force?: boolean } = {},
) {
  if (!shouldSyncPortfolioCorporateAction(position, now, options.force === true)) {
    return { reliable: true, checked: false, updated: false };
  }

  try {
    const quote = await fetchYahooCorporateActionQuote({
      symbol: position.symbol,
      providerSymbol: position.providerSymbol ?? undefined,
      from: position.createdAt,
      asOf: now,
    });
    const adjustment = calculatePortfolioSplitAdjustment(
      position,
      getYahooCumulativeSplitFactor(quote.splitEvents),
    );

    if (!adjustment) {
      return { reliable: false, checked: true, updated: false };
    }

    const adjustmentFactor = decimal(adjustment.adjustmentFactor);
    const updateResult = await prisma.$transaction(async (transaction) => {
      const result = await transaction.portfolioPosition.updateMany({
        where: {
          id: position.id,
          appliedSplitFactor: position.appliedSplitFactor,
        },
        data: {
          providerSymbol: quote.providerSymbol,
          quantity: adjustment.quantity,
          averagePriceUsd: adjustment.averagePriceUsd,
          appliedSplitFactor: adjustment.appliedSplitFactor,
          corporateActionsCheckedAt: now,
          delistedAt: null,
        },
      });

      if (
        result.count === 1 &&
        !adjustmentFactor.equals(1) &&
        position.userId &&
        position.positionCycleId
      ) {
        await transaction.virtualTrade.updateMany({
          where: {
            userId: position.userId,
            positionCycleId: position.positionCycleId,
          },
          data: { quantity: { multiply: adjustmentFactor } },
        });
      }

      return result;
    });
    if (updateResult.count === 1) {
      return { reliable: true, checked: true, updated: true };
    }

    const latestPosition = await prisma.portfolioPosition.findUnique({
      where: { id: position.id },
      select: { appliedSplitFactor: true },
    });
    return {
      reliable: latestPosition !== null && decimal(latestPosition.appliedSplitFactor).equals(adjustment.appliedSplitFactor),
      checked: true,
      updated: false,
    };
  } catch {
    return { reliable: false, checked: true, updated: false };
  }
}

export async function syncPortfolioCorporateActions(
  positions: PositionForCorporateAction[],
  now = new Date(),
  marketPriceAsOfBySymbol: Map<string, Date> = new Map(),
) {
  const results = await Promise.all(positions.map(async (position) => {
    const marketPriceAsOf = marketPriceAsOfBySymbol.get(position.symbol.trim().toUpperCase()) ?? null;
    const result = await syncPortfolioPositionCorporateAction(position, now, {
      force: shouldForceCorporateActionSyncForPrice(position.corporateActionsCheckedAt, marketPriceAsOf),
    });
    return { positionId: position.id, ...result };
  }));

  return {
    updatedCount: results.filter((result) => result.updated).length,
    unreliablePositionIds: results.filter((result) => !result.reliable).map((result) => result.positionId),
  };
}
