"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { AssetPerformance } from "@/lib/ai-market/asset-performance";
import type { MarketExchange } from "@/lib/ai-market/types";
import styles from "./PortfolioPerformanceDashboard.module.css";

export const portfolioPerformancePeriods = ["1d", "1w", "1m", "3m", "6m", "1y"] as const;

export type PortfolioPerformancePeriod = (typeof portfolioPerformancePeriods)[number];
export type PortfolioHistoryPeriodKey = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "YEARLY";

export type PortfolioPeriodSnapshot = {
  key: PortfolioHistoryPeriodKey | PortfolioPerformancePeriod;
  label?: string;
  change: number | null;
  changeUsd: number | null;
  points?: number[];
  requestedDays?: number;
  observedDays?: number | null;
  coveragePercent?: number;
  isPartial?: boolean;
  source?: "history" | "empty" | string;
};

export type PortfolioPerformancePosition = {
  symbol: string;
  name: string;
  performanceSymbol?: string;
  exchange?: MarketExchange | "yahoo";
  currentValueUsd: number;
  currentProfitLossUsd: number | null;
  currentProfitLossPercent: number | null;
};

type PortfolioPerformanceDashboardProps = {
  locale: "tr" | "en" | string;
  totalValueUsd: number;
  totalPeriods: PortfolioPeriodSnapshot[];
  positions: PortfolioPerformancePosition[];
  variant?: "compact" | "detailed";
  className?: string;
};

type PositionWithPerformance = PortfolioPerformancePosition & {
  performance: AssetPerformance | null;
};

type ResolvedTotalPeriod = {
  period: PortfolioPerformancePeriod;
  percent: number | null;
  usd: number | null;
  points: number[];
  source: "history" | "history-partial" | "estimated" | "unavailable";
  coveredPositions: number;
  coveragePercent: number | null;
  isPartial: boolean;
};

type PerformanceFetchResult = {
  requestSignature: string;
  performanceByKey: Record<string, AssetPerformance>;
};

const historyPeriodMap: Record<PortfolioHistoryPeriodKey, PortfolioPerformancePeriod> = {
  DAILY: "1d",
  WEEKLY: "1w",
  MONTHLY: "1m",
  QUARTERLY: "3m",
  SEMI_ANNUAL: "6m",
  YEARLY: "1y",
};

const periodLabels = {
  tr: {
    "1d": "Günlük",
    "1w": "Haftalık",
    "1m": "Aylık",
    "3m": "3 aylık",
    "6m": "6 aylık",
    "1y": "Yıllık",
  },
  en: {
    "1d": "Daily",
    "1w": "Weekly",
    "1m": "Monthly",
    "3m": "3 months",
    "6m": "6 months",
    "1y": "Yearly",
  },
} satisfies Record<"tr" | "en", Record<PortfolioPerformancePeriod, string>>;

const copy = {
  tr: {
    title: "Portföy performansı",
    compactTitle: "Dönemsel kazanç / kayıp",
    description: "Doğrulanmış portföy geçmişi ile açık pozisyonların piyasa hareketini ayrı katmanlarda izleyin.",
    selectedPeriod: "Seçili dönem",
    historySource: "Portföy geçmişi",
    partialHistorySource: "Kısmi portföy geçmişi",
    estimateSource: "Ürün etkilerinden tahmin",
    unavailableSource: "Dönem verisi yok",
    estimateNote: "Tahmini toplam, yalnız veri alınabilen açık pozisyonların mevcut piyasa etkisidir; işlem geçmişi getirisi değildir.",
    historyNote: "Bu değer, kayıtlı sanal portföy anlık görüntülerinden hesaplanır.",
    partialHistoryNote: "Bu getiri, tam dönemi kapsamayan kayıtlı portföy aralığından hesaplanır; tam dönem getirisi değildir.",
    periodCoverage: "dönem kapsamı",
    partialShort: "Kısmi",
    positionsTitle: "Ürün bazında dönem etkisi",
    positionsDescription: "Her çubuk, bugünkü pozisyon değeri sabit miktarda tutulmuş olsaydı ilgili piyasa hareketinin USD etkisini gösterir.",
    currentValue: "Mevcut değer",
    actualProfitLoss: "Maliyet bazlı toplam K/Z",
    marketImpact: "Mevcut pozisyonun piyasa etkisi",
    notTradeHistory: "Tahmindir; gerçekleşmiş işlem K/Z'si değildir.",
    noPositions: "Grafiğe eklenecek açık pozisyon bulunmuyor.",
    noPeriodData: "Dönem verisi henüz oluşmadı.",
    loading: "Ürün dönem verileri yükleniyor…",
    partialData: "Bazı ürünlerde dönem verisi alınamadı.",
    sourceMissing: "Performans veri kaynağı tanımlı değil",
    coverage: "pozisyon kapsanıyor",
    chartSummary: "Dönemsel portföy kazanç ve kayıp karşılaştırması",
  },
  en: {
    title: "Portfolio performance",
    compactTitle: "Periodic profit / loss",
    description: "Track verified portfolio history separately from the market movement of open positions.",
    selectedPeriod: "Selected period",
    historySource: "Portfolio history",
    partialHistorySource: "Partial portfolio history",
    estimateSource: "Estimate from asset effects",
    unavailableSource: "No period data",
    estimateNote: "The estimated total is the current market effect of open positions with available data; it is not a trading-history return.",
    historyNote: "This value is calculated from saved virtual portfolio snapshots.",
    partialHistoryNote: "This return uses the saved portfolio interval available so far; it is not a full-period return.",
    periodCoverage: "period coverage",
    partialShort: "Partial",
    positionsTitle: "Period impact by asset",
    positionsDescription: "Each bar shows the USD effect of the period's market move if today's position quantity had remained constant.",
    currentValue: "Current value",
    actualProfitLoss: "Total cost-basis P/L",
    marketImpact: "Current-position market effect",
    notTradeHistory: "Estimate only; not realized trading P/L.",
    noPositions: "There are no open positions to chart.",
    noPeriodData: "Period data is not available yet.",
    loading: "Loading asset period data…",
    partialData: "Period data was unavailable for some assets.",
    sourceMissing: "Performance data source is not configured",
    coverage: "positions covered",
    chartSummary: "Periodic portfolio profit and loss comparison",
  },
} as const;

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizePeriodKey(key: PortfolioPeriodSnapshot["key"]) {
  return key in historyPeriodMap ? historyPeriodMap[key as PortfolioHistoryPeriodKey] : (key as PortfolioPerformancePeriod);
}

export function calculateCurrentPositionMarketImpactUsd(currentValueUsd: number, changePercent: number | null) {
  if (!Number.isFinite(currentValueUsd) || currentValueUsd < 0 || !isFiniteNumber(changePercent) || changePercent <= -100) {
    return null;
  }

  const priorValueUsd = currentValueUsd / (1 + changePercent / 100);
  const impactUsd = currentValueUsd - priorValueUsd;

  return Number.isFinite(impactUsd) ? impactUsd : null;
}

function calculatePercentFromCurrentValue(currentValueUsd: number, changeUsd: number | null) {
  if (!Number.isFinite(currentValueUsd) || !isFiniteNumber(changeUsd)) {
    return null;
  }

  const priorValueUsd = currentValueUsd - changeUsd;

  if (priorValueUsd <= 0) {
    return null;
  }

  const percent = (changeUsd / priorValueUsd) * 100;

  return Number.isFinite(percent) ? percent : null;
}

function getPositionRequestKey(position: PortfolioPerformancePosition) {
  if (!position.exchange) {
    return null;
  }

  return `${position.exchange}:${(position.performanceSymbol ?? position.symbol).trim().toUpperCase()}`;
}

function getPositionChange(position: PositionWithPerformance, period: PortfolioPerformancePeriod) {
  return position.performance?.changes[period] ?? null;
}

function getPositionImpact(position: PositionWithPerformance, period: PortfolioPerformancePeriod) {
  return calculateCurrentPositionMarketImpactUsd(position.currentValueUsd, getPositionChange(position, period));
}

function resolveTotalPeriod(
  period: PortfolioPerformancePeriod,
  totalValueUsd: number,
  snapshot: PortfolioPeriodSnapshot | undefined,
  positions: PositionWithPerformance[],
): ResolvedTotalPeriod {
  const snapshotPercent = isFiniteNumber(snapshot?.change) ? snapshot.change : null;
  const snapshotUsd = isFiniteNumber(snapshot?.changeUsd) ? snapshot.changeUsd : null;
  const hasHistory = snapshot?.source !== "empty" && (snapshotPercent !== null || snapshotUsd !== null);

  if (hasHistory) {
    const coveragePercent = isFiniteNumber(snapshot?.coveragePercent)
      ? Math.max(0, Math.min(100, snapshot.coveragePercent))
      : null;
    const isPartial = snapshot?.isPartial === true;

    return {
      period,
      percent: snapshotPercent ?? calculatePercentFromCurrentValue(totalValueUsd, snapshotUsd),
      usd: snapshotUsd ?? calculateCurrentPositionMarketImpactUsd(totalValueUsd, snapshotPercent),
      points: (snapshot?.points ?? []).filter(Number.isFinite),
      source: isPartial ? "history-partial" : "history",
      coveredPositions: positions.length,
      coveragePercent,
      isPartial,
    };
  }

  const impacts = positions
    .map((position) => getPositionImpact(position, period))
    .filter(isFiniteNumber);

  if (impacts.length === 0) {
    return {
      period,
      percent: null,
      usd: null,
      points: [],
      source: "unavailable",
      coveredPositions: 0,
      coveragePercent: null,
      isPartial: true,
    };
  }

  const estimatedUsd = impacts.reduce((sum, value) => sum + value, 0);

  return {
    period,
    percent: calculatePercentFromCurrentValue(totalValueUsd, estimatedUsd),
    usd: estimatedUsd,
    points: [],
    source: "estimated",
    coveredPositions: impacts.length,
    coveragePercent: null,
    isPartial: true,
  };
}

function formatPercent(value: number | null, locale: "tr" | "en") {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function formatUsd(value: number | null, locale: "tr" | "en") {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  const formatted = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(Math.abs(value));

  if (value > 0) {
    return `+${formatted}`;
  }

  return value < 0 ? `−${formatted}` : formatted;
}

function getTone(value: number | null) {
  if (!isFiniteNumber(value)) {
    return "text-slate-500";
  }

  if (value > 0) {
    return "text-emerald-700";
  }

  if (value < 0) {
    return "text-rose-700";
  }

  return "text-slate-700";
}

function getSourceLabel(source: ResolvedTotalPeriod["source"], text: (typeof copy)["tr"] | (typeof copy)["en"]) {
  if (source === "history") {
    return text.historySource;
  }

  if (source === "history-partial") {
    return text.partialHistorySource;
  }

  if (source === "estimated") {
    return text.estimateSource;
  }

  return text.unavailableSource;
}

function buildSparkline(points: number[]) {
  const width = 320;
  const height = 92;
  const inset = 8;

  if (points.length < 2) {
    return null;
  }

  const minimum = Math.min(...points);
  const maximum = Math.max(...points);
  const span = Math.max(maximum - minimum, 1);
  const xStep = (width - inset * 2) / (points.length - 1);
  const coordinates = points.map((point, index) => ({
    x: inset + index * xStep,
    y: height - inset - ((point - minimum) / span) * (height - inset * 2),
  }));

  return {
    path: coordinates.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "),
    lastPoint: coordinates[coordinates.length - 1],
    minimum,
    maximum,
  };
}

function DivergingBar({
  value,
  maximum,
  label,
  delay = 0,
}: {
  value: number | null;
  maximum: number;
  label: string;
  delay?: number;
}) {
  const width = isFiniteNumber(value) && maximum > 0 ? Math.min(49, (Math.abs(value) / maximum) * 49) : 0;
  const isPositive = isFiniteNumber(value) && value >= 0;

  return (
    <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={label}>
      <span className="absolute inset-y-0 left-1/2 w-px bg-slate-400" aria-hidden="true" />
      {width > 0 ? (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 rounded-full ${isPositive ? `${styles.barPositive} left-1/2 bg-emerald-500` : `${styles.barNegative} right-1/2 bg-rose-500`}`}
          style={{ width: `${width}%`, animationDelay: `${delay}ms` }}
        />
      ) : null}
    </div>
  );
}

function PortfolioSparkline({
  points,
  period,
  periodLabel,
  locale,
}: {
  points: number[];
  period: PortfolioPerformancePeriod;
  periodLabel: string;
  locale: "tr" | "en";
}) {
  const chart = buildSparkline(points);

  if (!chart) {
    return null;
  }

  const currencyFormatter = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <div className="mt-4">
      <svg
        viewBox="0 0 320 92"
        className="h-24 w-full overflow-visible"
        role="img"
        aria-labelledby={`portfolio-sparkline-title-${period}`}
      >
        <title id={`portfolio-sparkline-title-${period}`}>
          {periodLabel}: {currencyFormatter.format(points[0])} – {currencyFormatter.format(points[points.length - 1])}
        </title>
        <line x1="8" x2="312" y1="84" y2="84" stroke="currentColor" className="text-slate-200" />
        <polyline
          points={chart.path}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${styles.sparkline} text-[#0f766e]`}
        />
        <circle
          cx={chart.lastPoint.x}
          cy={chart.lastPoint.y}
          r="5"
          fill="currentColor"
          className={`${styles.sparkPoint} text-[#0f766e]`}
        />
      </svg>
      <div className="flex items-center justify-between gap-4 text-[11px] font-bold text-slate-500">
        <span>{currencyFormatter.format(chart.minimum)}</span>
        <span>{currencyFormatter.format(chart.maximum)}</span>
      </div>
    </div>
  );
}

export function PortfolioPerformanceDashboard({
  locale: rawLocale,
  totalValueUsd,
  totalPeriods,
  positions,
  variant = "detailed",
  className = "",
}: PortfolioPerformanceDashboardProps) {
  const locale = rawLocale === "en" ? "en" : "tr";
  const text = copy[locale];
  const labels = periodLabels[locale];
  const [selectedPeriod, setSelectedPeriod] = useState<PortfolioPerformancePeriod>("1m");
  const [isVisible, setIsVisible] = useState(false);
  const [fetchResult, setFetchResult] = useState<PerformanceFetchResult>({ requestSignature: "", performanceByKey: {} });
  const rootRef = useRef<HTMLDivElement>(null);

  const requests = useMemo(() => {
    const uniqueRequests = new Map<string, { key: string; symbol: string; exchange: MarketExchange | "yahoo" }>();

    for (const position of positions) {
      const key = getPositionRequestKey(position);

      if (!key || !position.exchange) {
        continue;
      }

      uniqueRequests.set(key, {
        key,
        symbol: (position.performanceSymbol ?? position.symbol).trim().toUpperCase(),
        exchange: position.exchange,
      });
    }

    return Array.from(uniqueRequests.values());
  }, [positions]);
  const requestSignature = useMemo(
    () => requests.map((request) => `${request.key}:${request.symbol}`).join("|"),
    [requests],
  );
  const performanceByKey = useMemo(
    () => fetchResult.requestSignature === requestSignature ? fetchResult.performanceByKey : {},
    [fetchResult, requestSignature],
  );
  const loadState = !isVisible
    ? "idle"
    : requests.length === 0 || fetchResult.requestSignature === requestSignature
      ? "complete"
      : "loading";

  useEffect(() => {
    const element = rootRef.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    if (requests.length === 0) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    void Promise.allSettled(
      requests.map(async (request) => {
        const params = new URLSearchParams({ symbol: request.symbol, exchange: request.exchange });
        const response = await fetch(`/api/ai-market/performance?${params.toString()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Performance request failed (${response.status})`);
        }

        return { key: request.key, performance: (await response.json()) as AssetPerformance };
      }),
    ).then((results) => {
      if (!active) {
        return;
      }

      const nextPerformance: Record<string, AssetPerformance> = {};

      for (const result of results) {
        if (result.status === "fulfilled") {
          nextPerformance[result.value.key] = result.value.performance;
        }
      }

      setFetchResult({ requestSignature, performanceByKey: nextPerformance });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isVisible, requestSignature, requests]);

  const enrichedPositions = useMemo<PositionWithPerformance[]>(
    () => positions.map((position) => {
      const requestKey = getPositionRequestKey(position);

      return {
        ...position,
        performance: requestKey ? performanceByKey[requestKey] ?? null : null,
      };
    }),
    [performanceByKey, positions],
  );

  const snapshotByPeriod = useMemo(() => {
    const map = new Map<PortfolioPerformancePeriod, PortfolioPeriodSnapshot>();

    for (const period of totalPeriods) {
      map.set(normalizePeriodKey(period.key), period);
    }

    return map;
  }, [totalPeriods]);

  const resolvedPeriods = useMemo(
    () => portfolioPerformancePeriods.map((period) => resolveTotalPeriod(period, totalValueUsd, snapshotByPeriod.get(period), enrichedPositions)),
    [enrichedPositions, snapshotByPeriod, totalValueUsd],
  );
  const selectedTotal = resolvedPeriods.find((period) => period.period === selectedPeriod) ?? resolvedPeriods[2];
  const totalMaximum = Math.max(1, ...resolvedPeriods.map((period) => Math.abs(period.percent ?? 0)));
  const selectedPositionEffects = enrichedPositions.map((position) => ({
    position,
    percent: getPositionChange(position, selectedPeriod),
    usd: getPositionImpact(position, selectedPeriod),
  }));
  const selectedMaximum = Math.max(1, ...selectedPositionEffects.map((item) => Math.abs(item.usd ?? 0)));
  const failedPositionCount = requests.length - Object.keys(performanceByKey).length;
  const selectedSparkline = selectedTotal ? selectedTotal.points : [];
  const selectedSource = selectedTotal?.source ?? "unavailable";

  return (
    <section
      ref={rootRef}
      className={`overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.10)] ${className}`}
      aria-busy={loadState === "loading"}
    >
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(15,118,110,0.12),transparent_42%)] p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#0f766e]">
              {variant === "compact" ? text.compactTitle : text.title}
            </p>
            {variant === "detailed" ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{text.description}</p> : null}
          </div>
          <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
            {getSourceLabel(selectedSource, text)}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,0.75fr)_minmax(260px,1.25fr)] md:items-end">
          <div className={styles.chartEnter}>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              {text.selectedPeriod} · {labels[selectedPeriod]}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className={`text-3xl font-black tabular-nums sm:text-4xl ${getTone(selectedTotal?.percent ?? null)}`}>
                {formatPercent(selectedTotal?.percent ?? null, locale)}
              </p>
              <p className={`text-lg font-black tabular-nums ${getTone(selectedTotal?.usd ?? null)}`}>
                {formatUsd(selectedTotal?.usd ?? null, locale)}
              </p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {selectedSource === "history"
                ? text.historyNote
                : selectedSource === "history-partial"
                  ? text.partialHistoryNote
                  : selectedSource === "estimated"
                    ? text.estimateNote
                    : text.noPeriodData}
            </p>
            {selectedTotal?.coveragePercent !== null && selectedTotal?.coveragePercent !== undefined ? (
              <p className={`mt-1 text-[11px] font-black ${selectedTotal.isPartial ? "text-amber-800" : "text-slate-500"}`}>
                {new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 0 }).format(selectedTotal.coveragePercent)}% {text.periodCoverage}
              </p>
            ) : null}
            {selectedSource === "estimated" ? (
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                {selectedTotal.coveredPositions}/{positions.length} {text.coverage}
              </p>
            ) : null}
          </div>

          {selectedSparkline.length >= 2 ? (
            <PortfolioSparkline points={selectedSparkline} period={selectedPeriod} periodLabel={labels[selectedPeriod]} locale={locale} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <p className="text-xs font-black text-slate-600">{labels[selectedPeriod]}</p>
              <div className="mt-4">
                <DivergingBar
                  value={selectedTotal?.usd ?? null}
                  maximum={Math.max(1, Math.abs(selectedTotal?.usd ?? 0))}
                  label={`${labels[selectedPeriod]}: ${formatUsd(selectedTotal?.usd ?? null, locale)}`}
                />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                {selectedSource === "estimated" ? text.notTradeHistory : text.noPeriodData}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" role="group" aria-label={text.chartSummary}>
          {resolvedPeriods.map((period, index) => {
            const isSelected = selectedPeriod === period.period;

            return (
              <button
                key={period.period}
                type="button"
                onClick={() => setSelectedPeriod(period.period)}
                aria-pressed={isSelected}
                className={`min-w-0 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] ${
                  isSelected
                    ? "border-[#0f766e] bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <span className="block text-xs font-black text-slate-600">{labels[period.period]}</span>
                <span className={`mt-2 block text-base font-black tabular-nums ${getTone(period.percent)}`}>{formatPercent(period.percent, locale)}</span>
                <span className={`mt-0.5 block truncate text-[11px] font-bold tabular-nums ${getTone(period.usd)}`}>{formatUsd(period.usd, locale)}</span>
                {period.source === "history-partial" ? (
                  <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.08em] text-amber-800">
                    {text.partialShort} · {new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 0 }).format(period.coveragePercent ?? 0)}%
                  </span>
                ) : null}
                <span className="mt-3 block">
                  <DivergingBar
                    value={period.percent}
                    maximum={totalMaximum}
                    delay={index * 45}
                    label={`${labels[period.period]}: ${formatPercent(period.percent, locale)}, ${formatUsd(period.usd, locale)}`}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {loadState === "loading" ? <p className="mt-4 text-xs font-bold text-slate-500" role="status">{text.loading}</p> : null}
        {loadState === "complete" && failedPositionCount > 0 ? <p className="mt-4 text-xs font-bold text-amber-800" role="status">{text.partialData}</p> : null}

        {variant === "detailed" ? (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-xl font-black text-[#152033]">{text.positionsTitle}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{text.positionsDescription}</p>
              </div>
              <span className="text-xs font-black text-slate-500">{labels[selectedPeriod]}</span>
            </div>

            {positions.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">{text.noPositions}</p>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4" role="img" aria-label={`${labels[selectedPeriod]} ${text.marketImpact}`}>
                  {selectedPositionEffects.map(({ position, usd, percent }, index) => (
                    <div key={`${position.symbol}-${index}`} className={styles.chartEnter} style={{ animationDelay: `${index * 55}ms` } as CSSProperties}>
                      <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#152033]">{position.symbol}</p>
                          <p className="truncate text-[11px] font-bold text-slate-500">{position.name}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-black tabular-nums ${getTone(usd)}`}>{formatUsd(usd, locale)}</p>
                          <p className={`text-[11px] font-bold tabular-nums ${getTone(percent)}`}>{formatPercent(percent, locale)}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <DivergingBar
                          value={usd}
                          maximum={selectedMaximum}
                          delay={index * 55}
                          label={`${position.symbol}, ${labels[selectedPeriod]}: ${formatPercent(percent, locale)}, ${formatUsd(usd, locale)}`}
                        />
                      </div>
                      {!position.exchange ? <p className="mt-1 text-[11px] font-bold text-amber-800">{text.sourceMissing}</p> : null}
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 2xl:grid-cols-2">
                  {enrichedPositions.map((position, positionIndex) => {
                    const periodImpacts = portfolioPerformancePeriods.map((period) => ({
                      period,
                      percent: getPositionChange(position, period),
                      usd: getPositionImpact(position, period),
                    }));
                    const periodMaximum = Math.max(1, ...periodImpacts.map((item) => Math.abs(item.usd ?? 0)));

                    return (
                      <article
                        key={`${position.symbol}-${positionIndex}`}
                        className={`${styles.chartEnter} rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5`}
                        style={{ animationDelay: `${positionIndex * 60}ms` } as CSSProperties}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-black text-[#152033]">{position.symbol}</p>
                            <p className="truncate text-xs font-bold text-slate-500">{position.name}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-left sm:text-right">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{text.currentValue}</p>
                              <p className="mt-1 text-sm font-black text-[#152033]">{formatUsd(position.currentValueUsd, locale).replace(/^\+/, "")}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{text.actualProfitLoss}</p>
                              <p className={`mt-1 text-sm font-black ${getTone(position.currentProfitLossUsd)}`}>
                                {formatUsd(position.currentProfitLossUsd, locale)} · {formatPercent(position.currentProfitLossPercent, locale)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                          {periodImpacts.map((item, index) => (
                            <div key={item.period} className="min-w-0 rounded-xl bg-slate-50 p-2.5">
                              <p className="text-[11px] font-black text-slate-600">{labels[item.period]}</p>
                              <p className={`mt-1 text-xs font-black tabular-nums ${getTone(item.percent)}`}>{formatPercent(item.percent, locale)}</p>
                              <p className={`mt-0.5 truncate text-[10px] font-bold tabular-nums ${getTone(item.usd)}`}>{formatUsd(item.usd, locale)}</p>
                              <div className="mt-2">
                                <DivergingBar
                                  value={item.usd}
                                  maximum={periodMaximum}
                                  delay={index * 45}
                                  label={`${position.symbol}, ${labels[item.period]} ${text.marketImpact}: ${formatPercent(item.percent, locale)}, ${formatUsd(item.usd, locale)}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-[11px] leading-5 text-slate-500">
                          {text.marketImpact}: {text.notTradeHistory}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
