"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EconomyHeadline } from "@/lib/economy-news";
import { formatMarketItemPrice, type MarketItem } from "@/lib/market-data";

type MarketOverviewPayload = {
  updatedAt: string;
  items: MarketItem[];
  topRisers: MarketItem[];
  topFallers: MarketItem[];
  error?: string;
};

type LiveMarketOverviewProps = {
  locale: string;
  initialItems: MarketItem[];
  title: string;
  panelTitle?: string;
  headlines?: EconomyHeadline[];
  variant?: "wide" | "sidebar";
};

function formatUpdatedAt(value: string | undefined, locale: string) {
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

function buildOverviewSignature(payload: MarketOverviewPayload) {
  return [
    ...payload.items.map((item) => `${item.symbol}:${item.priceUsd}:${item.changePercent}:${item.dataStatus}`),
    `r:${payload.topRisers.map((item) => `${item.symbol}:${item.priceUsd}:${item.changePercent}`).join(",")}`,
    `f:${payload.topFallers.map((item) => `${item.symbol}:${item.priceUsd}:${item.changePercent}`).join(",")}`,
  ].join("|");
}

function getDataStatusLabel(item: MarketItem, locale: string) {
  if (item.dataStatus === "live") {
    return locale === "en" ? "Live" : "Canlı";
  }

  if (item.dataStatus === "close") {
    return locale === "en" ? "Last close" : "Son kapanış";
  }

  if (item.dataStatus === "delayed") {
    return locale === "en" ? "Delayed" : "Gecikmeli";
  }

  if (item.dataStatus === "representative") {
    return locale === "en" ? "Representative" : "Temsili";
  }

  return locale === "en" ? "Model" : "Model";
}

function TrendList({ title, items, locale }: { title: string; items: MarketItem[]; locale: string }) {
  return (
    <div className="market-trend-list rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.symbol} className="market-trend-row flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <p className="market-trend-symbol truncate text-sm font-black text-[#152033]">{item.symbol}</p>
              <p className="market-trend-name truncate text-[11px] font-semibold text-slate-600">{item.name}</p>
              <p className="market-trend-price mt-0.5 text-[11px] font-bold text-slate-600">{formatMarketItemPrice(item)}</p>
              <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                {getDataStatusLabel(item, locale)}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <span className={`market-trend-change block text-sm font-black ${item.changePercent >= 0 ? "market-trend-change--up text-emerald-700" : "market-trend-change--down text-red-600"}`}>
                {item.changePercent >= 0 ? "+" : ""}
                {item.changePercent.toFixed(2)}%
              </span>
              <span className="market-trend-mini mt-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {formatMarketItemPrice(item)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveMarketOverview({ locale, initialItems, title, panelTitle, headlines = [], variant = "wide" }: LiveMarketOverviewProps) {
  const isEnglish = locale === "en";
  const isSidebar = variant === "sidebar";
  const initialSignature = buildOverviewSignature({
    updatedAt: "",
    items: initialItems,
    topRisers: [...initialItems].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10),
    topFallers: [...initialItems].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10),
  });
  const [state, setState] = useState<MarketOverviewPayload>({
    updatedAt: "",
    items: initialItems,
    topRisers: [...initialItems].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10),
    topFallers: [...initialItems].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10),
  });
  const lastSignatureRef = useRef(initialSignature);

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
          throw new Error("Piyasa özeti alınamadı.");
        }

        const nextState = (await response.json()) as MarketOverviewPayload;
        const nextSignature = buildOverviewSignature(nextState);

        if (active && nextSignature !== lastSignatureRef.current) {
          lastSignatureRef.current = nextSignature;
          setState(nextState);
        }
      } catch {
        if (active && !requestController.signal.aborted) {
          setState((current) => current);
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
  }, []);

  const stats = useMemo(() => {
    const positive = state.items.filter((item) => item.changePercent >= 0).length;
    const negative = state.items.length - positive;
    return { positive, negative };
  }, [state.items]);

  return (
    <section className={`dashboard-shell grid gap-4 p-4 ${isSidebar ? "" : "lg:grid-cols-[1.1fr_1fr_1fr]"}`}>
      <div className={`market-news-panel rounded-xl bg-[#101827] text-white shadow-sm ${isSidebar ? "p-4" : "p-5"}`}>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5a623]">{panelTitle ?? title}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">{isEnglish ? "Products" : "Ürün"}</p>
            <p className="mt-1 text-lg font-black">{state.items.length}</p>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">{isEnglish ? "Gainers" : "Yükselen"}</p>
            <p className="mt-1 text-lg font-black text-emerald-300">{stats.positive}</p>
          </div>
          <div className="rounded-lg bg-white/10 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">{isEnglish ? "Losers" : "Düşen"}</p>
            <p className="mt-1 text-lg font-black text-red-300">{stats.negative}</p>
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-400">
          {isEnglish ? "Last update" : "Son güncelleme"}: {formatUpdatedAt(state.updatedAt, locale)}
        </p>
        {state.error ? <p className="mt-2 text-xs font-bold text-amber-300">{state.error}</p> : null}
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f5a623]">
            {isEnglish ? "Important economy headlines" : "Öne çıkan ekonomi başlıkları"}
          </p>
          <div className="mt-3 grid gap-3">
            {headlines.length > 0 ? (
              headlines.map((headline) => (
                <a
                  key={`${headline.title}-${headline.source}`}
                  href={headline.link}
                  target="_blank"
                  rel="noreferrer"
                  className="market-news-link rounded-lg border border-white/10 bg-white/6 p-3 hover:bg-white/10"
                >
                  <p className="market-news-title text-sm font-black leading-6 text-white">{headline.title}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {headline.source}
                  </p>
                </a>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-300">
                {isEnglish ? "Daily economy headlines could not be loaded right now." : "Günlük ekonomi başlıkları şu anda yüklenemedi."}
              </p>
            )}
          </div>
        </div>
      </div>

      <TrendList title={isEnglish ? "Top 10 gainers" : "En çok yükselen 10"} items={state.topRisers} locale={locale} />
      <TrendList title={isEnglish ? "Top 10 losers" : "En çok düşen 10"} items={state.topFallers} locale={locale} />
    </section>
  );
}
