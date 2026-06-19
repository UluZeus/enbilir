"use client";

import { getSafeLocale, type Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";

type QuickWatchlistPanelProps = {
  locale: Locale | string;
  favorites: string[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  getAssetLabel: (symbol: string) => string;
};

export function QuickWatchlistPanel({ locale, favorites, selectedSymbol, onSelectSymbol, getAssetLabel }: QuickWatchlistPanelProps) {
  const copy = getUiCopy(getSafeLocale(locale));
  const visibleFavorites = favorites.slice(0, 12);

  return (
    <section className="quick-watchlist-panel rounded-md border border-slate-800 bg-[#0b111d] p-3 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="quick-watchlist-kicker text-xs font-black uppercase tracking-[0.14em] text-slate-500">Watchlist</p>
          <h2 className="quick-watchlist-title mt-1 text-sm font-black text-white">{copy.ai.focusAsset}</h2>
        </div>
        <span className="quick-watchlist-count rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-black text-slate-300">
          {favorites.length}
        </span>
      </div>

      <div className="mt-3 grid gap-1.5">
        {visibleFavorites.length === 0 ? (
          <p className="rounded-md border border-slate-800 bg-slate-950/70 p-3 text-xs font-semibold text-slate-400">
            {copy.ai.emptyFavoritesTable}
          </p>
        ) : (
          visibleFavorites.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => onSelectSymbol(symbol)}
              className={`quick-watchlist-item rounded-md border px-3 py-2 text-left ${
                selectedSymbol === symbol
                  ? "border-amber-300/40 bg-amber-300/10"
                  : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
              }`}
            >
              <span className="quick-watchlist-symbol block truncate text-xs font-black text-slate-100">{symbol}</span>
              <span className="quick-watchlist-name mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{getAssetLabel(symbol)}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
