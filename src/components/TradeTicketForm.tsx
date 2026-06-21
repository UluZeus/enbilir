"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { TechnicalIndicatorCharts } from "@/components/ai-market/TechnicalIndicatorCharts";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import type { MarketAnalysis } from "@/lib/ai-market/types";
import { formatMarketItemPrice, type MarketItem } from "@/lib/market-data";
import type { TradeActionState, tradeAction } from "@/lib/actions";
import { getTradeAnalysisTarget } from "@/lib/trade-watch";

type TradeTicketFormProps = {
  locale: string;
  userId: string;
  marketItems: MarketItem[];
  idempotencyKey: string;
  action: typeof tradeAction;
  initialCategory?: MarketItem["category"] | "ALL";
  initialSymbol?: string;
  initialSearch?: string;
};

type LiveMarketPayload = {
  updatedAt: string;
  items: MarketItem[];
  topRisers: MarketItem[];
  topFallers: MarketItem[];
  error?: string;
};

type AnalysisState = {
  status: "idle" | "loading" | "success" | "error";
  analysis: MarketAnalysis | null;
  error: string | null;
};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} className="premium-cta px-5 py-3 text-sm font-black disabled:cursor-wait disabled:opacity-70">
      {pending ? pendingLabel : label}
    </button>
  );
}

function formatUpdatedAt(value: string | null, locale: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatChange(changePercent: number) {
  const prefix = changePercent > 0 ? "+" : "";
  return `${prefix}${changePercent.toFixed(2)}%`;
}

function TrendBadge({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "slate" }) {
  const toneClasses =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "red"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`trade-trend-badge rounded-lg border px-3 py-2 ${toneClasses}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function buildMarketSignature(items: MarketItem[]) {
  return items
    .map((item) => `${item.symbol}:${item.priceUsd}:${item.changePercent}:${item.category}:${item.dataStatus}`)
    .join("|");
}

function filterMarketItems(items: MarketItem[], category: MarketItem["category"] | "ALL", query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return items.filter((item) => {
    const categoryMatches = category === "ALL" || item.category === category;
    const queryMatches =
      !normalizedQuery ||
      item.symbol.toLowerCase().includes(normalizedQuery) ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.market.toLowerCase().includes(normalizedQuery);

    return categoryMatches && queryMatches;
  });
}

function buildTradeHref(locale: string, category: MarketItem["category"] | "ALL", symbol?: string, search?: string) {
  const params = new URLSearchParams();

  if (category !== "ALL") {
    params.set("category", category);
  }

  if (symbol) {
    params.set("symbol", symbol);
  }

  const normalizedSearch = search?.trim();
  if (normalizedSearch) {
    params.set("q", normalizedSearch);
  }

  const query = params.toString();
  return `/${locale}/islem-yap${query ? `?${query}` : ""}`;
}

export function TradeTicketForm({
  locale,
  userId,
  marketItems = [],
  idempotencyKey,
  action,
  initialCategory = "ALL",
  initialSymbol,
  initialSearch = "",
}: TradeTicketFormProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale).trade;
  const [state, formAction] = useActionState<TradeActionState, FormData>(action, { ok: false, message: "" });
  const [query, setQuery] = useState(initialSearch);
  const category = initialCategory;
  const [liveItems, setLiveItems] = useState<MarketItem[]>(marketItems);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(null);
  const [selectedSymbol] = useState<string>(() => {
    const normalizedSymbol = initialSymbol?.trim().toUpperCase() ?? "";
    if (normalizedSymbol && marketItems.some((item) => item.symbol.toUpperCase() === normalizedSymbol)) {
      return normalizedSymbol;
    }

    return marketItems[0]?.symbol ?? "";
  });
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: "idle", analysis: null, error: null });
  const liveSignatureRef = useRef(buildMarketSignature(marketItems));
  const filteredItems = useMemo(() => filterMarketItems(liveItems, category, query), [category, liveItems, query]);
  const selectedItem = useMemo(() => {
    return filteredItems.find((item) => item.symbol === selectedSymbol) ?? filteredItems[0] ?? null;
  }, [filteredItems, selectedSymbol]);
  const selectedItemSymbol = selectedItem?.symbol ?? "";
  const selectedItemName = selectedItem?.name ?? "";
  const selectedItemMarket = selectedItem?.market ?? "";
  const selectedItemCategory = selectedItem?.category ?? "";
  const selectedItemPrice = selectedItem?.price ?? "";
  const selectedItemPriceUsd = selectedItem?.priceUsd ?? 0;
  const selectedItemChangePercent = selectedItem?.changePercent ?? 0;
  const selectedItemDataStatus = selectedItem?.dataStatus ?? "close";
  const selectedItemSource = selectedItem?.source ?? "fallback";

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    async function loadOverview() {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;

      try {
        const response = await fetch("/api/market/overview", {
          signal: requestController.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(copy.marketDataUnavailable);
        }

        const payload = (await response.json()) as LiveMarketPayload;

        if (!active) {
          return;
        }

        const nextItems = payload.items.length > 0 ? payload.items : marketItems;
        const nextSignature = buildMarketSignature(nextItems);

        if (nextSignature !== liveSignatureRef.current) {
          liveSignatureRef.current = nextSignature;
          setLiveItems(nextItems);
        }

        setLiveUpdatedAt(payload.updatedAt ?? null);
      } catch {
        if (active && !requestController.signal.aborted) {
          setLiveItems((current) => (current.length > 0 ? current : marketItems));
        }
      }
    }

    loadOverview();
    const refreshId = window.setInterval(loadOverview, 30_000);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(refreshId);
    };
  }, [copy.marketDataUnavailable, marketItems]);

  const analysisTarget = useMemo(() => {
    if (!selectedItemSymbol) {
      return null;
    }

    return getTradeAnalysisTarget({
      symbol: selectedItemSymbol,
      name: selectedItemName || selectedItemSymbol,
      market: selectedItemMarket,
      category: selectedItemCategory as MarketItem["category"],
      dataSymbol: selectedItemSymbol.toLowerCase(),
      price: selectedItemPrice,
      priceUsd: selectedItemPriceUsd,
      changePercent: selectedItemChangePercent,
      dataStatus: selectedItemDataStatus as MarketItem["dataStatus"],
      source: selectedItemSource as MarketItem["source"],
    });
  }, [
    selectedItemChangePercent,
    selectedItemCategory,
    selectedItemDataStatus,
    selectedItemMarket,
    selectedItemName,
    selectedItemPrice,
    selectedItemPriceUsd,
    selectedItemSource,
    selectedItemSymbol,
  ]);
  const analysisSignature = analysisTarget ? `${analysisTarget.exchange}:${analysisTarget.symbol}` : "";

  useEffect(() => {
    const targetSymbol = analysisTarget?.symbol ?? "";
    const targetExchange = analysisTarget?.exchange ?? "";

    if (targetSymbol === "" || targetExchange === "") {
      return;
    }

    let active = true;
    let controller: AbortController | null = null;

    async function loadAnalysis() {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;

      try {
        setAnalysisState((current) => ({ ...current, status: "loading", error: null }));
        const requestUrl = new URL("/api/ai-market/analyze", window.location.origin);
        requestUrl.searchParams.set("symbol", targetSymbol);
        requestUrl.searchParams.set("exchange", targetExchange);
        requestUrl.searchParams.set("interval", "1h");

        const response = await fetch(requestUrl, {
          signal: requestController.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(copy.marketDataUnavailable);
        }

        const analysis = (await response.json()) as MarketAnalysis;

        if (active) {
          setAnalysisState({ status: "success", analysis, error: null });
        }
      } catch (error) {
        if (active && !requestController.signal.aborted) {
          setAnalysisState({
            status: "error",
            analysis: null,
            error: error instanceof Error ? error.message : copy.marketDataUnavailable,
          });
        }
      }
    }

    loadAnalysis();
    const refreshId = window.setInterval(loadAnalysis, 30_000);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(refreshId);
    };
  }, [analysisSignature, analysisTarget, copy.marketDataUnavailable]);

  const hasProducts = filteredItems.length > 0;
  const effectiveSelectedItem = useMemo(() => {
    return filteredItems.find((item) => item.symbol === selectedSymbol) ?? filteredItems[0] ?? null;
  }, [filteredItems, selectedSymbol]);
  const effectiveSelectedSymbol = effectiveSelectedItem?.symbol ?? "";
  const selectedCategoryLabel = category === "ALL" ? copy.allProducts : copy.categoryLabels[category];
  const effectiveCategoryOptions = [
    { value: "ALL" as const, label: copy.allProducts, count: liveItems.length },
    ...Object.entries(copy.categoryLabels).map(([key, label]) => ({
      value: key as MarketItem["category"],
      label,
      count: liveItems.filter((item) => item.category === key).length,
    })),
  ];
  const selectedChangeTone =
    effectiveSelectedItem && effectiveSelectedItem.changePercent > 0
      ? "green"
      : effectiveSelectedItem && effectiveSelectedItem.changePercent < 0
        ? "red"
        : "slate";

  return (
    <div className="grid min-w-0 gap-5">
      <form action={formAction} className="trade-ticket-terminal dashboard-shell min-w-0 p-4 lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0f766e]">{copy.title}</p>
            <h2 className="mt-2 text-xl font-black text-[#152033] sm:text-2xl">
              {effectiveSelectedItem ? `${effectiveSelectedItem.symbol} · ${effectiveSelectedItem.name}` : copy.description}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{copy.description}</p>
          </div>
          <div className="grid gap-1 text-left text-xs font-bold text-slate-500 lg:text-right">
            <p>Son güncelleme</p>
            <p className="text-sm font-black text-[#152033]">{formatUpdatedAt(liveUpdatedAt, safeLocale)}</p>
          </div>
        </div>

        {state.message ? (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold leading-6 ${
              state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <div className="trade-category-card mt-5 rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{copy.category}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-600">{copy.productSearch}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {selectedCategoryLabel} · {filteredItems.length} {copy.allProducts.toLowerCase()}
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              30 saniye canlı tarama
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {effectiveCategoryOptions.map((option) => (
              <Link
                key={String(option.value)}
                href={buildTradeHref(safeLocale, option.value, undefined, query)}
                aria-current={category === option.value ? "page" : undefined}
                className={`trade-category-pill rounded-full border px-3 py-2 text-[11px] font-black transition ${
                  category === option.value
                    ? "border-[#0f766e] bg-[#0f766e] text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#0f766e] hover:text-[#0f766e]"
                }`}
              >
                <span className="block truncate">{option.label}</span>
                <span className="block text-[10px] font-bold opacity-70">({option.count})</span>
              </Link>
            ))}
          </div>
        </div>

        <input type="hidden" name="symbol" value={effectiveSelectedSymbol} />

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,0.9fr)_auto] xl:items-end">
          <label className="trade-terminal-field grid min-w-0 gap-2 text-sm font-bold text-slate-700">
            {copy.action}
            <select name="side" className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0f766e]">
              <option value="BUY">{copy.buy}</option>
              <option value="SELL">{copy.sell}</option>
            </select>
          </label>

          <label className="trade-terminal-field grid min-w-0 gap-2 text-sm font-bold text-slate-700">
            {copy.amountUsd}
            <input
              name="amountUsd"
              type="number"
              min="1"
              step="1"
              required
              className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0f766e]"
            />
          </label>

          <div className="flex items-end">
            {hasProducts ? (
              <SubmitButton label={copy.submit} pendingLabel={copy.submitting} />
            ) : (
              <button disabled className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-500">
                {copy.noProductData}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <TrendBadge label="Görüntülenen" value={String(filteredItems.length)} tone="slate" />
          <TrendBadge label="Alım / Satım" value="Aktif" tone="green" />
          <TrendBadge label="Yenileme" value="30 saniye" tone="slate" />
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
        <form method="get" action={`/${safeLocale}/islem-yap`} className="grid gap-2">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            {copy.productSearch}
            <input
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.productSearchPlaceholder}
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#0f766e]"
            />
          </label>
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="symbol" value={effectiveSelectedSymbol} />
          <div className="flex justify-end">
            <button type="submit" className="rounded-md border border-[#0f766e] bg-[#0f766e] px-4 py-2 text-sm font-black text-white shadow-sm">
              Ara
            </button>
          </div>
        </form>

        <div key={`${category}:${query}`} className="mt-4 max-h-[22rem] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="grid gap-2">
            {filteredItems.map((item) => (
              <Link
                key={item.symbol}
                href={buildTradeHref(safeLocale, category, item.symbol, query)}
                aria-current={effectiveSelectedSymbol === item.symbol ? "page" : undefined}
                className={`grid gap-1 rounded-lg border px-3 py-2.5 text-left transition ${
                  effectiveSelectedSymbol === item.symbol
                    ? "border-[#0f766e] bg-white shadow-sm"
                    : "border-slate-200 bg-white/80 hover:border-[#0f766e]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-black text-[#152033]">{item.symbol}</p>
                  <p className={`shrink-0 text-sm font-black ${item.changePercent >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatChange(item.changePercent)}
                  </p>
                </div>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {item.name} · {copy.categoryLabels[item.category]} · {copy.statusLabels[item.dataStatus]}
                </p>
                <p className="text-xs font-bold text-[#0f766e]">{formatMarketItemPrice(item)}</p>
              </Link>
            ))}
            {!hasProducts ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-sm font-semibold text-slate-500">
                {copy.marketDataUnavailable}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        {effectiveSelectedItem ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{effectiveSelectedItem.market}</p>
                <p className="mt-1 text-2xl font-black text-[#0f766e] lg:text-3xl">{effectiveSelectedItem.price}</p>
              </div>
              <div
                className={`rounded-full border px-3 py-1 text-xs font-black lg:text-sm ${
                  selectedChangeTone === "green"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : selectedChangeTone === "red"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {formatChange(effectiveSelectedItem.changePercent)}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <TrendBadge label="Sembol" value={effectiveSelectedItem.symbol} tone="slate" />
              <TrendBadge label="Kategori" value={copy.categoryLabels[effectiveSelectedItem.category]} tone="slate" />
              <TrendBadge label="Piyasa" value={effectiveSelectedItem.market} tone="slate" />
              <TrendBadge label="Durum" value={copy.statusLabels[effectiveSelectedItem.dataStatus]} tone={effectiveSelectedItem.dataStatus === "live" ? "green" : "slate"} />
            </div>

            {analysisState.analysis?.technicalSeries ? (
              <TechnicalIndicatorCharts
                locale={safeLocale}
                symbol={analysisState.analysis.symbol}
                interval={analysisState.analysis.interval}
                series={analysisState.analysis.technicalSeries}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
                {analysisState.status === "loading"
                  ? "Teknik grafik yükleniyor..."
                  : analysisState.error || "Seçilen ürün için teknik grafik verisi hazırlanıyor."}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
