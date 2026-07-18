export type VipAssetClass = "EQUITY" | "BROAD_MARKET" | "COMMODITY" | "BOND" | "FX" | "CRYPTO";

export type VipFundamentalFramework = "CORPORATE_FINANCIALS" | "MACRO_MARKET_STRUCTURE";

export type VipCrowdingLevel = "LOW" | "MODERATE" | "HIGH" | "EXTREME";

export type VipTechnicalSnapshot = {
  asOf: string;
  lastPrice: number;
  sma50: number;
  sma200: number;
  distanceFromSma50Pct: number;
  distanceFromSma200Pct: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  volumeRatio20d: number;
  volumeBreakout: boolean;
  breakoutLevel: number;
  high52Week: number;
  distanceFrom52WeekHighPct: number;
  momentum20dPct: number;
  momentum60dPct: number;
  atr14Pct: number;
  rsiDivergence: "BULLISH" | "BEARISH" | "NONE";
  macdDivergence: "BULLISH" | "BEARISH" | "NONE";
  support: number;
  resistance: number;
  technicalScore: number;
  crowdingScore: number;
  crowdingLevel: VipCrowdingLevel;
  crowdingSignals: string[];
  crowdingVeto: boolean;
};

export type VipFundamentalSnapshot = {
  periodEnd: string | null;
  revenue: number | null;
  revenueGrowthPct: number | null;
  freeCashFlow: number | null;
  freeCashFlowGrowthPct: number | null;
  netMarginPct: number | null;
  netMarginExpansionBps: number | null;
  totalDebt: number | null;
  debtToAssetsPct: number | null;
  debtToFreeCashFlow: number | null;
  researchAndDevelopment: number | null;
  researchAndDevelopmentGrowthPct: number | null;
  sourceUrl: string;
};

export type VipInstitutionalSnapshot = {
  ownershipPercent: number | null;
  increasedPositionHolders: number | null;
  decreasedPositionHolders: number | null;
  newPositionHolders: number | null;
  soldOutPositionHolders: number | null;
  perception: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "UNAVAILABLE";
  sourceUrl: string;
};

export type VipShortInterestSnapshot = {
  settlementDate: string | null;
  sharesShort: number | null;
  changePercent: number | null;
  daysToCover: number | null;
  sourceUrl: string;
};

export type VipResearchCandidate = {
  symbol: string;
  providerSymbol: string;
  displayName: string;
  assetClass: VipAssetClass;
  currency: string;
  fundamentalFramework: VipFundamentalFramework;
  marketDataSourceUrl: string;
  technical: VipTechnicalSnapshot;
  fundamental: VipFundamentalSnapshot | null;
  institutional: VipInstitutionalSnapshot | null;
  shortInterest: VipShortInterestSnapshot | null;
  quantitativeScore: number;
};

export type VipSource = {
  title: string;
  url: string;
  publishedAt?: string | null;
};

export type VipIdeaDraft = {
  symbol: string;
  stance: "AL" | "TUT" | "IZLE" | "UZAK_DUR";
  thesisSummary: string;
  negativeCase: string;
  macroThesis: string;
  fundamentalThesis: string;
  technicalThesis: string;
  catalysts: string[];
  exitPlan: string;
  institutionalPerception: string;
  shortInterestCommentary: string;
  confidenceScore: number;
  riskScore: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  targetPrice: number;
  secondaryTargetPrice: number | null;
  sources: VipSource[];
};

export type VipReportDraft = {
  marketContext: string;
  executiveSummary: string;
  ideas: VipIdeaDraft[];
};
