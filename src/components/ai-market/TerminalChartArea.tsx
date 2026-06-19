"use client";

import { SelectedAssetMiniCharts } from "@/components/ai-market/SelectedAssetMiniCharts";
import { getSafeLocale, type Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import type { MarketAnalysis } from "@/lib/ai-market/types";

type TerminalChartAreaProps = {
  locale: Locale | string;
  analysis: MarketAnalysis | null;
  status: "idle" | "loading" | "success" | "error";
};

function formatTime(value: string | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function signalLabel(analysis: MarketAnalysis | null, copy: ReturnType<typeof getUiCopy>["ai"]) {
  if (!analysis) {
    return copy.waiting;
  }

  if (analysis.signal.signal === "STRONG_BUY" || analysis.signal.signal === "BUY") {
    return analysis.signal.confidence >= 80 ? copy.strongBuy : copy.buyWatch;
  }

  if (analysis.signal.signal === "SELL") {
    return analysis.signal.confidence >= 80 ? copy.strongSell : copy.sellWatch;
  }

  if (analysis.signal.signal === "AVOID" || analysis.signal.signal === "NO_TRADE") {
    return copy.sellWatch;
  }

  if (analysis.signal.signal === "TAKE_PROFIT") {
    return copy.hold;
  }

  return copy.hold;
}

function Metric({ label, value, tone = "text-slate-700" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="terminal-health-metric rounded-md border border-slate-200 bg-white px-2.5 py-2">
      <p className="terminal-health-label text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`terminal-health-value mt-1 truncate text-xs font-black ${tone}`}>{value}</p>
    </div>
  );
}

export function TerminalChartArea({ locale, analysis, status }: TerminalChartAreaProps) {
  const copy = getUiCopy(getSafeLocale(locale)).ai;
  const signalTone =
    analysis?.signal.signal === "STRONG_BUY" || analysis?.signal.signal === "BUY"
      ? "text-emerald-700"
      : analysis?.signal.signal === "SELL"
        ? "text-red-700"
        : "text-slate-700";

  return (
    <section className="terminal-health-panel rounded-md border border-slate-200 bg-slate-100/95 p-3 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="terminal-health-kicker text-xs font-black uppercase tracking-[0.16em] text-slate-500">AI Trading Terminal</p>
          <h2 className="terminal-health-title mt-1 text-lg font-black text-[#152033]">
            {analysis ? `${analysis.symbol} ${copy.technicalHealth}` : copy.selectedAssetTechnical}
          </h2>
          <p className="terminal-health-description mt-1 text-xs font-semibold text-slate-500">
            {copy.technicalPanelDescription}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
          <Metric label={copy.interval} value={analysis?.interval ?? "-"} />
          <Metric label={copy.aiSignal} value={signalLabel(analysis, copy)} tone={signalTone} />
          <Metric label={copy.updateLabel} value={formatTime(analysis?.updatedAt)} />
          <Metric label={copy.confidence} value={analysis ? `%${analysis.signal.confidence}` : "-"} />
          <Metric label={copy.risk} value={analysis ? `%${analysis.risk.score}` : "-"} tone={analysis && analysis.risk.score >= 70 ? "text-red-700" : "text-slate-700"} />
          <Metric label={copy.status} value={status === "loading" ? copy.updating : analysis?.dataStatus === "live" ? copy.liveData : copy.controlled} />
        </div>
      </div>

      <div className="mt-3">
        <SelectedAssetMiniCharts locale={locale} symbol={analysis?.symbol ?? "-"} interval={analysis?.interval ?? "-"} series={analysis?.technicalSeries} />
      </div>
    </section>
  );
}
