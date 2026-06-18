"use client";

import { getSafeLocale, type Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getAssetUniverseItem, STATIC_ASSET_UNIVERSE } from "@/lib/ai-market/asset-universe";
import { AI_MARKET_FAVORITES_STORAGE_KEY, DEFAULT_AI_MARKET_FAVORITES } from "@/lib/ai-market/favorite-defaults";
import type { AssetClass, WatchSymbol } from "@/lib/ai-market/types";

export { AI_MARKET_FAVORITES_STORAGE_KEY, DEFAULT_AI_MARKET_FAVORITES };

export type FavoriteAsset = {
  symbol: string;
  displayName: string;
  name: string;
  assetClass: AssetClass;
  exchange?: string;
};

type FavoritesPanelProps = {
  locale?: Locale | string;
  favorites: string[];
  symbols: WatchSymbol[];
  selectedSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
  onRemoveFavorite: (symbol: string) => void;
};

const assetClassLabels: Record<FavoriteAsset["assetClass"], string> = {
  CRYPTO: "Kripto",
  COMMODITY: "Metal",
  FX: "FX",
  EQUITY: "Hisse",
  INDEX: "Endeks",
};

const favoriteGroups: Array<{ key: FavoriteAsset["assetClass"]; title: string }> = [
  { key: "CRYPTO", title: "Kripto Favorileri" },
  { key: "COMMODITY", title: "Metal Favorileri" },
  { key: "EQUITY", title: "Hisse Favorileri" },
  { key: "INDEX", title: "Endeks Favorileri" },
  { key: "FX", title: "FX Favorileri" },
];

export function getAssetClassLabel(assetClass: FavoriteAsset["assetClass"]) {
  return assetClassLabels[assetClass];
}

export function getKnownAsset(symbol: string, symbols: WatchSymbol[]): FavoriteAsset {
  const watchSymbol = symbols.find((item) => item.symbol === symbol);

  if (watchSymbol) {
    return {
      symbol: watchSymbol.symbol,
      displayName: `${watchSymbol.baseAsset}/${watchSymbol.quoteAsset}`,
      name: watchSymbol.name,
      assetClass: watchSymbol.assetClass,
      exchange: watchSymbol.assetClass === "CRYPTO" ? "Binance / Gate.io" : "Yahoo",
    };
  }

  const universeAsset = getAssetUniverseItem(symbol);

  return {
    symbol,
    displayName: universeAsset?.displayName ?? symbol,
    name: universeAsset?.name ?? "Favori varlik",
    assetClass: universeAsset?.assetClass ?? "CRYPTO",
    exchange: universeAsset?.exchangeLabel,
  };
}

export function FavoritesPanel({
  locale = "tr",
  favorites,
  symbols,
  selectedSymbol,
  onSelectSymbol,
  onRemoveFavorite,
}: FavoritesPanelProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale);
  const assetClassLabelsLocalized: Record<FavoriteAsset["assetClass"], string> = safeLocale === "en"
    ? { CRYPTO: "Crypto", COMMODITY: "Metals", FX: "FX", EQUITY: "Equities", INDEX: "Indexes" }
    : assetClassLabels;
  const favoriteGroupsLocalized = favoriteGroups.map((group) => ({
    ...group,
    title: safeLocale === "en" ? `${assetClassLabelsLocalized[group.key]} Favorites` : group.title,
  }));
  const supportedSymbols = new Set(symbols.map((item) => item.symbol));
  const groupedFavorites = favoriteGroupsLocalized.map((group) => ({
    ...group,
    assets: favorites.map((symbol) => getKnownAsset(symbol, symbols)).filter((asset) => asset.assetClass === group.key),
  }));

  return (
    <section className="premium-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-black text-[#152033]">{copy.ai.favorites}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {safeLocale === "en" ? `${favorites.length} assets are synced for the AI agent` : `${favorites.length} varlık AI ajanı için senkronize ediliyor`}
          </p>
        </div>
        <span className="w-fit rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-xs font-black text-slate-600">
          {copy.ai.favoritesCount(favorites.length)}
        </span>
      </div>

      {favorites.length > 30 ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
          {safeLocale === "en" ? "Selecting more than 30 favorites can slow down automatic analysis." : "30’dan fazla favori seçmek otomatik analiz performansını yavaşlatabilir."}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4">
        {favorites.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white/70 p-3 text-sm font-semibold text-slate-500">
            {safeLocale === "en" ? "Your favorites list is empty." : "Favori listen boş."}
          </p>
        ) : (
          groupedFavorites.map((group) =>
            group.assets.length > 0 ? (
              <div key={group.key}>
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{group.title}</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {group.assets.map((asset) => {
                    const canAnalyze = supportedSymbols.has(asset.symbol) || PREPARED_FAVORITE_ASSETS.some((item) => item.symbol === asset.symbol);

                    return (
                      <div key={asset.symbol} className="rounded-md border border-white/70 bg-white/60 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-[#152033]">{asset.displayName}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">{asset.name}</p>
                            <p className="mt-2 w-fit rounded-md border border-slate-200 bg-white/70 px-2 py-1 text-[11px] font-black text-slate-500">
                              {assetClassLabelsLocalized[asset.assetClass]}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveFavorite(asset.symbol)}
                            className="rounded-md border border-red-100 bg-red-50 px-2 py-1 text-xs font-black text-red-700 hover:border-red-200"
                          >
                            {safeLocale === "en" ? "Remove" : "Çıkar"}
                          </button>
                        </div>

                        {onSelectSymbol ? (
                          <button
                            type="button"
                            onClick={() => onSelectSymbol(asset.symbol)}
                            disabled={!canAnalyze}
                            className={`mt-3 w-full rounded-md border px-3 py-2 text-sm font-black ${
                              selectedSymbol === asset.symbol
                                ? "border-[#f5a623] bg-amber-50 text-[#8a5a00]"
                                : canAnalyze
                                  ? "border-[#0f766e] bg-emerald-50 text-[#0f766e] hover:bg-emerald-100"
                                  : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                            }`}
                          >
                            {canAnalyze ? (safeLocale === "en" ? "Analyze" : "Analiz et") : (safeLocale === "en" ? "Analyze later" : "Analiz daha sonra")}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )
        )}
      </div>
    </section>
  );
}

export const PREPARED_FAVORITE_ASSETS: FavoriteAsset[] = STATIC_ASSET_UNIVERSE.map((asset) => ({
  symbol: asset.symbol,
  displayName: asset.displayName,
  name: asset.name,
  assetClass: asset.assetClass,
  exchange: asset.exchangeLabel,
}));
