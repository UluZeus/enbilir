import type { AssetClass, WatchSymbol } from "@/lib/ai-market/types";

export type AssetUniverseCategory =
  | "CRYPTO_VOLUME_TOP_100"
  | "CRYPTO_MARKET_CAP_TOP_100"
  | "NASDAQ"
  | "DOW_JONES"
  | "SP500"
  | "BIST100"
  | "METALS"
  | "FX"
  | "INDEXES";

export type AssetProvider = "binance" | "yahoo";

export type AssetUniverseItem = {
  symbol: string;
  displayName: string;
  name: string;
  assetClass: AssetClass;
  category: AssetUniverseCategory;
  provider: AssetProvider;
  providerSymbol: string;
  exchangeLabel: string;
  currency: string;
  tags: string[];
};

type EquitySeed = {
  symbol: string;
  name?: string;
};

const cryptoNames: Record<string, string> = {
  BTCUSDT: "Bitcoin",
  ETHUSDT: "Ethereum",
  BNBUSDT: "BNB",
  SOLUSDT: "Solana",
  XRPUSDT: "XRP",
  DOGEUSDT: "Dogecoin",
  ADAUSDT: "Cardano",
  TRXUSDT: "TRON",
  AVAXUSDT: "Avalanche",
  SHIBUSDT: "Shiba Inu",
  DOTUSDT: "Polkadot",
  LINKUSDT: "Chainlink",
  BCHUSDT: "Bitcoin Cash",
  LTCUSDT: "Litecoin",
  UNIUSDT: "Uniswap",
  NEARUSDT: "NEAR Protocol",
  APTUSDT: "Aptos",
  ATOMUSDT: "Cosmos",
  FILUSDT: "Filecoin",
  ICPUSDT: "Internet Computer",
  ETCUSDT: "Ethereum Classic",
  XLMUSDT: "Stellar",
  HBARUSDT: "Hedera",
  ARBUSDT: "Arbitrum",
  OPUSDT: "Optimism",
  INJUSDT: "Injective",
  SUIUSDT: "Sui",
  AAVEUSDT: "Aave",
  MKRUSDT: "Maker",
  RNDRUSDT: "Render",
  GRTUSDT: "The Graph",
  ALGOUSDT: "Algorand",
  VETUSDT: "VeChain",
  FETUSDT: "Fetch.ai",
  RUNEUSDT: "THORChain",
  THETAUSDT: "Theta",
  EGLDUSDT: "MultiversX",
  SANDUSDT: "The Sandbox",
  MANAUSDT: "Decentraland",
  AXSUSDT: "Axie Infinity",
  FLOWUSDT: "Flow",
  CHZUSDT: "Chiliz",
  ENAUSDT: "Ethena",
  SEIUSDT: "Sei",
  WLDUSDT: "Worldcoin",
  JUPUSDT: "Jupiter",
  TIAUSDT: "Celestia",
  PYTHUSDT: "Pyth Network",
  STRKUSDT: "Starknet",
  PENDLEUSDT: "Pendle",
};

export const CRYPTO_MARKET_CAP_SEED = Object.keys(cryptoNames);

export const NASDAQ_SEED = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "META",
  "GOOGL",
  "GOOG",
  "TSLA",
  "AVGO",
  "COST",
  "NFLX",
  "AMD",
  "ADBE",
  "PEP",
  "CSCO",
  "TMUS",
  "INTC",
  "CMCSA",
  "QCOM",
  "TXN",
  "AMGN",
  "HON",
  "INTU",
  "AMAT",
  "ISRG",
  "BKNG",
  "ADP",
  "GILD",
  "LRCX",
  "MU",
  "PANW",
  "MDLZ",
  "SBUX",
  "MELI",
  "KLAC",
  "SNPS",
  "CDNS",
  "CRWD",
  "MAR",
  "ORLY",
  "CSX",
  "REGN",
  "ABNB",
  "MRVL",
  "NXPI",
  "FTNT",
  "ADI",
  "CEG",
  "PYPL",
  "ROST",
];

export const DOW_JONES_SEED = [
  "AAPL",
  "AMGN",
  "AMZN",
  "AXP",
  "BA",
  "CAT",
  "CRM",
  "CSCO",
  "CVX",
  "DIS",
  "GS",
  "HD",
  "HON",
  "IBM",
  "JNJ",
  "JPM",
  "KO",
  "MCD",
  "MMM",
  "MRK",
  "MSFT",
  "NKE",
  "NVDA",
  "PG",
  "SHW",
  "TRV",
  "UNH",
  "V",
  "VZ",
  "WMT",
];

export const SP500_SEED = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "META",
  "GOOGL",
  "BRK-B",
  "LLY",
  "AVGO",
  "JPM",
  "TSLA",
  "XOM",
  "UNH",
  "V",
  "MA",
  "COST",
  "HD",
  "PG",
  "JNJ",
  "NFLX",
  "ABBV",
  "BAC",
  "KO",
  "CRM",
  "WMT",
  "AMD",
  "PEP",
  "ADBE",
  "CSCO",
  "ORCL",
  "MCD",
  "TMO",
  "ACN",
  "ABT",
  "GE",
  "LIN",
  "MRK",
  "QCOM",
  "TXN",
  "INTU",
  "IBM",
  "CAT",
  "AMAT",
  "DIS",
  "VZ",
  "NOW",
  "ISRG",
  "GS",
  "RTX",
  "SPGI",
  "LOW",
  "BKNG",
  "HON",
  "NEE",
  "AMGN",
  "PFE",
  "MS",
  "BLK",
  "SYK",
  "DE",
  "PLD",
  "C",
  "ADP",
  "LMT",
  "MDLZ",
  "GILD",
  "T",
  "MMC",
  "CB",
  "REGN",
  "SCHW",
  "CVS",
  "CI",
  "SO",
  "ZTS",
  "ELV",
  "MO",
  "DUK",
  "USB",
  "CL",
  "APD",
  "EOG",
  "CME",
  "PNC",
  "ITW",
  "EQIX",
  "AON",
  "HCA",
  "MU",
  "ICE",
  "SHW",
  "GM",
  "F",
  "BA",
  "NKE",
  "SBUX",
];

export const BIST100_SEED = [
  "THYAO.IS",
  "ASELS.IS",
  "BIMAS.IS",
  "AKBNK.IS",
  "GARAN.IS",
  "ISCTR.IS",
  "KCHOL.IS",
  "SAHOL.IS",
  "TUPRS.IS",
  "EREGL.IS",
  "FROTO.IS",
  "TOASO.IS",
  "SISE.IS",
  "ENKAI.IS",
  "TCELL.IS",
  "TTKOM.IS",
  "YKBNK.IS",
  "HALKB.IS",
  "VAKBN.IS",
  "KOZAL.IS",
  "KOZAA.IS",
  "PETKM.IS",
  "ARCLK.IS",
  "TAVHL.IS",
  "PGSUS.IS",
  "MGROS.IS",
  "ULKER.IS",
  "CCOLA.IS",
  "DOHOL.IS",
  "GUBRF.IS",
  "HEKTS.IS",
  "SASA.IS",
  "KRDMD.IS",
  "ALARK.IS",
  "ENJSA.IS",
  "OYAKC.IS",
  "ISGYO.IS",
  "EKGYO.IS",
  "AGHOL.IS",
  "AKSA.IS",
  "AKSEN.IS",
  "ANSGR.IS",
  "ANHYT.IS",
  "BRSAN.IS",
  "BRYAT.IS",
  "CANTE.IS",
  "DOAS.IS",
  "ECILC.IS",
  "EUPWR.IS",
  "GESAN.IS",
  "GWIND.IS",
  "KCAER.IS",
  "KLSER.IS",
  "KONTR.IS",
  "MAVI.IS",
  "ODAS.IS",
  "QUAGR.IS",
  "SOKM.IS",
  "TABGD.IS",
  "TKFEN.IS",
  "TMSN.IS",
  "TRGYO.IS",
  "VESTL.IS",
  "ZOREN.IS",
];

export const METALS_SEED: EquitySeed[] = [
  { symbol: "XAUUSD", name: "Ons Altin" },
  { symbol: "XAGUSD", name: "Ons Gumus" },
  { symbol: "HG=F", name: "Bakir" },
  { symbol: "PL=F", name: "Platin" },
  { symbol: "PA=F", name: "Paladyum" },
  { symbol: "GC=F", name: "Altin vadeli" },
  { symbol: "SI=F", name: "Gumus vadeli" },
  { symbol: "CL=F", name: "Petrol" },
  { symbol: "NG=F", name: "Dogalgaz" },
];

export const FX_SEED: EquitySeed[] = [
  { symbol: "USDTRY", name: "Dolar/TL" },
  { symbol: "EURTRY", name: "Euro/TL" },
  { symbol: "EURUSD=X", name: "EUR/USD" },
  { symbol: "GBPUSD=X", name: "GBP/USD" },
  { symbol: "USDJPY=X", name: "USD/JPY" },
  { symbol: "USDCHF=X", name: "USD/CHF" },
  { symbol: "USDCAD=X", name: "USD/CAD" },
  { symbol: "AUDUSD=X", name: "AUD/USD" },
  { symbol: "NZDUSD=X", name: "NZD/USD" },
];

export const INDEX_SEED: EquitySeed[] = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq Composite" },
  { symbol: "^NDX", name: "Nasdaq 100" },
  { symbol: "^DJI", name: "Dow Jones" },
  { symbol: "^RUT", name: "Russell 2000" },
  { symbol: "XU100.IS", name: "BIST 100" },
  { symbol: "^VIX", name: "VIX" },
  { symbol: "DX-Y.NYB", name: "Dolar Endeksi" },
];

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function cryptoAsset(symbol: string, category: AssetUniverseCategory): AssetUniverseItem {
  const baseAsset = symbol.endsWith("USDT") ? symbol.slice(0, -4) : symbol;

  return {
    symbol,
    displayName: `${baseAsset}/USDT`,
    name: cryptoNames[symbol] ?? baseAsset,
    assetClass: "CRYPTO",
    category,
    provider: "binance",
    providerSymbol: symbol,
    exchangeLabel: "Binance",
    currency: "USDT",
    tags: ["kripto", "usdt"],
  };
}

function equityAsset(symbol: string, category: AssetUniverseCategory, exchangeLabel: string): AssetUniverseItem {
  return {
    symbol,
    displayName: symbol,
    name: symbol,
    assetClass: "EQUITY",
    category,
    provider: "yahoo",
    providerSymbol: symbol,
    exchangeLabel,
    currency: "USD",
    tags: ["hisse", exchangeLabel.toLowerCase()],
  };
}

function bistAsset(symbol: string): AssetUniverseItem {
  return {
    symbol,
    displayName: symbol.replace(".IS", ""),
    name: symbol.replace(".IS", ""),
    assetClass: "EQUITY",
    category: "BIST100",
    provider: "yahoo",
    providerSymbol: symbol,
    exchangeLabel: "BIST",
    currency: "TRY",
    tags: ["bist", "imkb", "hisse"],
  };
}

function namedYahooAsset(seed: EquitySeed, category: AssetUniverseCategory, assetClass: AssetClass, exchangeLabel: string, currency: string): AssetUniverseItem {
  const providerSymbol = seed.symbol === "USDTRY" ? "USDTRY=X" : seed.symbol === "EURTRY" ? "EURTRY=X" : seed.symbol;

  return {
    symbol: seed.symbol,
    displayName: seed.symbol,
    name: seed.name ?? seed.symbol,
    assetClass,
    category,
    provider: "yahoo",
    providerSymbol,
    exchangeLabel,
    currency,
    tags: [category.toLowerCase(), assetClass.toLowerCase()],
  };
}

export const CRYPTO_MARKET_CAP_ASSETS = CRYPTO_MARKET_CAP_SEED.map((symbol) => cryptoAsset(symbol, "CRYPTO_MARKET_CAP_TOP_100"));
export const NASDAQ_ASSETS = unique(NASDAQ_SEED).map((symbol) => equityAsset(symbol, "NASDAQ", "Nasdaq"));
export const DOW_JONES_ASSETS = unique(DOW_JONES_SEED).map((symbol) => equityAsset(symbol, "DOW_JONES", "Dow Jones"));
export const SP500_ASSETS = unique(SP500_SEED).map((symbol) => equityAsset(symbol, "SP500", "S&P 500"));
export const BIST100_ASSETS = unique(BIST100_SEED).map(bistAsset);
export const METALS_ASSETS = METALS_SEED.map((seed) => namedYahooAsset(seed, "METALS", "COMMODITY", "Yahoo", "USD"));
export const FX_ASSETS = FX_SEED.map((seed) => namedYahooAsset(seed, "FX", "FX", "Yahoo", seed.symbol.endsWith("TRY") ? "TRY" : "USD"));
export const INDEX_ASSETS = INDEX_SEED.map((seed) => namedYahooAsset(seed, "INDEXES", "INDEX", "Yahoo", seed.symbol === "XU100.IS" ? "TRY" : "USD"));

export const STATIC_ASSET_UNIVERSE = [
  ...CRYPTO_MARKET_CAP_ASSETS,
  ...NASDAQ_ASSETS,
  ...DOW_JONES_ASSETS,
  ...SP500_ASSETS,
  ...BIST100_ASSETS,
  ...METALS_ASSETS,
  ...FX_ASSETS,
  ...INDEX_ASSETS,
];

export const ASSET_UNIVERSE_MAP = new Map(STATIC_ASSET_UNIVERSE.map((asset) => [asset.symbol, asset]));

export const ASSET_UNIVERSE_SECTIONS: Array<{ category: AssetUniverseCategory; title: string; assets: AssetUniverseItem[] }> = [
  { category: "CRYPTO_MARKET_CAP_TOP_100", title: "Kripto - Piyasa Değerine Göre İlk 100", assets: CRYPTO_MARKET_CAP_ASSETS },
  { category: "NASDAQ", title: "Nasdaq", assets: NASDAQ_ASSETS },
  { category: "DOW_JONES", title: "Dow Jones", assets: DOW_JONES_ASSETS },
  { category: "SP500", title: "S&P 500", assets: SP500_ASSETS },
  { category: "BIST100", title: "BIST 100 / İMKB 100", assets: BIST100_ASSETS },
  { category: "METALS", title: "Metaller", assets: METALS_ASSETS },
  { category: "FX", title: "FX", assets: FX_ASSETS },
  { category: "INDEXES", title: "Endeksler", assets: INDEX_ASSETS },
];

export function getAssetUniverseItem(symbol: string) {
  return ASSET_UNIVERSE_MAP.get(symbol.toUpperCase());
}

export function toWatchSymbol(asset: AssetUniverseItem): WatchSymbol {
  if (asset.assetClass === "CRYPTO") {
    const baseAsset = asset.symbol.endsWith("USDT") ? asset.symbol.slice(0, -4) : asset.symbol;

    return {
      symbol: asset.symbol,
      name: asset.name,
      baseAsset,
      quoteAsset: "USDT",
      assetClass: "CRYPTO",
      binanceSymbol: asset.providerSymbol,
      gateSymbol: `${baseAsset}_USDT`,
    };
  }

  return {
    symbol: asset.symbol,
    name: asset.name,
    baseAsset: asset.displayName,
    quoteAsset: asset.currency,
    assetClass: asset.assetClass,
    binanceSymbol: "",
    gateSymbol: "",
    yahooSymbol: asset.providerSymbol,
  };
}
