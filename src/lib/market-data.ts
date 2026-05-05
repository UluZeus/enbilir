export type MarketItem = {
  symbol: string;
  dataSymbol: string;
  name: string;
  market: string;
  price: string;
  priceUsd: number;
  changePercent: number;
};

export const mixedMarketItems: MarketItem[] = [
  { symbol: "THYAO", dataSymbol: "thyao.tr", name: "Türk Hava Yolları", market: "BIST", price: "312.40", priceUsd: 9.64, changePercent: 8.74 },
  { symbol: "BTC", dataSymbol: "btcusd", name: "Bitcoin", market: "Kripto", price: "64,920", priceUsd: 64920, changePercent: 6.42 },
  { symbol: "XAG/USD", dataSymbol: "xagusd", name: "Gümüş Ons", market: "Emtia", price: "27.12", priceUsd: 27.12, changePercent: 5.38 },
  { symbol: "NVDA", dataSymbol: "nvda.us", name: "NVIDIA", market: "ABD Hisse", price: "925.10", priceUsd: 925.1, changePercent: 4.95 },
  { symbol: "ETH", dataSymbol: "ethusd", name: "Ethereum", market: "Kripto", price: "3,180", priceUsd: 3180, changePercent: 4.61 },
  { symbol: "EUR/TRY", dataSymbol: "eurtry", name: "Euro TL", market: "Döviz", price: "35.21", priceUsd: 1.08, changePercent: 3.18 },
  { symbol: "ASELS", dataSymbol: "asels.tr", name: "Aselsan", market: "BIST", price: "62.85", priceUsd: 1.94, changePercent: 2.94 },
  { symbol: "XAU/USD", dataSymbol: "xauusd", name: "Altın Ons", market: "Emtia", price: "2,318", priceUsd: 2318, changePercent: 2.44 },
  { symbol: "S&P 500", dataSymbol: "^spx", name: "S&P 500 Endeksi", market: "Endeks", price: "5,241", priceUsd: 5241, changePercent: 1.92 },
  { symbol: "USD/JPY", dataSymbol: "usdjpy", name: "Dolar Yen", market: "Döviz", price: "154.22", priceUsd: 1, changePercent: 1.68 },
  { symbol: "DOGE", dataSymbol: "dogeusd", name: "Dogecoin", market: "Kripto", price: "0.142", priceUsd: 0.142, changePercent: -1.36 },
  { symbol: "BRENT", dataSymbol: "brent", name: "Brent Petrol", market: "Emtia", price: "82.10", priceUsd: 82.1, changePercent: -1.92 },
  { symbol: "AAPL", dataSymbol: "aapl.us", name: "Apple", market: "ABD Hisse", price: "188.30", priceUsd: 188.3, changePercent: -2.11 },
  { symbol: "GBP/USD", dataSymbol: "gbpusd", name: "Sterlin Dolar", market: "Döviz", price: "1.2510", priceUsd: 1.25, changePercent: -2.35 },
  { symbol: "KCHOL", dataSymbol: "kchol.tr", name: "Koç Holding", market: "BIST", price: "207.60", priceUsd: 6.41, changePercent: -2.84 },
  { symbol: "NASDAQ", dataSymbol: "^ndq", name: "Nasdaq 100", market: "Endeks", price: "18,042", priceUsd: 18042, changePercent: -3.08 },
  { symbol: "SOL", dataSymbol: "solusd", name: "Solana", market: "Kripto", price: "142.80", priceUsd: 142.8, changePercent: -3.94 },
  { symbol: "TSLA", dataSymbol: "tsla.us", name: "Tesla", market: "ABD Hisse", price: "172.20", priceUsd: 172.2, changePercent: -4.22 },
  { symbol: "EREGL", dataSymbol: "eregl.tr", name: "Ereğli Demir Çelik", market: "BIST", price: "43.18", priceUsd: 1.33, changePercent: -5.17 },
  { symbol: "PLATIN", dataSymbol: "pl.us", name: "Platin", market: "Emtia", price: "918.40", priceUsd: 918.4, changePercent: -6.01 },
];

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
