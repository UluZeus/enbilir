import { describe, expect, it } from "vitest";
import {
  applyVipBuyEvidenceGate,
  getVerifiedCandidateSources,
  hasSpecificThreeToTwelveMonthCatalyst,
  normalizeVipResearchSource,
  sourceMatchesCandidate,
} from "@/lib/vip-research/evidence-policy";

describe("VIP research evidence policy", () => {
  it("requires both a concrete event and a 3-12 month time marker", () => {
    expect(hasSpecificThreeToTwelveMonthCatalyst([
      "Şirketin yeni ürün lansmanı Q4 2026 döneminde planlanıyor.",
    ])).toBe(true);
    expect(hasSpecificThreeToTwelveMonthCatalyst([
      "Fed faiz indirimi için Q4 2026 döneminde yeni bir pencere açabilir.",
    ])).toBe(true);
    expect(hasSpecificThreeToTwelveMonthCatalyst([
      "Önümüzdeki 6 ay olumlu olabilir.",
    ])).toBe(false);
    expect(hasSpecificThreeToTwelveMonthCatalyst([
      "Yeni ürün lansmanı planlanıyor ancak tarih açıklanmadı.",
    ])).toBe(false);
  });

  it("accepts only credential-free external HTTPS sources", () => {
    expect(normalizeVipResearchSource({ title: "IR", url: "https://investor.example.com/news" }))
      .toEqual({ title: "IR", url: "https://investor.example.com/news" });
    expect(normalizeVipResearchSource({ title: "Unsafe", url: "http://example.com/news" })).toBeNull();
    expect(normalizeVipResearchSource({ title: "Unsafe", url: "https://user:pass@example.com/news" })).toBeNull();
    expect(normalizeVipResearchSource({ title: "Local", url: "https://localhost/news" })).toBeNull();
  });

  it("does not attach a response-level citation to an unrelated idea", () => {
    const apple = { symbol: "AAPL", providerSymbol: "AAPL", displayName: "Apple Inc" };

    expect(sourceMatchesCandidate(
      { title: "Apple investor relations", url: "https://www.apple.com/newsroom/" },
      apple,
    )).toBe(true);
    expect(sourceMatchesCandidate(
      { title: "Microsoft investor relations", url: "https://www.microsoft.com/investor" },
      apple,
    )).toBe(false);

    expect(getVerifiedCandidateSources([
      { title: "Apple investor relations", url: "https://www.apple.com/newsroom/" },
      { title: "Microsoft investor relations", url: "https://www.microsoft.com/investor" },
      { title: "Apple local source", url: "http://apple.example.com/news" },
    ], apple)).toEqual([
      { title: "Apple investor relations", url: "https://www.apple.com/newsroom/" },
    ]);
  });

  it("downgrades an unsupported buy and rejects a buy with a risk veto", () => {
    const supported = {
      stance: "AL" as const,
      riskVeto: false,
      catalysts: ["Yeni ürün lansmanı Q4 2026 döneminde planlanıyor."],
      sources: [{ title: "IR", url: "https://investor.example.com/news" }],
    };

    expect(applyVipBuyEvidenceGate(supported)).toBe("AL");
    expect(applyVipBuyEvidenceGate({ ...supported, sources: [] })).toBe("IZLE");
    expect(applyVipBuyEvidenceGate({ ...supported, catalysts: ["Katalizör araştırması gerekli."] })).toBe("IZLE");
    expect(applyVipBuyEvidenceGate({ ...supported, riskVeto: true })).toBe("UZAK_DUR");
  });
});
