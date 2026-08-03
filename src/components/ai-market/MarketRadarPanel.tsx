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
type RadarLoadState = "loading" | "ready" | "empty" | "partial" | "error" | "offline";
type RadarMotionPreference = "auto" | "running" | "paused";

export function resolveRadarMotionState(
  preference: RadarMotionPreference,
  prefersReducedMotion: boolean,
) {
  const isRunning = preference === "running" || (preference === "auto" && !prefersReducedMotion);

  return {
    isRunning,
    isStatic: !isRunning,
    isPaused: preference === "paused",
  };
}

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

function formatPercent(value: number) {
  return Number.isFinite(value) ? `%${Math.round(value)}` : "%-";
}

async function fetchIntervalAlerts(interval: string, signal: AbortSignal) {
  const response = await fetch(`/api/ai-market/market-scan?exchange=binance&interval=${encodeURIComponent(interval)}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Market scan failed (${response.status})`);
  }

  const payload = (await response.json()) as MarketScanResponse;
  return Array.isArray(payload.alerts) ? payload.alerts : [];
}

export function MarketRadarPanel({ locale, nonce }: { locale: Locale; nonce: string }) {
  const copy = getUiCopy(locale).ai;
  const [tickerGroups, setTickerGroups] = useState<RadarTickerGroups>(initialTickerGroups);
  const [loadState, setLoadState] = useState<RadarLoadState>("loading");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [motionPreference, setMotionPreference] = useState<RadarMotionPreference>("auto");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const inProgressRef = useRef(false);
  const scanSequenceRef = useRef(0);
  const { isRunning, isStatic, isPaused } = resolveRadarMotionState(
    motionPreference,
    prefersReducedMotion,
  );

  const loadOpportunities = useCallback(async () => {
    if (inProgressRef.current) {
      return;
    }

    inProgressRef.current = true;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoadState("loading");

    try {
      const settled = await Promise.allSettled(SCAN_INTERVALS.map((interval) => fetchIntervalAlerts(interval, controller.signal)));
      const fulfilled = settled.filter((result): result is PromiseFulfilledResult<MarketScanAlert[]> => result.status === "fulfilled");
      const alerts = fulfilled.flatMap((result) => result.value);

      if (!controller.signal.aborted) {
        if (fulfilled.length === 0) {
          setLoadState(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error");
          return;
        }

        const scanId = scanSequenceRef.current + 1;
        scanSequenceRef.current = scanId;
        const nextGroups = groupAlerts(alerts);

        startTransition(() => {
          setTickerGroups((current) => appendTickerGroups(current, nextGroups, scanId));
        });
        setLastUpdatedAt(new Date());
        setLoadState(
          fulfilled.length < SCAN_INTERVALS.length
            ? "partial"
            : alerts.length === 0
              ? "empty"
              : "ready",
        );
      }
    } catch {
      if (!controller.signal.aborted) {
        setLoadState(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error");
      }
    } finally {
      inProgressRef.current = false;
    }
  }, []);

  useEffect(() => {
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
  }, [loadOpportunities]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      setPrefersReducedMotion(motionQuery.matches);
    };

    updateMotionPreference();
    motionQuery.addEventListener("change", updateMotionPreference);

    return () => {
      motionQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  return (
    <section className="ai-market-radar-panel min-w-0 max-w-full overflow-hidden rounded-md border border-slate-800 bg-[#0b111d] p-3 text-slate-100 shadow-xl md:p-4">
      <style nonce={nonce}>{`
        @keyframes ai-market-radar-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ai-market-radar-track {
          animation: ai-market-radar-ticker 64s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: no-preference) {
          .visual-motion-off .ai-market-radar-track--auto {
            animation: ai-market-radar-ticker 64s linear infinite !important;
            will-change: transform;
          }
        }
        .visual-motion-off .ai-market-radar-track--motion-enabled {
          animation: ai-market-radar-ticker 64s linear infinite !important;
          will-change: transform;
        }
        .ai-market-radar-track--static {
          width: 100%;
          flex-wrap: wrap;
          animation: none !important;
          transform: none;
          will-change: auto;
        }
        .ai-market-radar-track--static .ai-market-radar-pass,
        .ai-market-radar-track--static .ai-market-radar-segment,
        .ai-market-radar-track--static .ai-market-radar-item {
          max-width: 100%;
          flex-wrap: wrap;
          white-space: normal;
        }
        .ai-market-radar-viewport {
          contain: layout paint;
          overflow: clip;
        }
        .ai-market-radar-viewport--static {
          contain: layout;
          overflow: visible;
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-market-radar-track--auto {
            width: 100%;
            flex-wrap: wrap;
            transform: none !important;
            will-change: auto;
          }
          .ai-market-radar-track--auto .ai-market-radar-pass,
          .ai-market-radar-track--auto .ai-market-radar-segment,
          .ai-market-radar-track--auto .ai-market-radar-item {
            max-width: 100%;
            flex-wrap: wrap;
            white-space: normal;
          }
          .ai-market-radar-track--auto .ai-market-radar-pass--mirror {
            display: none;
          }
          .ai-market-radar-viewport:has(.ai-market-radar-track--auto) {
            contain: layout;
            overflow: visible;
          }
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
          <span className="ai-market-radar-status w-fit max-w-full rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-100" role="status" aria-live="polite">
            {isPaused
              ? (locale === "tr" ? "Akış duraklatıldı" : "Feed paused")
              : isStatic
                ? (locale === "tr" ? "Hareket azaltıldı" : "Motion reduced")
                : loadState === "loading"
                ? (locale === "tr" ? "Veri güncelleniyor" : "Updating data")
                : loadState === "partial"
                  ? (locale === "tr" ? "Kısmi veri" : "Partial data")
                  : loadState === "offline"
                    ? (locale === "tr" ? "Çevrimdışı" : "Offline")
                    : loadState === "error"
                      ? (locale === "tr" ? "Veri alınamadı" : "Data unavailable")
                      : copy.radarStatus}
          </span>
          <button
            type="button"
            onClick={() => {
              setMotionPreference(isRunning ? "paused" : "running");
            }}
            aria-pressed={!isRunning}
            className="min-h-11 rounded-full border border-slate-700 bg-slate-900 px-3 text-[11px] font-bold text-slate-200 transition hover:border-cyan-300/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {isRunning
              ? (locale === "tr" ? "Akışı duraklat" : "Pause feed")
              : isPaused
                ? (locale === "tr" ? "Akışı sürdür" : "Resume feed")
                : (locale === "tr" ? "Akışı başlat" : "Start feed")}
          </button>
          {loadState === "error" || loadState === "offline" ? (
            <button
              type="button"
              onClick={() => void loadOpportunities()}
              className="min-h-11 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 text-[11px] font-bold text-amber-100 transition hover:bg-amber-300/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              {locale === "tr" ? "Yeniden dene" : "Retry"}
            </button>
          ) : null}
        </div>
      </div>
      {loadState === "error" || loadState === "offline" || loadState === "partial" ? (
        <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold leading-5 text-amber-100" role="alert">
          {loadState === "offline"
            ? (locale === "tr" ? "İnternet bağlantısı yok. Son başarılı veriler korunuyor." : "There is no internet connection. The last successful data is retained.")
            : loadState === "partial"
              ? (locale === "tr" ? "Bazı zaman aralıkları alınamadı. Gösterilen sonuçlar kısmi olabilir." : "Some intervals could not be loaded. Displayed results may be partial.")
              : (locale === "tr" ? "Piyasa radarı verisi alınamadı. Bu durum fırsat olmadığı anlamına gelmez." : "Market radar data could not be loaded. This does not mean there are no opportunities.")}
          {lastUpdatedAt ? ` ${locale === "tr" ? "Son başarılı güncelleme" : "Last successful update"}: ${lastUpdatedAt.toLocaleTimeString(locale === "tr" ? "tr-TR" : "en-US")}.` : ""}
        </p>
      ) : null}
      <div className="mt-3 grid gap-2.5">
        <RadarTickerRow locale={locale} title={copy.shortTerm} subtitle="1m / 5m / 15m" segments={tickerGroups.shortTerm} loadState={loadState} isRunning={isRunning} motionPreference={motionPreference} />
        <RadarTickerRow locale={locale} title={copy.hourly} subtitle="1h" segments={tickerGroups.hourly} loadState={loadState} isRunning={isRunning} motionPreference={motionPreference} />
        <RadarTickerRow locale={locale} title={copy.mediumTerm} subtitle="4h / 1d" segments={tickerGroups.mediumTerm} loadState={loadState} isRunning={isRunning} motionPreference={motionPreference} />
      </div>
    </section>
  );
}

function RadarTickerRow({
  locale,
  title,
  subtitle,
  segments,
  loadState,
  isRunning,
  motionPreference,
}: {
  locale: Locale;
  title: string;
  subtitle: string;
  segments: RadarTickerSegment[];
  loadState: RadarLoadState;
  isRunning: boolean;
  motionPreference: RadarMotionPreference;
}) {
  const tickerSegments = segments.length > 0 ? segments : [{ id: "radar-fallback", alerts: [] }];
  const motionClass = motionPreference === "auto"
    ? "ai-market-radar-track--auto"
    : isRunning
      ? "ai-market-radar-track--motion-enabled"
      : "ai-market-radar-track--static";

  return (
    <div className="ai-market-radar-row grid min-w-0 max-w-full gap-2 rounded-md border border-slate-800 bg-slate-950/65 p-2 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
      <div className="min-w-0 shrink-0 px-1">
        <p className="ai-market-radar-row-title text-xs font-black uppercase tracking-[0.12em] text-slate-300 md:text-sm">{title}</p>
        <p className="ai-market-radar-row-subtitle mt-0.5 text-[11px] font-bold text-slate-500">{subtitle}</p>
      </div>
      <div className={`ai-market-radar-viewport min-w-0 rounded-md border border-slate-800 bg-[#070b13] px-3 py-2 ${isRunning ? "overflow-hidden" : "ai-market-radar-viewport--static"}`}>
        <div className={`ai-market-radar-track flex w-max min-w-full items-center gap-8 ${motionClass}`}>
          <RadarTickerPass locale={locale} segments={tickerSegments} loadState={loadState} passId="primary" isStatic={!isRunning} />
          {isRunning ? (
            <RadarTickerPass locale={locale} segments={tickerSegments} loadState={loadState} passId="mirror" ariaHidden />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RadarTickerPass({
  locale,
  segments,
  loadState,
  passId,
  ariaHidden = false,
  isStatic = false,
}: {
  locale: Locale;
  segments: RadarTickerSegment[];
  loadState: RadarLoadState;
  passId: string;
  ariaHidden?: boolean;
  isStatic?: boolean;
}) {
  return (
    <div aria-hidden={ariaHidden || undefined} className={`ai-market-radar-pass ai-market-radar-pass--${passId} flex items-center gap-6 text-sm md:text-base ${isStatic ? "ai-market-radar-pass--static" : ""}`}>
      {segments.map((segment) => (
        <span key={`${passId}-${segment.id}`} className="ai-market-radar-segment inline-flex items-center gap-4 whitespace-nowrap">
          {segment.alerts.length > 0 ? (
            <OpportunityItems locale={locale} alerts={segment.alerts} keyPrefix={`${passId}-${segment.id}`} />
          ) : (
            <FallbackText locale={locale} loadState={loadState} />
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
        <span key={`${keyPrefix}-${alert.key}`} className="ai-market-radar-item inline-flex items-center gap-2 whitespace-nowrap">
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

function FallbackText({ locale, loadState }: { locale: Locale; loadState: RadarLoadState }) {
  const copy = getUiCopy(locale).ai;

  if (loadState === "loading") {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <span className="h-3 w-16 animate-pulse rounded-full bg-slate-700" />
        <span className="h-3 w-24 animate-pulse rounded-full bg-slate-800" />
        <span className="h-3 w-20 animate-pulse rounded-full bg-slate-700" />
      </span>
    );
  }

  if (loadState === "error" || loadState === "offline") {
    return (
      <span className="ai-market-radar-empty whitespace-nowrap font-semibold text-amber-200">
        {locale === "tr" ? "Veri alınamadı; yeniden deneyin." : "Data unavailable; please retry."}
      </span>
    );
  }

  if (loadState === "partial") {
    return (
      <span className="ai-market-radar-empty whitespace-nowrap font-semibold text-amber-200">
        {locale === "tr" ? "Bu zaman aralığı alınamadı." : "This interval is unavailable."}
      </span>
    );
  }

  return <span className="ai-market-radar-empty whitespace-nowrap font-semibold text-slate-300">{copy.emptyRadar}</span>;
}
