import { describe, expect, it } from "vitest";
import {
  buildContextFromMarketItems,
  buildLocalMarketChatAnswer,
  buildMarketChatContextText,
  selectMarketChatAgentPerformance,
  type MarketChatContext,
} from "@/lib/ai-market/market-chat";
import type { MarketItem } from "@/lib/market-data";

const items: MarketItem[] = [
  {
    symbol: "AAPL",
    dataSymbol: "AAPL",
    name: "Apple",
    market: "Nasdaq Hisse",
    category: "NASDAQ",
    dataStatus: "delayed",
    source: "yahoo",
    price: "210.25",
    priceUsd: 210.25,
    changePercent: 1.4,
  },
  {
    symbol: "BTC",
    dataSymbol: "BTCUSDT",
    name: "Bitcoin",
    market: "Kripto",
    category: "CRYPTO",
    dataStatus: "live",
    source: "binance",
    price: "102000.00",
    priceUsd: 102_000,
    changePercent: -0.8,
  },
];

const latestReport: NonNullable<MarketChatContext["latestReport"]> = {
  generatedAt: "2026-07-18T04:00:00.000Z",
  marketRegime: "SEÇİCİ RİSK",
  riskAppetite: "ORTA",
  macroSummary: "Faiz ve kâr büyümesi birlikte izleniyor.",
  newsSummary: "Başlıklar tek başına katalizör sayılmadı.",
  keyTakeaways: ["Kanıt teyidi gerekli"],
  assets: [{
    symbol: "AAPL",
    displayName: "Apple",
    assetClass: "EQUITY",
    lastPrice: 210.25,
    changePercent: 1.4,
    signalType: "WATCH",
    confidence: 61,
    riskScore: 48,
    opportunityScore: 61,
    technicalCommentary: "EMA50 üzerinde, EMA200 teyidi izleniyor.",
    macroCommentary: "Faiz hassasiyeti sürüyor.",
    newsCommentary: null,
    watchLevels: ["EMA50: 202"],
    scenarios: ["202 altı zayıflama"],
    indicatorSnapshot: "EMA50=202, EMA200=190, RSI=58, MACD histogram=0.2",
  }],
};

const vipResearch: NonNullable<MarketChatContext["vipResearch"]> = {
  generatedAt: "2026-07-18T04:10:00.000Z",
  marketContext: "Seçici fırsat rejimi.",
  executiveSummary: "Kalabalıklaşma filtresi uygulandı.",
  fallbackUsed: false,
  ideas: [{
    symbol: "AAPL",
    displayName: "Apple",
    assetClass: "EQUITY",
    rank: 1,
    stance: "IZLE",
    thesisSummary: "Nakit üretimi güçlü, giriş teyidi bekleniyor.",
    negativeCase: "Değerleme ve talep yavaşlaması.",
    macroThesis: "Faiz patikası çarpanı etkiler.",
    fundamentalThesis: "FCF ve marj kanıtı mevcut.",
    technicalThesis: "50/200 yapı pozitif ancak hacim teyidi eksik.",
    catalysts: ["Q4 ürün döngüsü"],
    exitPlan: "190 altı günlük kapanışta tez geçersiz.",
    institutionalPerception: "Olumlu fakat kalabalık.",
    shortInterestCommentary: "Short düşük.",
    confidenceScore: 76,
    riskScore: 49,
    priceAtRecommendation: 210,
    entryLow: 198,
    entryHigh: 204,
    stopLoss: 189,
    targetPrice: 235,
    secondaryTargetPrice: 248,
  }],
};

describe("market chat evidence separation", () => {
  it("exposes only homepage-level weekly/monthly agent performance to Standard", () => {
    const periods = ["daily", "weekly", "monthly", "threeMonth", "sixMonth", "yearly"].map((key, index) => ({
      key,
      pnlUsd: index * 1_000,
      returnPercent: index / 10,
      isPartial: false,
    }));
    const agents = [{
      name: "OLGUN",
      riskProfile: "DENGELI",
      performanceBaseUsd: 1_000_000,
      lastRunAt: new Date("2026-07-18T04:15:00.000Z"),
      periods,
    }];

    expect(selectMarketChatAgentPerformance(agents, "STANDARD")[0].periods.map((period) => period.key))
      .toEqual(["weekly", "monthly"]);
    expect(selectMarketChatAgentPerformance(agents, "VIP")[0].periods.map((period) => period.key))
      .toEqual(periods.map((period) => period.key));
  });

  it("keeps private VIP research out of Standard context", () => {
    const context = buildContextFromMarketItems("AAPL nasıl?", items, latestReport, undefined, undefined, "STANDARD");
    const text = buildMarketChatContextText(context, "tr");

    expect(text).toContain("Public site report assets");
    expect(text).not.toContain("VIP_RESEARCH_CONTEXT");
    expect(text).not.toContain("Q4 ürün döngüsü");
  });

  it("adds the private research block only when an active VIP context is supplied", () => {
    const context = buildContextFromMarketItems("AAPL nasıl?", items, latestReport, undefined, vipResearch, "VIP");
    const text = buildMarketChatContextText(context, "tr");

    expect(text).toContain("<VIP_RESEARCH_CONTEXT>");
    expect(text).toContain("Q4 ürün döngüsü");
    expect(text).toContain("stop=189");
  });

  it("returns an explicit evidence-gap verdict instead of inventing a Standard scorecard", () => {
    const context = buildContextFromMarketItems("AAPL hissesi nasıl?", items, latestReport, undefined, undefined, "STANDARD");
    const answer = buildLocalMarketChatAnswer("AAPL hissesi nasıl?", context, "tr");

    expect(answer).toContain("İZLE / KANIT YETERSİZ");
    expect(answer).toContain("giriş-stop-hedef seviyeleri üretmiyorum");
    expect(answer).toContain("gecikmeli");
    expect(answer).not.toContain("210.25 USD");
  });
});
