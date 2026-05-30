export type MarketExchange = "binance" | "gate";

export type AssetClass = "CRYPTO" | "COMMODITY" | "FX" | "EQUITY" | "INDEX";

export type SignalType =
  | "STRONG_BUY"
  | "BUY"
  | "WATCH"
  | "HOLD"
  | "TAKE_PROFIT"
  | "SELL"
  | "AVOID"
  | "NO_TRADE";

export type WatchSymbol = {
  symbol: string;
  name: string;
  baseAsset: string;
  quoteAsset: string;
  assetClass: AssetClass;
  binanceSymbol: string;
  gateSymbol: string;
  yahooSymbol?: string;
};

export type Candle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type IndicatorSnapshot = {
  rsi: number | null;
  macd: {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  };
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  bollinger: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
    bandwidth: number | null;
  };
  atr: number | null;
  volumeAnomaly: {
    ratio: number | null;
    isAnomaly: boolean;
  };
};

export type RiskAssessment = {
  score: number;
  level: "DUSUK" | "ORTA" | "YUKSEK";
  reasons: string[];
};

export type SignalAssessment = {
  signal: SignalType;
  confidence: number;
  reasons: string[];
};

export type MarketAnalysis = {
  symbol: string;
  name: string;
  exchange: MarketExchange;
  interval: string;
  lastPrice: number | null;
  changePercent: number | null;
  volume: number | null;
  indicators: IndicatorSnapshot;
  signal: SignalAssessment;
  risk: RiskAssessment;
  explanation: string;
  disclaimer: string;
  updatedAt: string;
  dataStatus: "live" | "fallback" | "error";
  error?: string;
};
