import type { MarketExchange, WatchSymbol } from "@/lib/ai-market/types";

type AssetWatchlistProps = {
  symbols: WatchSymbol[];
  selectedSymbol: string;
  exchange: MarketExchange;
  interval: string;
  onSymbolChange: (symbol: string) => void;
  onExchangeChange: (exchange: MarketExchange) => void;
  onIntervalChange: (interval: string) => void;
};

const intervals = [
  { value: "15m", label: "15 dk" },
  { value: "1h", label: "1 saat" },
  { value: "4h", label: "4 saat" },
  { value: "1d", label: "1 gün" },
];

export function AssetWatchlist({
  symbols,
  selectedSymbol,
  exchange,
  interval,
  onSymbolChange,
  onExchangeChange,
  onIntervalChange,
}: AssetWatchlistProps) {
  return (
    <aside className="premium-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[#152033]">Takip listesi</h2>
          <p className="mt-1 text-xs text-slate-500">Public Binance ve Gate.io verileri</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onExchangeChange("binance")}
          className={`rounded-md border px-3 py-2 text-sm font-black ${
            exchange === "binance" ? "border-[#0f766e] bg-emerald-50 text-[#0f766e]" : "border-slate-200 bg-white/70 text-slate-600"
          }`}
        >
          Binance
        </button>
        <button
          type="button"
          onClick={() => onExchangeChange("gate")}
          className={`rounded-md border px-3 py-2 text-sm font-black ${
            exchange === "gate" ? "border-[#0f766e] bg-emerald-50 text-[#0f766e]" : "border-slate-200 bg-white/70 text-slate-600"
          }`}
        >
          Gate.io
        </button>
      </div>

      <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-500" htmlFor="ai-market-interval">
        Periyot
      </label>
      <select
        id="ai-market-interval"
        value={interval}
        onChange={(event) => onIntervalChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold"
      >
        {intervals.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <div className="mt-4 grid gap-2">
        {symbols.map((item) => (
          <button
            key={item.symbol}
            type="button"
            onClick={() => onSymbolChange(item.symbol)}
            className={`rounded-md border p-3 text-left ${
              selectedSymbol === item.symbol
                ? "border-[#f5a623] bg-amber-50 shadow-sm"
                : "border-white/70 bg-white/60 hover:border-[#0f766e]"
            }`}
          >
            <span className="block text-sm font-black text-[#152033]">{item.baseAsset}/USDT</span>
            <span className="mt-1 block text-xs text-slate-500">{item.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
