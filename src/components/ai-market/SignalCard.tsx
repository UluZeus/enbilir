import type { MarketAnalysis, SignalType } from "@/lib/ai-market/types";

const signalLabels: Record<SignalType, string> = {
  STRONG_BUY: "Güçlü Al İzlemesi",
  BUY: "Al İzlemesi",
  WATCH: "Yakından İzle",
  HOLD: "Bekle",
  TAKE_PROFIT: "Kar Alımı İzle",
  SELL: "Satış Baskısı",
  AVOID: "Uzak Dur",
  NO_TRADE: "İşlem Yok",
};

const signalStyles: Record<SignalType, string> = {
  STRONG_BUY: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  BUY: "bg-teal-100 text-teal-800 ring-teal-200",
  WATCH: "bg-sky-100 text-sky-800 ring-sky-200",
  HOLD: "bg-slate-100 text-slate-700 ring-slate-200",
  TAKE_PROFIT: "bg-amber-100 text-amber-800 ring-amber-200",
  SELL: "bg-red-100 text-red-800 ring-red-200",
  AVOID: "bg-rose-100 text-rose-800 ring-rose-200",
  NO_TRADE: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

function formatPrice(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${value.toLocaleString("tr-TR", { maximumFractionDigits: value < 1 ? 6 : 2 })} USDT`;
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function SignalCard({ analysis }: { analysis: MarketAnalysis }) {
  const providerLabel = ["XAUUSD", "XAGUSD", "USDTRY"].includes(analysis.symbol)
    ? "Yahoo public veri"
    : `${analysis.exchange === "binance" ? "Binance" : "Gate.io"} public veri`;

  return (
    <section className="premium-card premium-card--dark p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5a623]">
            {providerLabel}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-normal text-white">{analysis.name}</h2>
          <p className="mt-1 text-sm text-slate-300">{analysis.symbol} - {analysis.interval}</p>
        </div>
        <span className={`inline-flex rounded-md px-3 py-2 text-sm font-black ring-1 ${signalStyles[analysis.signal.signal]}`}>
          {signalLabels[analysis.signal.signal]}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Son fiyat" value={formatPrice(analysis.lastPrice)} />
        <Metric label="Periyot değişimi" value={formatPercent(analysis.changePercent)} />
        <Metric label="Güven" value={`${analysis.signal.confidence}/100`} />
      </div>

      <div className="mt-5 rounded-md border border-white/10 bg-white/5 p-4">
        <p className="text-sm leading-6 text-slate-200">{analysis.explanation}</p>
      </div>

      <div className="mt-4 grid gap-2">
        {analysis.signal.reasons.map((reason) => (
          <p key={reason} className="rounded-md bg-black/20 px-3 py-2 text-sm text-slate-200">
            {reason}
          </p>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
