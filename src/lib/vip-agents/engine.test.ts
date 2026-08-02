import { describe, expect, it } from "vitest";

import { getVipAgentBuyIneligibilityReason } from "@/lib/vip-agents/calculations";
import { VIP_AGENT_STRATEGIES } from "@/lib/vip-agents/config";
import { getVipAgentNoQuoteDecision } from "@/lib/vip-agents/engine";

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
