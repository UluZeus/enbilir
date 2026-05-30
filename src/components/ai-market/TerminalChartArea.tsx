"use client";

import { SelectedAssetMiniCharts } from "@/components/ai-market/SelectedAssetMiniCharts";
import type { MarketAnalysis } from "@/lib/ai-market/types";

type TerminalChartAreaProps = {
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

function signalLabel(analysis: MarketAnalysis | null) {
  if (!analysis) {
    return "Bekleniyor";
  }

  if (analysis.signal.signal === "STRONG_BUY" || analysis.signal.signal === "BUY") {
    return analysis.signal.confidence >= 80 ? "Güçlü Al" : "Alış İçin Takip";
  }

  if (analysis.signal.signal === "SELL") {
    return analysis.signal.confidence >= 80 ? "Güçlü Sat" : "Satış İçin Takip";
  }

  if (analysis.signal.signal === "AVOID" || analysis.signal.signal === "NO_TRADE") {
    return "Riskli / Uzak Dur";
  }

  if (analysis.signal.signal === "TAKE_PROFIT") {
    return "Kâr Al";
  }

  return "Bekle";
}

function Metric({ label, value, tone = "text-slate-700" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-xs font-black ${tone}`}>{value}</p>
    </div>
  );
}

export function TerminalChartArea({ analysis, status }: TerminalChartAreaProps) {
  const signalTone =
    analysis?.signal.signal === "STRONG_BUY" || analysis?.signal.signal === "BUY"
      ? "text-emerald-700"
      : analysis?.signal.signal === "SELL"
        ? "text-red-700"
        : "text-slate-700";

  return (
    <section className="rounded-md border border-slate-200 bg-slate-100/95 p-3 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">AI Trading Terminal</p>
          <h2 className="mt-1 text-lg font-black text-[#152033]">
            {analysis ? `${analysis.symbol} teknik sağlık ekranı` : "Seçili varlık teknik ekranı"}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Büyük dekoratif grafik yerine seçili varlığın gerçek mum serisinden hesaplanan 6 teknik panel gösterilir.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
          <Metric label="Periyot" value={analysis?.interval ?? "-"} />
          <Metric label="Sinyal" value={signalLabel(analysis)} tone={signalTone} />
          <Metric label="Son güncelleme" value={formatTime(analysis?.updatedAt)} />
          <Metric label="Güven" value={analysis ? `%${analysis.signal.confidence}` : "-"} />
          <Metric label="Risk" value={analysis ? `%${analysis.risk.score}` : "-"} tone={analysis && analysis.risk.score >= 70 ? "text-red-700" : "text-slate-700"} />
          <Metric label="Durum" value={status === "loading" ? "Güncelleniyor" : analysis?.dataStatus === "live" ? "Canlı veri" : "Kontrollü"} />
        </div>
      </div>

      <div className="mt-3">
        <SelectedAssetMiniCharts symbol={analysis?.symbol ?? "-"} interval={analysis?.interval ?? "-"} series={analysis?.technicalSeries} />
      </div>
    </section>
  );
}
