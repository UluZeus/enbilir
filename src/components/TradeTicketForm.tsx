"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import type { MarketItem } from "@/lib/market-data";
import type { TradeActionState, tradeAction } from "@/lib/actions";

type TradeTicketFormProps = {
  locale: string;
  userId: string;
  marketItems: MarketItem[];
  idempotencyKey: string;
  action: typeof tradeAction;
};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} className="premium-cta px-5 py-3 text-sm font-black disabled:cursor-wait disabled:opacity-70">
      {pending ? pendingLabel : label}
    </button>
  );
}

export function TradeTicketForm({ locale, userId, marketItems = [], idempotencyKey, action }: TradeTicketFormProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale).trade;
  const categoryLabels = copy.categoryLabels;
  const statusLabels = copy.statusLabels;
  const router = useRouter();
  const [state, formAction] = useActionState<TradeActionState, FormData>(action, { ok: false, message: "" });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MarketItem["category"] | "ALL">("ALL");
  const filteredItems = useMemo(() => {
    const safeMarketItems = Array.isArray(marketItems) ? marketItems : [];
    const normalizedQuery = query.trim().toLowerCase();

    return safeMarketItems.filter((item) => {
      const categoryMatches = category === "ALL" || item.category === category;
      const queryMatches =
        !normalizedQuery ||
        item.symbol.toLowerCase().includes(normalizedQuery) ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.market.toLowerCase().includes(normalizedQuery);

      return categoryMatches && queryMatches;
    });
  }, [category, marketItems, query]);
  const hasProducts = filteredItems.length > 0;

  useEffect(() => {
    if (!state.ok) {
      return;
    }

    try {
      router.refresh();
    } catch (error) {
      console.error("Trade refresh failed after successful transaction:", error);
    }
  }, [router, state.ok, state.message]);

  return (
    <form action={formAction} className="mt-5 grid gap-4">
      {state.message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold leading-6 ${
            state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {state.message}
        </div>
      ) : null}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="grid gap-3 md:grid-cols-[1fr_260px]">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.productSearch}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.productSearchPlaceholder}
            className="rounded-md border border-slate-300 px-4 py-3 font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.category}
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as MarketItem["category"] | "ALL")}
            className="rounded-md border border-slate-300 px-4 py-3 font-normal"
          >
            <option value="ALL">{copy.allProducts}</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto] md:items-end">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.product}
          <select name="symbol" disabled={!hasProducts} className="rounded-md border border-slate-300 px-4 py-3 font-normal disabled:opacity-60">
            {filteredItems.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol} - {item.name} · {categoryLabels[item.category]} · {statusLabels[item.dataStatus]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.action}
          <select name="side" className="rounded-md border border-slate-300 px-4 py-3 font-normal">
            <option value="BUY">{copy.buy}</option>
            <option value="SELL">{copy.sell}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.amountUsd}
          <input name="amountUsd" type="number" min="1" step="1" required className="rounded-md border border-slate-300 px-4 py-3 font-normal" />
        </label>
        {hasProducts ? (
          <SubmitButton label={copy.submit} pendingLabel={copy.submitting} />
        ) : (
          <button disabled className="rounded-md border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-black text-slate-500">
            {copy.noProductData}
          </button>
        )}
      </div>
      <p className="text-xs leading-5 text-slate-500">
        {hasProducts
          ? copy.productsListed(filteredItems.length)
          : copy.marketDataUnavailable}
      </p>
    </form>
  );
}
