"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getAssetClassLabel } from "@/components/ai-market/FavoritesPanel";
import { getSafeLocale, type Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { ASSET_UNIVERSE_SECTIONS, type AssetUniverseCategory, type AssetUniverseItem } from "@/lib/ai-market/asset-universe";
import type { AssetClass } from "@/lib/ai-market/types";
import { localizeMarketText } from "@/lib/market-data";

type BinanceUniverseAsset = {
  symbol: string;
  displayName: string;
  price: number;
  change24h: number;
  volume24h: number;
  assetClass: "CRYPTO";
  exchange: "binance";
};

type UniverseResponse = BinanceUniverseAsset[] | { data?: unknown; error?: string };

type AssetUniversePanelProps = {
  locale?: Locale | string;
  favorites: string[];
  onAddFavorite: (symbol: string) => void;
  onRemoveFavorite?: (symbol: string) => void;
};

type LoadState = {
  status: "idle" | "loading" | "success" | "error";
  assets: BinanceUniverseAsset[];
  error: string | null;
};

type AssetFilter = "ALL" | "CRYPTO_VOLUME_TOP_100" | AssetUniverseCategory;

const filters: Array<{ value: AssetFilter; label: string }> = [
  { value: "ALL", label: "Tümü" },
  { value: "CRYPTO_VOLUME_TOP_100", label: "Kripto Hacim Top 100" },
  { value: "CRYPTO_MARKET_CAP_TOP_100", label: "Kripto Piyasa Değeri Top 100" },
  { value: "NASDAQ", label: "Nasdaq" },
  { value: "DOW_JONES", label: "Dow Jones" },
  { value: "SP500", label: "S&P 500" },
  { value: "BIST100", label: "BIST 100 / İMKB 100" },
  { value: "METALS", label: "Metaller" },
  { value: "FX", label: "FX" },
  { value: "INDEXES", label: "Endeksler" },
];

function formatPrice(value: number) {
  if (value >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  if (value >= 1) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }

  return value.toLocaleString("en-US", { maximumSignificantDigits: 4 });
}

function formatVolume(value: number) {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function isUniverseAsset(value: unknown): value is BinanceUniverseAsset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const asset = value as Record<string, unknown>;

  return (
    typeof asset.symbol === "string" &&
    typeof asset.displayName === "string" &&
    typeof asset.price === "number" &&
    typeof asset.change24h === "number" &&
    typeof asset.volume24h === "number" &&
    asset.assetClass === "CRYPTO" &&
    asset.exchange === "binance"
  );
}

function matchesSearch(asset: { symbol: string; displayName: string; name?: string; tags?: string[] }, search: string) {
  const query = search.trim().toUpperCase();

  if (!query) {
    return true;
  }

  return (
    asset.symbol.toUpperCase().includes(query) ||
    asset.displayName.toUpperCase().includes(query) ||
    (asset.name?.toUpperCase().includes(query) ?? false) ||
    (asset.tags?.some((tag) => tag.toUpperCase().includes(query)) ?? false)
  );
}

export function AssetUniversePanel({ locale = "tr", favorites, onAddFavorite, onRemoveFavorite }: AssetUniversePanelProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale);
  const filterLabels = safeLocale === "en"
    ? {
        ALL: "All",
        CRYPTO_VOLUME_TOP_100: "Crypto Volume Top 100",
        CRYPTO_MARKET_CAP_TOP_100: "Crypto Market Cap Top 100",
        NASDAQ: "Nasdaq",
        DOW_JONES: "Dow Jones",
        SP500: "S&P 500",
        BIST100: "BIST 100",
        METALS: "Metals",
        FX: "FX",
        INDEXES: "Indexes",
      }
    : Object.fromEntries(filters.map((filter) => [filter.value, filter.label])) as Record<AssetFilter, string>;
  const [state, setState] = useState<LoadState>({ status: "idle", assets: [], error: null });
  const [search, setSearch] = useState("");
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("ALL");
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUniverse() {
      setState((current) => ({ ...current, status: "loading", error: null }));

      try {
        const response = await fetch("/api/ai-market/universe", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json()) as UniverseResponse;

        if (!response.ok) {
          const message = !Array.isArray(payload) && typeof payload.error === "string"
            ? payload.error
            : safeLocale === "en"
              ? "Asset list could not be loaded."
              : "Varlik listesi alinamadi.";
          throw new Error(message);
        }

        if (!Array.isArray(payload)) {
          throw new Error(safeLocale === "en" ? "Asset list is not in the expected format." : "Varlik listesi beklenen formatta degil.");
        }

        setState({ status: "success", assets: payload.filter(isUniverseAsset), error: null });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          assets: [],
          error: error instanceof Error ? error.message : safeLocale === "en" ? "Asset list could not be loaded." : "Varlik listesi yuklenemedi.",
        });
      }
    }

    loadUniverse();

    return () => controller.abort();
  }, [safeLocale]);

  const filteredVolumeAssets = useMemo(() => {
    if (assetFilter !== "ALL" && assetFilter !== "CRYPTO_VOLUME_TOP_100") {
      return [];
    }

    return state.assets.filter((asset) => matchesSearch({ symbol: asset.symbol, displayName: asset.displayName, name: asset.displayName }, search));
  }, [assetFilter, search, state.assets]);

  const filteredSections = useMemo(() => {
    return ASSET_UNIVERSE_SECTIONS.map((section) => ({
      ...section,
      assets:
        assetFilter === "ALL" || assetFilter === section.category
          ? section.assets.filter((asset) => matchesSearch(asset, search))
          : [],
    })).filter((section) => section.assets.length > 0);
  }, [assetFilter, search]);

  const visibleCount = filteredVolumeAssets.length + filteredSections.reduce((total, section) => total + section.assets.length, 0);

  return (
    <section className="premium-card p-4 md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#152033]">{safeLocale === "en" ? "Asset Universe" : "Varlık Evreni"}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {safeLocale === "en"
              ? "Choose favorites from crypto, US stocks, BIST 100, metals, FX, and indexes."
              : "Kripto, ABD hisseleri, BIST 100, metaller, FX ve endeksler arasından favori seç."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-xs font-black text-slate-600">
            {copy.ai.favoritesCount(favorites.length)}
          </span>
          <span className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-xs font-black text-slate-600">
            {safeLocale === "en" ? `${visibleCount} visible assets` : `${visibleCount} görünür varlık`}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
        <div>
          <label className="block text-xs font-black uppercase tracking-[0.14em] text-slate-500" htmlFor="ai-market-asset-search">
            {copy.common.search}
          </label>
          <input
            id="ai-market-asset-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={safeLocale === "en" ? "BTC, NVDA, THYAO, gold..." : "BTC, NVDA, THYAO, altın..."}
            className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#0f766e]"
          />
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.trade.category}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setAssetFilter(filter.value)}
                className={`rounded-md border px-3 py-2 text-xs font-black ${
                  assetFilter === filter.value
                    ? "border-[#0f766e] bg-emerald-50 text-[#0f766e]"
                    : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300"
                }`}
              >
                {filterLabels[filter.value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-6">
        {assetFilter === "ALL" || assetFilter === "CRYPTO_VOLUME_TOP_100" ? (
          <AssetSection title={safeLocale === "en" ? "Crypto - Top 100 by Volume" : "Kripto - Hacme Göre İlk 100"} countLabel={copy.ai.assets} count={filteredVolumeAssets.length}>
            {state.status === "loading" ? <p className="rounded-md bg-white/70 p-3 text-sm font-semibold text-slate-500">{copy.common.loading}...</p> : null}
            {state.status === "error" ? (
              <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{state.error}</p>
            ) : null}
            {state.status === "success" ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filteredVolumeAssets.map((asset) => (
                  <VolumeAssetCard
                    key={asset.symbol}
                    asset={asset}
                    isFavorite={favoriteSet.has(asset.symbol)}
                    onAddFavorite={onAddFavorite}
                    onRemoveFavorite={onRemoveFavorite}
                    locale={safeLocale}
                  />
                ))}
              </div>
            ) : null}
          </AssetSection>
        ) : null}

        {filteredSections.map((section) => (
          <AssetSection key={section.category} title={safeLocale === "en" ? filterLabels[section.category] : section.title} countLabel={copy.ai.assets} count={section.assets.length}>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {section.assets.map((asset) => (
                <SeedAssetCard
                  key={`${section.category}-${asset.symbol}`}
                  asset={asset}
                  isFavorite={favoriteSet.has(asset.symbol)}
                  onAddFavorite={onAddFavorite}
                  onRemoveFavorite={onRemoveFavorite}
                  locale={safeLocale}
                />
              ))}
            </div>
          </AssetSection>
        ))}
      </div>
    </section>
  );
}

function AssetSection({ title, count, countLabel, children }: { title: string; count: number; countLabel: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{title}</h3>
        <span className="text-xs font-bold text-slate-400">{count} {countLabel}</span>
      </div>
      <div className="mt-2 max-h-[560px] overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

function VolumeAssetCard({
  locale = "tr",
  asset,
  isFavorite,
  onAddFavorite,
  onRemoveFavorite,
}: {
  locale?: Locale | string;
  asset: BinanceUniverseAsset;
  isFavorite: boolean;
  onAddFavorite: (symbol: string) => void;
  onRemoveFavorite?: (symbol: string) => void;
}) {
  return (
    <AssetCardFrame isFavorite={isFavorite}>
      <AssetCardBody
        displayName={asset.displayName}
        name={`$${formatPrice(asset.price)} · ${asset.change24h.toFixed(2)}% · ${formatVolume(asset.volume24h)}`}
        assetClass="CRYPTO"
        exchangeLabel="Binance"
        locale={locale}
      />
      <FavoriteToggle locale={locale} symbol={asset.symbol} isFavorite={isFavorite} onAddFavorite={onAddFavorite} onRemoveFavorite={onRemoveFavorite} />
    </AssetCardFrame>
  );
}

function SeedAssetCard({
  locale = "tr",
  asset,
  isFavorite,
  onAddFavorite,
  onRemoveFavorite,
}: {
  locale?: Locale | string;
  asset: AssetUniverseItem;
  isFavorite: boolean;
  onAddFavorite: (symbol: string) => void;
  onRemoveFavorite?: (symbol: string) => void;
}) {
  return (
    <AssetCardFrame isFavorite={isFavorite}>
      <AssetCardBody
        displayName={asset.displayName}
        name={localizeMarketText(asset.name, locale)}
        assetClass={asset.assetClass}
        exchangeLabel={asset.exchangeLabel}
        locale={locale}
      />
      <FavoriteToggle locale={locale} symbol={asset.symbol} isFavorite={isFavorite} onAddFavorite={onAddFavorite} onRemoveFavorite={onRemoveFavorite} />
    </AssetCardFrame>
  );
}

function AssetCardFrame({ isFavorite, children }: { isFavorite: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-md border p-3 ${isFavorite ? "border-emerald-200 bg-emerald-50/60" : "border-white/70 bg-white/60"}`}>
      <div className="flex items-start justify-between gap-3">{children}</div>
    </div>
  );
}

function AssetCardBody({
  displayName,
  name,
  assetClass,
  exchangeLabel,
  locale = "tr",
}: {
  displayName: string;
  name: string;
  assetClass: AssetClass;
  exchangeLabel: string;
  locale?: Locale | string;
}) {
  const safeLocale = getSafeLocale(locale);
  const assetClassLabel = safeLocale === "en"
    ? {
        CRYPTO: "Crypto",
        COMMODITY: "Metals",
        FX: "FX",
        EQUITY: "Equities",
        INDEX: "Indexes",
      }[assetClass]
    : getAssetClassLabel(assetClass);

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-black text-[#152033]">{displayName}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{name}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded-md border border-slate-200 bg-white/70 px-2 py-1 text-[11px] font-black text-slate-500">
          {assetClassLabel}
        </span>
        <span className="rounded-md border border-slate-200 bg-white/70 px-2 py-1 text-[11px] font-black text-slate-500">
          {exchangeLabel}
        </span>
      </div>
    </div>
  );
}

function FavoriteToggle({
  locale = "tr",
  symbol,
  isFavorite,
  onAddFavorite,
  onRemoveFavorite,
}: {
  locale?: Locale | string;
  symbol: string;
  isFavorite: boolean;
  onAddFavorite: (symbol: string) => void;
  onRemoveFavorite?: (symbol: string) => void;
}) {
  const safeLocale = getSafeLocale(locale);
  return (
    <button
      type="button"
      onClick={() => (isFavorite && onRemoveFavorite ? onRemoveFavorite(symbol) : onAddFavorite(symbol))}
      disabled={isFavorite && !onRemoveFavorite}
      className={`shrink-0 rounded-md border px-2 py-1 text-xs font-black ${
        isFavorite
          ? onRemoveFavorite
            ? "border-emerald-200 bg-white text-emerald-700 hover:border-red-200 hover:text-red-700"
            : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
          : "border-[#0f766e] bg-emerald-50 text-[#0f766e] hover:bg-emerald-100"
      }`}
    >
      {isFavorite ? (safeLocale === "en" ? "Selected" : "Seçili") : (safeLocale === "en" ? "Add" : "Ekle")}
    </button>
  );
}
