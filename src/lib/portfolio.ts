import type { CashMode } from "@/generated/prisma/enums";
import type { MarketItem } from "@/lib/market-data";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { prisma } from "@/lib/prisma";

export const initialCashUsd = 1_000_000;

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
  const trades = await prisma.virtualTrade.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const enrichedPositions = positions.map((position) => {
    const marketItem = findMarketItemForPosition(liveMarketItems, position.symbol);
    const currentPriceUsd = getSafePortfolioPriceUsd(position, marketItem);
    const priceStatus = getPortfolioPriceStatus(marketItem);
    const valueUsd = position.quantity * currentPriceUsd;
    const profitLossUsd = valueUsd - position.quantity * position.averagePriceUsd;

    return {
      ...position,
      currentPriceUsd,
      priceSource: priceStatus.priceSource,
      dataStatus: priceStatus.dataStatus,
      valueUsd,
      profitLossUsd,
    };
  });

  const positionsValueUsd = enrichedPositions.reduce((sum, position) => sum + position.valueUsd, 0);
  const cashValueUsd = cashToUsd(account.cashAmount, account.cashMode);

  return {
    account,
    positions: enrichedPositions,
    trades,
    cashCurrency: getCashCurrency(account.cashMode),
    cashValueUsd,
    positionsValueUsd,
    totalValueUsd: cashValueUsd + positionsValueUsd,
    profitLossUsd: cashValueUsd + positionsValueUsd - initialCashUsd,
  };
}

export const getPortfolioSnapshot = getCurrentPortfolio;
