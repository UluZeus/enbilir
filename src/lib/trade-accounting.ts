import type { DecimalValue } from "@/lib/decimal";
import { decimal, roundDecimal } from "@/lib/decimal";

function roundUsd(value: number) {
  return Math.round((value + Number.EPSILON) * 100_000_000) / 100_000_000;
}

export function getVirtualExecutionCostsDecimal(input: {
  category: string;
  side: "BUY" | "SELL";
  quotePriceUsd: DecimalValue;
  requestedAmountUsd: DecimalValue;
}) {
  const quotePriceUsd = decimal(input.quotePriceUsd);
  const requestedAmountUsd = decimal(input.requestedAmountUsd);
  const feeRate = decimal("0.0001");
  const slippageRate = input.category === "CRYPTO"
    ? decimal("0.0005")
    : input.category === "FX"
      ? decimal("0.0001")
      : decimal("0.0002");
  const executionPriceUsd = roundDecimal(
    quotePriceUsd.times(input.side === "BUY" ? decimal(1).plus(slippageRate) : decimal(1).minus(slippageRate)),
    8,
  );

  if (input.side === "BUY") {
    const executionNotionalUsd = roundDecimal(requestedAmountUsd.div(decimal(1).plus(feeRate)), 8);
    const feeUsd = roundDecimal(requestedAmountUsd.minus(executionNotionalUsd), 8);
    const quantity = roundDecimal(executionNotionalUsd.div(executionPriceUsd), 12);
    return {
      quantity,
      executionPriceUsd,
      executionNotionalUsd,
      feeUsd,
      slippageUsd: roundDecimal(quantity.times(executionPriceUsd.minus(quotePriceUsd).abs()), 8),
      cashDeltaUsd: roundDecimal(requestedAmountUsd, 8),
    };
  }

  const quantity = roundDecimal(requestedAmountUsd.div(quotePriceUsd), 12);
  const executionNotionalUsd = roundDecimal(quantity.times(executionPriceUsd), 8);
  const feeUsd = roundDecimal(executionNotionalUsd.times(feeRate), 8);
  return {
    quantity,
    executionPriceUsd,
    executionNotionalUsd,
    feeUsd,
    slippageUsd: roundDecimal(quantity.times(executionPriceUsd.minus(quotePriceUsd).abs()), 8),
    cashDeltaUsd: roundDecimal(executionNotionalUsd.minus(feeUsd), 8),
  };
}

export function calculateRealizedTradePnlDecimal(input: {
  quantity: DecimalValue;
  averagePriceUsd: DecimalValue;
  netProceedsUsd: DecimalValue;
}) {
  const costBasisUsd = roundDecimal(decimal(input.quantity).times(input.averagePriceUsd), 8);
  const realizedPnlUsd = roundDecimal(decimal(input.netProceedsUsd).minus(costBasisUsd), 8);
  return {
    costBasisUsd,
    realizedPnlUsd,
    realizedPnlPercent: costBasisUsd.isPositive()
      ? roundDecimal(realizedPnlUsd.div(costBasisUsd).times(100), 8)
      : decimal(0),
  };
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 1_000_000_000_000) / 1_000_000_000_000;
}

export function getVirtualExecutionCosts(input: {
  category: string;
  side: "BUY" | "SELL";
  quotePriceUsd: number;
  requestedAmountUsd: number;
}) {
  const feeRate = 0.0001;
  const slippageRate = input.category === "CRYPTO"
    ? 0.0005
    : input.category === "FX"
      ? 0.0001
      : 0.0002;
  const executionPriceUsd = roundUsd(
    input.quotePriceUsd * (input.side === "BUY" ? 1 + slippageRate : 1 - slippageRate),
  );

  if (input.side === "BUY") {
    const executionNotionalUsd = roundUsd(input.requestedAmountUsd / (1 + feeRate));
    const feeUsd = roundUsd(input.requestedAmountUsd - executionNotionalUsd);
    const quantity = roundQuantity(executionNotionalUsd / executionPriceUsd);
    return {
      quantity,
      executionPriceUsd,
      executionNotionalUsd,
      feeUsd,
      slippageUsd: roundUsd(quantity * Math.abs(executionPriceUsd - input.quotePriceUsd)),
      cashDeltaUsd: roundUsd(input.requestedAmountUsd),
    };
  }

  const quantity = roundQuantity(input.requestedAmountUsd / input.quotePriceUsd);
  const executionNotionalUsd = roundUsd(quantity * executionPriceUsd);
  const feeUsd = roundUsd(executionNotionalUsd * feeRate);
  return {
    quantity,
    executionPriceUsd,
    executionNotionalUsd,
    feeUsd,
    slippageUsd: roundUsd(quantity * Math.abs(executionPriceUsd - input.quotePriceUsd)),
    cashDeltaUsd: roundUsd(executionNotionalUsd - feeUsd),
  };
}

export function calculateRealizedTradePnl(input: {
  quantity: number;
  averagePriceUsd: number;
  netProceedsUsd: number;
}) {
  const costBasisUsd = roundUsd(input.quantity * input.averagePriceUsd);
  const realizedPnlUsd = roundUsd(input.netProceedsUsd - costBasisUsd);
  return {
    costBasisUsd,
    realizedPnlUsd,
    realizedPnlPercent: costBasisUsd > 0 ? roundUsd((realizedPnlUsd / costBasisUsd) * 100) : 0,
  };
}
