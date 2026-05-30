import type { MarketAnalysis } from "@/lib/ai-market/types";

export type SignalAlertType =
  | "STRONG_BUY"
  | "STRONG_SELL"
  | "BULLISH_MOMENTUM"
  | "BEARISH_MOMENTUM"
  | "BUY_WATCH"
  | "SELL_WATCH";

export type SignalAlert = {
  key: string;
  symbol: string;
  name: string;
  exchange: string;
  interval: string;
  alertType: SignalAlertType;
  label: string;
  recommendationScore: number;
  confidence: number;
  riskScore: number;
  lastPrice: number | null;
  rationale: string;
  message: string;
  updatedAt: string;
  soundLevel: "strong-buy" | "strong-sell" | "bullish" | "bearish" | "watch" | "silent";
  priority: number;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getTrend(analysis: MarketAnalysis) {
  const { lastPrice, indicators } = analysis;

  if (lastPrice === null || indicators.ema20 === null || indicators.ema50 === null) {
    return "neutral";
  }

  if (lastPrice > indicators.ema20 && indicators.ema20 >= indicators.ema50) {
    return "up";
  }

  if (lastPrice < indicators.ema20 && indicators.ema20 <= indicators.ema50) {
    return "down";
  }

  return "neutral";
}

function getAtrPercent(analysis: MarketAnalysis) {
  if (analysis.lastPrice === null || analysis.lastPrice <= 0 || analysis.indicators.atr === null) {
    return null;
  }

  return (analysis.indicators.atr / analysis.lastPrice) * 100;
}

function scoreAlert(analysis: MarketAnalysis) {
  const trend = getTrend(analysis);
  const macdHistogram = analysis.indicators.macd.histogram;
  const rsi = analysis.indicators.rsi;
  const atrPercent = getAtrPercent(analysis);
  const reasons: string[] = [];
  let bullishScore = analysis.signal.confidence;
  let bearishScore = analysis.signal.confidence;

  if (trend === "up") {
    bullishScore += 16;
    bearishScore -= 10;
    reasons.push("EMA yapısı yukarı momentumu destekliyor");
  }

  if (trend === "down") {
    bearishScore += 16;
    bullishScore -= 10;
    reasons.push("EMA yapısı satış baskısını güçlendiriyor");
  }

  if (macdHistogram !== null) {
    if (macdHistogram > 0) {
      bullishScore += 14;
      bearishScore -= 8;
      reasons.push("MACD histogramı pozitif bölgede");
    } else if (macdHistogram < 0) {
      bearishScore += 14;
      bullishScore -= 8;
      reasons.push("MACD histogramı negatif bölgede");
    }
  }

  if (rsi !== null) {
    if (rsi >= 45 && rsi <= 66) {
      bullishScore += 7;
      reasons.push("RSI aşırı şişmeden momentum alanında");
    } else if (rsi > 72) {
      bearishScore += 8;
      bullishScore -= 10;
      reasons.push("RSI aşırı alım riskine yakın");
    } else if (rsi < 30) {
      bullishScore += 5;
      reasons.push("RSI tepki bölgesine yakın");
    }
  }

  if (analysis.indicators.volumeAnomaly.isAnomaly) {
    if (macdHistogram !== null && macdHistogram > 0) {
      bullishScore += 7;
      reasons.push("hacim artışı yukarı hareketi destekliyor");
    } else {
      bearishScore += 6;
      reasons.push("hacim anomalisi satış baskısını artırıyor");
    }
  }

  if (analysis.lastPrice !== null && analysis.indicators.bollinger.upper !== null && analysis.indicators.bollinger.lower !== null) {
    if (analysis.lastPrice >= analysis.indicators.bollinger.upper) {
      bearishScore += 6;
      bullishScore -= 8;
      reasons.push("fiyat Bollinger üst bandına yakın");
    } else if (analysis.lastPrice <= analysis.indicators.bollinger.lower) {
      bullishScore += 4;
      reasons.push("fiyat Bollinger alt bandında tepki arıyor");
    }
  }

  if (analysis.risk.score >= 75) {
    bullishScore -= 24;
    bearishScore -= 16;
    reasons.push("risk skoru yüksek");
  } else if (analysis.risk.score >= 55) {
    bullishScore -= 8;
    bearishScore -= 6;
  } else {
    bullishScore += 5;
    bearishScore += 4;
    reasons.push("risk skoru kontrol edilebilir bölgede");
  }

  if (atrPercent !== null && atrPercent > 5) {
    bullishScore -= 12;
    bearishScore -= 10;
    reasons.push("ATR oynaklığı yüksek");
  }

  return {
    bullishScore: clampScore(bullishScore),
    bearishScore: clampScore(bearishScore),
    reasons,
  };
}

function pickAlertType(analysis: MarketAnalysis, bullishScore: number, bearishScore: number): SignalAlertType | null {
  if (analysis.dataStatus !== "live" || analysis.lastPrice === null) {
    return null;
  }

  if (analysis.risk.score >= 82) {
    return null;
  }

  if (bullishScore >= 84 && bullishScore >= bearishScore + 8 && analysis.risk.score <= 58) {
    return "STRONG_BUY";
  }

  if (bearishScore >= 84 && bearishScore >= bullishScore + 8 && analysis.risk.score <= 64) {
    return "STRONG_SELL";
  }

  if (bullishScore >= 78 && bullishScore >= bearishScore + 6 && analysis.risk.score <= 68) {
    return "BULLISH_MOMENTUM";
  }

  if (bearishScore >= 78 && bearishScore >= bullishScore + 6 && analysis.risk.score <= 70) {
    return "BEARISH_MOMENTUM";
  }

  if (bullishScore >= 70 && bullishScore >= bearishScore && analysis.risk.score <= 74) {
    return "BUY_WATCH";
  }

  if (bearishScore >= 70 && bearishScore > bullishScore && analysis.risk.score <= 76) {
    return "SELL_WATCH";
  }

  return null;
}

function getAlertLabel(alertType: SignalAlertType) {
  const labels: Record<SignalAlertType, string> = {
    STRONG_BUY: "Güçlü Al Sinyali",
    STRONG_SELL: "Güçlü Sat Sinyali",
    BULLISH_MOMENTUM: "Yükseliş Eğilimi Güçlü",
    BEARISH_MOMENTUM: "Düşüş Eğilimi Güçlü",
    BUY_WATCH: "Alış İçin Yakın Takip",
    SELL_WATCH: "Satış İçin Yakın Takip",
  };

  return labels[alertType];
}

function getSoundLevel(alertType: SignalAlertType): SignalAlert["soundLevel"] {
  const levels: Record<SignalAlertType, SignalAlert["soundLevel"]> = {
    STRONG_BUY: "strong-buy",
    STRONG_SELL: "strong-sell",
    BULLISH_MOMENTUM: "bullish",
    BEARISH_MOMENTUM: "bearish",
    BUY_WATCH: "watch",
    SELL_WATCH: "watch",
  };

  return levels[alertType];
}

function getPriority(alertType: SignalAlertType, recommendationScore: number, riskScore: number) {
  const basePriority: Record<SignalAlertType, number> = {
    STRONG_BUY: 600,
    STRONG_SELL: 590,
    BULLISH_MOMENTUM: 480,
    BEARISH_MOMENTUM: 470,
    BUY_WATCH: 340,
    SELL_WATCH: 330,
  };

  return basePriority[alertType] + recommendationScore - Math.round(riskScore / 3);
}

function buildRationale(analysis: MarketAnalysis, reasons: string[]) {
  const uniqueReasons = Array.from(new Set(reasons.filter(Boolean))).slice(0, 2);

  if (uniqueReasons.length > 0) {
    return uniqueReasons.join("; ") + ".";
  }

  return analysis.signal.reasons[0] ?? "Teknik göstergelerde belirgin hareket izleniyor.";
}

function buildMessage(analysis: MarketAnalysis, alertType: SignalAlertType, recommendationScore: number) {
  const label = getAlertLabel(alertType).toLocaleLowerCase("tr-TR");

  if (alertType === "STRONG_BUY") {
    return `${analysis.symbol} için ${analysis.interval} periyotta güçlü yukarı momentum tespit edildi. Güven skoru %${recommendationScore}, risk skoru %${analysis.risk.score}.`;
  }

  if (alertType === "STRONG_SELL") {
    return `${analysis.symbol} için ${analysis.interval} periyotta satış baskısı güçleniyor. Güven skoru %${recommendationScore}, risk skoru %${analysis.risk.score}.`;
  }

  return `${analysis.symbol} için ${analysis.interval} periyotta ${label} var. Güven skoru %${recommendationScore}, risk skoru %${analysis.risk.score}.`;
}

export function buildAlertKey(symbol: string, interval: string, alertType: SignalAlertType) {
  return `${symbol}:${interval}:${alertType}`;
}

export function getImportantSignalAlerts(analyses: MarketAnalysis[], limit = 3): SignalAlert[] {
  return analyses
    .map((analysis): SignalAlert | null => {
      const score = scoreAlert(analysis);
      const alertType = pickAlertType(analysis, score.bullishScore, score.bearishScore);

      if (!alertType) {
        return null;
      }

      const isBullish = alertType === "STRONG_BUY" || alertType === "BULLISH_MOMENTUM" || alertType === "BUY_WATCH";
      const recommendationScore = isBullish ? score.bullishScore : score.bearishScore;

      return {
        key: buildAlertKey(analysis.symbol, analysis.interval, alertType),
        symbol: analysis.symbol,
        name: analysis.name,
        exchange: analysis.exchange,
        interval: analysis.interval,
        alertType,
        label: getAlertLabel(alertType),
        recommendationScore,
        confidence: analysis.signal.confidence,
        riskScore: analysis.risk.score,
        lastPrice: analysis.lastPrice,
        rationale: buildRationale(analysis, score.reasons),
        message: buildMessage(analysis, alertType, recommendationScore),
        updatedAt: analysis.updatedAt,
        soundLevel: getSoundLevel(alertType),
        priority: getPriority(alertType, recommendationScore, analysis.risk.score),
      };
    })
    .filter((alert): alert is SignalAlert => alert !== null)
    .sort((left, right) => right.priority - left.priority)
    .slice(0, limit);
}
