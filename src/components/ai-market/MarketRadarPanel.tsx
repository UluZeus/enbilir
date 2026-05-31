"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SignalAlertType } from "@/lib/ai-market/alert-engine";

const MARKET_SCAN_MS = 30_000;
const SHORT_TERM_INTERVALS = ["1m", "5m", "15m"] as const;
const HOURLY_INTERVALS = ["1h"] as const;
const MEDIUM_TERM_INTERVALS = ["4h", "1d"] as const;
const SCAN_INTERVALS = [...SHORT_TERM_INTERVALS, ...HOURLY_INTERVALS, ...MEDIUM_TERM_INTERVALS];
const EMPTY_MESSAGE = "Bu vadede güçlü fırsat yok. Piyasa izleniyor.";

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

const initialGroups: RadarGroups = {
  shortTerm: [],
  hourly: [],
  mediumTerm: [],
};

const directionBoost: Record<SignalAlertType, number> = {
  STRONG_BUY: 34,
  STRONG_SELL: 34,
  BULLISH_MOMENTUM: 24,
  BEARISH_MOMENTUM: 24,
  BUY_WATCH: 14,
  SELL_WATCH: 14,
};

function getDirectionLabel(alertType: SignalAlertType) {
  if (alertType === "STRONG_BUY" || alertType === "BULLISH_MOMENTUM" || alertType === "BUY_WATCH") {
    return "AL önerisi";
  }

  return "SAT önerisi";
}

function getDirectionTone(alertType: SignalAlertType) {
  if (alertType === "STRONG_BUY" || alertType === "BULLISH_MOMENTUM" || alertType === "BUY_WATCH") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  return "border-rose-400/30 bg-rose-400/10 text-rose-200";
}

function getOpportunityScore(alert: MarketScanAlert) {
  const confidence = Number.isFinite(alert.confidence) ? alert.confidence : 0;
  const riskScore = Number.isFinite(alert.riskScore) ? alert.riskScore : 100;
  const recommendationScore = Number.isFinite(alert.recommendationScore) ? alert.recommendationScore ?? confidence : confidence;
  const priority = Number.isFinite(alert.priority) ? alert.priority ?? 0 : 0;

  return confidence * 1.8 + recommendationScore + directionBoost[alert.alertType] + priority / 25 - riskScore * 1.35;
}

function selectTopOpportunities(alerts: MarketScanAlert[]) {
  return [...alerts].sort((left, right) => getOpportunityScore(right) - getOpportunityScore(left)).slice(0, 5);
}

function groupAlerts(alerts: MarketScanAlert[]): RadarGroups {
  return {
    shortTerm: selectTopOpportunities(alerts.filter((alert) => SHORT_TERM_INTERVALS.includes(alert.interval as (typeof SHORT_TERM_INTERVALS)[number]))),
    hourly: selectTopOpportunities(alerts.filter((alert) => HOURLY_INTERVALS.includes(alert.interval as (typeof HOURLY_INTERVALS)[number]))),
    mediumTerm: selectTopOpportunities(alerts.filter((alert) => MEDIUM_TERM_INTERVALS.includes(alert.interval as (typeof MEDIUM_TERM_INTERVALS)[number]))),
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
    return [];
  }

  const payload = (await response.json()) as MarketScanResponse;
  return Array.isArray(payload.alerts) ? payload.alerts : [];
}

export function MarketRadarPanel() {
  const [groups, setGroups] = useState<RadarGroups>(initialGroups);
  const [isLoading, setIsLoading] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);
  const inProgressRef = useRef(false);

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
        setGroups(groupAlerts(alerts));
      }
    } catch {
      if (!controller.signal.aborted) {
        setGroups(initialGroups);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
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

  return (
    <section className="w-full overflow-hidden rounded-md border border-slate-800 bg-[#0b111d] p-3 text-slate-100 shadow-xl md:p-4">
      <style>{`
        @keyframes ai-market-radar-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <h2 className="text-sm font-black uppercase tracking-[0.14em] text-cyan-300 md:text-base">Piyasa Radarı</h2>
      <div className="mt-3 grid gap-2.5">
        <RadarTickerRow title="Kısa Vade" subtitle="1m / 5m / 15m" alerts={groups.shortTerm} isLoading={isLoading} />
        <RadarTickerRow title="1 Saatlik" subtitle="1h" alerts={groups.hourly} isLoading={isLoading} />
        <RadarTickerRow title="4 Saat / Günlük" subtitle="4h / 1d" alerts={groups.mediumTerm} isLoading={isLoading} />
      </div>
    </section>
  );
}

function RadarTickerRow({ title, subtitle, alerts, isLoading }: { title: string; subtitle: string; alerts: MarketScanAlert[]; isLoading: boolean }) {
  return (
    <div className="grid min-w-0 gap-2 rounded-md border border-slate-800 bg-slate-950/65 p-2 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
      <div className="shrink-0 px-1">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-300 md:text-sm">{title}</p>
        <p className="mt-0.5 text-[11px] font-bold text-slate-500">{subtitle}</p>
      </div>
      <div className="min-w-0 overflow-hidden rounded-md border border-slate-800 bg-[#070b13] px-3 py-2">
        <div className="flex w-max min-w-full items-center gap-8 motion-safe:animate-[ai-market-radar-ticker_64s_linear_infinite] hover:[animation-play-state:paused]">
          <div className="flex items-center gap-4 text-sm md:text-base">
            {alerts.length > 0 ? <OpportunityItems alerts={alerts} /> : <FallbackText isLoading={isLoading} />}
          </div>
          <div aria-hidden="true" className="flex items-center gap-4 text-sm md:text-base">
            {alerts.length > 0 ? <OpportunityItems alerts={alerts} /> : <FallbackText isLoading={isLoading} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunityItems({ alerts }: { alerts: MarketScanAlert[] }) {
  return (
    <>
      {alerts.map((alert) => (
        <span key={alert.key} className="inline-flex items-center gap-2 whitespace-nowrap">
          <span className="font-black text-white">{alert.symbol}</span>
          <span className="text-slate-500">·</span>
          <span className="font-semibold text-slate-200">{alert.interval}</span>
          <span className="text-slate-500">·</span>
          <span className={`rounded-md border px-2 py-0.5 text-xs font-black md:text-sm ${getDirectionTone(alert.alertType)}`}>
            {getDirectionLabel(alert.alertType)}
          </span>
          <span className="text-slate-500">·</span>
          <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 font-semibold text-cyan-100">
            Güven {formatPercent(alert.confidence)}
          </span>
          <span className="text-slate-500">·</span>
          <span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 font-semibold text-amber-100">
            Risk {Math.round(alert.riskScore)}/100
          </span>
          <span className="text-slate-600">•</span>
        </span>
      ))}
    </>
  );
}

function FallbackText({ isLoading }: { isLoading: boolean }) {
  return <span className="whitespace-nowrap font-semibold text-slate-300">{isLoading ? "Piyasa fırsatları taranıyor." : EMPTY_MESSAGE}</span>;
}
