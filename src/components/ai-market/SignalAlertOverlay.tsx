"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SoundAlertToggle } from "@/components/ai-market/SoundAlertToggle";
import type { SignalAlert, SignalAlertType } from "@/lib/ai-market/alert-engine";
import { AI_MARKET_SOUND_ENABLED_KEY, playSignalAlertSound } from "@/lib/ai-market/sound-alerts";
import type { MarketExchange } from "@/lib/ai-market/types";

const MARKET_SCAN_MS = 30_000;
const ALERT_VISIBLE_MS = 10_000;
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
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-100";
  }

  return "border-rose-400/40 bg-rose-400/10 text-rose-100";
}

function getExchangeLabel(exchange: MarketExchange) {
  void exchange;
  return "Binance";
}

export function SignalAlertOverlay() {
  const [activeAlert, setActiveAlert] = useState<MarketScanAlert | null>(null);
  const [extraAlertCount, setExtraAlertCount] = useState(0);
  const [lastScanInterval, setLastScanInterval] = useState(SCAN_INTERVALS[0]);
  const [lastCandidateCount, setLastCandidateCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const scanIndexRef = useRef(0);
  const inProgressRef = useRef(false);
  const dismissTimerRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);
    setExtraAlertCount(0);
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();

      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const showAlert = useCallback((alert: MarketScanAlert, extraCount: number) => {
    setActiveAlert(alert);
    setExtraAlertCount(extraCount);

    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
    }

    dismissTimerRef.current = window.setTimeout(() => {
      dismissAlert();
    }, ALERT_VISIBLE_MS);

    if (window.localStorage.getItem(AI_MARKET_SOUND_ENABLED_KEY) === "true") {
      void playSignalAlertSound(alert.soundLevel);
    }
  }, [dismissAlert]);

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
        return;
      }

      const now = Date.now();
      const cooldowns = pruneCooldowns(readCooldowns(), now);
      const availableAlerts = payload.alerts.filter((alert) => canShowAlert(alert, cooldowns, now));
      const topAlert = availableAlerts[0];

      if (!topAlert) {
        writeCooldowns(cooldowns);
        return;
      }

      cooldowns[topAlert.key] = {
        shownAt: now,
        score: topAlert.recommendationScore,
      };
      writeCooldowns(cooldowns);
      showAlert(topAlert, Math.max(0, availableAlerts.length - 1));
    } catch {
      return;
    } finally {
      controllerRef.current = null;
      inProgressRef.current = false;
      if (mountedRef.current) {
        setIsScanning(false);
      }
    }
  }, [showAlert]);

  useEffect(() => {
    void runScan();
    const refreshId = window.setInterval(() => {
      void runScan();
    }, MARKET_SCAN_MS);

    return () => window.clearInterval(refreshId);
  }, [runScan]);

  return (
    <div className="fixed left-2 top-2 z-40 grid w-[min(300px,calc(100vw-16px))] gap-1.5 sm:left-3 sm:top-3">
      <SoundAlertToggle compact />
      {activeAlert ? (
        <div className="overflow-hidden rounded-md border border-slate-700 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 p-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Piyasa Radarı: Binance</p>
              <h2 className="mt-0.5 truncate text-sm font-black text-white">{activeAlert.displayName}</h2>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">{getExchangeLabel(activeAlert.exchange)}</p>
            </div>
            <button
              type="button"
              onClick={dismissAlert}
              className="rounded-md border border-slate-700 px-2 py-1 text-[10px] font-black text-slate-300 hover:border-slate-500"
            >
              Kapat
            </button>
          </div>

          <div className="grid gap-2 p-2.5">
            <span className={`w-fit rounded-md border px-2 py-1 text-[10px] font-black ${getAlertClass(activeAlert.alertType)}`}>
              {activeAlert.label}
            </span>
            <p className="text-xs font-bold leading-5 text-slate-100">{activeAlert.message}</p>
            <p className="overflow-hidden text-[11px] leading-4 text-slate-400 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {activeAlert.reason}
            </p>

            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <Metric label="Borsa" value={getExchangeLabel(activeAlert.exchange)} />
              <Metric label="Periyot" value={activeAlert.interval} />
              <Metric label="Tavsiye" value={`%${activeAlert.recommendationScore}`} />
              <Metric label="Risk" value={`%${activeAlert.riskScore}`} />
              <Metric label="Güven" value={`%${activeAlert.confidence}`} />
              <Metric label="Son Fiyat" value={formatPrice(activeAlert.price)} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-bold text-slate-500">
              <span>Güncelleme {formatTime(activeAlert.timestamp)}</span>
              <span>{extraAlertCount > 0 ? `+${extraAlertCount} başka sinyal` : `Tarama: ${lastScanInterval}`}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-slate-700/70 bg-slate-950/85 px-2.5 py-1.5 text-[11px] font-bold text-slate-400 shadow-lg">
          Piyasa radarı: Binance / 30 sn · son periyot {lastScanInterval} · {lastCandidateCount || 30} aday{" "}
          {isScanning ? "· kontrol ediliyor" : ""}
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-800 bg-slate-900/90 p-1.5">
      <p className="truncate font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate font-black text-slate-100">{value}</p>
    </div>
  );
}
