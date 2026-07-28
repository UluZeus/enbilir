function roundUsd(value: number) {
  return Math.round((value + Number.EPSILON) * 100_000_000) / 100_000_000;
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
