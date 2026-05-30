import type { Candle, IndicatorSnapshot, RiskAssessment } from "@/lib/ai-market/types";

function latestClose(candles: Candle[]) {
  return candles.length > 0 ? candles[candles.length - 1].close : null;
}

export function assessRisk(candles: Candle[], indicators: IndicatorSnapshot): RiskAssessment {
  const close = latestClose(candles);
  let score = 35;
  const reasons: string[] = [];

  if (close === null || candles.length < 50) {
    return {
      score: 80,
      level: "YUKSEK",
      reasons: ["Veri derinligi sinirli oldugu icin risk yuksek kabul edildi."],
    };
  }

  if (indicators.rsi !== null && (indicators.rsi > 72 || indicators.rsi < 28)) {
    score += 15;
    reasons.push("RSI uc bolgeye yakin.");
  }

  if (indicators.atr !== null && close > 0) {
    const atrPercent = (indicators.atr / close) * 100;

    if (atrPercent > 5) {
      score += 25;
      reasons.push("ATR yuksek oynakliga isaret ediyor.");
    } else if (atrPercent > 2.5) {
      score += 12;
      reasons.push("ATR orta seviye oynaklik gosteriyor.");
    } else {
      score -= 8;
      reasons.push("ATR gorece kontrollu oynaklik gosteriyor.");
    }
  }

  if (indicators.bollinger.bandwidth !== null) {
    if (indicators.bollinger.bandwidth > 12) {
      score += 12;
      reasons.push("Bollinger bant genisligi artmis.");
    } else if (indicators.bollinger.bandwidth < 4) {
      score += 6;
      reasons.push("Dar bant sonrasi sert hareket riski var.");
    }
  }

  if (indicators.volumeAnomaly.isAnomaly) {
    score += 10;
    reasons.push("Hacim anomalisi karar riskini artiriyor.");
  }

  if (indicators.ema200 !== null && close < indicators.ema200) {
    score += 10;
    reasons.push("Fiyat uzun vadeli ortalamanin altinda.");
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const level = boundedScore >= 70 ? "YUKSEK" : boundedScore >= 45 ? "ORTA" : "DUSUK";

  return {
    score: boundedScore,
    level,
    reasons: reasons.slice(0, 5),
  };
}
