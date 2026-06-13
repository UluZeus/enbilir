import {
  BIST100_SEED,
  CRYPTO_MARKET_CAP_SEED,
  DOW_JONES_SEED,
  NASDAQ_SEED,
} from "@/lib/ai-market/asset-universe";

export type MarketItem = {
  symbol: string;
  dataSymbol: string;
  name: string;
  market: string;
  category:
    | "BIST"
    | "NASDAQ"
    | "DOW"
    | "FX"
    | "CRYPTO"
    | "COMMODITY"
    | "TR_BOND"
    | "US_BOND"
    | "EUROBOND"
    | "INDEX";
  dataStatus: "live" | "delayed" | "close" | "representative";
  source: "binance" | "yahoo" | "fallback" | "representative";
  price: string;
  priceUsd: number;
  changePercent: number;
};

type MarketSeed = Omit<MarketItem, "price" | "priceUsd" | "changePercent" | "dataStatus" | "source"> & {
  priceUsd: number;
  changePercent: number;
  dataStatus?: MarketItem["dataStatus"];
  source?: MarketItem["source"];
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededPrice(symbol: string, base: number, spread: number) {
  const hash = hashString(symbol);
  const normalized = (hash % 10_000) / 10_000;

  return Number((base + normalized * spread).toFixed(base < 10 ? 4 : 2));
}

function seededChange(symbol: string, spread = 6) {
  const hash = hashString(`${symbol}:change`);
  const normalized = (hash % 20_000) / 20_000;
  const value = (normalized - 0.5) * spread;

  return Number(value.toFixed(2));
}

function getPriceFractionDigits(value: number, category: MarketItem["category"]) {
  if (category === "CRYPTO") {
    if (value >= 1000) {
      return 2;
    }

    if (value >= 1) {
      return 4;
    }

    if (value >= 0.01) {
      return 6;
    }

    return 8;
  }

  if (category === "COMMODITY") {
    if (value >= 1000) {
      return 2;
    }

    if (value >= 1) {
      return 4;
    }

    return 6;
  }

  if (category === "FX") {
    return value >= 10 ? 2 : 4;
  }

  if (category === "TR_BOND" || category === "US_BOND" || category === "EUROBOND") {
    return 2;
  }

  if (value >= 1000) {
    return 2;
  }

  if (value >= 100) {
    return 2;
  }

  if (value >= 1) {
    return 2;
  }

  if (value >= 0.1) {
    return 4;
  }

  if (value >= 0.01) {
    return 6;
  }

  return 8;
}

export function formatMarketItemValue(value: number, category: MarketItem["category"]) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: getPriceFractionDigits(value, category),
  }).format(value);
}

function item(seed: MarketSeed): MarketItem {
  return {
    ...seed,
    price: formatMarketItemValue(seed.priceUsd, seed.category),
    dataStatus: seed.dataStatus ?? "delayed",
    source: seed.source ?? "fallback",
  };
}

function buildEquityItems(
  symbols: string[],
  options: {
    market: string;
    category: MarketItem["category"];
    basePrice: number;
    spread: number;
    dataSymbol?: (symbol: string) => string;
  },
): MarketSeed[] {
  return symbols.map((symbol) => ({
    symbol,
    dataSymbol: options.dataSymbol?.(symbol) ?? symbol.toLowerCase(),
    name: symbol,
    market: options.market,
    category: options.category,
    priceUsd: seededPrice(symbol, options.basePrice, options.spread),
    changePercent: seededChange(symbol, options.category === "CRYPTO" ? 12 : 7),
  }));
}

const EXTRA_CRYPTO_SYMBOLS = [
  "PEPE",
  "BONK",
  "TON",
  "KAS",
  "TAO",
  "ONDO",
  "LDO",
  "WIF",
  "FLOKI",
  "NOT",
  "JASMY",
  "OM",
  "IMX",
  "ARKM",
  "TWT",
  "BOME",
  "DYDX",
  "RAY",
  "CFX",
  "AR",
  "ENS",
  "CRV",
  "COMP",
  "SNX",
  "1INCH",
  "ZK",
  "MINA",
  "ROSE",
  "HOT",
  "KAVA",
  "GALA",
  "KSM",
  "HNT",
  "BAT",
  "CAKE",
  "XEC",
  "COTI",
  "DASH",
  "IOTA",
  "NEO",
  "QTUM",
  "ZIL",
  "CELO",
  "ILV",
  "LUNC",
  "BSV",
  "XMR",
  "XTZ",
  "CRO",
  "SXP",
  "SUPER",
  "MANTA",
  "W",
];

const EXTRA_DOW_SYMBOLS = [
  "AON",
  "AXP",
  "CSGP",
  "DE",
  "EMR",
  "FDX",
  "GD",
  "HON",
  "ITW",
  "LOW",
  "MSI",
  "NOC",
  "PM",
  "SPGI",
  "SYK",
  "TGT",
  "UPS",
  "UNP",
  "VRTX",
  "WBA",
];

const EXTRA_BIST_SYMBOLS = [
  "AKSA",
  "AKSEN",
  "ALARK",
  "ANHYT",
  "ANSGR",
  "ARCLK",
  "ASTOR",
  "BERA",
  "BRISA",
  "CANTE",
  "CIMSA",
  "CRFSA",
  "DOAS",
  "ECILC",
  "EGEEN",
  "ENJSA",
  "ESEN",
  "FENER",
  "GEDIK",
  "GESAN",
  "GLYHO",
  "INDES",
  "ISDMR",
  "LOGO",
  "MPARK",
  "NTGAZ",
  "OTKAR",
  "PENTA",
  "SOKM",
  "TABGD",
  "TKFEN",
  "TSKB",
  "TTRAK",
  "VESTL",
  "VRGYO",
  "YATAS",
  "YEOTK",
  "ZOREN",
  "SNGYO",
  "MAVI",
];

const cryptoSymbols = unique([...CRYPTO_MARKET_CAP_SEED, ...EXTRA_CRYPTO_SYMBOLS].map((symbol) => symbol.replace(/USDT$/i, ""))).slice(0, 100);
const nasdaqSymbols = unique(NASDAQ_SEED).slice(0, 50);
const dowSymbols = unique([...DOW_JONES_SEED, ...EXTRA_DOW_SYMBOLS]).slice(0, 50);
const bistSymbols = unique([...BIST100_SEED, ...EXTRA_BIST_SYMBOLS]).slice(0, 100);

const CRYPTO_FALLBACK_PRICES: Record<string, number> = {
  BTC: 65000,
  ETH: 3500,
  BNB: 600,
  SOL: 150,
  XRP: 0.5,
  DOGE: 0.15,
  ADA: 0.42,
  TRX: 0.16,
  AVAX: 30,
  SHIB: 0.00002,
  DOT: 7,
  LINK: 15,
  BCH: 400,
  LTC: 50,
  UNI: 10,
  NEAR: 5,
  APT: 9,
  ATOM: 8,
  FIL: 5,
  ICP: 11,
  ETC: 28,
  XLM: 0.12,
  HBAR: 0.09,
  ARB: 1.2,
  OP: 2.2,
  INJ: 18,
  SUI: 1.5,
  AAVE: 90,
  MKR: 2500,
  RNDR: 8,
  GRT: 0.25,
  ALGO: 0.15,
  VET: 0.03,
  FET: 1.1,
  RUNE: 5,
  THETA: 1.5,
  EGLD: 35,
  SAND: 0.4,
  MANA: 0.35,
  AXS: 5,
  FLOW: 0.9,
  CHZ: 0.12,
  ENA: 0.8,
  SEI: 0.35,
  WLD: 2.5,
  JUP: 0.9,
  TIA: 5,
  PYTH: 0.35,
  STRK: 0.7,
  PENDLE: 5,
  TON: 6,
  KAS: 0.1,
  TAO: 350,
  ONDO: 1.2,
  LDO: 2.2,
  WIF: 2,
  FLOKI: 0.00018,
  NOT: 0.02,
  JASMY: 0.02,
  OM: 0.6,
  IMX: 0.9,
  ARKM: 0.9,
  TWT: 1.3,
  BOME: 0.001,
  DYDX: 1.2,
  RAY: 3,
  CFX: 0.1,
  AR: 20,
  ENS: 20,
  CRV: 0.4,
  COMP: 45,
  SNX: 1.5,
  "1INCH": 0.35,
  ZK: 0.15,
  MINA: 0.5,
  ROSE: 0.06,
  HOT: 0.002,
  KAVA: 0.4,
  GALA: 0.03,
  KSM: 30,
  HNT: 4,
  BAT: 0.2,
  CAKE: 3,
  XEC: 0.00003,
  COTI: 0.1,
  DASH: 25,
  IOTA: 0.18,
  NEO: 12,
  QTUM: 3,
  ZIL: 0.02,
  CELO: 0.45,
  ILV: 20,
  LUNC: 0.0001,
  BSV: 50,
  XMR: 160,
  XTZ: 1.2,
  CRO: 0.08,
  SXP: 0.22,
  SUPER: 0.8,
  MANTA: 0.7,
  W: 0.4,
};

function getCryptoFallbackPrice(symbol: string) {
  const normalized = symbol.toUpperCase();
  const explicitPrice = CRYPTO_FALLBACK_PRICES[normalized];

  if (typeof explicitPrice === "number") {
    return explicitPrice;
  }

  const hash = hashString(normalized);
  const normalizedHash = (hash % 10_000) / 10_000;
  const microCapSymbols = new Set(["PEPE", "BONK", "FLOKI", "BOME", "XEC", "HOT", "COTI", "ROSE", "ZIL", "MINA", "JASMY", "NOT", "GALA", "VET", "CHZ", "SXP", "SUPER", "MANTA", "W", "KAVA"]);
  const midCapSymbols = new Set(["TON", "KAS", "LDO", "RAY", "CFX", "AR", "ENS", "CRV", "COMP", "SNX", "1INCH", "ZK", "KSM", "HNT", "BAT", "CAKE", "DASH", "IOTA", "NEO", "QTUM", "CELO", "ILV", "BSV", "XMR", "XTZ", "CRO", "WLD", "JUP", "TIA", "PYTH", "STRK", "PENDLE", "AAVE", "MKR", "RNDR", "GRT", "ALGO", "THETA", "EGLD", "SAND", "MANA", "AXS", "FLOW", "ENA", "SEI", "IMX", "ARKM", "TWT", "DYDX", "OM", "INJ", "SUI", "OP", "ARB", "FET", "NEAR", "ATOM", "FIL", "ICP"]);

  if (microCapSymbols.has(normalized)) {
    return Number((0.00001 + normalizedHash * 0.5).toFixed(8));
  }

  if (midCapSymbols.has(normalized)) {
    return Number((0.5 + normalizedHash * 50).toFixed(4));
  }

  return Number((1 + normalizedHash * 250).toFixed(4));
}

const cryptoSeeds: MarketSeed[] = cryptoSymbols.map((symbol) => ({
  symbol,
  dataSymbol: `${symbol.toLowerCase()}usdt`,
  name: symbol,
  market: "Kripto",
  category: "CRYPTO",
  priceUsd: getCryptoFallbackPrice(symbol),
  changePercent: seededChange(symbol, 12),
}));

const nasdaqSeeds: MarketSeed[] = buildEquityItems(nasdaqSymbols, {
  market: "Nasdaq Hisse",
  category: "NASDAQ",
  basePrice: 15,
  spread: 1_250,
});

const dowSeeds: MarketSeed[] = buildEquityItems(dowSymbols, {
  market: "Dow Jones Hisse",
  category: "DOW",
  basePrice: 20,
  spread: 750,
});

const bistSeeds: MarketSeed[] = buildEquityItems(bistSymbols, {
  market: "BIST / IMKB",
  category: "BIST",
  basePrice: 0.3,
  spread: 35,
  dataSymbol: (symbol) => `${symbol.toLowerCase()}.tr`,
});

const fxAndCommodities: MarketSeed[] = [
  { symbol: "USD/TRY", dataSymbol: "usdtry", name: "Dolar TL", market: "Majör Döviz", category: "FX", priceUsd: 32.5, changePercent: 0.42 },
  { symbol: "EUR/TRY", dataSymbol: "eurtry", name: "Euro TL", market: "Majör Döviz", category: "FX", priceUsd: 35.2, changePercent: 3.18 },
  { symbol: "GBP/TRY", dataSymbol: "gbptry", name: "Sterlin TL", market: "Majör Döviz", category: "FX", priceUsd: 41.0, changePercent: 1.46 },
  { symbol: "CHF/TRY", dataSymbol: "chftry", name: "Frank TL", market: "Majör Döviz", category: "FX", priceUsd: 36.0, changePercent: 0.84 },
  { symbol: "EUR/USD", dataSymbol: "eurusd", name: "Euro Dolar", market: "Majör Döviz", category: "FX", priceUsd: 1.08, changePercent: 0.18 },
  { symbol: "GBP/USD", dataSymbol: "gbpusd", name: "Sterlin Dolar", market: "Majör Döviz", category: "FX", priceUsd: 1.25, changePercent: -2.35 },
  { symbol: "USD/JPY", dataSymbol: "usdjpy", name: "Dolar Yen", market: "Majör Döviz", category: "FX", priceUsd: 155.2, changePercent: 1.68 },
  { symbol: "USD/CHF", dataSymbol: "usdchf", name: "Dolar Frank", market: "Majör Döviz", category: "FX", priceUsd: 0.88, changePercent: -0.22 },
  { symbol: "AUD/USD", dataSymbol: "audusd", name: "Avustralya Doları", market: "Majör Döviz", category: "FX", priceUsd: 0.66, changePercent: 0.36 },
  { symbol: "USD/CAD", dataSymbol: "usdcad", name: "Dolar Kanada Doları", market: "Majör Döviz", category: "FX", priceUsd: 1.37, changePercent: 0.2 },
  { symbol: "XAU/USD", dataSymbol: "xauusd", name: "Altın Ons", market: "Emtia", category: "COMMODITY", priceUsd: 2318, changePercent: 2.44 },
  { symbol: "XAG/USD", dataSymbol: "xagusd", name: "Gümüş Ons", market: "Emtia", category: "COMMODITY", priceUsd: 27.12, changePercent: 5.38 },
  { symbol: "GRAM_GOLD_USD", dataSymbol: "gram_gold_usd", name: "Kapalı Çarşı Gram Altın (USD)", market: "Kapalı Çarşı", category: "COMMODITY", priceUsd: 2318 / 31.1035, changePercent: 2.44, dataStatus: "representative", source: "representative" },
  { symbol: "GRAM_SILVER_USD", dataSymbol: "gram_silver_usd", name: "Kapalı Çarşı Gram Gümüş (USD)", market: "Kapalı Çarşı", category: "COMMODITY", priceUsd: 27.12 / 31.1035, changePercent: 5.38, dataStatus: "representative", source: "representative" },
  { symbol: "COPPER", dataSymbol: "hg.f", name: "Bakır", market: "Emtia", category: "COMMODITY", priceUsd: 4.61, changePercent: 1.22 },
  { symbol: "BRONZE", dataSymbol: "bronze", name: "Bronz", market: "Emtia", category: "COMMODITY", priceUsd: 4.08, changePercent: 0.74, dataStatus: "representative", source: "representative" },
  { symbol: "PALLADIUM", dataSymbol: "pa.f", name: "Paladyum", market: "Emtia", category: "COMMODITY", priceUsd: 982.4, changePercent: -0.82 },
  { symbol: "PLATIN", dataSymbol: "pl.f", name: "Platin", market: "Emtia", category: "COMMODITY", priceUsd: 918.4, changePercent: -6.01 },
  { symbol: "WTI", dataSymbol: "cl.f", name: "Ham Petrol", market: "Emtia", category: "COMMODITY", priceUsd: 78.2, changePercent: -1.36 },
  { symbol: "BRENT", dataSymbol: "brn.f", name: "Brent Petrol", market: "Emtia", category: "COMMODITY", priceUsd: 82.1, changePercent: -1.92 },
  { symbol: "NATGAS", dataSymbol: "ng.f", name: "Doğalgaz", market: "Emtia", category: "COMMODITY", priceUsd: 2.18, changePercent: 2.01 },
];

const fixedIncome: MarketSeed[] = [
  { symbol: "TRBOND-1M", dataSymbol: "trbond-1m", name: "Türkiye Hazine Bonosu 1 Ay", market: "Türkiye Tahvil/Bono", category: "TR_BOND", priceUsd: 100.4, changePercent: 0.08, dataStatus: "representative", source: "representative" },
  { symbol: "TRBOND-3M", dataSymbol: "trbond-3m", name: "Türkiye Hazine Bonosu 3 Ay", market: "Türkiye Tahvil/Bono", category: "TR_BOND", priceUsd: 101.1, changePercent: 0.16, dataStatus: "representative", source: "representative" },
  { symbol: "TRBOND-6M", dataSymbol: "trbond-6m", name: "Türkiye Hazine Bonosu 6 Ay", market: "Türkiye Tahvil/Bono", category: "TR_BOND", priceUsd: 102.2, changePercent: 0.25, dataStatus: "representative", source: "representative" },
  { symbol: "TRBOND-1Y", dataSymbol: "trbond-1y", name: "Türkiye Tahvili 1 Yıl", market: "Türkiye Tahvil/Bono", category: "TR_BOND", priceUsd: 104.6, changePercent: 0.34, dataStatus: "representative", source: "representative" },
  { symbol: "TRBOND-3Y", dataSymbol: "trbond-3y", name: "Türkiye Tahvili 3 Yıl", market: "Türkiye Tahvil/Bono", category: "TR_BOND", priceUsd: 108.9, changePercent: -0.12, dataStatus: "representative", source: "representative" },
  { symbol: "TRBOND-5Y", dataSymbol: "trbond-5y", name: "Türkiye Tahvili 5 Yıl", market: "Türkiye Tahvil/Bono", category: "TR_BOND", priceUsd: 112.4, changePercent: -0.2, dataStatus: "representative", source: "representative" },
  { symbol: "TRBOND-10Y", dataSymbol: "trbond-10y", name: "Türkiye Tahvili 10 Yıl", market: "Türkiye Tahvil/Bono", category: "TR_BOND", priceUsd: 118.7, changePercent: -0.31, dataStatus: "representative", source: "representative" },
  { symbol: "USBILL-1M", dataSymbol: "us1m", name: "ABD T-Bill 1 Ay", market: "ABD Tahvil", category: "US_BOND", priceUsd: 100.2, changePercent: 0.04, dataStatus: "representative", source: "representative" },
  { symbol: "USBILL-3M", dataSymbol: "us3m", name: "ABD T-Bill 3 Ay", market: "ABD Tahvil", category: "US_BOND", priceUsd: 100.6, changePercent: 0.06, dataStatus: "representative", source: "representative" },
  { symbol: "USBILL-6M", dataSymbol: "us6m", name: "ABD T-Bill 6 Ay", market: "ABD Tahvil", category: "US_BOND", priceUsd: 101.1, changePercent: 0.08, dataStatus: "representative", source: "representative" },
  { symbol: "UST-1Y", dataSymbol: "us1y", name: "ABD Tahvili 1 Yıl", market: "ABD Tahvil", category: "US_BOND", priceUsd: 102.1, changePercent: 0.11, dataStatus: "representative", source: "representative" },
  { symbol: "UST-3Y", dataSymbol: "us3y", name: "ABD Tahvili 3 Yıl", market: "ABD Tahvil", category: "US_BOND", priceUsd: 105.4, changePercent: -0.05, dataStatus: "representative", source: "representative" },
  { symbol: "UST-5Y", dataSymbol: "us5y", name: "ABD Tahvili 5 Yıl", market: "ABD Tahvil", category: "US_BOND", priceUsd: 108.2, changePercent: -0.08, dataStatus: "representative", source: "representative" },
  { symbol: "UST-10Y", dataSymbol: "us10y", name: "ABD Tahvili 10 Yıl", market: "ABD Tahvil", category: "US_BOND", priceUsd: 114.9, changePercent: -0.14, dataStatus: "representative", source: "representative" },
  { symbol: "EUROBOND-S", dataSymbol: "eurobond-s", name: "Türkiye Eurobond Kısa Vade", market: "Eurobond", category: "EUROBOND", priceUsd: 96.4, changePercent: 0.18, dataStatus: "representative", source: "representative" },
  { symbol: "EUROBOND-M", dataSymbol: "eurobond-m", name: "Türkiye Eurobond Orta Vade", market: "Eurobond", category: "EUROBOND", priceUsd: 91.8, changePercent: -0.11, dataStatus: "representative", source: "representative" },
  { symbol: "EUROBOND-L", dataSymbol: "eurobond-l", name: "Türkiye Eurobond Uzun Vade", market: "Eurobond", category: "EUROBOND", priceUsd: 84.7, changePercent: -0.28, dataStatus: "representative", source: "representative" },
];

const indexSymbols = [
  { symbol: "S&P 500", dataSymbol: "^GSPC", name: "S&P 500 Endeksi", priceUsd: 5241, changePercent: 1.92 },
  { symbol: "NASDAQ", dataSymbol: "^IXIC", name: "Nasdaq Composite", priceUsd: 18042, changePercent: -3.08 },
  { symbol: "DJIA", dataSymbol: "^DJI", name: "Dow Jones Endeksi", priceUsd: 38624, changePercent: 0.44 },
];

const mixedItems: MarketSeed[] = [
  ...cryptoSeeds,
  ...nasdaqSeeds,
  ...dowSeeds,
  ...bistSeeds,
  ...fxAndCommodities,
  ...fixedIncome,
  ...indexSymbols.map((seed) => ({
    symbol: seed.symbol,
    dataSymbol: seed.dataSymbol,
    name: seed.name,
    market: "Endeks",
    category: "INDEX" as const,
    priceUsd: seed.priceUsd,
    changePercent: seed.changePercent,
  })),
];

function uniqueMarketItems(items: MarketItem[]) {
  const seen = new Set<string>();

  return items.filter((entry) => {
    if (seen.has(entry.symbol)) {
      return false;
    }

    seen.add(entry.symbol);
    return true;
  });
}

export const mixedMarketItems: MarketItem[] = uniqueMarketItems(mixedItems.map(item));

function pick(symbol: string) {
  return mixedMarketItems.find((entry) => entry.symbol === symbol);
}

export const portfolioItems: MarketItem[] = [
  pick("BTC") ?? mixedMarketItems[0],
  pick("AAPL") ?? mixedMarketItems[1],
  pick("THYAO") ?? mixedMarketItems[2],
  pick("XAU/USD") ?? mixedMarketItems[3],
].filter((entry): entry is MarketItem => Boolean(entry));

export const chartPeriods = [
  { label: "Günlük", change: 1.82, points: [18, 26, 22, 38, 44, 39, 56] },
  { label: "Haftalık", change: 4.36, points: [20, 30, 28, 42, 45, 58, 64] },
  { label: "Aylık", change: 9.14, points: [16, 24, 33, 31, 48, 62, 74] },
  { label: "3 Aylık", change: 18.72, points: [12, 22, 28, 45, 52, 66, 86] },
  { label: "Yıllık", change: 41.08, points: [10, 18, 27, 39, 58, 70, 92] },
];

export const rankings = [
  { label: "Günlük", overall: 128, friends: 4 },
  { label: "Haftalık", overall: 94, friends: 3 },
  { label: "Aylık", overall: 52, friends: 2 },
  { label: "3 Aylık", overall: 31, friends: 2 },
  { label: "Yıllık", overall: 17, friends: 1 },
];

export const marketNews = [
  "BIST tarafında bankacılık hisseleri gün içi hacimde öne çıktı.",
  "Küresel piyasalarda faiz indirimi beklentisi emtia fiyatlarını destekliyor.",
  "Kripto varlıklarda volatilite artarken Bitcoin yeniden ana direnç bölgesini test ediyor.",
  "Döviz piyasasında gelişen ülke para birimleri karışık seyrediyor.",
];

export const rotaryNews = [
  "Rotary ekonomi okuryazarlığı oturumunda sanal portföy yarışması tanıtıldı.",
  "Gençlere yönelik finansal bilinç programı için yeni eğitim modülü hazırlanıyor.",
  "Haftanın sosyal etki notu: bütçe yönetimi ve tasarruf alışkanlıkları.",
];

export function getTopRisers() {
  return [...mixedMarketItems].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
}

export function getTopFallers() {
  return [...mixedMarketItems].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
}

export function findMarketItem(symbol: string) {
  return mixedMarketItems.find((item) => item.symbol === symbol);
}

export function getMarketItemDisplayUnit(item: MarketItem) {
  if (item.category === "BIST") {
    return "TL";
  }

  if (item.category === "FX" && item.symbol.toUpperCase().includes("TRY")) {
    return "TL";
  }

  if (item.category === "COMMODITY" && (item.symbol === "XAU/USD" || item.symbol === "XAG/USD")) {
    return "USD/ons";
  }

  return "USD";
}

export function formatMarketItemPrice(item: MarketItem) {
  return `${item.price} ${getMarketItemDisplayUnit(item)}`;
}
