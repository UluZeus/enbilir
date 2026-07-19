import type { AssetClass } from "@/lib/ai-market/types";

export type MacroCoverageAsset = {
  symbol: string;
  displayName: string;
  name: string;
  assetClass: AssetClass;
  category: string;
  providerSymbol: string;
  whyRequired: string;
};

export const REQUIRED_MACRO_COVERAGE_LABELS = [
  "Altin",
  "Gumus",
  "Euro",
  "USD",
  "Turk lirasi",
  "BIST 100",
  "Dow Jones",
  "Nasdaq",
  "Brent petrol",
  "Kripto varliklar",
  "Paladyum",
  "Enerji hisseleri",
  "Nukleer enerji hisseleri",
  "Yapay zeka hisseleri",
  "Cin borsalari",
  "Japon borsalari",
  "Uzak Dogu borsalari",
  "Donemsel makro konjonktur",
];

export const REQUIRED_MACRO_ASSETS: MacroCoverageAsset[] = [
  { symbol: "XAUUSD", displayName: "XAU/USD", name: "Ons altin", assetClass: "COMMODITY", category: "metals", providerSymbol: "GC=F", whyRequired: "Altin guvenli liman ve reel faiz hassasiyeti" },
  { symbol: "XAGUSD", displayName: "XAG/USD", name: "Ons gumus", assetClass: "COMMODITY", category: "metals", providerSymbol: "SI=F", whyRequired: "Gumus hem degerli metal hem sanayi talebi gostergesi" },
  { symbol: "EURUSD=X", displayName: "EUR/USD", name: "Euro/Dolar", assetClass: "FX", category: "fx", providerSymbol: "EURUSD=X", whyRequired: "Euro dolar paritesi global dolar likiditesini yansitir" },
  { symbol: "USDTRY", displayName: "USD/TRY", name: "Dolar/TL", assetClass: "FX", category: "fx-try", providerSymbol: "TRY=X", whyRequired: "Turk lirasi ve yerel risk algisi" },
  { symbol: "EURTRY", displayName: "EUR/TRY", name: "Euro/TL", assetClass: "FX", category: "fx-try", providerSymbol: "EURTRY=X", whyRequired: "Euro ve TL etkisini birlikte izler" },
  { symbol: "XU100.IS", displayName: "BIST 100", name: "BIST 100", assetClass: "INDEX", category: "turkey-equity", providerSymbol: "XU100.IS", whyRequired: "Turkiye hisse piyasasi ana gostergesi" },
  { symbol: "^DJI", displayName: "Dow Jones", name: "Dow Jones Industrial Average", assetClass: "INDEX", category: "us-index", providerSymbol: "^DJI", whyRequired: "ABD sanayi ve defansif buyuk sirketler" },
  { symbol: "^IXIC", displayName: "Nasdaq", name: "Nasdaq Composite", assetClass: "INDEX", category: "us-index", providerSymbol: "^IXIC", whyRequired: "Teknoloji ve buyume hisseleri risk istahi" },
  { symbol: "BZ=F", displayName: "Brent", name: "Brent petrol", assetClass: "COMMODITY", category: "energy", providerSymbol: "BZ=F", whyRequired: "Enerji maliyeti ve enflasyon baskisi" },
  { symbol: "BTCUSDT", displayName: "BTC", name: "Bitcoin", assetClass: "CRYPTO", category: "crypto", providerSymbol: "BTCUSDT", whyRequired: "Kuresel likidite ve dijital varlik risk istahi" },
  { symbol: "ETHUSDT", displayName: "ETH", name: "Ethereum", assetClass: "CRYPTO", category: "crypto", providerSymbol: "ETHUSDT", whyRequired: "Akilli sozlesme ekosistemi ve dijital varlik risk istahi" },
  { symbol: "PA=F", displayName: "Paladyum", name: "Paladyum vadeli", assetClass: "COMMODITY", category: "metals", providerSymbol: "PA=F", whyRequired: "Otomotiv ve sanayi metali konjonkturu" },
  { symbol: "XLE", displayName: "XLE", name: "Energy Select Sector SPDR", assetClass: "EQUITY", category: "energy-stocks", providerSymbol: "XLE", whyRequired: "ABD enerji hisseleri sepeti" },
  { symbol: "XOM", displayName: "XOM", name: "Exxon Mobil", assetClass: "EQUITY", category: "energy-stocks", providerSymbol: "XOM", whyRequired: "Kuresel enerji devleri" },
  { symbol: "URA", displayName: "URA", name: "Global X Uranium ETF", assetClass: "EQUITY", category: "nuclear-energy", providerSymbol: "URA", whyRequired: "Uranyum ve nukleer enerji temasi" },
  { symbol: "CCJ", displayName: "CCJ", name: "Cameco", assetClass: "EQUITY", category: "nuclear-energy", providerSymbol: "CCJ", whyRequired: "Nukleer yakit zinciri" },
  { symbol: "NVDA", displayName: "NVDA", name: "Nvidia", assetClass: "EQUITY", category: "ai-stocks", providerSymbol: "NVDA", whyRequired: "AI altyapi lideri" },
  { symbol: "AMD", displayName: "AMD", name: "Advanced Micro Devices", assetClass: "EQUITY", category: "ai-stocks", providerSymbol: "AMD", whyRequired: "AI cipi rekabeti" },
  { symbol: "MSFT", displayName: "MSFT", name: "Microsoft", assetClass: "EQUITY", category: "ai-stocks", providerSymbol: "MSFT", whyRequired: "Kurumsal AI ve bulut talebi" },
  { symbol: "000001.SS", displayName: "Shanghai Composite", name: "Cin Shanghai Composite", assetClass: "INDEX", category: "asia-index", providerSymbol: "000001.SS", whyRequired: "Cin ana borsa gostergesi" },
  { symbol: "^HSI", displayName: "Hang Seng", name: "Hong Kong Hang Seng", assetClass: "INDEX", category: "asia-index", providerSymbol: "^HSI", whyRequired: "Cin/Hong Kong risk algisi" },
  { symbol: "^N225", displayName: "Nikkei 225", name: "Japonya Nikkei 225", assetClass: "INDEX", category: "asia-index", providerSymbol: "^N225", whyRequired: "Japonya borsasi ve yen etkisi" },
  { symbol: "^KS11", displayName: "KOSPI", name: "Guney Kore KOSPI", assetClass: "INDEX", category: "asia-index", providerSymbol: "^KS11", whyRequired: "Uzak Dogu teknoloji/sanayi zinciri" },
  { symbol: "^TWII", displayName: "Taiwan Weighted", name: "Tayvan borsasi", assetClass: "INDEX", category: "asia-index", providerSymbol: "^TWII", whyRequired: "Yari iletken ekosistemi" },
];

export function getRequiredMacroSymbols() {
  return REQUIRED_MACRO_ASSETS.map((asset) => asset.symbol);
}
