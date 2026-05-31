"use client";

import Link from "next/link";
import { AssetUniversePanel } from "@/components/ai-market/AssetUniversePanel";
import {
  AI_MARKET_FAVORITES_STORAGE_KEY,
  DEFAULT_AI_MARKET_FAVORITES,
  FavoritesPanel,
} from "@/components/ai-market/FavoritesPanel";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import type { WatchSymbol } from "@/lib/ai-market/types";
import { useMemo, useSyncExternalStore } from "react";

type AssetManagementDashboardProps = {
  locale: string;
  symbols: WatchSymbol[];
};

const FAVORITES_CHANGED_EVENT = "ai-market-favorites-changed";

function normalizeFavorites(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_AI_MARKET_FAVORITES;
  }

  const favorites = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return Array.from(new Set(favorites.map((item) => item.trim().toUpperCase())));
}

function getStoredFavorites() {
  if (typeof window === "undefined") {
    return DEFAULT_AI_MARKET_FAVORITES;
  }

  try {
    const storedValue = window.localStorage.getItem(AI_MARKET_FAVORITES_STORAGE_KEY);
    return storedValue ? normalizeFavorites(JSON.parse(storedValue)) : DEFAULT_AI_MARKET_FAVORITES;
  } catch {
    return DEFAULT_AI_MARKET_FAVORITES;
  }
}

function getFavoritesSnapshot() {
  return JSON.stringify(getStoredFavorites());
}

function subscribeToFavorites(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(FAVORITES_CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(FAVORITES_CHANGED_EVENT, callback);
  };
}

function writeFavorites(favorites: string[]) {
  window.localStorage.setItem(AI_MARKET_FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

export function AssetManagementDashboard({ locale, symbols }: AssetManagementDashboardProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale).ai;
  const favoritesSnapshot = useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    () => JSON.stringify(DEFAULT_AI_MARKET_FAVORITES),
  );
  const favorites = useMemo(() => normalizeFavorites(JSON.parse(favoritesSnapshot)), [favoritesSnapshot]);

  function addFavorite(symbol: string) {
    const normalized = symbol.trim().toUpperCase();

    if (!normalized || favorites.includes(normalized)) {
      return;
    }

    writeFavorites([...favorites, normalized]);
  }

  function removeFavorite(symbol: string) {
    writeFavorites(favorites.filter((item) => item !== symbol));
  }

  function clearFavorites() {
    if (!window.confirm(copy.clearFavoritesConfirm)) {
      return;
    }

    writeFavorites([]);
  }

  function resetFavorites() {
    if (!window.confirm(copy.resetFavoritesConfirm)) {
      return;
    }

    writeFavorites(DEFAULT_AI_MARKET_FAVORITES);
  }

  return (
    <div className="grid gap-5">
      <section className="premium-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{copy.assetManagementBreadcrumb}</p>
            <h1 className="mt-2 text-2xl font-black text-[#152033] md:text-3xl">{copy.assetManagementTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {copy.assetManagementBody}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/ai-piyasa-asistani`}
              className="rounded-md border border-[#0f766e] bg-emerald-50 px-3 py-2 text-sm font-black text-[#0f766e] hover:bg-emerald-100"
            >
              {copy.backToAnalysis}
            </Link>
            <button
              type="button"
              onClick={resetFavorites}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:border-slate-300"
            >
              {copy.resetFavorites}
            </button>
            <button
              type="button"
              onClick={clearFavorites}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 hover:border-red-300"
            >
              {copy.clearFavorites}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label={copy.selectedFavorites} value={favorites.length.toString()} />
          <Stat label={copy.storageLocation} value="localStorage" />
          <Stat label={copy.storageKey} value={AI_MARKET_FAVORITES_STORAGE_KEY} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
        <FavoritesPanel locale={safeLocale} favorites={favorites} symbols={symbols} onRemoveFavorite={removeFavorite} />
        <AssetUniversePanel locale={safeLocale} favorites={favorites} onAddFavorite={addFavorite} onRemoveFavorite={removeFavorite} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white/70 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-[#152033]">{value}</p>
    </div>
  );
}
