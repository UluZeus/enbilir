"use client";

import { useState } from "react";
import { getSafeLocale, type Locale } from "@/i18n/config";
import { AI_MARKET_SOUND_ENABLED_KEY, playTestAlertSound } from "@/lib/ai-market/sound-alerts";

type SoundAlertToggleProps = {
  compact?: boolean;
  locale?: Locale | string;
};

function getStoredSoundEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(AI_MARKET_SOUND_ENABLED_KEY) === "true";
}

function getClientLocale(locale?: Locale | string) {
  if (locale) {
    return getSafeLocale(locale);
  }

  if (typeof window !== "undefined" && window.location.pathname.startsWith("/en")) {
    return "en";
  }

  return "tr";
}

export function SoundAlertToggle({ compact = false, locale }: SoundAlertToggleProps) {
  const safeLocale = getClientLocale(locale);
  const [enabled, setEnabled] = useState(getStoredSoundEnabled);

  function updateEnabled(nextEnabled: boolean) {
    window.localStorage.setItem(AI_MARKET_SOUND_ENABLED_KEY, String(nextEnabled));
    setEnabled(nextEnabled);

    if (nextEnabled) {
      void playTestAlertSound();
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "rounded-md border border-slate-700/80 bg-slate-950/90 p-2 shadow-lg"}`}>
      <button
        type="button"
        onClick={() => updateEnabled(!enabled)}
        className={`rounded-md border font-black ${compact ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-xs"} ${
          enabled
            ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
            : "border-slate-600 bg-slate-900 text-slate-200 hover:border-slate-500"
        }`}
      >
        {enabled ? (safeLocale === "en" ? "Sound Alert On" : "Sesli Uyarı Açık") : (safeLocale === "en" ? "Enable Sound Alert" : "Sesli Uyarı Aç")}
      </button>
      <button
        type="button"
        onClick={() => void playTestAlertSound()}
        disabled={!enabled}
        className={`rounded-md border border-slate-600 bg-slate-900 font-black text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-45 ${
          compact ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-xs"
        }`}
      >
        {safeLocale === "en" ? "Test Sound" : "Test Sesi"}
      </button>
    </div>
  );
}
