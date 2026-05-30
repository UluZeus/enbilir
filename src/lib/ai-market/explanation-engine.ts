import type { MarketAnalysis, SignalType } from "@/lib/ai-market/types";

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

export function buildExplanation(analysis: Omit<MarketAnalysis, "explanation" | "disclaimer">) {
  const signal = signalLabels[analysis.signal.signal];
  const priceText = analysis.lastPrice !== null ? `${analysis.lastPrice.toLocaleString("tr-TR")} USDT` : "fiyat verisi yok";
  const changeText =
    analysis.changePercent !== null ? `${analysis.changePercent >= 0 ? "+" : ""}${analysis.changePercent.toFixed(2)}%` : "degisim yok";
  const mainReason = analysis.signal.reasons[0] ?? "Teknik veriler net bir yon gostermiyor.";
  const riskReason = analysis.risk.reasons[0] ?? "Risk normal aralikta izleniyor.";

  return `${analysis.name} icin son fiyat ${priceText}, periyot degisimi ${changeText}. Model ${signal} uretirken ana gerekce olarak "${mainReason}" notunu one cikariyor. Risk seviyesi ${analysis.risk.level.toLowerCase()} (${analysis.risk.score}/100); ${riskReason} Bu sonuc kesin alim-satim onerisi olarak yorumlanmamalidir.`;
}
