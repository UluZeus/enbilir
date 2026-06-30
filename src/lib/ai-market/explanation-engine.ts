import type { MarketAnalysis, SignalType } from "@/lib/ai-market/types";
import { AI_MARKET_DISCLAIMER_EN, getRiskLabel, getSignalExplanationLabel, localizeAiMarketText } from "@/lib/ai-market/localization";

const signalLabels: Record<SignalType, string> = {
  STRONG_BUY: "guclu izleme/al sinyali",
  BUY: "pozitif izleme sinyali",
  WATCH: "yakindan izleme sinyali",
  HOLD: "koruma/bekleme sinyali",
  TAKE_PROFIT: "kar realizasyonu izlemesi",
  SELL: "negatif sinyal",
  AVOID: "uzak durma sinyali",
  NO_TRADE: "islem yok sinyali",
};

export const AI_MARKET_DISCLAIMER =
  "Bu ekran yatirim tavsiyesi degildir; yalnizca public piyasa verileriyle uretilen teknik analiz ozetidir.";

export function getAiMarketDisclaimer(locale: "tr" | "en") {
  return locale === "en" ? AI_MARKET_DISCLAIMER_EN : AI_MARKET_DISCLAIMER;
}

export function buildExplanation(analysis: Omit<MarketAnalysis, "explanation" | "disclaimer">, locale: "tr" | "en" = "tr") {
  const signal = getSignalExplanationLabel(signalLabels[analysis.signal.signal], locale);
  const priceText = analysis.lastPrice !== null
    ? `${analysis.lastPrice.toLocaleString(locale === "en" ? "en-US" : "tr-TR")} USDT`
    : locale === "en" ? "no price data" : "fiyat verisi yok";
  const changeText =
    analysis.changePercent !== null ? `${analysis.changePercent >= 0 ? "+" : ""}${analysis.changePercent.toFixed(2)}%` : locale === "en" ? "no change data" : "degisim yok";
  const mainReason = localizeAiMarketText(analysis.signal.reasons[0] ?? "Teknik veriler net bir yon gostermiyor.", locale);
  const riskReason = localizeAiMarketText(analysis.risk.reasons[0] ?? "Risk normal aralikta izleniyor.", locale);

  if (locale === "en") {
    return `${analysis.name} last price is ${priceText}, with an interval change of ${changeText}. The model produced ${signal} and highlights "${mainReason}" as the main reason. Risk level is ${getRiskLabel(analysis.risk.level, locale)} (${analysis.risk.score}/100); ${riskReason} This result should not be interpreted as a direct buy-sell recommendation.`;
  }

  return `${analysis.name} icin son fiyat ${priceText}, periyot degisimi ${changeText}. Model ${signal} uretirken ana gerekce olarak "${mainReason}" notunu one cikariyor. Risk seviyesi ${analysis.risk.level.toLowerCase()} (${analysis.risk.score}/100); ${riskReason} Bu sonuc kesin alim-satim onerisi olarak yorumlanmamalidir.`;
}
