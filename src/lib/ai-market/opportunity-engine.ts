import type { MarketAnalysis } from "@/lib/ai-market/types";

export type OpportunityActionLabel =
  | "Güçlü Al"
  | "Güçlü Sat"
  | "Yükseliş İhtimali Yüksek"
  | "Düşüş Eğiliminde"
  | "Alış İçin Takip Et"
  | "Satış İçin Takip Et"
  | "Kâr Al"
  | "Bekle"
  | "Riskli / Uzak Dur";

export type TopOpportunity = {
  rank: number;
  symbol: string;
  name: string;
  actionLabel: OpportunityActionLabel;
  recommendationScore: number;
  riskScore: number;
  interval: string;
  rationale: string;
  lastPrice: number | null;
  updatedAt: string;
  direction: "up" | "down" | "neutral" | "avoid";
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isPositiveTrend(analysis: MarketAnalysis) {
  const { lastPrice, indicators } = analysis;

  return (
    lastPrice !== null &&
    indicators.ema20 !== null &&
    indicators.ema50 !== null &&
    lastPrice > indicators.ema20 &&
    indicators.ema20 >= indicators.ema50
  );
}

function isNegativeTrend(analysis: MarketAnalysis) {
  const { lastPrice, indicators } = analysis;

  return (
    lastPrice !== null &&
    indicators.ema20 !== null &&
    indicators.ema50 !== null &&
    lastPrice < indicators.ema20 &&
    indicators.ema20 <= indicators.ema50
  );
}

function getAtrPercent(analysis: MarketAnalysis) {
  if (analysis.lastPrice === null || analysis.lastPrice <= 0 || analysis.indicators.atr === null) {
    return null;
  }

  return (analysis.indicators.atr / analysis.lastPrice) * 100;
}

function scoreAnalysis(analysis: MarketAnalysis) {
  const positiveTrend = isPositiveTrend(analysis);
  const negativeTrend = isNegativeTrend(analysis);
  const macdHistogram = analysis.indicators.macd.histogram;
  const rsi = analysis.indicators.rsi;
  const atrPercent = getAtrPercent(analysis);
  const volumeRatio = analysis.indicators.volumeAnomaly.ratio;
  const bollinger = analysis.indicators.bollinger;
  const reasons: string[] = [];

  let bullishScore = analysis.signal.confidence;
  let bearishScore = analysis.signal.confidence;

  if (positiveTrend) {
    bullishScore += 16;
    bearishScore -= 12;
    reasons.push("EMA yapısı pozitif trendi destekliyor");
  }

  if (negativeTrend) {
    bearishScore += 16;
    bullishScore -= 12;
    reasons.push("EMA yapısı aşağı yönlü momentumu gösteriyor");
  }

  if (macdHistogram !== null) {
    if (macdHistogram > 0) {
      bullishScore += 14;
      bearishScore -= 10;
      reasons.push("MACD histogramı pozitif");
    } else if (macdHistogram < 0) {
      bearishScore += 14;
      bullishScore -= 10;
      reasons.push("MACD histogramı zayıf");
    }
  }

  if (rsi !== null) {
    if (rsi >= 45 && rsi <= 64) {
      bullishScore += 8;
      reasons.push("RSI aşırı şişmeden momentum alanında");
    } else if (rsi > 72) {
      bearishScore += 10;
      bullishScore -= 12;
      reasons.push("RSI aşırı alım riskine yakın");
    } else if (rsi < 30) {
      bullishScore += 6;
      bearishScore -= 6;
      reasons.push("RSI tepki bölgesine yakın");
    }
  }

  if (analysis.indicators.volumeAnomaly.isAnomaly) {
    if (macdHistogram !== null && macdHistogram > 0) {
      bullishScore += 8;
      reasons.push("hacim desteği pozitif momentumu güçlendiriyor");
    } else {
      bearishScore += 6;
      reasons.push("hacim anomalisi karar riskini artırıyor");
    }
  } else if (volumeRatio !== null && volumeRatio >= 1.15 && macdHistogram !== null && macdHistogram > 0) {
    bullishScore += 4;
    reasons.push("hacim ortalamanın üzerinde");
  }

  if (analysis.lastPrice !== null && bollinger.upper !== null && bollinger.lower !== null) {
    if (analysis.lastPrice >= bollinger.upper) {
      bearishScore += 6;
      bullishScore -= 8;
      reasons.push("fiyat Bollinger üst bandına yakın");
    } else if (analysis.lastPrice <= bollinger.lower) {
      bullishScore += 4;
      reasons.push("fiyat Bollinger alt bandında tepki arıyor");
    }
  }

  if (analysis.risk.score >= 70) {
    bullishScore -= 28;
    bearishScore -= 16;
    reasons.push("risk skoru yüksek");
  } else if (analysis.risk.score >= 45) {
    bullishScore -= 10;
    bearishScore -= 6;
  } else {
    bullishScore += 6;
    bearishScore += 4;
    reasons.push("risk skoru makul");
  }

  if (atrPercent !== null && atrPercent > 5) {
    bullishScore -= 14;
    bearishScore -= 10;
    reasons.push("ATR oynaklığı yüksek");
  }

  if (analysis.dataStatus !== "live") {
    bullishScore -= 24;
    bearishScore -= 20;
    reasons.push("veri kalitesi zayıf");
  }

  const avoidScore = clampScore(analysis.risk.score + (analysis.dataStatus !== "live" ? 20 : 0) + (atrPercent !== null && atrPercent > 5 ? 12 : 0));

  return {
    bullishScore: clampScore(bullishScore),
    bearishScore: clampScore(bearishScore),
    avoidScore,
    reasons,
  };
}

function getActionLabel(analysis: MarketAnalysis, bullishScore: number, bearishScore: number, avoidScore: number): OpportunityActionLabel {
  if (avoidScore >= 82 || analysis.signal.signal === "AVOID") {
    return "Riskli / Uzak Dur";
  }

  if (analysis.signal.signal === "TAKE_PROFIT") {
    return "Kâr Al";
  }

  if (bullishScore >= 80 && bullishScore >= bearishScore + 8) {
    return "Güçlü Al";
  }

  if (bearishScore >= 80 && bearishScore >= bullishScore + 8) {
    return "Güçlü Sat";
  }

  if (bullishScore >= 70 && bullishScore >= bearishScore) {
    return "Yükseliş İhtimali Yüksek";
  }

  if (bearishScore >= 70 && bearishScore > bullishScore) {
    return "Düşüş Eğiliminde";
  }

  if (bullishScore >= 60 && bullishScore >= bearishScore) {
    return "Alış İçin Takip Et";
  }

  if (bearishScore >= 60 && bearishScore > bullishScore) {
    return "Satış İçin Takip Et";
  }

  return "Bekle";
}

function getDirection(actionLabel: OpportunityActionLabel): TopOpportunity["direction"] {
  if (actionLabel === "Güçlü Al" || actionLabel === "Yükseliş İhtimali Yüksek" || actionLabel === "Alış İçin Takip Et") {
    return "up";
  }

  if (actionLabel === "Güçlü Sat" || actionLabel === "Düşüş Eğiliminde" || actionLabel === "Satış İçin Takip Et" || actionLabel === "Kâr Al") {
    return "down";
  }

  if (actionLabel === "Riskli / Uzak Dur") {
    return "avoid";
  }

  return "neutral";
}

function buildRationale(analysis: MarketAnalysis, reasons: string[]) {
  const uniqueReasons = Array.from(new Set(reasons.filter(Boolean))).slice(0, 3);

  if (uniqueReasons.length > 0) {
    return uniqueReasons.join("; ") + ".";
  }

  return analysis.signal.reasons[0] ?? "Teknik veriler net bir öncelikli fırsat üretmiyor.";
}

export function getTopOpportunities(analyses: MarketAnalysis[], limit = 5): TopOpportunity[] {
  return analyses
    .map((analysis) => {
      const score = scoreAnalysis(analysis);
      const actionLabel = getActionLabel(analysis, score.bullishScore, score.bearishScore, score.avoidScore);
      const recommendationScore =
        actionLabel === "Riskli / Uzak Dur" ? Math.max(score.avoidScore, analysis.risk.score) : Math.max(score.bullishScore, score.bearishScore);

      return {
        rank: 0,
        symbol: analysis.symbol,
        name: analysis.name,
        actionLabel,
        recommendationScore: clampScore(recommendationScore),
        riskScore: analysis.risk.score,
        interval: analysis.interval,
        rationale: buildRationale(analysis, score.reasons),
        lastPrice: analysis.lastPrice,
        updatedAt: analysis.updatedAt,
        direction: getDirection(actionLabel),
      };
    })
    .filter((opportunity) => opportunity.recommendationScore >= 60 || opportunity.actionLabel === "Riskli / Uzak Dur")
    .sort((left, right) => {
      const leftPriority = left.actionLabel === "Riskli / Uzak Dur" ? left.recommendationScore - 25 : left.recommendationScore;
      const rightPriority = right.actionLabel === "Riskli / Uzak Dur" ? right.recommendationScore - 25 : right.recommendationScore;

      return rightPriority - leftPriority || left.riskScore - right.riskScore;
    })
    .slice(0, limit)
    .map((opportunity, index) => ({ ...opportunity, rank: index + 1 }));
}
