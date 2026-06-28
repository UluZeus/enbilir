import type { CashMode } from "@/generated/prisma/enums";
import type { MarketItem } from "@/lib/market-data";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { prisma } from "@/lib/prisma";

export const initialCashUsd = 1_000_000;
export const bonusTradingPowerUsd = 100_000;
export const totalTradingPowerUsd = initialCashUsd + bonusTradingPowerUsd;

const exchangeRatesToUsd: Record<CashMode, number> = {
  USD: 1,
  EUR: 1.08,
  CHF: 1.1,
  TRY_REPO: 1 / 32.4,
};

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getCashCurrency(mode: CashMode) {
  return mode === "TRY_REPO" ? "TRY" : mode;
}

export function cashToUsd(amount: number, mode: CashMode) {
  return amount * exchangeRatesToUsd[mode];
}

export function usdToCash(amount: number, mode: CashMode) {
  return amount / exchangeRatesToUsd[mode];
}

export function calculateCompetitionProfitLossUsd(totalValueUsd: number) {
  return totalValueUsd - initialCashUsd;
}

export function calculateCompetitionReturnPercent(totalValueUsd: number) {
  return (calculateCompetitionProfitLossUsd(totalValueUsd) / initialCashUsd) * 100;
}

export function getSafePortfolioPriceUsd(
  position: { averagePriceUsd: number; symbol: string },
  marketItem: { priceUsd: number; source: string } | undefined,
) {
  if (marketItem && Number.isFinite(marketItem.priceUsd) && marketItem.priceUsd > 0) {
    return marketItem.priceUsd;
  }

  return position.averagePriceUsd;
}

function getPortfolioPriceStatus(marketItem: MarketItem | undefined) {
  if (!marketItem) {
    return {
      priceSource: "average-cost",
      dataStatus: "average-cost",
    };
  }

  return {
    priceSource: marketItem.source,
    dataStatus: marketItem.dataStatus,
  };
}

function findMarketItemForPosition(marketItems: MarketItem[], symbol: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();

  return marketItems.find((item) => item.symbol.trim().toUpperCase() === normalizedSymbol);
}

type TradeForCompetitionCost = {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  totalUsd: number;
};

type CompetitionCostLot = {
  quantity: number;
  competitionCostUsd: number;
};

function calculateCompetitionPositionCosts(trades: TradeForCompetitionCost[]) {
  const lotsBySymbol = new Map<string, CompetitionCostLot[]>();
  let grossBuySpendingUsd = 0;

  for (const trade of trades) {
    const symbol = trade.symbol.trim().toUpperCase();

    if (trade.side === "BUY") {
      const spendingBefore = grossBuySpendingUsd;
      const spendingAfter = grossBuySpendingUsd + trade.totalUsd;
      const bonusBefore = Math.max(0, spendingBefore - initialCashUsd);
      const bonusAfter = Math.max(0, spendingAfter - initialCashUsd);
      const bonusFundedUsd = Math.max(0, bonusAfter - bonusBefore);
      const competitionCostUsd = Math.max(0, trade.totalUsd - bonusFundedUsd);
      const lots = lotsBySymbol.get(symbol) ?? [];

      lots.push({ quantity: trade.quantity, competitionCostUsd });
      lotsBySymbol.set(symbol, lots);
      grossBuySpendingUsd = spendingAfter;
      continue;
    }

    if (trade.side === "SELL") {
      const lots = lotsBySymbol.get(symbol) ?? [];
      let quantityToRemove = trade.quantity;

      while (quantityToRemove > 0 && lots.length > 0) {
        const lot = lots[0];
        const removedQuantity = Math.min(quantityToRemove, lot.quantity);
        const removedRatio = lot.quantity > 0 ? removedQuantity / lot.quantity : 0;

        lot.quantity -= removedQuantity;
        lot.competitionCostUsd -= lot.competitionCostUsd * removedRatio;
        quantityToRemove -= removedQuantity;

        if (lot.quantity <= 0.000001) {
          lots.shift();
        }
      }

      lotsBySymbol.set(symbol, lots);
    }
  }

  return new Map(
    Array.from(lotsBySymbol.entries()).map(([symbol, lots]) => [
      symbol,
      lots.reduce((sum, lot) => sum + Math.max(0, lot.competitionCostUsd), 0),
    ]),
  );
}

export async function ensureVirtualAccount(userId: string) {
  const account = await prisma.virtualAccount.findUnique({ where: { userId } });

  if (account) {
    return account;
  }

  return prisma.virtualAccount.create({
    data: {
      userId,
      cashAmount: initialCashUsd,
      cashMode: "USD",
      baseCurrency: "USD",
    },
  });
}

export async function accrueRepoIfNeeded(userId: string) {
  const account = await ensureVirtualAccount(userId);

  if (account.cashMode !== "TRY_REPO") {
    return account;
  }

  const now = new Date();
  const last = account.repoLastAccruedAt ?? account.updatedAt;
  const days = Math.floor((now.getTime() - last.getTime()) / 86_400_000);

  if (days <= 0) {
    return account;
  }

  const cashAmount = account.cashAmount * (1 + account.dailyRepoRate * days);

  return prisma.virtualAccount.update({
    where: { userId },
    data: {
      cashAmount,
      repoLastAccruedAt: now,
    },
  });
}

export async function getCurrentPortfolio(userId: string, marketItems?: MarketItem[]) {
  const account = await accrueRepoIfNeeded(userId);
  const positions = await prisma.portfolioPosition.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  const liveMarketItems = marketItems ?? await getLiveMarketItemsForSymbols(positions.map((position) => position.symbol));
  const allTrades = await prisma.virtualTrade.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const trades = [...allTrades].reverse().slice(0, 6);
  const competitionCostsBySymbol = calculateCompetitionPositionCosts(allTrades);

  const enrichedPositions = positions.map((position) => {
    const marketItem = findMarketItemForPosition(liveMarketItems, position.symbol);
    const currentPriceUsd = getSafePortfolioPriceUsd(position, marketItem);
    const priceStatus = getPortfolioPriceStatus(marketItem);
    const accountingCostUsd = position.quantity * position.averagePriceUsd;
    const competitionCostUsd = competitionCostsBySymbol.get(position.symbol.trim().toUpperCase()) ?? accountingCostUsd;
    const valueUsd = position.quantity * currentPriceUsd;
    const profitLossUsd = valueUsd - competitionCostUsd;

    return {
      ...position,
      currentPriceUsd,
      priceSource: priceStatus.priceSource,
      dataStatus: priceStatus.dataStatus,
      accountingCostUsd,
      competitionCostUsd,
      valueUsd,
      profitLossUsd,
    };
  });

  const positionsValueUsd = enrichedPositions.reduce((sum, position) => sum + position.valueUsd, 0);
  const accountingPositionsCostUsd = enrichedPositions.reduce((sum, position) => sum + position.accountingCostUsd, 0);
  const cashValueUsd = cashToUsd(account.cashAmount, account.cashMode);
  const appliedBonusTradingPowerUsd = Math.min(
    bonusTradingPowerUsd,
    Math.max(0, cashValueUsd + accountingPositionsCostUsd - initialCashUsd),
  );
  const effectiveTradingPowerUsd = initialCashUsd + appliedBonusTradingPowerUsd;

  return {
    account,
    positions: enrichedPositions,
    trades,
    cashCurrency: getCashCurrency(account.cashMode),
    cashValueUsd,
    positionsValueUsd,
    totalValueUsd: cashValueUsd + positionsValueUsd,
    initialCapitalUsd: initialCashUsd,
    totalTradingPowerUsd: effectiveTradingPowerUsd,
    bonusTradingPowerUsd: appliedBonusTradingPowerUsd,
    profitLossUsd: calculateCompetitionProfitLossUsd(cashValueUsd + positionsValueUsd),
    profitLossPercent: calculateCompetitionReturnPercent(cashValueUsd + positionsValueUsd),
  };
}

export const getPortfolioSnapshot = getCurrentPortfolio;
