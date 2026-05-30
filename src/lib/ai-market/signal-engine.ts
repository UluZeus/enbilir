import type { Candle, IndicatorSnapshot, SignalAssessment, SignalType } from "@/lib/ai-market/types";

function latestClose(candles: Candle[]) {
  return candles.length > 0 ? candles[candles.length - 1].close : null;
}

function decideSignal(score: number, riskPenalty: number): SignalType {
  const adjusted = score - riskPenalty;

  if (adjusted >= 6) {
    return "STRONG_BUY";
  }

  if (adjusted >= 3) {
    return "BUY";
  }

  if (adjusted >= 1) {
    return "WATCH";
  }

  if (adjusted <= -5) {
    return "SELL";
  }

  if (adjusted <= -3) {
    return "AVOID";
  }

  if (score >= 4 && riskPenalty >= 3) {
    return "TAKE_PROFIT";
  }

  if (Math.abs(adjusted) < 1) {
    return "HOLD";
  }

  return "NO_TRADE";
}

export function analyzeSignal(candles: Candle[], indicators: IndicatorSnapshot): SignalAssessment {
  const close = latestClose(candles);
  let score = 0;
  let riskPenalty = 0;
  const reasons: string[] = [];

  if (close === null || candles.length < 50) {
    return {
      signal: "NO_TRADE",
      confidence: 20,
      reasons: ["Analiz icin yeterli mum verisi yok."],
    };
  }

  if (indicators.rsi !== null) {
    if (indicators.rsi < 30) {
      score += 2;
      reasons.push("RSI asiri satim bolgesine yakin.");
    } else if (indicators.rsi > 72) {
      score -= 2;
      riskPenalty += 1;
      reasons.push("RSI asiri alim riskini isaret ediyor.");
    } else if (indicators.rsi >= 45 && indicators.rsi <= 62) {
      score += 1;
      reasons.push("RSI dengeli momentum araliginda.");
    }
  }

  if (indicators.macd.histogram !== null) {
    if (indicators.macd.histogram > 0) {
      score += 2;
      reasons.push("MACD histogrami pozitif momentum gosteriyor.");
    } else {
      score -= 2;
      reasons.push("MACD histogrami zayif momentum gosteriyor.");
    }
  }

  if (indicators.ema20 !== null && indicators.ema50 !== null) {
    if (indicators.ema20 > indicators.ema50 && close > indicators.ema20) {
      score += 2;
      reasons.push("Fiyat EMA 20 ve EMA 50 uzerinde.");
    } else if (indicators.ema20 < indicators.ema50 && close < indicators.ema50) {
      score -= 2;
      reasons.push("Kisa vadeli EMA yapisi zayif.");
    }
  }

  if (indicators.ema200 !== null) {
    if (close > indicators.ema200) {
      score += 1;
      reasons.push("Fiyat EMA 200 uzerinde kalmaya calisiyor.");
    } else {
      score -= 1;
      reasons.push("Fiyat EMA 200 altinda.");
    }
  }

  if (indicators.bollinger.upper !== null && indicators.bollinger.lower !== null) {
    if (close >= indicators.bollinger.upper) {
      riskPenalty += 2;
      reasons.push("Fiyat Bollinger ust bandina yakin.");
    } else if (close <= indicators.bollinger.lower) {
      score += 1;
      riskPenalty += 1;
      reasons.push("Fiyat Bollinger alt bandina yakin; tepki ihtimali izlenebilir.");
    }
  }

  if (indicators.volumeAnomaly.isAnomaly) {
    score += indicators.macd.histogram !== null && indicators.macd.histogram > 0 ? 1 : -1;
    riskPenalty += 1;
    reasons.push("Hacim ortalamanin belirgin uzerinde.");
  }

  const signal = decideSignal(score, riskPenalty);
  const confidence = Math.max(20, Math.min(88, 45 + Math.abs(score) * 7 - riskPenalty * 5));

  return {
    signal,
    confidence,
    reasons: reasons.slice(0, 5),
  };
}
