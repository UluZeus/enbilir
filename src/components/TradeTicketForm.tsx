"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { MarketItem } from "@/lib/market-data";
import type { tradeAction } from "@/lib/actions";

type TradeTicketFormProps = {
  locale: string;
  userId: string;
  marketItems: MarketItem[];
  idempotencyKey: string;
  action: typeof tradeAction;
};

const categoryLabels: Record<MarketItem["category"], string> = {
  BIST: "BIST / İMKB",
  NASDAQ: "NASDAQ",
  DOW: "Dow Jones",
  FX: "Majör döviz",
  CRYPTO: "Kripto",
  COMMODITY: "Emtia",
  TR_BOND: "Türkiye tahvil/bono",
  US_BOND: "ABD tahvil",
  EUROBOND: "Eurobond",
  INDEX: "Endeks",
};

const statusLabels: Record<MarketItem["dataStatus"], string> = {
  live: "canlı",
  delayed: "gecikmeli",
  close: "son kapanış",
  representative: "temsili",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} className="premium-cta px-5 py-3 text-sm font-black disabled:cursor-wait disabled:opacity-70">
      {pending ? "İşlem uygulanıyor..." : "İşlemi uygula"}
    </button>
  );
}

export function TradeTicketForm({ locale, userId, marketItems, idempotencyKey, action }: TradeTicketFormProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MarketItem["category"] | "ALL">("ALL");
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return marketItems.filter((item) => {
      const categoryMatches = category === "ALL" || item.category === category;
      const queryMatches =
        !normalizedQuery ||
        item.symbol.toLowerCase().includes(normalizedQuery) ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.market.toLowerCase().includes(normalizedQuery);

      return categoryMatches && queryMatches;
    });
  }, [category, marketItems, query]);

  return (
    <form action={action} className="mt-5 grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="grid gap-3 md:grid-cols-[1fr_260px]">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Ürün ara
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sembol, ürün adı veya piyasa"
            className="rounded-md border border-slate-300 px-4 py-3 font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Kategori
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as MarketItem["category"] | "ALL")}
            className="rounded-md border border-slate-300 px-4 py-3 font-normal"
          >
            <option value="ALL">Tüm ürünler</option>
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
          Ürün
          <select name="symbol" className="rounded-md border border-slate-300 px-4 py-3 font-normal">
            {filteredItems.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol} - {item.name} · {categoryLabels[item.category]} · {statusLabels[item.dataStatus]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          İşlem
          <select name="side" className="rounded-md border border-slate-300 px-4 py-3 font-normal">
            <option value="BUY">Al</option>
            <option value="SELL">Sat</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Tutar USD
          <input name="amountUsd" type="number" min="1" step="1" required className="rounded-md border border-slate-300 px-4 py-3 font-normal" />
        </label>
        <SubmitButton />
      </div>
      <p className="text-xs leading-5 text-slate-500">
        {filteredItems.length} ürün listeleniyor. Etiketler veri kaynağını gösterir: gecikmeli, son kapanış veya temsili.
      </p>
    </form>
  );
}
