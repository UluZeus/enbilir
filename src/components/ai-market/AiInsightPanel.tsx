import { getSafeLocale, type Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { localizeAiMarketText } from "@/lib/ai-market/localization";
import type { MarketAnalysis } from "@/lib/ai-market/types";

type AiInsightPanelProps = {
  locale: Locale | string;
  analysis: MarketAnalysis | null;
};

export function AiInsightPanel({ locale, analysis }: AiInsightPanelProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale).ai;
  const reasons = (analysis?.signal.reasons ?? []).map((reason) => localizeAiMarketText(reason, safeLocale));
  const riskReasons = (analysis?.risk.reasons ?? []).map((reason) => localizeAiMarketText(reason, safeLocale));

  return (
    <section className="rounded-md border border-slate-800 bg-[#0b111d] p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300/80">{copy.analystComment}</p>
          <h2 className="mt-1 text-lg font-black text-white">{copy.decisionSummary}</h2>
        </div>
        <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-black text-slate-300">
          {analysis ? `%${analysis.signal.confidence}` : "-"}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">
        {analysis ? localizeAiMarketText(analysis.explanation, safeLocale) : copy.decisionPlaceholder}
      </p>

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        <InsightList title={copy.signalReasons} items={reasons} empty={copy.signalReasonEmpty} />
        <InsightList title={copy.riskNotes} items={riskReasons} empty={copy.riskNoteEmpty} />
      </div>
    </section>
  );
}

function InsightList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-300">{title}</p>
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
