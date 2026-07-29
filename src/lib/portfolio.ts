import type { CashMode } from "@/generated/prisma/enums";
import type { MarketItem } from "@/lib/market-data";
import { isExecutableMarketQuote } from "@/lib/executable-quote";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { prisma } from "@/lib/prisma";
import { syncPortfolioCorporateActions } from "@/lib/portfolio-corporate-actions";

export const initialCashUsd = 1_000_000;
export const bonusTradingPowerUsd = 100_000;
export const totalTradingPowerUsd = initialCashUsd + bonusTradingPowerUsd;

const exchangeRatesToUsd: Record<CashMode, number> = {
  USD: 1,
  EUR: 1.08,
  CHF: 1.1,
  TRY_REPO: 1 / 32.4,
};

const cashModeMarketSymbols: Partial<Record<CashMode, string>> = {
  EUR: "EUR/USD",
  CHF: "USD/CHF",
  TRY_REPO: "USD/TRY",
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

export function cashToUsd(amount: number, mode: CashMode, rateToUsd = exchangeRatesToUsd[mode]) {
  return amount * rateToUsd;
}

export function usdToCash(amount: number, mode: CashMode, rateToUsd = exchangeRatesToUsd[mode]) {
  return amount / rateToUsd;
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

export function hasVerifiedPortfolioQuote(marketItem: MarketItem | undefined, now = Date.now()) {
  if (marketItem?.source === "gate") {
    return isExecutableMarketQuote(marketItem, { now });
  }

  if (
    !marketItem ||
    !["binance", "yahoo"].includes(marketItem.source) ||
    marketItem.dataStatus !== "live" ||
    !marketItem.sourceAsOf
  ) {
    return false;
  }

  const sourceTime = Date.parse(marketItem.sourceAsOf);
  const maximumAgeMs = marketItem.source === "binance" ? 15 * 60_000 : 7 * 86_400_000;
  return Number.isFinite(sourceTime) && now - sourceTime >= -60_000 && now - sourceTime <= maximumAgeMs;
}

function getPortfolioPriceStatus(marketItem: MarketItem | undefined) {
  if (!hasVerifiedPortfolioQuote(marketItem)) {
    return {
      priceSource: "average-cost",
      dataStatus: "average-cost",
      valuationReliable: false,
    };
  }

  return {
    priceSource: marketItem!.source,
    dataStatus: marketItem!.dataStatus,
    valuationReliable: true,
  };
}

function findMarketItemForPosition(marketItems: MarketItem[], symbol: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();

  return marketItems.find((item) => item.symbol.trim().toUpperCase() === normalizedSymbol);
}

export async function getCashModeUsdRate(
  mode: CashMode,
  marketItems?: MarketItem[],
  requireExecutable = false,
) {
  if (mode === "USD") return 1;
  const symbol = cashModeMarketSymbols[mode];
  if (!symbol) return null;
  const items = marketItems ?? await getLiveMarketItemsForSymbols([symbol]);
  const item = findMarketItemForPosition(items, symbol);

  if (!item || !hasVerifiedPortfolioQuote(item) || (requireExecutable && item.executionEligible !== true)) {
    return null;
  }

  const nativePrice = item.priceNative ?? item.priceUsd;
  if (!Number.isFinite(nativePrice) || nativePrice <= 0) return null;
  return mode === "EUR" ? nativePrice : 1 / nativePrice;
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

  const cashAmount = account.cashAmount * Math.pow(1 + account.dailyRepoRate, days);
  const accruedThrough = new Date(last.getTime() + days * 86_400_000);

  return prisma.virtualAccount.update({
    where: { userId },
    data: {
      cashAmount,
      repoLastAccruedAt: accruedThrough,
    },
  });
}

export async function getCurrentPortfolio(userId: string, marketItems?: MarketItem[]) {
  const storedAccount = await ensureVirtualAccount(userId);
  const account = (() => {
    if (storedAccount.cashMode !== "TRY_REPO") {
      return storedAccount;
    }

    const last = storedAccount.repoLastAccruedAt ?? storedAccount.updatedAt;
    const days = Math.floor((Date.now() - last.getTime()) / 86_400_000);

    if (days <= 0) {
      return storedAccount;
    }

    return {
      ...storedAccount,
      cashAmount: storedAccount.cashAmount * Math.pow(1 + storedAccount.dailyRepoRate, days),
      repoLastAccruedAt: new Date(last.getTime() + days * 86_400_000),
    };
  })();
  let positions = await prisma.portfolioPosition.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  const cashMarketSymbol = cashModeMarketSymbols[account.cashMode];
  const suppliedItems = marketItems ?? [];
  const cashItemMissing = cashMarketSymbol && !findMarketItemForPosition(suppliedItems, cashMarketSymbol);
  const additionalItems = cashItemMissing
    ? await getLiveMarketItemsForSymbols([cashMarketSymbol])
    : [];
  const liveMarketItems = marketItems
    ? [...suppliedItems, ...additionalItems]
    : await getLiveMarketItemsForSymbols([
      ...positions.map((position) => position.symbol),
      ...(cashMarketSymbol ? [cashMarketSymbol] : []),
    ]);
  const marketPriceAsOfBySymbol = new Map(
    positions.flatMap((position) => {
      const item = findMarketItemForPosition(liveMarketItems, position.symbol);
      if (!item?.sourceAsOf) return [];
      const sourceAsOf = new Date(item.sourceAsOf);
      return Number.isNaN(sourceAsOf.getTime())
        ? []
        : [[position.symbol.trim().toUpperCase(), sourceAsOf] as const];
    }),
  );
  const corporateActionSync = await syncPortfolioCorporateActions(
    positions,
    new Date(),
    marketPriceAsOfBySymbol,
  );

  if (corporateActionSync.updatedCount > 0) {
    positions = await prisma.portfolioPosition.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }
  const unreliableCorporateActionPositionIds = new Set(corporateActionSync.unreliablePositionIds);
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
      valuationReliable: priceStatus.valuationReliable && !unreliableCorporateActionPositionIds.has(position.id),
      accountingCostUsd,
      competitionCostUsd,
      valueUsd,
      profitLossUsd,
    };
  });

  const positionsValueUsd = enrichedPositions.reduce((sum, position) => sum + position.valueUsd, 0);
  const hasUnreliableValuation = enrichedPositions.some((position) => !position.valuationReliable);
  const accountingPositionsCostUsd = enrichedPositions.reduce((sum, position) => sum + position.accountingCostUsd, 0);
  const cashRateToUsd = await getCashModeUsdRate(account.cashMode, liveMarketItems);
  const cashValuationReliable = account.cashMode === "USD" || cashRateToUsd !== null;
  const cashValueUsd = cashToUsd(
    account.cashAmount,
    account.cashMode,
    cashRateToUsd ?? exchangeRatesToUsd[account.cashMode],
  );
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
    hasUnreliableValuation: hasUnreliableValuation || !cashValuationReliable,
    cashValuationReliable,
    totalValueUsd: cashValueUsd + positionsValueUsd,
    initialCapitalUsd: initialCashUsd,
    totalTradingPowerUsd: effectiveTradingPowerUsd,
    bonusTradingPowerUsd: appliedBonusTradingPowerUsd,
    profitLossUsd: calculateCompetitionProfitLossUsd(cashValueUsd + positionsValueUsd),
    profitLossPercent: calculateCompetitionReturnPercent(cashValueUsd + positionsValueUsd),
  };
}

export const getPortfolioSnapshot = getCurrentPortfolio;
