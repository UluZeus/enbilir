import { describe, expect, it } from "vitest";
import {
  buildVipAgentDigest,
  buildVipUniversePulse,
  extractVipTechnicalCandidates,
  renderVipDailyDigest,
  type VipDigestAgentInput,
  type VipDigestIdea,
  type VipDigestUniverseItem,
} from "@/lib/vip-research/daily-digest";

const ideas: VipDigestIdea[] = [
  {
    id: "idea-aapl",
    symbol: "AAPL",
    displayName: "Apple",
    currency: "USD",
    rank: 1,
    stance: "AL",
    thesisSummary: "Nakit akışı ve marj genişlemesi teknik teyitle birleşiyor.",
    confidenceScore: 84,
    riskScore: 35,
    entryLow: 190,
    entryHigh: 198,
    stopLoss: 180,
    targetPrice: 225,
  },
  ...[2, 3, 4].map((rank) => ({
    id: `idea-${rank}`,
    symbol: `SYM${rank}`,
    displayName: `Symbol ${rank}`,
    currency: rank === 2 ? "JPY" : "USD",
    rank,
    stance: "IZLE",
    thesisSummary: `Tez ${rank}`,
    confidenceScore: 70,
    riskScore: 50,
    entryLow: 10,
    entryHigh: 11,
    stopLoss: 9,
    targetPrice: 14,
  })),
];

function agent(
  id: string,
  slug: string,
  name: string,
  decisions: VipDigestAgentInput["decisions"] = [],
): VipDigestAgentInput {
  return {
    id,
    slug,
    name,
    riskProfile: name === "SABİT" ? "MUHAFAZAKAR" : name === "OLGUN" ? "DENGELI" : "AGRESIF",
    description: `${name} stratejisi`,
    decisions,
    positions: [{ symbol: "AAPL", stopLossUsd: 181, targetPriceUsd: 228 }],
    snapshots: [{ pnlUsd: 12_500, returnPercent: 1.25 }],
  };
}

describe("VIP daily digest universe radar", () => {
  it("reports the full attempted universe but only raises alerts from verified quotes", () => {
    const filler: VipDigestUniverseItem[] = Array.from({ length: 329 }, (_, index) => ({
      symbol: `F${index}`,
      name: `Fallback ${index}`,
      category: "NASDAQ",
      source: "fallback",
      dataStatus: "close",
      priceUsd: 100,
      changePercent: 18,
    }));
    const pulse = buildVipUniversePulse([
      ...filler,
      { symbol: "AAPL", name: "Apple", category: "NASDAQ", source: "yahoo", dataStatus: "live", priceUsd: 202, changePercent: 5.2 },
      { symbol: "BTC", name: "Bitcoin", category: "CRYPTO", source: "binance", dataStatus: "live", priceUsd: 70_000, changePercent: 2 },
      { symbol: "MSFT", name: "Microsoft", category: "NASDAQ", source: "yahoo", dataStatus: "live", priceUsd: 450, changePercent: 1 },
    ], [{
      symbol: "MSFT",
      displayName: "Microsoft",
      lastPrice: 450,
      breakoutLevel: 448,
      volumeRatio20d: 1.8,
      volumeBreakout: true,
      rsi14: 62,
      rsiDivergence: "NONE",
      macdDivergence: "NONE",
      crowdingLevel: "MODERATE",
      crowdingScore: 40,
      technicalScore: 78,
    }]);

    expect(pulse.universeSize).toBe(332);
    expect(pulse.verifiedQuoteCount).toBe(3);
    expect(pulse.totalAlertCount).toBe(2);
    expect(pulse.alerts.map((alert) => alert.symbol)).toEqual(["MSFT", "AAPL"]);
    expect(pulse.alerts[0]).toMatchObject({ kind: "BREAKOUT", status: "DOĞRULANDI" });
  });

  it("requires corroboration before surfacing a divergence or crowding watch", () => {
    const pulse = buildVipUniversePulse([], [{
      symbol: "QUIET",
      displayName: "Quiet asset",
      lastPrice: 100,
      breakoutLevel: 120,
      volumeRatio20d: 0.8,
      volumeBreakout: false,
      rsi14: 52,
      rsiDivergence: "BULLISH",
      macdDivergence: "NONE",
      crowdingLevel: "HIGH",
      crowdingScore: 58,
      technicalScore: 50,
    }]);

    expect(pulse.alerts).toEqual([]);
  });

  it("rejects malformed technical source snapshots", () => {
    expect(extractVipTechnicalCandidates([{ symbol: "BAD", technical: { lastPrice: "100" } }])).toEqual([]);
    expect(extractVipTechnicalCandidates(null)).toEqual([]);
  });
});

describe("VIP daily digest agent section", () => {
  it("orders SABİT, OLGUN and YILDIRIM and never presents SKIP or ERROR as advice", () => {
    const records = [
      agent("vip-agent-yildirim", "yildirim", "YILDIRIM", [{ symbol: "PORTFOY", action: "SUMMARY", priceUsd: null, reason: "Portföy özeti", sourceIdeaId: null }]),
      agent("vip-agent-sabit", "sabit", "SABİT", [
        { symbol: "AAPL", action: "BUY", priceUsd: 195, reason: "Giriş bandı doğrulandı.", sourceIdeaId: "idea-aapl" },
        { symbol: "SYM2", action: "SKIP", priceUsd: 12, reason: "Risk eşiği aşıldı.", sourceIdeaId: "idea-2" },
        { symbol: "SYM3", action: "ERROR", priceUsd: null, reason: "Veri yok.", sourceIdeaId: "idea-3" },
        { symbol: "PORTFOY", action: "SUMMARY", priceUsd: null, reason: "Dört fikir değerlendirildi.", sourceIdeaId: null },
      ]),
      agent("vip-agent-olgun", "olgun", "OLGUN", [{ symbol: "AAPL", action: "HOLD", priceUsd: 202, reason: "Stop ve hedef tetiklenmedi.", sourceIdeaId: "idea-aapl" }]),
    ];
    const digest = buildVipAgentDigest(records, ideas);

    expect(digest.map((item) => item.name)).toEqual(["SABİT", "OLGUN", "YILDIRIM"]);
    expect(digest[0].decisions).toHaveLength(1);
    expect(digest[0].decisions[0]).toMatchObject({ actionLabel: "AL", stopLoss: 181, targetPrice: 228 });
    expect(digest[0]).toMatchObject({ skippedCount: 1, errorCount: 1 });
    expect(digest[0]).toMatchObject({ dailyActionLabel: "AL · AAPL" });
    expect(digest[0].dailyAdvice).toContain("Stop olmadan işlem yapma");
    expect(digest[2].decisions).toEqual([]);
    expect(digest[2].summary).toBe("Portföy özeti");
    expect(digest[2].dailyActionLabel).toBe("PORTFÖYÜ KORU");
  });

  it("always returns all three agents with a clear safe action", () => {
    const digest = buildVipAgentDigest([
      agent("vip-agent-sabit", "sabit", "SABİT", [
        { symbol: "AAPL", action: "ERROR", priceUsd: null, reason: "Veri yok.", sourceIdeaId: "idea-aapl" },
      ]),
    ], ideas);

    expect(digest.map((item) => item.name)).toEqual(["SABİT", "OLGUN", "YILDIRIM"]);
    expect(digest[0]).toMatchObject({ dailyActionLabel: "VERİYİ BEKLE" });
    expect(digest[0].dailyAdvice).toContain("Bugün işlem yapma");
    expect(digest[1]).toMatchObject({ dailyActionLabel: "BEKLE" });
    expect(digest[2]).toMatchObject({ dailyActionLabel: "BEKLE" });
  });

  it("turns an all-skip day into a clear portfolio protection decision", () => {
    const digest = buildVipAgentDigest([
      agent("vip-agent-sabit", "sabit", "SABİT", [
        { symbol: "AAPL", action: "SKIP", priceUsd: 202, reason: "Eşik geçilmedi.", sourceIdeaId: "idea-aapl" },
        { symbol: "PORTFOY", action: "SUMMARY", priceUsd: null, reason: "Yeni işlem yok.", sourceIdeaId: null },
      ]),
    ], ideas);

    expect(digest[0].dailyActionLabel).toBe("PORTFÖYÜ KORU");
    expect(digest[0].dailyAdvice).toBe("Bugün yeni alım yapma. Nakit ve portföyü koru. Adaylar işlem eşiğini geçmedi.");
    expect(digest[0].decisions).toEqual([]);
  });
});

describe("VIP layered email renderer", () => {
  it("keeps the email concise, layered, escaped and linked to detail pages", () => {
    const agents = buildVipAgentDigest([
      agent("vip-agent-sabit", "sabit", "SABİT", [{ symbol: "AAPL", action: "BUY", priceUsd: 195, reason: "Giriş bandı doğrulandı.", sourceIdeaId: "idea-aapl" }]),
      agent("vip-agent-olgun", "olgun", "OLGUN"),
      agent("vip-agent-yildirim", "yildirim", "YILDIRIM"),
    ], ideas);
    const digest = renderVipDailyDigest({
      recipientName: "<script>alert('x')</script>",
      report: {
        id: "report-1",
        periodKey: "2026-07-18",
        fallbackUsed: true,
        executiveSummary: "Bugün yalnız doğrulanmış başlıklar öne çıkarıldı.",
        marketContext: "Faiz, dolar likiditesi ve seçici risk iştahı birlikte izleniyor.",
        disclaimer: "Kişiye özel yatırım danışmanlığı değildir.",
        ideas,
      },
      macroReport: {
        id: "macro-1",
        generatedAt: new Date("2026-07-18T04:00:00Z"),
        macroSummary: "Merkez bankaları ve dolar likiditesi fiyatlamanın ana çerçevesi.",
        marketRegime: "Seçici risk rejimi",
        riskAppetite: "Dengeli",
        keyTakeaways: ["Tek bir sinyal karar için yeterli değildir."],
        newsItems: [{ title: "Merkez bankası görünümü", link: "https://example.com/news", source: "Reuters", category: "macro", publishedAt: null }],
      },
      universePulse: {
        universeSize: 332,
        verifiedQuoteCount: 300,
        totalAlertCount: 1,
        alerts: [{ symbol: "AAPL", displayName: "Apple", kind: "DIVERGENCE", status: "YAKIN İZLEME", label: "Negatif uyumsuzluk", commentary: "Hareket teyit bekliyor.", changePercent: 5.2, priority: 90 }],
      },
      agents,
      urls: {
        home: "https://enbilir.com/tr/vip",
        report: "https://enbilir.com/tr/vip/raporlar/report-1",
        macroReport: "https://enbilir.com/tr/ai-piyasa-asistani/raporlar/macro-1",
        agents: "https://enbilir.com/tr/vip/ajanlar",
        agent: (slug) => `https://enbilir.com/tr/vip/ajanlar/${slug}#karar-izi`,
        idea: (ideaId) => `https://enbilir.com/tr/vip/raporlar/report-1#idea-${ideaId}`,
        asset: (symbol) => `https://enbilir.com/tr/islem-yap?symbol=${symbol}`,
      },
    });

    expect(digest.subject).toContain("1 özel durum");
    expect(digest.html).toContain("BUGÜN NE YAPMALI?");
    expect(digest.html).toContain("KATMAN 2 · ERKEN UYARI RADARI");
    expect(digest.html).toContain("SABİT, OLGUN ve YILDIRIM");
    expect(digest.html.match(/GÜNÜN KARARI/g)).toHaveLength(3);
    expect(digest.html).toContain("Hızlı yükselen fiyatın peşinden gitme");
    expect(digest.html).toContain("Düşüş riski arttı");
    expect(digest.html).toContain("AAPL düşebilir");
    expect(digest.html).not.toContain("AAPL artabilir");
    expect(digest.text).toContain("GÜNÜN KARARI: AL · AAPL");
    expect(digest.html).toContain("Detay öğren");
    expect(digest.html).toContain("Kaynak araştırması sınırlı");
    expect(digest.html).toContain("10,00 JPY");
    expect(digest.html).toContain("BAŞLANGIÇTAN BERİ");
    expect(digest.text).toContain("1.000.000 USD performans tabanına göre başlangıçtan beri toplamdır");
    expect(digest.html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(digest.html).not.toContain("<script>alert('x')</script>");
    expect(digest.html).not.toContain("SYM4 · IZLE");
    expect(digest.text).toContain("332 VARLIK ERKEN UYARI RADARI");
    expect(digest.text).toContain("ÖZEL BÖLÜM · SABİT, OLGUN VE YILDIRIM");
  });
});
