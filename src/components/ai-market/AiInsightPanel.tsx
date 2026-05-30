import type { MarketAnalysis } from "@/lib/ai-market/types";

type AiInsightPanelProps = {
  analysis: MarketAnalysis | null;
};

export function AiInsightPanel({ analysis }: AiInsightPanelProps) {
  const reasons = analysis?.signal.reasons ?? [];
  const riskReasons = analysis?.risk.reasons ?? [];

  return (
    <section className="rounded-md border border-slate-800 bg-[#0b111d] p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300/80">AI Analist Yorumu</p>
          <h2 className="mt-1 text-lg font-black text-white">Karar Destek Özeti</h2>
        </div>
        <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-black text-slate-300">
          {analysis ? `%${analysis.signal.confidence}` : "-"}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">
        {analysis?.explanation ?? "Seçili varlık için public piyasa verisi alındığında AI analist yorumu burada gösterilir."}
      </p>

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        <InsightList title="Sinyal Gerekçeleri" items={reasons} empty="Sinyal gerekçesi bekleniyor." />
        <InsightList title="Risk Notları" items={riskReasons} empty="Risk notu bekleniyor." />
      </div>
    </section>
  );
}

function InsightList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-2 grid gap-2">
        {(items.length > 0 ? items : [empty]).slice(0, 4).map((item) => (
          <p key={item} className="text-xs leading-5 text-slate-300">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
