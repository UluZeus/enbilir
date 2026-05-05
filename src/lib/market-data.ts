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
  source: "stooq" | "fallback" | "representative";
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

type EquityTuple = [symbol: string, dataSymbol: string, name: string, priceUsd: number, changePercent: number];
type UsEquityTuple = [symbol: string, dataSymbol: string, name: string, market: "NASDAQ" | "DOW", priceUsd: number, changePercent: number];
type CryptoTuple = [symbol: string, name: string, priceUsd: number, changePercent: number];

function item(seed: MarketSeed): MarketItem {
  return {
    ...seed,
    price: new Intl.NumberFormat("en-US", { maximumFractionDigits: seed.priceUsd < 10 ? 4 : 2 }).format(seed.priceUsd),
    dataStatus: seed.dataStatus ?? "delayed",
    source: seed.source ?? "stooq",
  };
}

const bist30Rows: EquityTuple[] = [
  ["AKBNK", "akbnk.tr", "Akbank", 1.72, 1.34],
  ["ARCLK", "arclk.tr", "Arçelik", 5.12, -0.82],
  ["ASELS", "asels.tr", "Aselsan", 1.94, 2.94],
  ["BIMAS", "bimas.tr", "BİM Mağazalar", 14.65, 0.88],
  ["EKGYO", "ekgyo.tr", "Emlak Konut GYO", 0.36, -1.1],
  ["ENKAI", "enkai.tr", "Enka İnşaat", 1.18, 0.42],
  ["EREGL", "eregl.tr", "Ereğli Demir Çelik", 1.33, -5.17],
  ["FROTO", "froto.tr", "Ford Otosan", 28.4, 1.72],
  ["GARAN", "garan.tr", "Garanti BBVA", 3.24, 2.08],
  ["GUBRF", "gubrf.tr", "Gübre Fabrikaları", 5.74, -1.96],
  ["HEKTS", "hekts.tr", "Hektaş", 0.47, -2.24],
  ["ISCTR", "isctr.tr", "İş Bankası C", 0.43, 1.44],
  ["KCHOL", "kchol.tr", "Koç Holding", 6.41, -2.84],
  ["KOZAA", "kozaa.tr", "Koza Anadolu", 1.58, 0.74],
  ["KOZAL", "kozal.tr", "Koza Altın", 0.74, -0.34],
  ["KRDMD", "krdmd.tr", "Kardemir D", 0.94, 0.26],
  ["PETKM", "petkm.tr", "Petkim", 0.62, -0.9],
  ["PGSUS", "pgsus.tr", "Pegasus", 7.86, 1.18],
  ["SAHOL", "sahol.tr", "Sabancı Holding", 2.85, 0.94],
  ["SASA", "sasa.tr", "Sasa Polyester", 1.22, -1.54],
  ["SISE", "sise.tr", "Şişecam", 1.52, 0.61],
  ["TCELL", "tcell.tr", "Turkcell", 2.71, 1.06],
  ["THYAO", "thyao.tr", "Türk Hava Yolları", 9.64, 8.74],
  ["TOASO", "toaso.tr", "Tofaş", 8.12, -0.48],
  ["TUPRS", "tuprs.tr", "Tüpraş", 5.34, 0.31],
  ["YKBNK", "ykbnk.tr", "Yapı Kredi", 0.92, 1.78],
];

const bist30: MarketSeed[] = bist30Rows.map(([symbol, dataSymbol, name, priceUsd, changePercent]) => ({
  symbol,
  dataSymbol,
  name,
  priceUsd,
  changePercent,
  market: "BIST / İMKB",
  category: "BIST" as const,
}));

const usStockRows: UsEquityTuple[] = [
  ["AAPL", "aapl.us", "Apple", "NASDAQ", 188.3, -2.11],
  ["MSFT", "msft.us", "Microsoft", "NASDAQ", 421.8, 1.36],
  ["NVDA", "nvda.us", "NVIDIA", "NASDAQ", 925.1, 4.95],
  ["AMZN", "amzn.us", "Amazon", "NASDAQ", 184.6, 0.92],
  ["GOOGL", "googl.us", "Alphabet A", "NASDAQ", 165.4, 0.74],
  ["META", "meta.us", "Meta Platforms", "NASDAQ", 493.2, 1.21],
  ["TSLA", "tsla.us", "Tesla", "NASDAQ", 172.2, -4.22],
  ["AVGO", "avgo.us", "Broadcom", "NASDAQ", 1348.7, 2.14],
  ["COST", "cost.us", "Costco", "NASDAQ", 734.5, 0.48],
  ["NFLX", "nflx.us", "Netflix", "NASDAQ", 608.4, 1.88],
  ["AMD", "amd.us", "AMD", "NASDAQ", 152.3, -1.72],
  ["ADBE", "adbe.us", "Adobe", "NASDAQ", 477.2, -0.64],
  ["PEP", "pep.us", "PepsiCo", "NASDAQ", 176.9, 0.22],
  ["INTC", "intc.us", "Intel", "NASDAQ", 34.8, -1.08],
  ["CSCO", "csco.us", "Cisco", "NASDAQ", 49.7, 0.34],
  ["JPM", "jpm.us", "JPMorgan Chase", "DOW", 198.4, 0.69],
  ["V", "v.us", "Visa", "DOW", 275.6, 0.38],
  ["UNH", "unh.us", "UnitedHealth", "DOW", 508.3, -0.52],
  ["HD", "hd.us", "Home Depot", "DOW", 341.2, 0.26],
  ["MCD", "mcd.us", "McDonald's", "DOW", 273.5, -0.18],
  ["CAT", "cat.us", "Caterpillar", "DOW", 345.1, 1.08],
  ["KO", "ko.us", "Coca-Cola", "DOW", 62.4, 0.16],
  ["DIS", "dis.us", "Disney", "DOW", 113.2, -0.74],
  ["BA", "ba.us", "Boeing", "DOW", 178.6, -1.42],
  ["IBM", "ibm.us", "IBM", "DOW", 185.7, 0.58],
];

const usStocks: MarketSeed[] = usStockRows.map(([symbol, dataSymbol, name, market, priceUsd, changePercent]) => ({
  symbol,
  dataSymbol,
  name,
  market: `${market} Hisse`,
  category: market === "DOW" ? "DOW" as const : "NASDAQ" as const,
  priceUsd,
  changePercent,
}));

const fxAndCommodities: MarketSeed[] = [
  { symbol: "USD/TRY", dataSymbol: "usdtry", name: "Dolar TL", market: "Majör Döviz", category: "FX", priceUsd: 1, changePercent: 0.42 },
  { symbol: "EUR/TRY", dataSymbol: "eurtry", name: "Euro TL", market: "Majör Döviz", category: "FX", priceUsd: 1.08, changePercent: 3.18 },
  { symbol: "GBP/TRY", dataSymbol: "gbptry", name: "Sterlin TL", market: "Majör Döviz", category: "FX", priceUsd: 1.25, changePercent: 1.46 },
  { symbol: "CHF/TRY", dataSymbol: "chftry", name: "Frank TL", market: "Majör Döviz", category: "FX", priceUsd: 1.1, changePercent: 0.84 },
  { symbol: "EUR/USD", dataSymbol: "eurusd", name: "Euro Dolar", market: "Majör Döviz", category: "FX", priceUsd: 1.08, changePercent: 0.18 },
  { symbol: "GBP/USD", dataSymbol: "gbpusd", name: "Sterlin Dolar", market: "Majör Döviz", category: "FX", priceUsd: 1.25, changePercent: -2.35 },
  { symbol: "USD/JPY", dataSymbol: "usdjpy", name: "Dolar Yen", market: "Majör Döviz", category: "FX", priceUsd: 1, changePercent: 1.68 },
  { symbol: "USD/CHF", dataSymbol: "usdchf", name: "Dolar Frank", market: "Majör Döviz", category: "FX", priceUsd: 1, changePercent: -0.22 },
  { symbol: "AUD/USD", dataSymbol: "audusd", name: "Avustralya Doları", market: "Majör Döviz", category: "FX", priceUsd: 0.66, changePercent: 0.36 },
  { symbol: "USD/CAD", dataSymbol: "usdcad", name: "Dolar Kanada Doları", market: "Majör Döviz", category: "FX", priceUsd: 1, changePercent: 0.2 },
  { symbol: "XAU/USD", dataSymbol: "xauusd", name: "Altın Ons", market: "Emtia", category: "COMMODITY", priceUsd: 2318, changePercent: 2.44 },
  { symbol: "XAG/USD", dataSymbol: "xagusd", name: "Gümüş Ons", market: "Emtia", category: "COMMODITY", priceUsd: 27.12, changePercent: 5.38 },
  { symbol: "COPPER", dataSymbol: "hg.f", name: "Bakır", market: "Emtia", category: "COMMODITY", priceUsd: 4.61, changePercent: 1.22 },
  { symbol: "BRONZE", dataSymbol: "bronze", name: "Bronz", market: "Emtia", category: "COMMODITY", priceUsd: 4.08, changePercent: 0.74, dataStatus: "representative", source: "representative" },
  { symbol: "PALLADIUM", dataSymbol: "pa.f", name: "Paladyum", market: "Emtia", category: "COMMODITY", priceUsd: 982.4, changePercent: -0.82 },
  { symbol: "PLATIN", dataSymbol: "pl.f", name: "Platin", market: "Emtia", category: "COMMODITY", priceUsd: 918.4, changePercent: -6.01 },
  { symbol: "WTI", dataSymbol: "cl.f", name: "Ham Petrol", market: "Emtia", category: "COMMODITY", priceUsd: 78.2, changePercent: -1.36 },
  { symbol: "BRENT", dataSymbol: "brn.f", name: "Brent Petrol", market: "Emtia", category: "COMMODITY", priceUsd: 82.1, changePercent: -1.92 },
  { symbol: "NATGAS", dataSymbol: "ng.f", name: "Doğalgaz", market: "Emtia", category: "COMMODITY", priceUsd: 2.18, changePercent: 2.01 },
];

const cryptoRows: CryptoTuple[] = [
  ["BTC", "Bitcoin", 64920, 6.42],
  ["ETH", "Ethereum", 3180, 4.61],
  ["BNB", "BNB", 592, 2.18],
  ["SOL", "Solana", 142.8, -3.94],
  ["XRP", "XRP", 0.56, 1.02],
  ["ADA", "Cardano", 0.46, -0.88],
  ["DOGE", "Dogecoin", 0.142, -1.36],
  ["AVAX", "Avalanche", 36.4, 2.44],
  ["TRX", "TRON", 0.12, 0.64],
  ["DOT", "Polkadot", 6.8, -0.58],
  ["MATIC", "Polygon", 0.71, 1.48],
  ["LINK", "Chainlink", 14.9, 2.06],
  ["TON", "Toncoin", 5.74, 3.22],
  ["SHIB", "Shiba Inu", 0.000024, -2.04],
  ["LTC", "Litecoin", 82.1, 0.92],
  ["BCH", "Bitcoin Cash", 448, 1.74],
  ["UNI", "Uniswap", 7.92, -0.38],
  ["ATOM", "Cosmos", 8.41, 0.46],
  ["ETC", "Ethereum Classic", 27.3, -1.14],
  ["XLM", "Stellar", 0.11, 0.22],
];

const cryptoSeeds: MarketSeed[] = cryptoRows.map(([symbol, name, priceUsd, changePercent]) => ({
  symbol,
  dataSymbol: `${String(symbol).toLowerCase()}usd`,
  name,
  market: "Kripto",
  category: "CRYPTO" as const,
  priceUsd,
  changePercent,
}));

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

const indexes: MarketSeed[] = [
  { symbol: "S&P 500", dataSymbol: "^spx", name: "S&P 500 Endeksi", market: "Endeks", category: "INDEX", priceUsd: 5241, changePercent: 1.92 },
  { symbol: "NASDAQ", dataSymbol: "^ndq", name: "Nasdaq 100", market: "Endeks", category: "INDEX", priceUsd: 18042, changePercent: -3.08 },
  { symbol: "DJIA", dataSymbol: "^dji", name: "Dow Jones Endeksi", market: "Endeks", category: "INDEX", priceUsd: 38624, changePercent: 0.44 },
];

export const mixedMarketItems: MarketItem[] = [
  ...bist30,
  ...usStocks,
  ...fxAndCommodities,
  ...cryptoSeeds,
  ...fixedIncome,
  ...indexes,
].map(item);

export const portfolioItems: MarketItem[] = [
  mixedMarketItems[0],
  mixedMarketItems[1],
  mixedMarketItems[7],
  mixedMarketItems[5],
];

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
