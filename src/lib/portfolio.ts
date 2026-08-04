import type { CashMode } from "@/generated/prisma/enums";
import type { MarketItem } from "@/lib/market-data";
import { isExecutableMarketQuote } from "@/lib/executable-quote";
import { getLiveMarketItemsForSymbols } from "@/lib/live-market";
import { prisma } from "@/lib/prisma";
import { syncPortfolioCorporateActions } from "@/lib/portfolio-corporate-actions";
import type { DecimalValue } from "@/lib/decimal";
import { decimal, decimalToNumber } from "@/lib/decimal";
import { withSerializableTransaction } from "@/lib/serializable-transaction";

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

const maximumYahooClosedPortfolioValuationAgeMs = 96 * 60 * 60 * 1000;

export function formatMoney(value: DecimalValue, currency = "USD") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(decimalToNumber(value));
}

export function getCashCurrency(mode: CashMode) {
  return mode === "TRY_REPO" ? "TRY" : mode;
}

export function cashToUsd(amount: DecimalValue, mode: CashMode, rateToUsd = exchangeRatesToUsd[mode]) {
  return decimalToNumber(decimal(amount).times(rateToUsd));
}

export function usdToCash(amount: DecimalValue, mode: CashMode, rateToUsd = exchangeRatesToUsd[mode]) {
  return decimalToNumber(decimal(amount).div(rateToUsd));
}

export function calculateCompetitionProfitLossUsd(totalValueUsd: number) {
  return totalValueUsd - initialCashUsd;
}

export function calculateCompetitionReturnPercent(totalValueUsd: number) {
  return (calculateCompetitionProfitLossUsd(totalValueUsd) / initialCashUsd) * 100;
}

export function getSafePortfolioPriceUsd(
  position: { averagePriceUsd: DecimalValue; symbol: string },
  marketItem: { priceUsd: number; source: string } | undefined,
) {
  if (marketItem && Number.isFinite(marketItem.priceUsd) && marketItem.priceUsd > 0) {
    return marketItem.priceUsd;
  }

  return decimalToNumber(position.averagePriceUsd);
}

export function hasVerifiedPortfolioQuote(marketItem: MarketItem | undefined, now = Date.now()) {
  if (isVerifiedYahooClosedPortfolioValuation(marketItem, now)) {
    return true;
  }

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

function isVerifiedYahooClosedPortfolioValuation(
  marketItem: MarketItem | undefined,
  now: number,
) {
  const priceNative = marketItem?.priceNative;

  if (
    !marketItem ||
    marketItem.source !== "yahoo" ||
    marketItem.dataStatus !== "close" ||
    marketItem.marketStateSource !== "provider" ||
    !["CLOSED", "MARKET_CLOSED"].includes(String(marketItem.marketState ?? "").toUpperCase()) ||
    !marketItem.providerSymbol ||
    !marketItem.instrumentType ||
    !marketItem.exchange ||
    !marketItem.sourceAsOf ||
    typeof priceNative !== "number" ||
    !Number.isFinite(priceNative) ||
    priceNative <= 0 ||
    !Number.isFinite(marketItem.priceUsd) ||
    marketItem.priceUsd <= 0 ||
    marketItem.exchangeDataDelayedBy !== 0
  ) {
    return false;
  }

  const sourceTime = Date.parse(marketItem.sourceAsOf);
  const ageMs = now - sourceTime;

  return (
    Number.isFinite(sourceTime) &&
    sourceTime > 0 &&
    ageMs >= 0 &&
    ageMs <= maximumYahooClosedPortfolioValuationAgeMs
  );
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

  if (
    !item ||
    !hasVerifiedPortfolioQuote(item) ||
    !isExecutableMarketQuote(item) ||
    (requireExecutable && item.executionEligible !== true)
  ) {
    return null;
  }

  const nativePrice = item.priceNative ?? item.priceUsd;
  if (!Number.isFinite(nativePrice) || nativePrice <= 0) return null;
  return mode === "EUR" ? nativePrice : 1 / nativePrice;
}

type TradeForCompetitionCost = {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: DecimalValue;
  totalUsd: DecimalValue;
};

type CompetitionCostLot = {
  quantity: ReturnType<typeof decimal>;
  competitionCostUsd: ReturnType<typeof decimal>;
};

function calculateCompetitionPositionCosts(trades: TradeForCompetitionCost[]) {
  const lotsBySymbol = new Map<string, CompetitionCostLot[]>();
  let grossBuySpendingUsd = decimal(0);

  for (const trade of trades) {
    const symbol = trade.symbol.trim().toUpperCase();

    if (trade.side === "BUY") {
      const spendingBefore = grossBuySpendingUsd;
      const tradeTotalUsd = decimal(trade.totalUsd);
      const spendingAfter = grossBuySpendingUsd.plus(tradeTotalUsd);
      const bonusBefore = decimalMax(decimal(0), spendingBefore.minus(initialCashUsd));
      const bonusAfter = decimalMax(decimal(0), spendingAfter.minus(initialCashUsd));
      const bonusFundedUsd = decimalMax(decimal(0), bonusAfter.minus(bonusBefore));
      const competitionCostUsd = decimalMax(decimal(0), tradeTotalUsd.minus(bonusFundedUsd));
      const lots = lotsBySymbol.get(symbol) ?? [];

      lots.push({ quantity: decimal(trade.quantity), competitionCostUsd });
      lotsBySymbol.set(symbol, lots);
      grossBuySpendingUsd = spendingAfter;
      continue;
    }

    if (trade.side === "SELL") {
      const lots = lotsBySymbol.get(symbol) ?? [];
      let quantityToRemove = decimal(trade.quantity);

      while (quantityToRemove.isPositive() && lots.length > 0) {
        const lot = lots[0];
        const removedQuantity = decimalMin(quantityToRemove, lot.quantity);
        const removedRatio = lot.quantity.isPositive() ? removedQuantity.div(lot.quantity) : decimal(0);

        lot.quantity = lot.quantity.minus(removedQuantity);
        lot.competitionCostUsd = lot.competitionCostUsd.minus(lot.competitionCostUsd.times(removedRatio));
        quantityToRemove = quantityToRemove.minus(removedQuantity);

        if (lot.quantity.lessThanOrEqualTo("0.000001")) {
          lots.shift();
        }
      }

      lotsBySymbol.set(symbol, lots);
    }
  }

  return new Map(
    Array.from(lotsBySymbol.entries()).map(([symbol, lots]) => [
      symbol,
      lots.reduce((sum, lot) => sum.plus(decimalMax(decimal(0), lot.competitionCostUsd)), decimal(0)),
    ]),
  );
}

function decimalMin(left: ReturnType<typeof decimal>, right: ReturnType<typeof decimal>) {
  return left.lessThanOrEqualTo(right) ? left : right;
}

function decimalMax(left: ReturnType<typeof decimal>, right: ReturnType<typeof decimal>) {
  return left.greaterThanOrEqualTo(right) ? left : right;
}

export async function ensureVirtualAccount(userId: string) {
  return prisma.virtualAccount.upsert({
    where: { userId },
    create: {
      userId,
      cashAmount: initialCashUsd,
      cashMode: "USD",
      baseCurrency: "USD",
    },
    update: {},
  });
}

export async function accrueRepoIfNeeded(userId: string) {
  await ensureVirtualAccount(userId);
  return withSerializableTransaction(async (transaction) => {
    const account = await transaction.virtualAccount.findUniqueOrThrow({ where: { userId } });

    if (account.cashMode !== "TRY_REPO") {
      return account;
    }

    const now = new Date();
    const last = account.repoLastAccruedAt ?? account.updatedAt;
    const days = Math.floor((now.getTime() - last.getTime()) / 86_400_000);

    if (days <= 0) {
      return account;
    }

    const cashAmount = decimal(account.cashAmount).times(decimal(1).plus(account.dailyRepoRate).pow(days));
    const accruedThrough = new Date(last.getTime() + days * 86_400_000);

    return transaction.virtualAccount.update({
      where: { userId },
      data: {
        cashAmount,
        repoLastAccruedAt: accruedThrough,
      },
    });
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
      cashAmount: decimal(storedAccount.cashAmount).times(decimal(1).plus(storedAccount.dailyRepoRate).pow(days)),
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
    const quantity = decimal(position.quantity);
    const accountingCostUsdDecimal = quantity.times(position.averagePriceUsd);
    const competitionCostUsdDecimal = competitionCostsBySymbol.get(position.symbol.trim().toUpperCase()) ?? accountingCostUsdDecimal;
    const valueUsdDecimal = quantity.times(currentPriceUsd);
    const profitLossUsdDecimal = valueUsdDecimal.minus(competitionCostUsdDecimal);

    return {
      ...position,
      quantity: decimalToNumber(position.quantity),
      averagePriceUsd: decimalToNumber(position.averagePriceUsd),
      appliedSplitFactor: decimalToNumber(position.appliedSplitFactor),
      currentPriceUsd,
      priceSource: priceStatus.priceSource,
      dataStatus: priceStatus.dataStatus,
      valuationReliable: priceStatus.valuationReliable && !unreliableCorporateActionPositionIds.has(position.id),
      accountingCostUsd: decimalToNumber(accountingCostUsdDecimal),
      competitionCostUsd: decimalToNumber(competitionCostUsdDecimal),
      valueUsd: decimalToNumber(valueUsdDecimal),
      profitLossUsd: decimalToNumber(profitLossUsdDecimal),
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
    account: {
      ...account,
      cashAmount: decimalToNumber(account.cashAmount),
      dailyRepoRate: decimalToNumber(account.dailyRepoRate),
    },
    positions: enrichedPositions,
    trades: trades.map((trade) => ({
      ...trade,
      quantity: decimalToNumber(trade.quantity),
      priceUsd: decimalToNumber(trade.priceUsd),
      totalUsd: decimalToNumber(trade.totalUsd),
      requestedAmountUsd: decimalToNumber(trade.requestedAmountUsd),
      executionNotionalUsd: decimalToNumber(trade.executionNotionalUsd),
      feeUsd: decimalToNumber(trade.feeUsd),
      slippageUsd: decimalToNumber(trade.slippageUsd),
      costBasisUsd: trade.costBasisUsd === null ? null : decimalToNumber(trade.costBasisUsd),
      realizedPnlUsd: trade.realizedPnlUsd === null ? null : decimalToNumber(trade.realizedPnlUsd),
      realizedPnlPercent: trade.realizedPnlPercent === null ? null : decimalToNumber(trade.realizedPnlPercent),
    })),
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
