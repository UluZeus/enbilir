import { describe, expect, it } from "vitest";

import { getVipAgentBuyIneligibilityReason } from "@/lib/vip-agents/calculations";
import { VIP_AGENT_STRATEGIES } from "@/lib/vip-agents/config";
import {
  calculateVipAgentAccountDecimal,
  calculateVipAgentSellAccountingDecimal,
  getVipAgentNoQuoteDecision,
} from "@/lib/vip-agents/engine";

describe("VIP agent quote decisions", () => {
  it("skips a trade when a known market session is closed instead of reporting a provider failure", () => {
    expect(getVipAgentNoQuoteDecision({
      availability: "SESSION_UNAVAILABLE",
      error: "Piyasa seansı kapalı veya açılış öncesi; güncel işlem fiyatı yok.",
    })).toEqual({
      action: "SKIP",
      reason: "Piyasa seansı kapalı veya açılış öncesi; güncel işlem fiyatı yok.",
    });
  });

  it("keeps provider mapping or freshness failures as errors", () => {
    expect(getVipAgentNoQuoteDecision({
      availability: "UNAVAILABLE",
      error: "Sağlayıcı eşlemesi veya güncel fiyat alınamadı.",
    })).toEqual({
      action: "ERROR",
      reason: "Sağlayıcı eşlemesi veya güncel fiyat alınamadı.",
    });
  });

  it("never turns a raw IZLE research stance into a BUY when a canonical quote is available", () => {
    const reason = getVipAgentBuyIneligibilityReason(VIP_AGENT_STRATEGIES[0], {
      stance: "IZLE",
      confidenceScore: 100,
      riskScore: 0,
      entryLow: 90,
      entryHigh: 110,
      stopLoss: 80,
    }, 100);

    expect(reason).toContain("yalnızca AL fikirleri işleme açılır");
  });
});

describe("VIP agent decimal account persistence", () => {
  it("rounds exact half-cents with Decimal before snapshot and ranking values are persisted", () => {
    const result = calculateVipAgentAccountDecimal({
      cashUsd: "100.005",
      positionsValueUsd: "0",
      reserveUsd: "0",
      performanceBaseUsd: "100",
    });

    expect(result.totalBalanceUsd.toFixed(2)).toBe("100.01");
    expect(result.performanceEquityUsd.toFixed(2)).toBe("100.01");
    expect(result.pnlUsd.toFixed(2)).toBe("0.01");
    expect(result.returnPercent.toFixed(4)).toBe("0.0100");
  });

  it("uses exact decimal multiplication for half-cent trade proceeds and realized P&L", () => {
    const result = calculateVipAgentSellAccountingDecimal({
      quantity: "0.1",
      priceUsd: "10.05",
      averagePriceUsd: "10",
      cashUsd: "100",
    });

    expect(result.grossUsd.toFixed(2)).toBe("1.01");
    expect(result.costBasisUsd.toFixed(2)).toBe("1.00");
    expect(result.realizedPnlUsd.toFixed(2)).toBe("0.01");
    expect(result.realizedPnlPercent.toFixed(4)).toBe("1.0000");
    expect(result.cashAfterUsd.toFixed(2)).toBe("101.01");
  });
});
