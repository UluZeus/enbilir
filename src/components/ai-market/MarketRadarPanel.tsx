"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import type { SignalAlertType } from "@/lib/ai-market/alert-engine";

const MARKET_SCAN_MS = 30_000;
const SHORT_TERM_INTERVALS = ["1m", "5m", "15m"] as const;
const HOURLY_INTERVALS = ["1h"] as const;
const MEDIUM_TERM_INTERVALS = ["4h", "1d"] as const;
const SCAN_INTERVALS = [...SHORT_TERM_INTERVALS, ...HOURLY_INTERVALS, ...MEDIUM_TERM_INTERVALS];

type RadarGroupKey = "shortTerm" | "hourly" | "mediumTerm";

type MarketScanAlert = {
  key: string;
  symbol: string;
  displayName?: string;
  interval: string;
  alertType: SignalAlertType;
  label?: string;
  confidence: number;
  recommendationScore?: number;
  riskScore: number;
  priority?: number;
};

type MarketScanResponse = {
  alerts?: MarketScanAlert[];
};

type RadarGroups = Record<RadarGroupKey, MarketScanAlert[]>;
type RadarTickerSegment = {
  id: string;
  alerts: MarketScanAlert[];
};
type RadarTickerGroups = Record<RadarGroupKey, RadarTickerSegment[]>;

const initialGroups: RadarGroups = {
  shortTerm: [],
  hourly: [],
  mediumTerm: [],
};
const initialTickerGroups: RadarTickerGroups = {
  shortTerm: [],
  hourly: [],
  mediumTerm: [],
};
const MAX_TICKER_SEGMENTS = 2;

const directionBoost: Record<SignalAlertType, number> = {
  STRONG_BUY: 34,
  STRONG_SELL: 34,
  BULLISH_MOMENTUM: 24,
  BEARISH_MOMENTUM: 24,
  BUY_WATCH: 14,
  SELL_WATCH: 14,
};

function getDirectionLabel(alertType: SignalAlertType, locale: Locale) {
  const copy = getUiCopy(locale).ai;

  if (alertType === "STRONG_BUY" || alertType === "BULLISH_MOMENTUM" || alertType === "BUY_WATCH") {
    return copy.buySignal;
  }

  return copy.sellSignal;
}

function getDirectionTone(alertType: SignalAlertType) {
  if (alertType === "STRONG_BUY" || alertType === "BULLISH_MOMENTUM" || alertType === "BUY_WATCH") {
    return "border-emerald-300/50 bg-emerald-400/18 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.18)]";
  }

  return "border-red-300/50 bg-red-400/18 text-red-100 shadow-[0_0_20px_rgba(248,113,113,0.18)]";
}

function getOpportunityScore(alert: MarketScanAlert) {
  const confidence = Number.isFinite(alert.confidence) ? alert.confidence : 0;
  const riskScore = Number.isFinite(alert.riskScore) ? alert.riskScore : 100;
  const recommendationScore = Number.isFinite(alert.recommendationScore) ? alert.recommendationScore ?? confidence : confidence;
  const priority = Number.isFinite(alert.priority) ? alert.priority ?? 0 : 0;

  return confidence * 1.8 + recommendationScore + directionBoost[alert.alertType] + priority / 25 - riskScore * 1.35;
}

function selectTopOpportunities(alerts: MarketScanAlert[]) {
  return [...alerts].sort((left, right) => getOpportunityScore(right) - getOpportunityScore(left)).slice(0, 3);
}

function groupAlerts(alerts: MarketScanAlert[]): RadarGroups {
  return {
    shortTerm: selectTopOpportunities(alerts.filter((alert) => SHORT_TERM_INTERVALS.includes(alert.interval as (typeof SHORT_TERM_INTERVALS)[number]))),
    hourly: selectTopOpportunities(alerts.filter((alert) => HOURLY_INTERVALS.includes(alert.interval as (typeof HOURLY_INTERVALS)[number]))),
    mediumTerm: selectTopOpportunities(alerts.filter((alert) => MEDIUM_TERM_INTERVALS.includes(alert.interval as (typeof MEDIUM_TERM_INTERVALS)[number]))),
  };
}

function appendTickerGroups(current: RadarTickerGroups, nextGroups: RadarGroups, scanId: number): RadarTickerGroups {
  return {
    shortTerm: [...current.shortTerm, { id: `${scanId}-short-term`, alerts: nextGroups.shortTerm }].slice(-MAX_TICKER_SEGMENTS),
    hourly: [...current.hourly, { id: `${scanId}-hourly`, alerts: nextGroups.hourly }].slice(-MAX_TICKER_SEGMENTS),
    mediumTerm: [...current.mediumTerm, { id: `${scanId}-medium-term`, alerts: nextGroups.mediumTerm }].slice(-MAX_TICKER_SEGMENTS),
  };
}

function hasTickerSegments(groups: RadarTickerGroups) {
  return Object.values(groups).some((segments) => segments.length > 0);
}

function formatPercent(value: number) {
  return Number.isFinite(value) ? `%${Math.round(value)}` : "%-";
}

async function fetchIntervalAlerts(interval: string, signal: AbortSignal) {
  const response = await fetch(`/api/ai-market/market-scan?exchange=binance&interval=${encodeURIComponent(interval)}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as MarketScanResponse;
  return Array.isArray(payload.alerts) ? payload.alerts : [];
}

export function MarketRadarPanel({ locale }: { locale: Locale }) {
  const copy = getUiCopy(locale).ai;
  const [tickerGroups, setTickerGroups] = useState<RadarTickerGroups>(initialTickerGroups);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const inProgressRef = useRef(false);
  const scanSequenceRef = useRef(0);

  const loadOpportunities = useCallback(async () => {
    if (inProgressRef.current) {
      return;
    }

    inProgressRef.current = true;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const settled = await Promise.allSettled(SCAN_INTERVALS.map((interval) => fetchIntervalAlerts(interval, controller.signal)));
      const alerts = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

      if (!controller.signal.aborted) {
        const scanId = scanSequenceRef.current + 1;
        scanSequenceRef.current = scanId;
        const nextGroups = groupAlerts(alerts);

        startTransition(() => {
          setTickerGroups((current) => appendTickerGroups(current, nextGroups, scanId));
        });
      }
    } catch {
      if (!controller.signal.aborted) {
        const scanId = scanSequenceRef.current + 1;
        scanSequenceRef.current = scanId;

        startTransition(() => {
          setTickerGroups((current) => hasTickerSegments(current) ? current : appendTickerGroups(current, initialGroups, scanId));
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
      inProgressRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (isPaused) {
      controllerRef.current?.abort();
      return;
    }

    const initialId = window.setTimeout(() => {
      void loadOpportunities();
    }, 0);
    const refreshId = window.setInterval(() => {
      void loadOpportunities();
    }, MARKET_SCAN_MS);

    return () => {
      window.clearTimeout(initialId);
      window.clearInterval(refreshId);
      controllerRef.current?.abort();
    };
  }, [isPaused, loadOpportunities]);

  return (
    <section className="ai-market-radar-panel min-w-0 max-w-full overflow-hidden rounded-md border border-slate-800 bg-[#0b111d] p-3 text-slate-100 shadow-xl md:p-4">
      <style>{`
        @keyframes ai-market-radar-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ai-market-radar-track {
          animation: ai-market-radar-ticker 64s linear infinite;
          will-change: transform;
        }
        .ai-market-radar-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-market-radar-track { animation: none; transform: none; }
        }
        .ai-market-radar-viewport {
          contain: layout paint;
          overflow: clip;
        }
      `}</style>
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h2 className="ai-market-radar-heading text-sm font-black uppercase tracking-[0.14em] text-cyan-300 md:text-base">{copy.radarTitle}</h2>
          <p className="ai-market-radar-description mt-1 text-xs leading-5 text-slate-400">
            {locale === "tr"
              ? "Bu bölüm 30 saniyede bir fırsatları tarar; eğitim amaçlıdır, yatırım tavsiyesi değildir."
              : "This section scans opportunities every 30 seconds; it is educational and not investment advice."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="ai-market-radar-status w-fit max-w-full rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-100" role="status">
            {isPaused ? (locale === "tr" ? "Akış duraklatıldı" : "Feed paused") : copy.radarStatus}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsPaused((current) => !current);
              setIsLoading(false);
            }}
            aria-pressed={isPaused}
            className="min-h-9 rounded-full border border-slate-700 bg-slate-900 px-3 text-[11px] font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-white"
          >
            {isPaused ? (locale === "tr" ? "Akışı sürdür" : "Resume feed") : (locale === "tr" ? "Akışı duraklat" : "Pause feed")}
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2.5">
        <RadarTickerRow locale={locale} title={copy.shortTerm} subtitle="1m / 5m / 15m" segments={tickerGroups.shortTerm} isLoading={isLoading} isPaused={isPaused} />
        <RadarTickerRow locale={locale} title={copy.hourly} subtitle="1h" segments={tickerGroups.hourly} isLoading={isLoading} isPaused={isPaused} />
        <RadarTickerRow locale={locale} title={copy.mediumTerm} subtitle="4h / 1d" segments={tickerGroups.mediumTerm} isLoading={isLoading} isPaused={isPaused} />
      </div>
    </section>
  );
}

function RadarTickerRow({
  locale,
  title,
  subtitle,
  segments,
  isLoading,
  isPaused,
}: {
  locale: Locale;
  title: string;
  subtitle: string;
  segments: RadarTickerSegment[];
  isLoading: boolean;
  isPaused: boolean;
}) {
  const tickerSegments = segments.length > 0 ? segments : [{ id: "radar-fallback", alerts: [] }];

  return (
    <div className="ai-market-radar-row grid min-w-0 max-w-full gap-2 rounded-md border border-slate-800 bg-slate-950/65 p-2 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
      <div className="min-w-0 shrink-0 px-1">
        <p className="ai-market-radar-row-title text-xs font-black uppercase tracking-[0.12em] text-slate-300 md:text-sm">{title}</p>
        <p className="ai-market-radar-row-subtitle mt-0.5 text-[11px] font-bold text-slate-500">{subtitle}</p>
      </div>
      <div className="ai-market-radar-viewport min-w-0 overflow-hidden rounded-md border border-slate-800 bg-[#070b13] px-3 py-2">
        <div className="ai-market-radar-track flex w-max min-w-full items-center gap-8" style={isPaused ? { animationPlayState: "paused" } : undefined}>
          <RadarTickerPass locale={locale} segments={tickerSegments} isLoading={isLoading} passId="primary" />
          <RadarTickerPass locale={locale} segments={tickerSegments} isLoading={isLoading} passId="mirror" ariaHidden />
        </div>
      </div>
    </div>
  );
}

function RadarTickerPass({
  locale,
  segments,
  isLoading,
  passId,
  ariaHidden = false,
}: {
  locale: Locale;
  segments: RadarTickerSegment[];
  isLoading: boolean;
  passId: string;
  ariaHidden?: boolean;
}) {
  return (
    <div aria-hidden={ariaHidden} className="flex items-center gap-6 text-sm md:text-base">
      {segments.map((segment) => (
        <span key={`${passId}-${segment.id}`} className="inline-flex items-center gap-4 whitespace-nowrap">
          {segment.alerts.length > 0 ? (
            <OpportunityItems locale={locale} alerts={segment.alerts} keyPrefix={`${passId}-${segment.id}`} />
          ) : (
            <FallbackText locale={locale} isLoading={isLoading} />
          )}
          <span className="ai-market-radar-separator text-slate-700">•</span>
        </span>
      ))}
    </div>
  );
}

function OpportunityItems({ locale, alerts, keyPrefix }: { locale: Locale; alerts: MarketScanAlert[]; keyPrefix: string }) {
  const copy = getUiCopy(locale).ai;

  return (
    <>
      {alerts.map((alert) => (
        <span key={`${keyPrefix}-${alert.key}`} className="inline-flex items-center gap-2 whitespace-nowrap">
          <span className="ai-market-radar-symbol font-black text-sky-300">{alert.symbol}</span>
          <span className="ai-market-radar-separator text-slate-500">·</span>
          <span className="ai-market-radar-meta font-semibold text-slate-200">{alert.interval}</span>
          <span className="ai-market-radar-separator text-slate-500">·</span>
          <span className={`ai-market-radar-signal rounded-md border px-2 py-0.5 text-xs font-black md:text-sm ${getDirectionTone(alert.alertType)}`}>
            {getDirectionLabel(alert.alertType, locale)}
          </span>
          <span className="ai-market-radar-separator text-slate-500">·</span>
          <span className="ai-market-radar-chip rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 font-semibold text-cyan-100">
            {copy.confidence} {formatPercent(alert.confidence)}
          </span>
          <span className="ai-market-radar-separator text-slate-500">·</span>
          <span className="ai-market-radar-chip ai-market-radar-chip--risk rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 font-semibold text-amber-100">
            {copy.risk} {Math.round(alert.riskScore)}/100
          </span>
          <span className="ai-market-radar-separator text-slate-600">•</span>
        </span>
      ))}
    </>
  );
}

function FallbackText({ locale, isLoading }: { locale: Locale; isLoading: boolean }) {
  const copy = getUiCopy(locale).ai;

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <span className="h-3 w-16 animate-pulse rounded-full bg-slate-700" />
        <span className="h-3 w-24 animate-pulse rounded-full bg-slate-800" />
        <span className="h-3 w-20 animate-pulse rounded-full bg-slate-700" />
      </span>
    );
  }

  return <span className="ai-market-radar-empty whitespace-nowrap font-semibold text-slate-300">{copy.emptyRadar}</span>;
}
