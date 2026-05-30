"use client";

type QuickWatchlistPanelProps = {
  favorites: string[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  getAssetLabel: (symbol: string) => string;
};

export function QuickWatchlistPanel({ favorites, selectedSymbol, onSelectSymbol, getAssetLabel }: QuickWatchlistPanelProps) {
  const visibleFavorites = favorites.slice(0, 12);

  return (
    <section className="rounded-md border border-slate-800 bg-[#0b111d] p-3 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Watchlist</p>
          <h2 className="mt-1 text-sm font-black text-white">Hızlı İzleme</h2>
        </div>
        <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] font-black text-slate-300">
          {favorites.length}
        </span>
      </div>

      <div className="mt-3 grid gap-1.5">
        {visibleFavorites.length === 0 ? (
          <p className="rounded-md border border-slate-800 bg-slate-950/70 p-3 text-xs font-semibold text-slate-400">
            Favori listen boş.
          </p>
        ) : (
          visibleFavorites.map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => onSelectSymbol(symbol)}
              className={`rounded-md border px-3 py-2 text-left ${
                selectedSymbol === symbol
                  ? "border-amber-300/40 bg-amber-300/10"
                  : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
              }`}
            >
              <span className="block truncate text-xs font-black text-slate-100">{symbol}</span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{getAssetLabel(symbol)}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
