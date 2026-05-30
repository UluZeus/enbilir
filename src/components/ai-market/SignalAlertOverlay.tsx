"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SoundAlertToggle } from "@/components/ai-market/SoundAlertToggle";
import type { SignalAlert, SignalAlertType } from "@/lib/ai-market/alert-engine";
import { AI_MARKET_SOUND_ENABLED_KEY, playSignalAlertSound } from "@/lib/ai-market/sound-alerts";
import type { MarketExchange } from "@/lib/ai-market/types";

const MARKET_SCAN_MS = 30_000;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
const ALERT_COOLDOWN_STORAGE_KEY = "ai-market-alert-cooldowns";
const SCAN_INTERVALS = ["1m", "5m", "15m", "1h", "4h"];

type MarketScanAlert = {
  key: string;
  symbol: string;
  displayName: string;
  exchange: MarketExchange;
  interval: string;
  alertType: SignalAlertType;
  label: string;
  confidence: number;
  recommendationScore: number;
  riskScore: number;
  price: number | null;
  reason: string;
  message: string;
  timestamp: string;
  soundLevel: SignalAlert["soundLevel"];
  priority: number;
};

type MarketScanResponse = {
  scannedAt: string;
  exchange: "binance";
  candidateCount: number;
  processedCount: number;
  intervalsChecked: string[];
  alerts: MarketScanAlert[];
  errors: string[];
};

type CooldownEntry = {
  shownAt: number;
  score: number;
};

type CooldownMap = Record<string, CooldownEntry>;

function readCooldowns() {
  try {
    const storedValue = window.localStorage.getItem(ALERT_COOLDOWN_STORAGE_KEY);
    const parsed = storedValue ? (JSON.parse(storedValue) as unknown) : {};

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as CooldownMap;
  } catch {
    return {};
  }
}

function writeCooldowns(cooldowns: CooldownMap) {
  window.localStorage.setItem(ALERT_COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
}

function pruneCooldowns(cooldowns: CooldownMap, now: number) {
  return Object.fromEntries(Object.entries(cooldowns).filter(([, entry]) => now - entry.shownAt < ALERT_COOLDOWN_MS * 2));
}

function canShowAlert(alert: MarketScanAlert, cooldowns: CooldownMap, now: number) {
  const existing = cooldowns[alert.key];

  if (!existing) {
    return true;
  }

  if (now - existing.shownAt >= ALERT_COOLDOWN_MS) {
    return true;
  }

  return alert.recommendationScore >= existing.score + 8;
}

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  if (value >= 1000) {
    return value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  }

  if (value >= 1) {
    return value.toLocaleString("tr-TR", { maximumFractionDigits: 4 });
  }

  return value.toLocaleString("tr-TR", { maximumSignificantDigits: 4 });
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getAlertClass(alertType: MarketScanAlert["alertType"]) {
  if (alertType === "STRONG_BUY" || alertType === "BULLISH_MOMENTUM" || alertType === "BUY_WATCH") {
    return "text-emerald-300";
  }

  if (alertType === "STRONG_SELL" || alertType === "BEARISH_MOMENTUM" || alertType === "SELL_WATCH") {
    return "text-rose-300";
  }

  return "text-amber-300";
}

function getExchangeLabel(exchange: MarketExchange) {
  void exchange;
  return "Binance";
}

export function SignalAlertOverlay() {
  const [activeAlerts, setActiveAlerts] = useState<MarketScanAlert[]>([]);
  const [lastScanInterval, setLastScanInterval] = useState(SCAN_INTERVALS[0]);
  const [lastCandidateCount, setLastCandidateCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const scanIndexRef = useRef(0);
  const inProgressRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const playTopAlertSound = useCallback((alerts: MarketScanAlert[]) => {
    const topAlert = alerts[0];
    if (topAlert && window.localStorage.getItem(AI_MARKET_SOUND_ENABLED_KEY) === "true") {
      void playSignalAlertSound(topAlert.soundLevel);
    }
  }, []);

  const runScan = useCallback(async () => {
    if (inProgressRef.current) {
      return;
    }

    inProgressRef.current = true;
    setIsScanning(true);

    const interval = SCAN_INTERVALS[scanIndexRef.current % SCAN_INTERVALS.length];
    scanIndexRef.current += 1;
    setLastScanInterval(interval);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch(`/api/ai-market/market-scan?exchange=binance&interval=${encodeURIComponent(interval)}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as MarketScanResponse;
      setLastCandidateCount(payload.candidateCount);

      if (payload.alerts.length === 0) {
        setActiveAlerts([]);
        return;
      }

      setActiveAlerts(payload.alerts.slice(0, 5));

      const now = Date.now();
      const cooldowns = pruneCooldowns(readCooldowns(), now);
      const availableAlerts = payload.alerts.filter((alert) => canShowAlert(alert, cooldowns, now));

      if (availableAlerts.length === 0) {
        writeCooldowns(cooldowns);
        return;
      }

      availableAlerts.slice(0, 5).forEach((alert) => {
        cooldowns[alert.key] = {
          shownAt: now,
          score: alert.recommendationScore,
        };
      });
      writeCooldowns(cooldowns);
      playTopAlertSound(availableAlerts);
    } catch {
      return;
    } finally {
      controllerRef.current = null;
      inProgressRef.current = false;
      if (mountedRef.current) {
        setIsScanning(false);
      }
    }
  }, [playTopAlertSound]);

  useEffect(() => {
    void runScan();
    const refreshId = window.setInterval(() => {
      void runScan();
    }, MARKET_SCAN_MS);

    return () => window.clearInterval(refreshId);
  }, [runScan]);

  const tickerItems = activeAlerts.length > 0 ? activeAlerts : [];
  const calmMessage = `Piyasa Radarı aktif: Binance piyasası 30 saniyede bir taranıyor. Son kontrol: ${lastScanInterval} periyodu, ${
    lastCandidateCount || 30
  } aday${isScanning ? ", kontrol sürüyor" : ""}.`;

  return (
    <section className="border-b border-slate-800 bg-[#050914] text-slate-100">
      <style>{`
        @keyframes ai-market-signal-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .ai-market-signal-ticker-track {
          animation: ai-market-signal-ticker 42s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .ai-market-signal-ticker-track {
            animation: none;
            transform: none;
          }
        }
      `}</style>

      <div className="mx-auto flex max-w-[1920px] flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:px-5">
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
            Piyasa Radarı
          </span>
          <span className="hidden text-[11px] font-bold text-slate-500 sm:inline">Binance / 30 sn</span>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1.5">
          <div className="flex w-max min-w-full items-center gap-8 ai-market-signal-ticker-track">
            <TickerContent alerts={tickerItems} fallback={calmMessage} />
            <TickerContent alerts={tickerItems} fallback={calmMessage} ariaHidden />
          </div>
        </div>

        <div className="shrink-0">
          <SoundAlertToggle compact />
        </div>
      </div>
    </section>
  );
}

function TickerContent({ alerts, fallback, ariaHidden = false }: { alerts: MarketScanAlert[]; fallback: string; ariaHidden?: boolean }) {
  if (alerts.length === 0) {
    return (
      <span aria-hidden={ariaHidden} className={`text-xs font-bold text-slate-400 md:text-sm ${ariaHidden ? "motion-reduce:hidden" : ""}`}>
        {fallback}
      </span>
    );
  }

  return (
    <span aria-hidden={ariaHidden} className={`flex items-center gap-4 text-xs font-bold md:text-sm ${ariaHidden ? "motion-reduce:hidden" : ""}`}>
      {alerts.map((alert) => (
        <span key={`${alert.key}-${ariaHidden ? "clone" : "main"}`} className="inline-flex items-center gap-2">
          <span className="font-black text-white">{alert.symbol}</span>
          <span className="text-slate-500">{alert.interval}</span>
          <span className={getAlertClass(alert.alertType)}>{alert.label}</span>
          <span className="text-slate-500">Güven %{alert.confidence}</span>
          <span className="text-slate-500">Risk %{alert.riskScore}</span>
          <span className="text-slate-500">{formatPrice(alert.price)}</span>
          <span className="text-slate-600">{formatTime(alert.timestamp)}</span>
          <span className="text-slate-700">•</span>
        </span>
      ))}
      <span className="text-slate-500">{getExchangeLabel(alerts[0].exchange)} radarı</span>
    </span>
  );
}
