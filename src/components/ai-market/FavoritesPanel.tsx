"use client";

import type { WatchSymbol } from "@/lib/ai-market/types";

export const AI_MARKET_FAVORITES_STORAGE_KEY = "ai-market-favorites";

export const DEFAULT_AI_MARKET_FAVORITES = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XAUUSD",
  "XAGUSD",
  "USDTRY",
  "AAPL",
  "NVDA",
  "^GSPC",
  "^IXIC",
];

export type FavoriteAsset = {
  symbol: string;
  displayName: string;
  name: string;
  assetClass: "CRYPTO" | "COMMODITY" | "FX" | "EQUITY" | "INDEX";
  exchange?: string;
};

type FavoritesPanelProps = {
  favorites: string[];
  symbols: WatchSymbol[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onRemoveFavorite: (symbol: string) => void;
};

function getKnownAsset(symbol: string, symbols: WatchSymbol[]) {
  const watchSymbol = symbols.find((item) => item.symbol === symbol);

  if (watchSymbol) {
    return {
      symbol: watchSymbol.symbol,
      displayName: `${watchSymbol.baseAsset}/${watchSymbol.quoteAsset}`,
      name: watchSymbol.name,
    };
  }

  const preparedAsset = PREPARED_FAVORITE_ASSETS.find((item) => item.symbol === symbol);

  return {
    symbol,
    displayName: preparedAsset?.displayName ?? symbol,
    name: preparedAsset?.name ?? "Favori varlik",
  };
}

export function FavoritesPanel({
  favorites,
  symbols,
  selectedSymbol,
  onSelectSymbol,
  onRemoveFavorite,
}: FavoritesPanelProps) {
  const supportedSymbols = new Set(symbols.map((item) => item.symbol));

  return (
    <section className="premium-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[#152033]">Favorilerim</h2>
          <p className="mt-1 text-xs text-slate-500">{favorites.length} varlik localStorage icinde saklaniyor</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {favorites.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white/70 p-3 text-sm font-semibold text-slate-500">
            Favori listen bos.
          </p>
        ) : (
          favorites.map((symbol) => {
            const asset = getKnownAsset(symbol, symbols);
            const canAnalyze = supportedSymbols.has(symbol);

            return (
              <div key={symbol} className="rounded-md border border-white/70 bg-white/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#152033]">{asset.displayName}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{asset.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFavorite(symbol)}
                    className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-black text-red-700 hover:border-red-200"
                  >
                    Cikar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectSymbol(symbol)}
                  disabled={!canAnalyze}
                  className={`mt-3 w-full rounded-md border px-3 py-2 text-sm font-black ${
                    selectedSymbol === symbol
                      ? "border-[#f5a623] bg-amber-50 text-[#8a5a00]"
                      : canAnalyze
                        ? "border-[#0f766e] bg-emerald-50 text-[#0f766e] hover:bg-emerald-100"
                        : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {canAnalyze ? "Analiz et" : "Analiz daha sonra"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export const PREPARED_FAVORITE_ASSETS: FavoriteAsset[] = [
  { symbol: "XAUUSD", displayName: "XAU/USD", name: "Ons Altin", assetClass: "COMMODITY" },
  { symbol: "XAGUSD", displayName: "XAG/USD", name: "Ons Gumus", assetClass: "COMMODITY" },
  { symbol: "HG=F", displayName: "HG=F", name: "Bakir", assetClass: "COMMODITY" },
  { symbol: "PL=F", displayName: "PL=F", name: "Platin", assetClass: "COMMODITY" },
  { symbol: "PA=F", displayName: "PA=F", name: "Paladyum", assetClass: "COMMODITY" },
  { symbol: "USDTRY", displayName: "USD/TRY", name: "Dolar/TL", assetClass: "FX" },
  { symbol: "EURUSD=X", displayName: "EUR/USD", name: "EUR/USD", assetClass: "FX" },
  { symbol: "AAPL", displayName: "AAPL", name: "Apple", assetClass: "EQUITY" },
  { symbol: "MSFT", displayName: "MSFT", name: "Microsoft", assetClass: "EQUITY" },
  { symbol: "NVDA", displayName: "NVDA", name: "Nvidia", assetClass: "EQUITY" },
  { symbol: "AMZN", displayName: "AMZN", name: "Amazon", assetClass: "EQUITY" },
  { symbol: "META", displayName: "META", name: "Meta", assetClass: "EQUITY" },
  { symbol: "GOOGL", displayName: "GOOGL", name: "Alphabet", assetClass: "EQUITY" },
  { symbol: "TSLA", displayName: "TSLA", name: "Tesla", assetClass: "EQUITY" },
  { symbol: "AMD", displayName: "AMD", name: "AMD", assetClass: "EQUITY" },
  { symbol: "NFLX", displayName: "NFLX", name: "Netflix", assetClass: "EQUITY" },
  { symbol: "AVGO", displayName: "AVGO", name: "Broadcom", assetClass: "EQUITY" },
  { symbol: "^GSPC", displayName: "^GSPC", name: "S&P 500", assetClass: "INDEX" },
  { symbol: "^IXIC", displayName: "^IXIC", name: "Nasdaq Composite", assetClass: "INDEX" },
  { symbol: "^NDX", displayName: "^NDX", name: "Nasdaq 100", assetClass: "INDEX" },
];
