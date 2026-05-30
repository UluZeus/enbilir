"use client";

import { useEffect, useMemo, useState } from "react";
import { PREPARED_FAVORITE_ASSETS } from "@/components/ai-market/FavoritesPanel";
import type { FavoriteAsset } from "@/components/ai-market/FavoritesPanel";

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
  favorites: string[];
  onAddFavorite: (symbol: string) => void;
};

type LoadState = {
  status: "idle" | "loading" | "success" | "error";
  assets: BinanceUniverseAsset[];
  error: string | null;
};

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

export function AssetUniversePanel({ favorites, onAddFavorite }: AssetUniversePanelProps) {
  const [state, setState] = useState<LoadState>({ status: "idle", assets: [], error: null });
  const [search, setSearch] = useState("");
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
          const message = !Array.isArray(payload) && typeof payload.error === "string" ? payload.error : "Varlik listesi alinamadi.";
          throw new Error(message);
        }

        if (!Array.isArray(payload)) {
          throw new Error("Varlik listesi beklenen formatta degil.");
        }

        setState({ status: "success", assets: payload.filter(isUniverseAsset), error: null });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "error",
          assets: [],
          error: error instanceof Error ? error.message : "Varlik listesi yuklenemedi.",
        });
      }
    }

    loadUniverse();

    return () => controller.abort();
  }, []);

  const filteredUniverse = useMemo(() => {
    const query = search.trim().toUpperCase();

    if (!query) {
      return state.assets.slice(0, 30);
    }

    return state.assets.filter((asset) => asset.symbol.includes(query) || asset.displayName.toUpperCase().includes(query)).slice(0, 30);
  }, [search, state.assets]);

  const filteredPreparedAssets = useMemo(() => {
    const query = search.trim().toUpperCase();

    if (!query) {
      return PREPARED_FAVORITE_ASSETS;
    }

    return PREPARED_FAVORITE_ASSETS.filter(
      (asset) =>
        asset.symbol.toUpperCase().includes(query) ||
        asset.displayName.toUpperCase().includes(query) ||
        asset.name.toUpperCase().includes(query),
    );
  }, [search]);

  return (
    <section className="premium-card p-4">
      <div>
        <h2 className="text-base font-black text-[#152033]">Varlik Ekle</h2>
        <p className="mt-1 text-xs text-slate-500">Binance Top 100 ve hazir varliklar</p>
      </div>

      <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-500" htmlFor="ai-market-asset-search">
        Ara
      </label>
      <input
        id="ai-market-asset-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="BTC, altin, NVDA..."
        className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold"
      />

      <div className="mt-4 grid gap-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Binance Top 100</h3>
          <div className="mt-2 max-h-[420px] overflow-y-auto pr-1">
            {state.status === "loading" ? <p className="rounded-md bg-white/70 p-3 text-sm font-semibold text-slate-500">Yukleniyor...</p> : null}
            {state.status === "error" ? (
              <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{state.error}</p>
            ) : null}
            {state.status === "success" ? (
              <div className="grid gap-2">
                {filteredUniverse.map((asset) => (
                  <UniverseAssetRow
                    key={asset.symbol}
                    asset={asset}
                    isFavorite={favoriteSet.has(asset.symbol)}
                    onAddFavorite={onAddFavorite}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Hazir Varliklar</h3>
          <div className="mt-2 grid gap-2">
            {filteredPreparedAssets.map((asset) => (
              <PreparedAssetRow
                key={asset.symbol}
                asset={asset}
                isFavorite={favoriteSet.has(asset.symbol)}
                onAddFavorite={onAddFavorite}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function UniverseAssetRow({
  asset,
  isFavorite,
  onAddFavorite,
}: {
  asset: BinanceUniverseAsset;
  isFavorite: boolean;
  onAddFavorite: (symbol: string) => void;
}) {
  return (
    <div className="rounded-md border border-white/70 bg-white/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#152033]">{asset.displayName}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            ${formatPrice(asset.price)} · {asset.change24h.toFixed(2)}% · {formatVolume(asset.volume24h)}
          </p>
        </div>
        <AddButton symbol={asset.symbol} isFavorite={isFavorite} onAddFavorite={onAddFavorite} />
      </div>
    </div>
  );
}

function PreparedAssetRow({
  asset,
  isFavorite,
  onAddFavorite,
}: {
  asset: FavoriteAsset;
  isFavorite: boolean;
  onAddFavorite: (symbol: string) => void;
}) {
  return (
    <div className="rounded-md border border-white/70 bg-white/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#152033]">{asset.displayName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{asset.name}</p>
        </div>
        <AddButton symbol={asset.symbol} isFavorite={isFavorite} onAddFavorite={onAddFavorite} />
      </div>
    </div>
  );
}

function AddButton({
  symbol,
  isFavorite,
  onAddFavorite,
}: {
  symbol: string;
  isFavorite: boolean;
  onAddFavorite: (symbol: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAddFavorite(symbol)}
      disabled={isFavorite}
      className={`shrink-0 rounded-md border px-2 py-1 text-xs font-black ${
        isFavorite
          ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
          : "border-[#0f766e] bg-emerald-50 text-[#0f766e] hover:bg-emerald-100"
      }`}
    >
      {isFavorite ? "Eklendi" : "Ekle"}
    </button>
  );
}
