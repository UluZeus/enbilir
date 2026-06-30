import type { Locale } from "@/i18n/config";
import type { RiskAssessment } from "@/lib/ai-market/types";

type RiskLevel = RiskAssessment["level"];

const phraseMap: Record<string, string> = {
  "Analiz icin yeterli mum verisi yok.": "There is not enough candle data for a reliable analysis.",
  "RSI asiri satim bolgesine yakin.": "RSI is close to the oversold zone.",
  "RSI asiri alim riskini isaret ediyor.": "RSI points to overbought risk.",
  "RSI dengeli momentum araliginda.": "RSI is in a balanced momentum range.",
  "MACD histogrami pozitif momentum gosteriyor.": "The MACD histogram shows positive momentum.",
  "MACD histogrami zayif momentum gosteriyor.": "The MACD histogram shows weak momentum.",
  "Fiyat EMA 20 ve EMA 50 uzerinde.": "Price is above EMA 20 and EMA 50.",
  "Kisa vadeli EMA yapisi zayif.": "The short-term EMA structure is weak.",
  "Fiyat EMA 200 uzerinde kalmaya calisiyor.": "Price is trying to stay above EMA 200.",
  "Fiyat EMA 200 altinda.": "Price is below EMA 200.",
  "Fiyat Bollinger ust bandina yakin.": "Price is close to the upper Bollinger band.",
  "Fiyat Bollinger alt bandina yakin; tepki ihtimali izlenebilir.": "Price is close to the lower Bollinger band; a reaction area can be monitored.",
  "Hacim ortalamanin belirgin uzerinde.": "Volume is clearly above its average.",
  "Veri derinligi sinirli oldugu icin risk yuksek kabul edildi.": "Risk is treated as high because data depth is limited.",
  "RSI uc bolgeye yakin.": "RSI is close to an extreme zone.",
  "ATR yuksek oynakliga isaret ediyor.": "ATR points to high volatility.",
  "ATR orta seviye oynaklik gosteriyor.": "ATR shows medium-level volatility.",
  "ATR gorece kontrollu oynaklik gosteriyor.": "ATR shows relatively controlled volatility.",
  "Bollinger bant genisligi artmis.": "Bollinger bandwidth has expanded.",
  "Dar bant sonrasi sert hareket riski var.": "There is a sharp-move risk after a narrow band.",
  "Hacim anomalisi karar riskini artiriyor.": "The volume anomaly increases decision risk.",
  "Fiyat uzun vadeli ortalamanin altinda.": "Price is below the long-term average.",
  "Teknik veriler net bir yon gostermiyor.": "Technical data does not point to a clear direction.",
  "Risk normal aralikta izleniyor.": "Risk is being monitored within a normal range.",
};

const recommendationMap: Record<string, string> = {
  "Yükseliş fırsatı": "Upside opportunity",
  "Düşüş fırsatı": "Downside opportunity",
  "Nötr": "Neutral",
  "Guclu al izlemesi": "Strong buy watch",
  "Al izlemesi": "Buy watch",
  "Satış baskısı": "Selling pressure",
  "Islem yok": "No trade",
};

const riskLabels: Record<RiskLevel, string> = {
  DUSUK: "low",
  ORTA: "medium",
  YUKSEK: "high",
};

const signalLabels: Record<string, string> = {
  "guclu izleme/al sinyali": "a strong buy/watch signal",
  "pozitif izleme sinyali": "a positive watch signal",
  "yakindan izleme sinyali": "a close-watch signal",
  "koruma/bekleme sinyali": "a protection/wait signal",
  "kar realizasyonu izlemesi": "a take-profit watch signal",
  "negatif sinyal": "a negative signal",
  "uzak durma sinyali": "an avoid signal",
  "islem yok sinyali": "a no-trade signal",
};

export const AI_MARKET_DISCLAIMER_EN =
  "This screen is not investment advice; it is an educational technical-analysis summary generated from public market data.";

export function localizeAiMarketText(value: string, locale: Locale | string) {
  if (locale !== "en") {
    return value;
  }

  return phraseMap[value] ?? recommendationMap[value] ?? value;
}

export function localizeAiRecommendation(value: string | null, locale: Locale | string) {
  if (!value) {
    return null;
  }

  return localizeAiMarketText(value, locale);
}

export function getRiskLabel(level: RiskLevel, locale: Locale | string) {
  return locale === "en" ? riskLabels[level] : level.toLowerCase();
}

export function getSignalExplanationLabel(label: string, locale: Locale | string) {
  if (locale !== "en") {
    return label;
  }

  return signalLabels[label] ?? label;
}
