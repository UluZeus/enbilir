import type { MarketAnalysis } from "@/lib/ai-market/types";

type MarketRadarPanelProps = {
  analysis: MarketAnalysis | null;
};

function scoreTone(score: number) {
  if (score >= 75) {
    return "text-rose-300";
  }

  if (score >= 55) {
    return "text-amber-300";
  }

  return "text-emerald-300";
}

export function MarketRadarPanel({ analysis }: MarketRadarPanelProps) {
  const riskScore = analysis?.risk.score ?? 0;

  return (
    <section className="rounded-md border border-slate-800 bg-[#0b111d] p-3 shadow-xl">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Piyasa Radarı</p>
      <h2 className="mt-1 text-sm font-black text-white">Binance Global Scan</h2>

      <div className="mt-3 grid gap-2">
        <RadarRow label="Tarama" value="30 sn" tone="text-cyan-300" />
        <RadarRow label="Aday Havuzu" value="30 kripto" tone="text-slate-200" />
        <RadarRow label="Periyot Döngüsü" value="1m / 5m / 15m / 1h / 4h" tone="text-slate-200" />
        <RadarRow label="Odak Risk" value={analysis ? `${riskScore}/100` : "-"} tone={scoreTone(riskScore)} />
      </div>

      <p className="mt-3 rounded-md border border-slate-800 bg-slate-950/70 p-3 text-xs leading-5 text-slate-400">
        Güçlü sinyal oluştuğunda sol üst alarm paneli devreye girer. Sesli alarm kullanıcı onayıyla çalışır.
      </p>
    </section>
  );
}

function RadarRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2">
      <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <span className={`text-xs font-black ${tone}`}>{value}</span>
    </div>
  );
}
