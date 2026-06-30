"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getSafeLocale, type Locale } from "@/i18n/config";
import { localizeAiRecommendation } from "@/lib/ai-market/localization";
import type { WatchSymbol } from "@/lib/ai-market/types";

type PerformanceSignal = {
  id: string;
  createdAt: string;
  symbol: string;
  displayName: string | null;
  interval: string;
  signalType: string;
  recommendationText: string | null;
  confidence: number | null;
  riskScore: number | null;
  priceAtSignal: number | null;
  evaluation: {
    horizon: string;
    priceAtEvaluation: number | null;
    priceChangePercent: number | null;
    directionCorrect: boolean | null;
    resultLabel: string | null;
    status: string | null;
  } | null;
};

type ChartPoint = {
  date: string;
  successRate: number | null;
  averageReturn: number | null;
  signals: number;
};

type Breakdown = {
  interval?: string;
  horizon?: string;
  signals: number;
  successRate: number | null;
  averageReturn: number | null;
};

type PerformanceResponse = {
  period: string;
  summary: {
    totalSignals: number;
    evaluatedSignals: number;
    pendingSignals: number;
    successRate: number | null;
    averageReturn: number | null;
    medianReturn: number | null;
    buySignalSuccessRate: number | null;
    sellSignalSuccessRate: number | null;
    bestSignal: PerformanceSignal | null;
    worstSignal: PerformanceSignal | null;
  };
  intervalBreakdown: Breakdown[];
  horizonBreakdown: Breakdown[];
  topSymbols: Array<{ symbol: string; signals: number; successRate: number | null; averageReturn: number | null }>;
  recentSignals: PerformanceSignal[];
  bestSignals: PerformanceSignal[];
  worstSignals: PerformanceSignal[];
  chartData: ChartPoint[];
};

type LoadState = {
  status: "loading" | "success" | "error";
  data: PerformanceResponse | null;
  error: string | null;
};

type Props = {
  locale: Locale | string;
  symbols: WatchSymbol[];
};

const copyByLocale = {
  tr: {
    title: "AI Sinyal Performansı",
    subtitle: "AI Asistanı sinyallerinin gerçekleşen fiyat hareketleriyle karşılaştırması.",
    totalSignals: "Toplam sinyal",
    evaluatedSignals: "Değerlendirilen",
    pendingSignals: "Bekleyen",
    successRate: "Başarı oranı",
    averageReturn: "Ortalama getiri",
    bestSignal: "En iyi sinyal",
    worstSignal: "En kötü sinyal",
    period: "Dönem",
    interval: "Periyot",
    signalType: "Sinyal tipi",
    symbol: "Sembol",
    all: "Tümü",
    daily: "Günlük",
    weekly: "Haftalık",
    monthly: "Aylık",
    quarterly: "3 Aylık",
    yearly: "Yıllık",
    buy: "AL",
    sell: "SAT",
    successChart: "Başarı oranı",
    returnChart: "Ortalama getiri",
    intervalBars: "Interval bazlı başarı",
    buySell: "AL / SAT karşılaştırması",
    horizon: "Horizon bazlı sonuç",
    topSymbols: "En çok sinyal üreten semboller",
    bestTen: "En iyi 10 sinyal",
    worstTen: "En kötü 10 sinyal",
    table: "Sinyal kayıtları",
    date: "Tarih",
    recommendation: "Öneri",
    signalPrice: "Sinyal fiyatı",
    evaluationPrice: "Değerlendirme fiyatı",
    returnPercent: "Getiri %",
    confidence: "Güven",
    risk: "Risk",
    result: "Sonuç",
    status: "Durum",
    loading: "Performans verileri yükleniyor.",
    error: "Performans raporu alınamadı.",
    empty: "Henüz değerlendirilecek yeterli sinyal yok.",
    note: "Bu sayfa AI Asistanı’nın geçmiş sinyal performansını ölçmek için hazırlanmıştır. Buradaki veriler yatırım tavsiyesi değildir.",
  },
  en: {
    title: "AI Signal Performance",
    subtitle: "Comparison of AI Assistant signals against realized price movements.",
    totalSignals: "Total signals",
    evaluatedSignals: "Evaluated",
    pendingSignals: "Pending",
    successRate: "Success rate",
    averageReturn: "Average return",
    bestSignal: "Best signal",
    worstSignal: "Worst signal",
    period: "Period",
    interval: "Interval",
    signalType: "Signal type",
    symbol: "Symbol",
    all: "All",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "3 Months",
    yearly: "Yearly",
    buy: "BUY",
    sell: "SELL",
    successChart: "Success rate",
    returnChart: "Average return",
    intervalBars: "Success by interval",
    buySell: "BUY / SELL comparison",
    horizon: "Results by horizon",
    topSymbols: "Top signal symbols",
    bestTen: "Best 10 signals",
    worstTen: "Worst 10 signals",
    table: "Signal logs",
    date: "Date",
    recommendation: "Recommendation",
    signalPrice: "Signal price",
    evaluationPrice: "Evaluation price",
    returnPercent: "Return %",
    confidence: "Confidence",
    risk: "Risk",
    result: "Result",
    status: "Status",
    loading: "Loading performance data.",
    error: "The performance report could not be loaded.",
    empty: "Not enough evaluated signals yet.",
    note: "This page measures the historical performance of AI Assistant signals. The information shown here is not investment advice.",
  },
} as const;

type PerformanceCopy = (typeof copyByLocale)[Locale];

function formatNumber(value: number | null | undefined, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
}

function resultClass(signal: PerformanceSignal) {
  if (signal.evaluation?.directionCorrect === true) {
    return "text-emerald-300";
  }

  if (signal.evaluation?.directionCorrect === false) {
    return "text-red-300";
  }

  return "text-slate-400";
}

function MiniLineChart({ data, metric, color }: { data: ChartPoint[]; metric: "successRate" | "averageReturn"; color: string }) {
  const points = data
    .map((item, index) => ({ index, value: item[metric] }))
    .filter((item): item is { index: number; value: number } => typeof item.value === "number" && Number.isFinite(item.value));

  if (points.length < 2) {
    return <EmptyChart />;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values, metric === "successRate" ? 0 : Math.min(...values));
  const max = Math.max(...values, metric === "successRate" ? 100 : Math.max(...values));
  const span = max - min || 1;
  const width = 360;
  const height = 150;
  const path = points
    .map((point, pointIndex) => {
      const x = (point.index / Math.max(data.length - 1, 1)) * width;
      const y = height - ((point.value - min) / span) * height;
      return `${pointIndex === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyChart() {
  return <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-700 text-sm font-bold text-slate-500">-</div>;
}

function BarList({ rows }: { rows: Breakdown[] }) {
  const max = Math.max(...rows.map((row) => row.successRate ?? 0), 1);

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const label = row.interval ?? row.horizon ?? "-";
        const value = row.successRate ?? 0;

        return (
          <div key={label} className="grid grid-cols-[44px_minmax(0,1fr)_72px] items-center gap-3 text-sm">
            <span className="font-black text-slate-300">{label}</span>
            <span className="h-2 rounded-full bg-slate-800">
              <span className="block h-2 rounded-full bg-cyan-400" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
            </span>
            <span className="text-right font-bold text-slate-300">{formatNumber(row.successRate, "%")}</span>
          </div>
        );
      })}
    </div>
  );
}

function SignalTable({ title, signals, copy, locale }: { title: string; signals: PerformanceSignal[]; copy: PerformanceCopy; locale: Locale }) {
  return (
    <section className="rounded-md border border-slate-800 bg-[#080d16] p-3">
      <h2 className="text-base font-black text-white">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">{copy.date}</th>
              <th className="px-3 py-2">{copy.symbol}</th>
              <th className="px-3 py-2">{copy.interval}</th>
              <th className="px-3 py-2">{copy.recommendation}</th>
              <th className="px-3 py-2">{copy.signalPrice}</th>
              <th className="px-3 py-2">{copy.evaluationPrice}</th>
              <th className="px-3 py-2">{copy.returnPercent}</th>
              <th className="px-3 py-2">{copy.confidence}</th>
              <th className="px-3 py-2">{copy.risk}</th>
              <th className="px-3 py-2">{copy.result}</th>
              <th className="px-3 py-2">{copy.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {signals.map((signal) => (
              <tr key={signal.id} className="text-slate-300">
                <td className="px-3 py-3">{new Date(signal.createdAt).toLocaleString()}</td>
                <td className="px-3 py-3 font-black text-white">{signal.symbol}</td>
                <td className="px-3 py-3">{signal.interval}</td>
                <td className="px-3 py-3">{localizeAiRecommendation(signal.recommendationText, locale) ?? signal.signalType}</td>
                <td className="px-3 py-3">{formatNumber(signal.priceAtSignal)}</td>
                <td className="px-3 py-3">{formatNumber(signal.evaluation?.priceAtEvaluation)}</td>
                <td className={`px-3 py-3 font-black ${resultClass(signal)}`}>{formatNumber(signal.evaluation?.priceChangePercent, "%")}</td>
                <td className="px-3 py-3">{formatNumber(signal.confidence, "%")}</td>
                <td className="px-3 py-3">{formatNumber(signal.riskScore, "%")}</td>
                <td className="px-3 py-3">{signal.evaluation?.resultLabel ?? "-"}</td>
                <td className="px-3 py-3">{signal.evaluation?.status ?? "PENDING"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AiSignalPerformanceDashboard({ locale, symbols }: Props) {
  const safeLocale = getSafeLocale(locale);
  const copy = copyByLocale[safeLocale];
  const [period, setPeriod] = useState("weekly");
  const [interval, setInterval] = useState("all");
  const [signalType, setSignalType] = useState("all");
  const [symbol, setSymbol] = useState("all");
  const [state, setState] = useState<LoadState>({ status: "loading", data: null, error: null });
  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({ period, interval, signalType });

    if (symbol !== "all") {
      params.set("symbol", symbol);
    }

    return `/api/ai-market/signal-performance?${params.toString()}`;
  }, [interval, period, signalType, symbol]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState((current) => ({ ...current, status: "loading", error: null }));

      try {
        const response = await fetch(requestUrl, { signal: controller.signal, headers: { Accept: "application/json" } });

        if (!response.ok) {
          throw new Error(copy.error);
        }

        setState({ status: "success", data: (await response.json()) as PerformanceResponse, error: null });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ status: "error", data: null, error: error instanceof Error ? error.message : copy.error });
        }
      }
    }

    load();

    return () => controller.abort();
  }, [copy.error, requestUrl]);

  const data = state.data;
  const hasEvaluatedData = Boolean(data && data.summary.evaluatedSignals > 0);

  return (
    <div className="min-h-screen bg-[#030711] px-3 py-4 text-slate-100 md:px-5">
      <main className="mx-auto grid max-w-7xl gap-4">
        <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">AI Market Assistant</p>
            <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">{copy.subtitle}</p>
          </div>
        </header>

        <section className="grid gap-3 rounded-md border border-slate-800 bg-[#080d16] p-3 md:grid-cols-4">
          <FilterSelect label={copy.period} value={period} onChange={setPeriod} options={["daily", "weekly", "monthly", "quarterly", "yearly"].map((value) => ({ value, label: copy[value as keyof typeof copy] as string }))} />
          <FilterSelect label={copy.interval} value={interval} onChange={setInterval} options={["all", "15m", "1h", "4h", "1d"].map((value) => ({ value, label: value === "all" ? copy.all : value }))} />
          <FilterSelect label={copy.signalType} value={signalType} onChange={setSignalType} options={[{ value: "all", label: copy.all }, { value: "BUY", label: copy.buy }, { value: "SELL", label: copy.sell }]} />
          <FilterSelect label={copy.symbol} value={symbol} onChange={setSymbol} options={[{ value: "all", label: copy.all }, ...symbols.map((item) => ({ value: item.symbol, label: `${item.symbol} - ${item.name}` }))]} />
        </section>

        {state.status === "loading" ? <StatePanel message={copy.loading} /> : null}
        {state.status === "error" ? <StatePanel message={state.error ?? copy.error} tone="error" /> : null}
        {state.status === "success" && !hasEvaluatedData ? <StatePanel message={copy.empty} /> : null}

        {data ? (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
              <MetricCard label={copy.totalSignals} value={formatNumber(data.summary.totalSignals)} />
              <MetricCard label={copy.evaluatedSignals} value={formatNumber(data.summary.evaluatedSignals)} />
              <MetricCard label={copy.pendingSignals} value={formatNumber(data.summary.pendingSignals)} />
              <MetricCard label={copy.successRate} value={formatNumber(data.summary.successRate, "%")} />
              <MetricCard label={copy.averageReturn} value={formatNumber(data.summary.averageReturn, "%")} />
              <MetricCard label={copy.bestSignal} value={data.summary.bestSignal?.symbol ?? "-"} subValue={formatNumber(data.summary.bestSignal?.evaluation?.priceChangePercent, "%")} />
              <MetricCard label={copy.worstSignal} value={data.summary.worstSignal?.symbol ?? "-"} subValue={formatNumber(data.summary.worstSignal?.evaluation?.priceChangePercent, "%")} />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <ChartPanel title={copy.successChart}>
                <MiniLineChart data={data.chartData} metric="successRate" color="#22d3ee" />
              </ChartPanel>
              <ChartPanel title={copy.returnChart}>
                <MiniLineChart data={data.chartData} metric="averageReturn" color="#34d399" />
              </ChartPanel>
              <ChartPanel title={copy.intervalBars}>
                <BarList rows={data.intervalBreakdown} />
              </ChartPanel>
              <ChartPanel title={copy.buySell}>
                <BarList
                  rows={[
                    { interval: copy.buy, signals: 0, successRate: data.summary.buySignalSuccessRate, averageReturn: null },
                    { interval: copy.sell, signals: 0, successRate: data.summary.sellSignalSuccessRate, averageReturn: null },
                  ]}
                />
              </ChartPanel>
              <ChartPanel title={copy.horizon}>
                <BarList rows={data.horizonBreakdown} />
              </ChartPanel>
              <ChartPanel title={copy.topSymbols}>
                <div className="grid gap-2">
                  {data.topSymbols.length > 0 ? (
                    data.topSymbols.map((item) => (
                      <div key={item.symbol} className="flex items-center justify-between rounded-md bg-slate-900 px-3 py-2 text-sm">
                        <span className="font-black text-white">{item.symbol}</span>
                        <span className="font-bold text-slate-300">
                          {item.signals} / {formatNumber(item.successRate, "%")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyChart />
                  )}
                </div>
              </ChartPanel>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <SignalTable title={copy.bestTen} signals={data.bestSignals} copy={copy} locale={safeLocale} />
              <SignalTable title={copy.worstTen} signals={data.worstSignals} copy={copy} locale={safeLocale} />
            </section>

            <SignalTable title={copy.table} signals={data.recentSignals} copy={copy} locale={safeLocale} />
          </>
        ) : null}

        <p className="rounded-md border border-slate-800 bg-[#080d16] p-4 text-sm font-semibold text-slate-400">{copy.note}</p>
      </main>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-300">
      <span className="text-xs uppercase text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-slate-700 bg-[#050812] px-3 py-2 text-white outline-none focus:border-cyan-400">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <article className="rounded-md border border-slate-800 bg-[#080d16] p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {subValue ? <p className="mt-1 text-sm font-bold text-emerald-300">{subValue}</p> : null}
    </article>
  );
}

function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-slate-800 bg-[#080d16] p-4">
      <h2 className="text-base font-black text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatePanel({ message, tone = "default" }: { message: string; tone?: "default" | "error" }) {
  const className =
    tone === "error"
      ? "rounded-md border border-red-400/30 bg-red-400/10 p-4 text-sm font-bold text-red-100"
      : "rounded-md border border-slate-800 bg-[#080d16] p-4 text-sm font-bold text-slate-400";

  return <div className={className}>{message}</div>;
}
