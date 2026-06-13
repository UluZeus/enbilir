import { formatMarketItemPrice, type MarketItem } from "@/lib/market-data";

type MarketPulseProps = {
  locale: string;
  items: MarketItem[];
  title: string;
  subtitle: string;
  accentLabel: string;
};

function formatUpdatedCount(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function TrendRow({ label, item }: { label: string; item: MarketItem | undefined }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      {item ? (
        <div className="mt-2 grid gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#152033]">{item.symbol}</p>
              <p className="truncate text-xs font-semibold text-slate-500">{item.name}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">{formatMarketItemPrice(item)}</p>
            </div>
            <p className={`shrink-0 text-sm font-black ${item.changePercent >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {item.changePercent >= 0 ? "+" : ""}
              {item.changePercent.toFixed(2)}%
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
            <span>{item.market}</span>
            <span>{formatMarketItemPrice(item)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Veri bekleniyor.</p>
      )}
    </div>
  );
}

export function MarketPulse({ locale, items, title, subtitle, accentLabel }: MarketPulseProps) {
  const safeItems = Array.isArray(items) ? items : [];
  const positiveCount = safeItems.filter((item) => item.changePercent >= 0).length;
  const negativeCount = safeItems.length - positiveCount;
  const topRiser = [...safeItems].sort((a, b) => b.changePercent - a.changePercent)[0];
  const topFaller = [...safeItems].sort((a, b) => a.changePercent - b.changePercent)[0];
  const caption = locale === "en" ? "Live scan every 30 seconds" : "30 saniyede bir canlı tarama";

  return (
    <section className="dashboard-shell grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr] lg:p-6">
      <div className="rounded-[1.1rem] bg-[#101827] p-5 text-white shadow-[0_24px_60px_rgba(16,24,39,0.24)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">{accentLabel}</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h2>
          </div>
          <span className="status-chip border-white/10 bg-white/10 text-xs font-bold text-slate-100">
            <span className="status-chip__dot" />
            {caption}
          </span>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{subtitle}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Ürün</p>
            <p className="mt-1 text-2xl font-black">{formatUpdatedCount(safeItems.length)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">Yükselen</p>
            <p className="mt-1 text-2xl font-black text-emerald-200">{formatUpdatedCount(positiveCount)}</p>
          </div>
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100">Düşen</p>
            <p className="mt-1 text-2xl font-black text-red-200">{formatUpdatedCount(negativeCount)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">En güçlü yükselen</p>
            <p className="mt-1 text-lg font-black">{topRiser ? topRiser.symbol : "-"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">En güçlü düşen</p>
            <p className="mt-1 text-lg font-black">{topFaller ? topFaller.symbol : "-"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <TrendRow label="Top yükselen" item={topRiser} />
        <TrendRow label="Top düşen" item={topFaller} />
      </div>
    </section>
  );
}
