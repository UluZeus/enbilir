"use client";

import { memo, useMemo } from "react";
import type { ReactNode } from "react";
import { getSafeLocale, type Locale } from "@/i18n/config";
import type { TechnicalSeries, TechnicalSeriesPoint } from "@/lib/ai-market/indicators";

type TechnicalIndicatorChartsProps = {
  locale?: Locale | string;
  symbol: string;
  interval: string;
  series: TechnicalSeries;
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

const chartHeight = 128;
const chartWidth = 360;
const mainRed = "#dc2626";
const neutralLine = "#64748b";

function compactNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("tr-TR", { maximumFractionDigits: digits });
}

function compactVolume(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
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
  const maxLabel = compactNumber(bounds.max, 2);
  const minLabel = compactNumber(bounds.min, 2);

  return (
    <div className="mt-3 grid grid-cols-[1fr_44px] gap-2">
      <svg className="h-32 w-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-hidden="true">
        <line x1="0" x2={chartWidth} y1="0" y2="0" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="0" x2={chartWidth} y1={chartHeight / 2} y2={chartHeight / 2} stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />
        <line x1="0" x2={chartWidth} y1={chartHeight} y2={chartHeight} stroke="#e2e8f0" strokeWidth="1" />
        {references.map((reference) => {
          const y = yForValue(reference.value, bounds.min, bounds.max);

          return y >= 0 && y <= chartHeight ? (
            <g key={`${reference.label}-${reference.value}`}>
              <line
                x1="0"
                x2={chartWidth}
                y1={y}
                y2={y}
                stroke={reference.color ?? "#94a3b8"}
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text x={chartWidth - 2} y={Math.max(10, y - 3)} textAnchor="end" fill={reference.color ?? "#64748b"} fontSize="10" fontWeight="700">
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
      <div className="flex flex-col justify-between py-1 text-right text-[11px] font-bold text-slate-500">
        <span>{maxLabel}</span>
        <span>{compactNumber((bounds.max + bounds.min) / 2, 2)}</span>
        <span>{minLabel}</span>
      </div>
    </div>
  );
}

function ValueGrid({ values }: { values: Array<{ label: string; value: string; tone?: string }> }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {values.map((item) => (
        <div key={item.label} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{item.label}</p>
          <p className={`mt-0.5 text-xs font-black ${item.tone ?? "text-slate-700"}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function ChartPanel({
  title,
  meta,
  values,
  children,
  lines,
  references,
  min,
  max,
}: {
  title: string;
  meta: string;
  values: Array<{ label: string; value: string; tone?: string }>;
  children?: ReactNode;
  lines: LineDefinition[];
  references?: ReferenceLine[];
  min?: number;
  max?: number;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{title}</h4>
          <p className="mt-1 text-xs font-semibold text-slate-700">{meta}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {lines.map((line) => (
            <span key={line.label} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />
              {line.label}
            </span>
          ))}
        </div>
      </div>
      <ValueGrid values={values} />
      <MiniLineChart lines={lines} references={references} min={min} max={max} />
      {children ? <div className="mt-3 text-xs leading-5 text-slate-600">{children}</div> : null}
    </div>
  );
}

function trendLabel(direction: TechnicalSeries["trend"]["direction"], isEnglish: boolean) {
  if (direction === "YUKARI") {
    return isEnglish ? "Rising" : "Yükselen";
  }

  if (direction === "ASAGI") {
    return isEnglish ? "Falling" : "Düşen";
  }

  return isEnglish ? "Sideways" : "Yatay";
}

function TrendPanel({ isEnglish, series }: { isEnglish: boolean; series: TechnicalSeries }) {
  const label = trendLabel(series.trend.direction, isEnglish);
  const tone =
    series.trend.direction === "YUKARI"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : series.trend.direction === "ASAGI"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className="rounded-md border border-slate-200 bg-white/80 p-4 shadow-sm">
      <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Trend</h4>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={`rounded-md border px-2 py-1 text-xs font-black ${tone}`}>{label}</span>
        <span className="text-sm font-black text-red-700">{series.trend.score}/100</span>
      </div>
      <div className="mt-4 h-3 rounded-full bg-slate-100">
        <div className="h-3 rounded-full bg-red-600" style={{ width: `${series.trend.score}%` }} />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">{series.trend.note}</p>
    </div>
  );
}

function cloudStatus(latest: TechnicalSeriesPoint, isEnglish: boolean) {
  const upper = Math.max(latest.ichimokuSpanA ?? Number.NEGATIVE_INFINITY, latest.ichimokuSpanB ?? Number.NEGATIVE_INFINITY);
  const lower = Math.min(latest.ichimokuSpanA ?? Number.POSITIVE_INFINITY, latest.ichimokuSpanB ?? Number.POSITIVE_INFINITY);

  if (!Number.isFinite(upper) || !Number.isFinite(lower)) {
    return isEnglish ? "Waiting for cloud data" : "Bulut verisi bekleniyor";
  }

  if (latest.close > upper) {
    return isEnglish ? "Above cloud" : "Bulut üstü";
  }

  if (latest.close < lower) {
    return isEnglish ? "Below cloud" : "Bulut altı";
  }

  return isEnglish ? "Inside cloud" : "Bulut içi";
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

export const TechnicalIndicatorCharts = memo(function TechnicalIndicatorCharts({
  locale = "tr",
  symbol,
  interval,
  series,
}: TechnicalIndicatorChartsProps) {
  const safeLocale = getSafeLocale(locale);
  const isEnglish = safeLocale === "en";
  const points = series.points;
  const priceLabel = isEnglish ? "Price" : "Fiyat";
  const lastPriceLabel = isEnglish ? "Last price" : "Son fiyat";
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
      macdHistogram: points.map((point) => point.macdHistogram),
      atr: points.map((point) => point.atr),
      ichimokuConversion: points.map((point) => point.ichimokuConversion),
      ichimokuBase: points.map((point) => point.ichimokuBase),
      ichimokuSpanA: points.map((point) => point.ichimokuSpanA),
      ichimokuSpanB: points.map((point) => point.ichimokuSpanB),
      parabolicSar: points.map((point) => point.parabolicSar),
    }),
    [points],
  );

  if (points.length === 0 || !latest) {
    return (
      <div className="rounded-md border border-slate-200 bg-white/70 p-3 text-xs font-semibold text-slate-500">
        {isEnglish ? `${symbol} does not have a technical chart series yet.` : `${symbol} için teknik grafik serisi henüz oluşmadı.`}
      </div>
    );
  }

  const macdLatest = lastValue(chartData.macd);
  const signalLatest = lastValue(chartData.macdSignal);
  const histogramLatest = lastValue(chartData.macdHistogram);
  const sarStatus =
    latest.parabolicSar === null
      ? isEnglish ? "Waiting for SAR data" : "SAR verisi bekleniyor"
      : latest.close > latest.parabolicSar
        ? isEnglish ? "Price is above SAR" : "Fiyat SAR üstünde"
        : isEnglish ? "Price is below SAR" : "Fiyat SAR altında";
  const volatility = volatilityStatus(latest, isEnglish);
  const volumeAnomaly = latest.volumeSma20 !== null && latest.volumeSma20 > 0 && latest.volume / latest.volumeSma20 >= 1.8;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-black text-[#152033]">{isEnglish ? `${symbol} Technical Chart Panels` : `${symbol} Teknik Grafik Panelleri`}</h3>
        <p className="text-xs font-semibold text-slate-500">
          {isEnglish ? `${interval} interval · last ${points.length} candles` : `${interval} periyot · son ${points.length} mum`}
        </p>
      </div>

      <div className="mt-3 grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        <ChartPanel
          title={isEnglish ? "Price + MA/EMA" : "Fiyat + MA/EMA"}
          meta={`${lastPriceLabel} ${compactNumber(latest.close, 4)}`}
          values={[
            { label: lastPriceLabel, value: compactNumber(latest.close, 4), tone: "text-red-700" },
            { label: "SMA20", value: compactNumber(latest.sma20, 4) },
            { label: "EMA20", value: compactNumber(latest.ema20, 4) },
            { label: "EMA50", value: compactNumber(latest.ema50, 4) },
          ]}
          lines={[
            { label: priceLabel, color: mainRed, values: chartData.close, width: 2.6 },
            { label: "SMA20", color: "#94a3b8", values: chartData.sma20 },
            { label: "EMA20", color: "#64748b", values: chartData.ema20 },
            { label: "EMA50", color: "#cbd5e1", values: chartData.ema50, dashed: true },
          ]}
        >
          {isEnglish ? "The price position relative to averages is used to monitor trend quality and potential support/resistance areas." : "Fiyatın ortalamalara göre konumu trend kalitesini ve olası destek/direnç bölgelerini izlemek için kullanılır."}
        </ChartPanel>

        <ChartPanel
          title="RSI"
          meta={`${isEnglish ? "Last RSI" : "RSI son değer"} ${compactNumber(latest.rsi, 1)}`}
          values={[
            { label: "RSI", value: compactNumber(latest.rsi, 1), tone: "text-red-700" },
            { label: isEnglish ? "Overbought" : "Aşırı alım", value: "70" },
            { label: isEnglish ? "Middle zone" : "Orta bölge", value: "50" },
            { label: isEnglish ? "Oversold" : "Aşırı satım", value: "30" },
          ]}
          lines={[{ label: "RSI", color: mainRed, values: chartData.rsi, width: 2.5 }]}
          references={[
            { value: 70, label: "70", color: "#f97316" },
            { value: 50, label: "50", color: "#cbd5e1" },
            { value: 30, label: "30", color: "#0ea5e9" },
          ]}
          min={0}
          max={100}
        >
          {isEnglish ? "Above 70 indicates overbought risk and below 30 indicates an oversold zone; it is not a trade signal by itself." : "70 üstü aşırı alım riskini, 30 altı aşırı satım bölgesini gösterir; tek başına işlem sinyali değildir."}
        </ChartPanel>

        <ChartPanel
          title="MACD"
          meta={`MACD ${compactNumber(macdLatest, 4)} · Signal ${compactNumber(signalLatest, 4)}`}
          values={[
            { label: "MACD", value: compactNumber(macdLatest, 4), tone: "text-red-700" },
            { label: "Signal", value: compactNumber(signalLatest, 4) },
            { label: "Histogram", value: compactNumber(histogramLatest, 4) },
            { label: isEnglish ? "Reference" : "Referans", value: "0" },
          ]}
          lines={[
            { label: "MACD", color: mainRed, values: chartData.macd, width: 2.5 },
            { label: "Signal", color: neutralLine, values: chartData.macdSignal },
            { label: "Hist", color: "#94a3b8", values: chartData.macdHistogram, dashed: true },
          ]}
          references={[{ value: 0, label: "0", color: "#64748b" }]}
        >
          {isEnglish ? "MACD crossing above signal indicates stronger momentum; a histogram below zero indicates weakness." : "MACD çizgisinin signal üstüne geçmesi momentumun güçlendiğini, histogramın sıfır altı zayıflamayı gösterir."}
        </ChartPanel>

        <TrendPanel isEnglish={isEnglish} series={series} />

        <ChartPanel
          title={isEnglish ? "Ichimoku Cloud" : "Ichimoku Bulutu"}
          meta={cloudStatus(latest, isEnglish)}
          values={[
            { label: "Tenkan", value: compactNumber(latest.ichimokuConversion, 4), tone: "text-red-700" },
            { label: "Kijun", value: compactNumber(latest.ichimokuBase, 4) },
            { label: "Senkou A", value: compactNumber(latest.ichimokuSpanA, 4) },
            { label: "Senkou B", value: compactNumber(latest.ichimokuSpanB, 4) },
          ]}
          lines={[
            { label: "Tenkan", color: mainRed, values: chartData.ichimokuConversion, width: 2.4 },
            { label: "Kijun", color: neutralLine, values: chartData.ichimokuBase },
            { label: "Span A", color: "#86efac", values: chartData.ichimokuSpanA },
            { label: "Span B", color: "#fecaca", values: chartData.ichimokuSpanB },
            { label: priceLabel, color: "#334155", values: chartData.close, dashed: true },
          ]}
        >
          {isEnglish ? "When price is above the cloud, trend support improves; inside the cloud, decision quality weakens." : "Fiyat bulut üstündeyse trend desteği artar; bulut içinde karar kalitesi zayıflar."}
        </ChartPanel>

        <ChartPanel
          title="Parabolic SAR"
          meta={sarStatus}
          values={[
            { label: priceLabel, value: compactNumber(latest.close, 4), tone: "text-red-700" },
            { label: "SAR", value: compactNumber(latest.parabolicSar, 4) },
            { label: isEnglish ? "Position" : "Konum", value: latest.parabolicSar === null ? "-" : latest.close > latest.parabolicSar ? (isEnglish ? "Above" : "Üstünde") : (isEnglish ? "Below" : "Altında") },
            { label: isEnglish ? "Interval" : "Periyot", value: interval },
          ]}
          lines={[
            { label: priceLabel, color: mainRed, values: chartData.close, width: 2.5 },
            { label: "SAR", color: "#94a3b8", values: chartData.parabolicSar, dashed: true },
          ]}
        >
          {isEnglish ? "Price above SAR supports upside tracking; below SAR highlights weakening risk." : "Fiyat SAR üstündeyse yükseliş takibi, SAR altındaysa zayıflama riski ön plana çıkar."}
        </ChartPanel>

        <ChartPanel
          title={isEnglish ? "ATR / Volatility" : "ATR / Volatilite"}
          meta={`${isEnglish ? "Volatility" : "Volatilite"} ${volatility.label}`}
          values={[
            { label: "ATR", value: compactNumber(latest.atr, 4), tone: "text-red-700" },
            { label: isEnglish ? "ATR/Price" : "ATR/Fiyat", value: volatility.ratio === null ? "-" : `%${compactNumber(volatility.ratio, 2)}` },
            { label: isEnglish ? "Status" : "Durum", value: volatility.label },
            { label: priceLabel, value: compactNumber(latest.close, 4) },
          ]}
          lines={[{ label: "ATR", color: mainRed, values: chartData.atr, width: 2.5 }]}
        >
          {isEnglish ? "As ATR rises, the price range widens; risk and reasonable stop distance increase accordingly." : "ATR yükseldikçe fiyat aralığı genişler; risk ve makul stop mesafesi de buna göre artar."}
        </ChartPanel>

        <ChartPanel
          title={isEnglish ? "Bollinger Band" : "Bollinger Bandı"}
          meta={`${isEnglish ? "Band status" : "Bant durumu"}: ${bollingerStatus(latest, isEnglish)}`}
          values={[
            { label: isEnglish ? "Upper band" : "Üst bant", value: compactNumber(latest.bollingerUpper, 4) },
            { label: isEnglish ? "Middle band" : "Orta bant", value: compactNumber(latest.bollingerMiddle, 4) },
            { label: isEnglish ? "Lower band" : "Alt bant", value: compactNumber(latest.bollingerLower, 4) },
            { label: isEnglish ? "Width" : "Genişlik", value: latest.bollingerBandwidth === null ? "-" : `%${compactNumber(latest.bollingerBandwidth, 2)}`, tone: "text-red-700" },
          ]}
          lines={[
            { label: priceLabel, color: mainRed, values: chartData.close, width: 2.5 },
            { label: isEnglish ? "Upper" : "Üst", color: "#94a3b8", values: chartData.bollingerUpper },
            { label: isEnglish ? "Middle" : "Orta", color: neutralLine, values: chartData.bollingerMiddle },
            { label: isEnglish ? "Lower" : "Alt", color: "#94a3b8", values: chartData.bollingerLower },
          ]}
        >
          {isEnglish ? "Low band width indicates compression; high width indicates expansion and helps interpret the volatility regime." : "Bant genişliği düşükse sıkışma, yüksekse genişleme izlenir; bu oynaklık rejimini yorumlamak için kullanılır."}
        </ChartPanel>

        <ChartPanel
          title={isEnglish ? "Volume" : "Hacim"}
          meta={volumeAnomaly ? (isEnglish ? "Volume anomaly detected" : "Hacim anomalisi var") : (isEnglish ? "Volume is in normal range" : "Hacim normal aralıkta")}
          values={[
            { label: isEnglish ? "Last volume" : "Son hacim", value: compactVolume(latest.volume), tone: "text-red-700" },
            { label: isEnglish ? "Avg. volume" : "Ort. hacim", value: compactVolume(latest.volumeSma20) },
            {
              label: isEnglish ? "Ratio" : "Oran",
              value: latest.volumeSma20 && latest.volumeSma20 > 0 ? `${compactNumber(latest.volume / latest.volumeSma20, 2)}x` : "-",
            },
            { label: isEnglish ? "Alert" : "Uyarı", value: volumeAnomaly ? (isEnglish ? "Anomaly" : "Anomali") : (isEnglish ? "None" : "Yok"), tone: volumeAnomaly ? "text-red-700" : undefined },
          ]}
          lines={[
            { label: isEnglish ? "Volume" : "Hacim", color: mainRed, values: chartData.volume, width: 2.5 },
            { label: isEnglish ? "Average" : "Ortalama", color: neutralLine, values: chartData.volumeSma20 },
          ]}
        >
          {isEnglish ? "A last volume reading significantly above the 20-candle average can increase decision risk and move strength." : "Son hacmin 20 mumluk ortalamanın belirgin üstüne çıkması karar riskini ve hareket gücünü artırabilir."}
        </ChartPanel>
      </div>
    </div>
  );
});
