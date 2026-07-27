import { describe, expect, it } from "vitest";
import { VIP_AGENT_STRATEGIES } from "@/lib/vip-agents/config";
import { buildVipAgentDailyTip, type VipAgentTipIdea } from "@/lib/vip-agents/daily-tip";

const sabit = VIP_AGENT_STRATEGIES.find((strategy) => strategy.slug === "sabit")!;
const olgun = VIP_AGENT_STRATEGIES.find((strategy) => strategy.slug === "olgun")!;
const yildirim = VIP_AGENT_STRATEGIES.find((strategy) => strategy.slug === "yildirim")!;

const apple: VipAgentTipIdea = {
  id: "idea-aapl",
  symbol: "AAPL",
  displayName: "Apple",
  currency: "USD",
  rank: 1,
  stance: "AL",
  thesisSummary: "Serbest nakit akışı büyüyor ve hacimli kırılım teyit bekliyor.",
  confidenceScore: 86,
  riskScore: 34,
  entryLow: 190,
  entryHigh: 198,
  stopLoss: 180,
  targetPrice: 230,
};

describe("VIP agent daily tips", () => {
  it("publishes a completed trade before any conditional idea", () => {
    const tip = buildVipAgentDailyTip({
      strategy: sabit,
      decisions: [{
        symbol: "AAPL",
        action: "BUY",
        priceUsd: 195,
        reason: "Giriş bandı ve risk eşiği doğrulandı.",
        sourceIdeaId: apple.id,
      }],
      ideas: [apple],
      positions: [{ symbol: "AAPL", stopLossUsd: 181, targetPriceUsd: 228 }],
    });

    expect(tip).toMatchObject({
      action: "BUY",
      symbol: "AAPL",
      referencePrice: 195,
      stopLoss: 181,
      targetPrice: 228,
      source: "DECISION",
    });
    expect(tip.statementTr).toContain("Bugün benim düşüncem AAPL varlığını 195,00 USD seviyesinden almak");
    expect(tip.statementTr).toContain("Bu benim kararımdır ve yatırım tavsiyesi değildir.");
  });

  it("keeps the three risk profiles distinct without forcing a trade", () => {
    const decisions = [{
      symbol: "AAPL",
      action: "SKIP",
      priceUsd: 202,
      reason: "Henüz işlem koşulu oluşmadı.",
      sourceIdeaId: apple.id,
    }];
    const conservativeTip = buildVipAgentDailyTip({ strategy: sabit, decisions, ideas: [apple], positions: [] });
    const balancedTip = buildVipAgentDailyTip({ strategy: olgun, decisions, ideas: [apple], positions: [] });
    const aggressiveTip = buildVipAgentDailyTip({ strategy: yildirim, decisions, ideas: [apple], positions: [] });

    expect(conservativeTip.action).toBe("WATCH");
    expect(conservativeTip.entryLow).toBe(190);
    expect(conservativeTip.entryHigh).toBe(198);
    expect(balancedTip.entryLow).toBe(188.1);
    expect(balancedTip.entryHigh).toBe(199.98);
    expect(aggressiveTip.entryLow).toBe(184.3);
    expect(aggressiveTip.entryHigh).toBe(203.94);
    expect(conservativeTip.statementTr).toContain("yalnız hacimli teknik teyit gelirse");
    expect(aggressiveTip.statementTr).toContain("Bu benim kararımdır ve yatırım tavsiyesi değildir.");
  });

  it("turns a failed profile threshold into an asset-specific wait instruction", () => {
    const riskyIdea = {
      ...apple,
      id: "idea-risky",
      symbol: "RISK",
      confidenceScore: 74,
      riskScore: 63,
    };
    const tip = buildVipAgentDailyTip({
      strategy: sabit,
      decisions: [{
        symbol: "RISK",
        action: "SKIP",
        priceUsd: 194,
        reason: "Risk eşiği geçilmedi.",
        sourceIdeaId: riskyIdea.id,
      }],
      ideas: [riskyIdea],
      positions: [],
    });

    expect(tip).toMatchObject({ action: "WAIT", symbol: "RISK", source: "IDEA" });
    expect(tip.statementTr).toContain("güven ve risk eşiklerim sağlanmadan almamak");
    expect(tip.rationaleTr).toContain("en az 82 güven ve en çok 38 risk");
  });

  it("does not suggest a purchase before the report stance becomes AL", () => {
    const watchIdea = {
      ...apple,
      id: "idea-watch",
      symbol: "WATCH",
      stance: "IZLE",
    };
    const tip = buildVipAgentDailyTip({
      strategy: olgun,
      decisions: [{
        symbol: "WATCH",
        action: "SKIP",
        priceUsd: 194,
        reason: "VIP notu IZLE; yalnızca AL fikirleri işleme açılır.",
        sourceIdeaId: watchIdea.id,
      }],
      ideas: [watchIdea],
      positions: [],
    });

    expect(tip.action).toBe("WATCH");
    expect(tip.statementTr).toContain("VIP notu AL seviyesine yükselmeden yeni alım yapmamak");
    expect(tip.statementTr).not.toContain("almak için izlemek");
  });

  it("never turns a negative idea into a short or sell when there is no position", () => {
    const negativeIdea = {
      ...apple,
      id: "idea-avoid",
      symbol: "AVOID",
      stance: "UZAK_DUR",
    };
    const tip = buildVipAgentDailyTip({
      strategy: yildirim,
      decisions: [{
        symbol: "AVOID",
        action: "SKIP",
        priceUsd: 201,
        reason: "VIP notu UZAK_DUR.",
        sourceIdeaId: negativeIdea.id,
      }],
      ideas: [negativeIdea],
      positions: [],
    });

    expect(tip.action).toBe("AVOID");
    expect(tip.statementTr).toContain("201,00 USD seviyesinde yeni alım yapmamak");
    expect(tip.statementTr).not.toContain("satmak");
    expect(tip.statementTr).not.toContain("short");
  });

  it("provides a disclosed cash fallback when no verified idea exists", () => {
    const tip = buildVipAgentDailyTip({
      strategy: olgun,
      decisions: [],
      ideas: [],
      positions: [],
    });

    expect(tip).toMatchObject({ action: "WAIT", symbol: null, source: "FALLBACK" });
    expect(tip.statementTr).toBe(
      "Bugün benim düşüncem doğrulanmış bir varlık ve seviye oluşmadığı için yeni alım yapmamak ve nakitte kalmaktır. Bu benim kararımdır ve yatırım tavsiyesi değildir.",
    );
  });
});
