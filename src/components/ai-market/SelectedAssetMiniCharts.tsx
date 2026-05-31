"use client";

import { useMemo } from "react";
import { getSafeLocale, type Locale } from "@/i18n/config";
import type { TechnicalSeries, TechnicalSeriesPoint } from "@/lib/ai-market/indicators";

type SelectedAssetMiniChartsProps = {
  locale?: Locale | string;
  symbol: string;
  interval: string;
  series?: TechnicalSeries;
};

type LineDefinition = {
  label: string;
  color: string;
  values: Array<number | null>;
  width?: number;
  dashed?: boolean;
};

type ReferenceLine = {
  value: number;
  label: string;
  color?: string;
};

const chartWidth = 280;
const chartHeight = 96;
const mainRed = "#dc2626";
const neutralLine = "#64748b";
const softLine = "#cbd5e1";

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("tr-TR", { maximumFractionDigits: digits });
}

function formatVolume(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function latestPoint(points: TechnicalSeriesPoint[]) {
  return points[points.length - 1] ?? null;
}

function lastValue(values: Array<number | null>) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];

    if (value !== null && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function getBounds(lines: LineDefinition[], references: ReferenceLine[] = [], minOverride?: number, maxOverride?: number) {
  const lineValues = lines.flatMap((line) => line.values).filter((value): value is number => value !== null && Number.isFinite(value));
  const referenceValues = references.map((reference) => reference.value);
  const values = [...lineValues, ...referenceValues];

  if (values.length === 0) {
    return { min: 0, max: 1 };
  }

  const rawMin = minOverride ?? Math.min(...values);
  const rawMax = maxOverride ?? Math.max(...values);
  const padding = Math.max((rawMax - rawMin) * 0.08, Math.abs(rawMax) * 0.002, 0.0001);

  return {
    min: rawMin - padding,
    max: rawMax + padding,
  };
}

function yForValue(value: number, min: number, max: number) {
  return chartHeight - ((value - min) / (max - min || 1)) * chartHeight;
}

function buildPath(values: Array<number | null>, min: number, max: number) {
  const denominator = Math.max(values.length - 1, 1);
  let path = "";

  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      return;
    }

    const x = (index / denominator) * chartWidth;
    const y = yForValue(value, min, max);
    path += `${path ? " L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  return path;
}

function MiniLineChart({
  lines,
  references = [],
  min,
  max,
}: {
  lines: LineDefinition[];
  references?: ReferenceLine[];
  min?: number;
  max?: number;
}) {
  const bounds = getBounds(lines, references, min, max);

  return (
    <svg className="mt-3 h-24 w-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-hidden="true">
      <line x1="0" x2={chartWidth} y1="0" y2="0" stroke="#e2e8f0" strokeWidth="1" />
      <line x1="0" x2={chartWidth} y1={chartHeight / 2} y2={chartHeight / 2} stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />
      <line x1="0" x2={chartWidth} y1={chartHeight} y2={chartHeight} stroke="#e2e8f0" strokeWidth="1" />
      {references.map((reference) => {
        const y = yForValue(reference.value, bounds.min, bounds.max);

        return y >= 0 && y <= chartHeight ? (
          <g key={`${reference.label}-${reference.value}`}>
            <line x1="0" x2={chartWidth} y1={y} y2={y} stroke={reference.color ?? "#94a3b8"} strokeDasharray="4 4" strokeWidth="1" />
            <text x={chartWidth - 2} y={Math.max(9, y - 3)} textAnchor="end" fill={reference.color ?? "#64748b"} fontSize="9" fontWeight="700">
              {reference.label}
            </text>
          </g>
        ) : null;
      })}
      {lines.map((line) => (
        <path
          key={line.label}
          d={buildPath(line.values, bounds.min, bounds.max)}
          fill="none"
          stroke={line.color}
          strokeDasharray={line.dashed ? "5 5" : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={line.width ?? 2}
        />
      ))}
    </svg>
  );
}

function ValueRow({ values }: { values: Array<{ label: string; value: string; tone?: string }> }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {values.map((item) => (
        <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{item.label}</p>
          <p className={`mt-0.5 truncate text-xs font-black ${item.tone ?? "text-slate-700"}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function MiniChartCard({
  title,
  meta,
  values,
  lines,
  references,
  min,
  max,
  footer,
}: {
  title: string;
  meta: string;
  values: Array<{ label: string; value: string; tone?: string }>;
  lines: LineDefinition[];
  references?: ReferenceLine[];
  min?: number;
  max?: number;
  footer?: string;
}) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-black uppercase tracking-[0.12em] text-slate-500">{title}</h3>
          <p className="mt-1 truncate text-xs font-semibold text-slate-700">{meta}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {lines.slice(0, 3).map((line) => (
            <span key={line.label} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: line.color }} />
              {line.label}
            </span>
          ))}
        </div>
      </div>
      <ValueRow values={values} />
      <MiniLineChart lines={lines} references={references} min={min} max={max} />
      {footer ? <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{footer}</p> : null}
    </article>
  );
}

function volatilityStatus(latest: TechnicalSeriesPoint, isEnglish: boolean) {
  if (!latest.atr || latest.close <= 0) {
    return { label: isEnglish ? "Waiting" : "Bekleniyor", ratio: null };
  }

  const ratio = (latest.atr / latest.close) * 100;

  if (ratio >= 4) {
    return { label: isEnglish ? "High" : "Yüksek", ratio };
  }

  if (ratio >= 1.8) {
    return { label: isEnglish ? "Medium" : "Orta", ratio };
  }

  return { label: isEnglish ? "Low" : "Düşük", ratio };
}

function bollingerStatus(latest: TechnicalSeriesPoint, isEnglish: boolean) {
  const bandwidth = latest.bollingerBandwidth;

  if (bandwidth === null) {
    return isEnglish ? "Waiting" : "Bekleniyor";
  }

  if (bandwidth < 4) {
    return isEnglish ? "Compression" : "Sıkışma";
  }

  if (bandwidth > 12) {
    return isEnglish ? "Expansion" : "Genişleme";
  }

  return "Normal";
}

export function SelectedAssetMiniCharts({ locale = "tr", symbol, interval, series }: SelectedAssetMiniChartsProps) {
  const isEnglish = getSafeLocale(locale) === "en";
  const points = useMemo(() => series?.points ?? [], [series?.points]);
  const latest = latestPoint(points);
  const chartData = useMemo(
    () => ({
      close: points.map((point) => point.close),
      volume: points.map((point) => point.volume),
      volumeSma20: points.map((point) => point.volumeSma20),
      sma20: points.map((point) => point.sma20),
      ema20: points.map((point) => point.ema20),
      ema50: points.map((point) => point.ema50),
      bollingerUpper: points.map((point) => point.bollingerUpper),
      bollingerMiddle: points.map((point) => point.bollingerMiddle),
      bollingerLower: points.map((point) => point.bollingerLower),
      rsi: points.map((point) => point.rsi),
      macd: points.map((point) => point.macd),
      macdSignal: points.map((point) => point.macdSignal),
      atr: points.map((point) => point.atr),
    }),
    [points],
  );

  if (points.length === 0 || !latest) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
        {isEnglish ? "Chart data could not be loaded for this asset." : "Bu varlık için grafik verisi alınamadı."}
      </div>
    );
  }

  const macdLatest = lastValue(chartData.macd);
  const signalLatest = lastValue(chartData.macdSignal);
  const volatility = volatilityStatus(latest, isEnglish);
  const volumeRatio = latest.volumeSma20 && latest.volumeSma20 > 0 ? latest.volume / latest.volumeSma20 : null;
  const volumeAnomaly = volumeRatio !== null && volumeRatio >= 1.8;

  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      <MiniChartCard
        title={isEnglish ? "Price + MA/EMA" : "Fiyat + MA/EMA"}
        meta={`${symbol} / ${interval}`}
        values={[
          { label: isEnglish ? "Last price" : "Son fiyat", value: formatNumber(latest.close, 4), tone: "text-red-700" },
          { label: "SMA20", value: formatNumber(latest.sma20, 4) },
          { label: "EMA20", value: formatNumber(latest.ema20, 4) },
          { label: "EMA50", value: formatNumber(latest.ema50, 4) },
        ]}
        lines={[
          { label: isEnglish ? "Price" : "Fiyat", color: mainRed, values: chartData.close, width: 2.4 },
          { label: "SMA", color: softLine, values: chartData.sma20 },
          { label: "EMA", color: neutralLine, values: chartData.ema20 },
          { label: "EMA50", color: "#94a3b8", values: chartData.ema50, dashed: true },
        ]}
      />

      <MiniChartCard
        title="RSI"
        meta={`${isEnglish ? "Last RSI" : "Son RSI"} ${formatNumber(latest.rsi, 1)}`}
        values={[
          { label: "RSI", value: formatNumber(latest.rsi, 1), tone: "text-red-700" },
          { label: isEnglish ? "Overbought" : "Aşırı alım", value: "70" },
          { label: isEnglish ? "Middle" : "Orta", value: "50" },
          { label: isEnglish ? "Oversold" : "Aşırı satım", value: "30" },
        ]}
        lines={[{ label: "RSI", color: mainRed, values: chartData.rsi, width: 2.4 }]}
        references={[
          { value: 70, label: "70", color: "#f97316" },
          { value: 50, label: "50", color: "#94a3b8" },
          { value: 30, label: "30", color: "#0ea5e9" },
        ]}
        min={0}
        max={100}
      />

      <MiniChartCard
        title="MACD"
        meta={`MACD ${formatNumber(macdLatest, 4)} / Signal ${formatNumber(signalLatest, 4)}`}
        values={[
          { label: "MACD", value: formatNumber(macdLatest, 4), tone: "text-red-700" },
          { label: "Signal", value: formatNumber(signalLatest, 4) },
          { label: isEnglish ? "Spread" : "Fark", value: macdLatest !== null && signalLatest !== null ? formatNumber(macdLatest - signalLatest, 4) : "-" },
          { label: isEnglish ? "Reference" : "Referans", value: "0" },
        ]}
        lines={[
          { label: "MACD", color: mainRed, values: chartData.macd, width: 2.4 },
          { label: "Signal", color: neutralLine, values: chartData.macdSignal },
        ]}
        references={[{ value: 0, label: "0", color: "#94a3b8" }]}
      />

      <MiniChartCard
        title={isEnglish ? "Bollinger Band" : "Bollinger Bandı"}
        meta={`${isEnglish ? "Band status" : "Bant durumu"}: ${bollingerStatus(latest, isEnglish)}`}
        values={[
          { label: isEnglish ? "Upper" : "Üst", value: formatNumber(latest.bollingerUpper, 4) },
          { label: isEnglish ? "Middle" : "Orta", value: formatNumber(latest.bollingerMiddle, 4) },
          { label: isEnglish ? "Lower" : "Alt", value: formatNumber(latest.bollingerLower, 4) },
          { label: isEnglish ? "Width" : "Genişlik", value: latest.bollingerBandwidth === null ? "-" : `%${formatNumber(latest.bollingerBandwidth, 2)}`, tone: "text-red-700" },
        ]}
        lines={[
          { label: isEnglish ? "Price" : "Fiyat", color: mainRed, values: chartData.close, width: 2.4 },
          { label: isEnglish ? "Upper" : "Üst", color: softLine, values: chartData.bollingerUpper },
          { label: isEnglish ? "Middle" : "Orta", color: neutralLine, values: chartData.bollingerMiddle },
          { label: isEnglish ? "Lower" : "Alt", color: softLine, values: chartData.bollingerLower },
        ]}
        footer={isEnglish ? "Compression indicates low volatility; expansion indicates a rising volatility regime." : "Sıkışma düşük oynaklık, genişleme artan oynaklık rejimini gösterir."}
      />

      <MiniChartCard
        title={isEnglish ? "ATR / Volatility" : "ATR / Volatilite"}
        meta={`${isEnglish ? "Volatility" : "Volatilite"} ${volatility.label}`}
        values={[
          { label: "ATR", value: formatNumber(latest.atr, 4), tone: "text-red-700" },
          { label: isEnglish ? "ATR/Price" : "ATR/Fiyat", value: volatility.ratio === null ? "-" : `%${formatNumber(volatility.ratio, 2)}` },
          { label: isEnglish ? "Status" : "Durum", value: volatility.label },
          { label: isEnglish ? "Price" : "Fiyat", value: formatNumber(latest.close, 4) },
        ]}
        lines={[{ label: "ATR", color: mainRed, values: chartData.atr, width: 2.4 }]}
      />

      <MiniChartCard
        title={isEnglish ? "Volume" : "Hacim"}
        meta={volumeAnomaly ? (isEnglish ? "Volume anomaly detected" : "Hacim anomalisi var") : (isEnglish ? "Volume is in normal range" : "Hacim normal aralıkta")}
        values={[
          { label: isEnglish ? "Last volume" : "Son hacim", value: formatVolume(latest.volume), tone: "text-red-700" },
          { label: isEnglish ? "Avg. volume" : "Ort. hacim", value: formatVolume(latest.volumeSma20) },
          { label: isEnglish ? "Ratio" : "Oran", value: volumeRatio === null ? "-" : `${formatNumber(volumeRatio, 2)}x` },
          { label: isEnglish ? "Alert" : "Uyarı", value: volumeAnomaly ? (isEnglish ? "Anomaly" : "Anomali") : (isEnglish ? "None" : "Yok"), tone: volumeAnomaly ? "text-red-700" : undefined },
        ]}
        lines={[
          { label: isEnglish ? "Volume" : "Hacim", color: mainRed, values: chartData.volume, width: 2.4 },
          { label: isEnglish ? "Average" : "Ortalama", color: neutralLine, values: chartData.volumeSma20 },
        ]}
      />
    </div>
  );
}
