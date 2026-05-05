"use client";

import { useState } from "react";

export type PortfolioBreakdownItem = {
  label: string;
  symbol: string;
  value: number;
  percent: number;
  color: string;
};

type PortfolioBreakdownProps = {
  items: PortfolioBreakdownItem[];
  compact?: boolean;
};

function formatUsd(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  const absValue = Math.abs(value);
  const decimals = absValue > 0 && absValue < 1 ? 4 : 2;

  return `${value.toFixed(decimals)}%`;
}

export function PortfolioBreakdown({ items, compact = false }: PortfolioBreakdownProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, 10);

  if (items.length === 0) {
    return (
      <div className="rounded-md bg-[#f8fafc] p-4 text-sm leading-6 text-slate-500">
        Portföyünde henüz yatırım ürünü yok. İlk sanal alımından sonra dağılım ve ürün ağırlıkları burada listelenir.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {visibleItems.map((item) => (
        <div key={item.symbol} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md bg-white/72 shadow-sm ${compact ? "p-2" : "p-3"}`}>
          <span className={compact ? "h-2.5 w-2.5 rounded-full shadow-sm" : "h-3 w-3 rounded-full shadow-sm"} style={{ backgroundColor: item.color }} />
          <div className="min-w-0">
            <p className={compact ? "truncate text-xs font-black text-[#152033]" : "truncate text-sm font-black text-[#152033]"}>{item.symbol}</p>
            <p className="truncate text-xs text-slate-500">{item.label}</p>
          </div>
          <div className="text-right">
            <p className={compact ? "text-xs font-black text-[#0f766e]" : "text-sm font-black text-[#0f766e]"}>{formatUsd(item.value)}</p>
            <p className="text-xs font-bold text-slate-500">{formatPercent(item.percent)}</p>
          </div>
        </div>
      ))}
      {items.length > 10 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-md border border-slate-300 bg-white/70 px-4 py-2 text-xs font-black text-slate-700 hover:border-[#0f766e]"
        >
          {expanded ? "Daha az göster" : `Tümünü göster (${items.length})`}
        </button>
      ) : null}
    </div>
  );
}
