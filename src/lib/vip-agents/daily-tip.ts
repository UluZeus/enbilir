import type { VipAgentStrategy } from "@/lib/vip-agents/config";

export type VipAgentDailyTipAction = "BUY" | "SELL" | "HOLD" | "WATCH" | "AVOID" | "WAIT";

export type VipAgentTipDecision = {
  symbol: string;
  action: string;
  priceUsd: number | null;
  reason: string;
  sourceIdeaId: string | null;
};

export type VipAgentTipIdea = {
  id: string;
  symbol: string;
  displayName: string;
  currency: string;
  rank: number;
  stance: string;
  thesisSummary: string;
  confidenceScore: number;
  riskScore: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  targetPrice: number;
};

export type VipAgentTipPosition = {
  symbol: string;
  stopLossUsd: number;
  targetPriceUsd: number;
};

export type VipAgentDailyTip = {
  agentSlug: VipAgentStrategy["slug"];
  agentName: VipAgentStrategy["name"];
  riskProfile: VipAgentStrategy["riskProfile"];
  action: VipAgentDailyTipAction;
  actionLabelTr: string;
  actionLabelEn: string;
  symbol: string | null;
  displayName: string | null;
  currency: string;
  referencePrice: number | null;
  entryLow: number | null;
  entryHigh: number | null;
  stopLoss: number | null;
  targetPrice: number | null;
  confidenceScore: number | null;
  riskScore: number | null;
  sourceIdeaId: string | null;
  source: "DECISION" | "IDEA" | "FALLBACK";
  rationaleTr: string;
  rationaleEn: string;
  opinionTr: string;
  opinionEn: string;
  disclosureTr: string;
  disclosureEn: string;
  statementTr: string;
  statementEn: string;
};

type BuildVipAgentDailyTipInput = {
  strategy: VipAgentStrategy;
  decisions: VipAgentTipDecision[];
  ideas: VipAgentTipIdea[];
  positions: VipAgentTipPosition[];
};

const DISCLOSURE_TR = "Bu benim kararımdır ve yatırım tavsiyesi değildir.";
const DISCLOSURE_EN = "This is my decision and is not investment advice.";

const ACTION_LABELS: Record<VipAgentDailyTipAction, { tr: string; en: string }> = {
  BUY: { tr: "AL", en: "BUY" },
  SELL: { tr: "SAT", en: "SELL" },
  HOLD: { tr: "TUT", en: "HOLD" },
  WATCH: { tr: "İZLE", en: "WATCH" },
  AVOID: { tr: "UZAK DUR", en: "AVOID" },
  WAIT: { tr: "BEKLE", en: "WAIT" },
};

const DIRECT_ACTION_PRIORITY: Record<string, number> = {
  SELL: 0,
  BUY: 1,
  HOLD: 2,
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundPrice(value: number) {
  const precision = Math.abs(value) < 1 ? 4 : 2;
  return Number(value.toFixed(precision));
}

function formatPrice(value: number | null, currency: string, locale: "tr" | "en") {
  if (!finite(value)) return locale === "tr" ? "doğrulanmış seviye yok" : "no verified level";
  const maximumFractionDigits = Math.abs(value) < 1 ? 4 : 2;
  return `${value.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: Math.min(2, maximumFractionDigits),
    maximumFractionDigits,
  })} ${currency}`;
}

function formatRange(low: number | null, high: number | null, currency: string, locale: "tr" | "en") {
  if (!finite(low) || !finite(high)) return formatPrice(low ?? high, currency, locale);
  return `${formatPrice(low, currency, locale)}–${formatPrice(high, currency, locale)}`;
}

function profileLabel(strategy: VipAgentStrategy, locale: "tr" | "en") {
  if (locale === "en") {
    if (strategy.riskProfile === "MUHAFAZAKAR") return "conservative";
    if (strategy.riskProfile === "AGRESIF") return "aggressive";
    return "balanced";
  }
  if (strategy.riskProfile === "MUHAFAZAKAR") return "muhafazakâr";
  if (strategy.riskProfile === "AGRESIF") return "agresif";
  return "dengeli";
}

function adjustedEntryRange(strategy: VipAgentStrategy, idea: VipAgentTipIdea) {
  const tolerance = strategy.entryTolerancePercent / 100;
  return {
    low: roundPrice(idea.entryLow * (1 - tolerance)),
    high: roundPrice(idea.entryHigh * (1 + tolerance)),
  };
}

function ideaAsymmetry(idea: VipAgentTipIdea) {
  const entry = (idea.entryLow + idea.entryHigh) / 2;
  const downside = Math.max(0.0001, entry - idea.stopLoss);
  const upside = Math.max(0, idea.targetPrice - entry);
  return Math.min(10, upside / downside);
}

function candidateScore(strategy: VipAgentStrategy, idea: VipAgentTipIdea) {
  const rankBonus = Math.max(0, 12 - idea.rank);
  const asymmetry = ideaAsymmetry(idea);

  if (strategy.slug === "sabit") {
    return idea.confidenceScore * 3 - idea.riskScore * 4 + asymmetry * 8 + rankBonus * 5;
  }
  if (strategy.slug === "yildirim") {
    return idea.confidenceScore * 1.5 + idea.riskScore * 0.35 + asymmetry * 28 + rankBonus * 9;
  }
  return idea.confidenceScore * 2.5 - Math.abs(idea.riskScore - 42) * 1.2 + asymmetry * 18 + rankBonus * 7;
}

function isNegativeStance(stance: string) {
  return stance === "SAT" || stance === "UZAK_DUR";
}

function selectCandidate(
  strategy: VipAgentStrategy,
  decisions: VipAgentTipDecision[],
  ideas: VipAgentTipIdea[],
) {
  const ideasById = new Map(ideas.map((idea) => [idea.id, idea]));
  const referenced = decisions
    .map((decision) => decision.sourceIdeaId ? ideasById.get(decision.sourceIdeaId) : undefined)
    .filter((idea): idea is VipAgentTipIdea => Boolean(idea));
  const uniquePool = Array.from(
    new Map((referenced.length > 0 ? referenced : ideas).map((idea) => [idea.id, idea])).values(),
  );
  const eligible = uniquePool.filter((idea) =>
    idea.confidenceScore >= strategy.minimumConfidence
    && idea.riskScore <= strategy.maximumRisk,
  );
  const positiveEligible = eligible.filter((idea) => !isNegativeStance(idea.stance));
  const positive = uniquePool.filter((idea) => !isNegativeStance(idea.stance));
  const pool = positiveEligible.length > 0
    ? positiveEligible
    : eligible.length > 0
      ? eligible
      : positive.length > 0
        ? positive
        : uniquePool;

  return [...pool].sort((left, right) =>
    candidateScore(strategy, right) - candidateScore(strategy, left)
    || left.rank - right.rank
    || left.symbol.localeCompare(right.symbol),
  )[0];
}

function rationaleForIdea(strategy: VipAgentStrategy, idea: VipAgentTipIdea, locale: "tr" | "en") {
  if (locale === "en") {
    return `Confidence is ${idea.confidenceScore}/100 and risk is ${idea.riskScore}/100. My ${profileLabel(strategy, "en")} rules require at least ${strategy.minimumConfidence} confidence and no more than ${strategy.maximumRisk} risk. ${idea.thesisSummary}`;
  }
  return `Güven ${idea.confidenceScore}/100, risk ${idea.riskScore}/100. ${profileLabel(strategy, "tr")} profilimde en az ${strategy.minimumConfidence} güven ve en çok ${strategy.maximumRisk} risk aranır. ${idea.thesisSummary}`;
}

function buildBase(
  strategy: VipAgentStrategy,
  action: VipAgentDailyTipAction,
  details: Omit<VipAgentDailyTip, "agentSlug" | "agentName" | "riskProfile" | "action" | "actionLabelTr" | "actionLabelEn" | "disclosureTr" | "disclosureEn" | "statementTr" | "statementEn">,
): VipAgentDailyTip {
  const labels = ACTION_LABELS[action];
  return {
    agentSlug: strategy.slug,
    agentName: strategy.name,
    riskProfile: strategy.riskProfile,
    action,
    actionLabelTr: labels.tr,
    actionLabelEn: labels.en,
    ...details,
    disclosureTr: DISCLOSURE_TR,
    disclosureEn: DISCLOSURE_EN,
    statementTr: `${details.opinionTr} ${DISCLOSURE_TR}`,
    statementEn: `${details.opinionEn} ${DISCLOSURE_EN}`,
  };
}

function directDecisionTip(
  strategy: VipAgentStrategy,
  decision: VipAgentTipDecision,
  idea: VipAgentTipIdea | undefined,
  position: VipAgentTipPosition | undefined,
) {
  const action = decision.action as "BUY" | "SELL" | "HOLD";
  const currency = idea?.currency ?? "USD";
  const range = idea ? adjustedEntryRange(strategy, idea) : { low: null, high: null };
  const stopLoss = position?.stopLossUsd ?? idea?.stopLoss ?? null;
  const targetPrice = position?.targetPriceUsd ?? idea?.targetPrice ?? null;
  const symbol = decision.symbol;
  const reference = decision.priceUsd;
  let opinionTr: string;
  let opinionEn: string;

  if (action === "BUY") {
    opinionTr = `Bugün benim düşüncem ${symbol} varlığını ${formatPrice(reference ?? range.low, currency, "tr")} seviyesinden almak; ${formatPrice(stopLoss, currency, "tr")} altında çıkmak ve ${formatPrice(targetPrice, currency, "tr")} hedefini izlemektir.`;
    opinionEn = `My view today is to buy ${symbol} at ${formatPrice(reference ?? range.low, currency, "en")}, exit below ${formatPrice(stopLoss, currency, "en")}, and watch the ${formatPrice(targetPrice, currency, "en")} target.`;
  } else if (action === "SELL") {
    opinionTr = `Bugün benim düşüncem ${symbol} varlığını ${formatPrice(reference, currency, "tr")} seviyesinden satmak ve yeni teyit oluşana kadar nakitte kalmaktır.`;
    opinionEn = `My view today is to sell ${symbol} at ${formatPrice(reference, currency, "en")} and remain in cash until a new confirmation appears.`;
  } else {
    opinionTr = `Bugün benim düşüncem ${symbol} varlığını elde tutmak; ${formatPrice(stopLoss, currency, "tr")} altında çıkmak ve ${formatPrice(targetPrice, currency, "tr")} seviyesinde kâr almayı değerlendirmektir.`;
    opinionEn = `My view today is to hold ${symbol}, exit below ${formatPrice(stopLoss, currency, "en")}, and consider taking profit at ${formatPrice(targetPrice, currency, "en")}.`;
  }

  return buildBase(strategy, action, {
    symbol,
    displayName: idea?.displayName ?? symbol,
    currency,
    referencePrice: reference,
    entryLow: range.low,
    entryHigh: range.high,
    stopLoss,
    targetPrice,
    confidenceScore: idea?.confidenceScore ?? null,
    riskScore: idea?.riskScore ?? null,
    sourceIdeaId: idea?.id ?? decision.sourceIdeaId,
    source: "DECISION",
    rationaleTr: decision.reason,
    rationaleEn: decision.reason,
    opinionTr,
    opinionEn,
  });
}

export function buildVipAgentDailyTip({
  strategy,
  decisions,
  ideas,
  positions,
}: BuildVipAgentDailyTipInput): VipAgentDailyTip {
  const ideaById = new Map(ideas.map((idea) => [idea.id, idea]));
  const positionBySymbol = new Map(positions.map((position) => [position.symbol, position]));
  const directDecision = [...decisions]
    .filter((decision) => decision.symbol !== "PORTFOY" && decision.action in DIRECT_ACTION_PRIORITY)
    .sort((left, right) =>
      DIRECT_ACTION_PRIORITY[left.action] - DIRECT_ACTION_PRIORITY[right.action]
      || left.symbol.localeCompare(right.symbol),
    )[0];

  if (directDecision) {
    const idea = directDecision.sourceIdeaId ? ideaById.get(directDecision.sourceIdeaId) : undefined;
    return directDecisionTip(strategy, directDecision, idea, positionBySymbol.get(directDecision.symbol));
  }

  const idea = selectCandidate(strategy, decisions, ideas);
  if (!idea) {
    const opinionTr = "Bugün benim düşüncem doğrulanmış bir varlık ve seviye oluşmadığı için yeni alım yapmamak ve nakitte kalmaktır.";
    const opinionEn = "My view today is to avoid new purchases and remain in cash because no asset and price level have been verified.";
    return buildBase(strategy, "WAIT", {
      symbol: null,
      displayName: null,
      currency: "USD",
      referencePrice: null,
      entryLow: null,
      entryHigh: null,
      stopLoss: null,
      targetPrice: null,
      confidenceScore: null,
      riskScore: null,
      sourceIdeaId: null,
      source: "FALLBACK",
      rationaleTr: "Güncel VIP raporunda değerlendirilebilecek doğrulanmış fikir bulunamadı.",
      rationaleEn: "The current VIP report contains no verified idea that can be evaluated.",
      opinionTr,
      opinionEn,
    });
  }

  const selectedDecision = decisions.find((decision) => decision.sourceIdeaId === idea.id);
  const range = adjustedEntryRange(strategy, idea);
  const meetsProfile = idea.confidenceScore >= strategy.minimumConfidence && idea.riskScore <= strategy.maximumRisk;
  const rangeTr = formatRange(range.low, range.high, idea.currency, "tr");
  const rangeEn = formatRange(range.low, range.high, idea.currency, "en");
  const stopTr = formatPrice(idea.stopLoss, idea.currency, "tr");
  const stopEn = formatPrice(idea.stopLoss, idea.currency, "en");
  const targetTr = formatPrice(idea.targetPrice, idea.currency, "tr");
  const targetEn = formatPrice(idea.targetPrice, idea.currency, "en");
  let action: VipAgentDailyTipAction;
  let opinionTr: string;
  let opinionEn: string;

  if (isNegativeStance(idea.stance)) {
    action = "AVOID";
    const referenceTr = formatPrice(selectedDecision?.priceUsd ?? (idea.entryLow + idea.entryHigh) / 2, idea.currency, "tr");
    const referenceEn = formatPrice(selectedDecision?.priceUsd ?? (idea.entryLow + idea.entryHigh) / 2, idea.currency, "en");
    opinionTr = `Bugün benim düşüncem ${idea.symbol} varlığında ${referenceTr} seviyesinde yeni alım yapmamak; güçlü hacimli teyit oluşmadan uzak durmaktır.`;
    opinionEn = `My view today is to avoid a new ${idea.symbol} purchase at ${referenceEn} and stay away until strong volume confirmation appears.`;
  } else if (selectedDecision?.action === "ERROR") {
    action = "WAIT";
    opinionTr = `Bugün benim düşüncem ${idea.symbol} varlığını ${rangeTr} aralığında bile güncel fiyat doğrulanmadan almamak; veri gelene kadar nakitte kalmaktır.`;
    opinionEn = `My view today is not to buy ${idea.symbol}, even inside ${rangeEn}, until the current price is verified, and to remain in cash until then.`;
  } else if (!meetsProfile) {
    action = "WAIT";
    opinionTr = `Bugün benim düşüncem ${idea.symbol} varlığını ${rangeTr} aralığına gelse bile güven ve risk eşiklerim sağlanmadan almamak; nakitte kalmaktır.`;
    opinionEn = `My view today is not to buy ${idea.symbol}, even if it reaches ${rangeEn}, until my confidence and risk thresholds are met, and to remain in cash.`;
  } else if (idea.stance !== "AL") {
    action = "WATCH";
    opinionTr = `Bugün benim düşüncem ${idea.symbol} varlığını ${rangeTr} aralığında izlemek; VIP notu AL seviyesine yükselmeden yeni alım yapmamak, ${stopTr} altında uzak durmak ve ${targetTr} hedefini takip etmektir.`;
    opinionEn = `My view today is to watch ${idea.symbol} inside ${rangeEn}, avoid a new purchase until the VIP rating is upgraded to BUY, stay away below ${stopEn}, and monitor the ${targetEn} target.`;
  } else {
    action = "WATCH";
    opinionTr = `Bugün benim düşüncem ${idea.symbol} varlığını ${rangeTr} aralığında yalnız hacimli teknik teyit gelirse almak için izlemek; ${stopTr} altında fikirden vazgeçmek ve ${targetTr} hedefini takip etmektir.`;
    opinionEn = `My view today is to watch ${idea.symbol} for a buy only if volume confirms inside ${rangeEn}, abandon the idea below ${stopEn}, and monitor the ${targetEn} target.`;
  }

  const rationaleTr = [
    rationaleForIdea(strategy, idea, "tr"),
    selectedDecision?.reason ? `Son ajan kontrolü: ${selectedDecision.reason}` : "",
  ].filter(Boolean).join(" ");
  const rationaleEn = [
    rationaleForIdea(strategy, idea, "en"),
    selectedDecision?.reason ? `Latest agent check: ${selectedDecision.reason}` : "",
  ].filter(Boolean).join(" ");

  return buildBase(strategy, action, {
    symbol: idea.symbol,
    displayName: idea.displayName,
    currency: idea.currency,
    referencePrice: selectedDecision?.priceUsd ?? null,
    entryLow: range.low,
    entryHigh: range.high,
    stopLoss: idea.stopLoss,
    targetPrice: idea.targetPrice,
    confidenceScore: idea.confidenceScore,
    riskScore: idea.riskScore,
    sourceIdeaId: idea.id,
    source: "IDEA",
    rationaleTr,
    rationaleEn,
    opinionTr,
    opinionEn,
  });
}
