import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MACRO_REPORT_CHART_SELECTION } from "@/lib/ai-market/report-chart-selection";
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

const previewChartImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="180"><rect width="600" height="180" rx="18" fill="#f7f9fb"/><path d="M18 135 L110 118 L205 128 L300 79 L395 92 L490 45 L582 28 L582 162 L18 162 Z" fill="#d7f4ec"/><path d="M18 135 L110 118 L205 128 L300 79 L395 92 L490 45 L582 28" fill="none" stroke="#0f9f82" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="582" cy="28" r="8" fill="#fff" stroke="#0f9f82" stroke-width="5"/></svg>')}`;

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

describe("VIP premium email renderer", () => {
  it("keeps the important content visible, polished, escaped and mobile-ready", () => {
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
        chartAssets: MACRO_REPORT_CHART_SELECTION.map((asset, index) => ({
          symbol: asset.symbol,
          label: asset.label,
          lastPrice: 100 + index,
          changePercent3d: index % 2 === 0 ? 1.2 : -0.8,
          direction: index % 2 === 0 ? "YUKARI" as const : "ASAGI" as const,
          imageSrc: previewChartImage,
          imageAlt: `${asset.label} son üç günlük fiyat eğrisi`,
        })),
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
    expect(digest.html).toContain("BUGÜN İÇİN NET PLAN");
    expect(digest.html).toContain("ERKEN UYARI RADARI");
    expect(digest.html).toContain("SABİT, OLGUN ve YILDIRIM");
    expect(digest.html.match(/GÜNÜN KARARI/g)).toHaveLength(3);
    expect(digest.html).toContain("Hızlı yükselen fiyatın peşinden gitme");
    expect(digest.html).toContain("Düşüş riski arttı");
    expect(digest.html).toContain("AAPL düşebilir");
    expect(digest.html).not.toContain("AAPL artabilir");
    expect(digest.html).toContain('color:#b83250">+5,2%');
    expect(digest.text).toContain("GÜNÜN KARARI: AL · AAPL");
    expect(digest.html).not.toContain("Detay öğren");
    expect(digest.html).not.toContain("<details");
    expect(digest.html).not.toContain("<summary");
    expect(digest.html).toContain("Kaynak araştırması sınırlı");
    expect(digest.html).toContain("10,00 JPY");
    expect(digest.html).toContain("BAŞLANGIÇTAN BERİ");
    expect(digest.html).toContain("Piyasanın genel yönü: Seçici risk rejimi");
    expect(digest.html).toContain("Risk alma isteği: Dengeli");
    expect(digest.html).toContain("Tek bir sinyal karar için yeterli değildir");
    expect(digest.html).toContain("Nakit akışı ve marj genişlemesi teknik teyitle birleşiyor");
    expect(digest.html).toContain("Hareket teyit bekliyor");
    expect(digest.text).toContain("1.000.000 USD performans tabanına göre başlangıçtan beri hesaplanır");
    expect(digest.html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(digest.html).not.toContain("<script>alert('x')</script>");
    expect(digest.html).not.toContain("SYM4");
    expect(digest.text).toContain("332 VARLIKTA ERKEN UYARI");
    expect(digest.text).toContain("VIP AJANLARININ BUGÜNKÜ KARARI");
    expect(digest.text).toContain("SON 3 GÜN PİYASA PANOSU");
    expect(digest.html.indexOf("XAG/USD")).toBeLessThan(digest.html.indexOf("XAU/USD"));
    expect(digest.html.indexOf("XAU/USD")).toBeLessThan(digest.html.indexOf("NVDA"));
    expect(digest.html).toContain("Nasdaq");
    expect(Buffer.byteLength(digest.html, "utf8")).toBeLessThan(90_000);

    if (process.env.VIP_EMAIL_PREVIEW_PATH) {
      writeFileSync(process.env.VIP_EMAIL_PREVIEW_PATH, digest.html, "utf8");
    }
  });
});
