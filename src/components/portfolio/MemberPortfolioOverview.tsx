import { getDonutColor, PortfolioDonut } from "@/components/PortfolioDonut";
import type { PortfolioPerformancePeriod, PortfolioPeriodKey } from "@/lib/portfolio-history";

export type MemberPortfolioDonutItem = {
  label: string;
  value: number;
  detail?: string;
  profitLossPercent?: number | null;
};

export type MemberPortfolioOverviewProps = {
  locale: "tr" | "en";
  totalValueUsd: number;
  cashValueUsd: number;
  items: MemberPortfolioDonutItem[];
  performancePeriods: PortfolioPerformancePeriod[];
};

type PeriodDefinition = {
  key: PortfolioPeriodKey;
  tr: string;
  en: string;
};

const periodDefinitions: PeriodDefinition[] = [
  { key: "DAILY", tr: "Günlük", en: "Daily" },
  { key: "WEEKLY", tr: "Haftalık", en: "Weekly" },
  { key: "MONTHLY", tr: "Aylık", en: "Monthly" },
  { key: "QUARTERLY", tr: "3 aylık", en: "3 months" },
  { key: "SEMI_ANNUAL", tr: "6 aylık", en: "6 months" },
  { key: "YEARLY", tr: "Yıllık", en: "Yearly" },
];

function formatUsd(value: number, locale: "tr" | "en", signed = false) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const normalizedValue = Math.abs(value) < 0.005 ? 0 : value;
  const formattedValue = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(normalizedValue);

  return signed && normalizedValue > 0 ? `+${formattedValue}` : formattedValue;
}

function formatPercent(value: number, signed = false) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const normalizedValue = Math.abs(value) < 0.005 ? 0 : value;
  const sign = signed && normalizedValue > 0 ? "+" : "";
  const decimals = Math.abs(normalizedValue) > 0 && Math.abs(normalizedValue) < 1 ? 4 : 2;

  return `${sign}${normalizedValue.toFixed(decimals)}%`;
}

function getTone(value: number) {
  if (value > 0) {
    return {
      dot: "bg-emerald-500",
      shell: "border-emerald-100 bg-emerald-50/80",
      text: "text-emerald-800",
    };
  }

  if (value < 0) {
    return {
      dot: "bg-rose-500",
      shell: "border-rose-100 bg-rose-50/80",
      text: "text-rose-800",
    };
  }

  return {
    dot: "bg-slate-400",
    shell: "border-slate-200 bg-slate-50",
    text: "text-slate-700",
  };
}

function getVisibleItems(items: MemberPortfolioDonutItem[], otherLabel: string) {
  const positiveItems = items.filter((item) => Number.isFinite(item.value) && item.value > 0);
  const maximumItems = 7;

  if (positiveItems.length <= maximumItems) {
    return positiveItems;
  }

  const groupedItems = positiveItems.slice(maximumItems - 1);

  return [
    ...positiveItems.slice(0, maximumItems - 1),
    {
      label: otherLabel,
      value: groupedItems.reduce((sum, item) => sum + item.value, 0),
      detail: `${groupedItems.length}`,
      profitLossPercent: null,
    },
  ];
}

export function MemberPortfolioOverview({
  locale,
  totalValueUsd,
  cashValueUsd,
  items,
  performancePeriods,
}: MemberPortfolioOverviewProps) {
  const tr = locale === "tr";
  const copy = tr
    ? {
        eyebrow: "Sanal portföy",
        title: "Portföy görünümü",
        updated: "Güncel dağılım",
        total: "Toplam değer",
        cash: "Nakit",
        allocation: "Varlık dağılımı",
        allocationDescription: "Portföyün ürün bazındaki güncel ağırlıkları",
        performance: "Dönemsel kazanç / kayıp",
        performanceDescription: "Yüzdesel değişim, ABD doları karşılığı ve veri kapsamı",
        insufficient: "Yeterli veri birikiyor",
        partial: "Kısmi dönem",
        full: "Tam dönem",
        coverage: "kapsam",
        empty: "Dağılımı göstermek için henüz portföy verisi yok.",
        other: "Diğer varlıklar",
        itemCount: "varlık",
      }
    : {
        eyebrow: "Virtual portfolio",
        title: "Portfolio overview",
        updated: "Current allocation",
        total: "Total value",
        cash: "Cash",
        allocation: "Asset allocation",
        allocationDescription: "Current product weights across the portfolio",
        performance: "Periodic profit / loss",
        performanceDescription: "Percentage change, its US dollar value, and data coverage",
        insufficient: "Building sufficient history",
        partial: "Partial period",
        full: "Full period",
        coverage: "coverage",
        empty: "Portfolio data is not available for an allocation view yet.",
        other: "Other assets",
        itemCount: "assets",
      };
  const safeTotal = Number.isFinite(totalValueUsd) && totalValueUsd > 0 ? totalValueUsd : 0;
  const safeCash = Number.isFinite(cashValueUsd) ? cashValueUsd : 0;
  const visibleItems = getVisibleItems(items, copy.other);
  const cashShare = safeTotal > 0 ? Math.min(100, Math.max(0, (safeCash / safeTotal) * 100)) : 0;
  const allocationSummary = visibleItems
    .map((item) => `${item.label} ${formatPercent(safeTotal > 0 ? (item.value / safeTotal) * 100 : 0)}`)
    .join(", ");

  return (
    <section
      aria-label={copy.title}
      className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-[0_26px_70px_-44px_rgba(15,23,42,0.5)] sm:p-6"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 -z-10 h-48 w-48 rounded-full bg-teal-100/60 blur-3xl motion-safe:animate-pulse"
      />

      <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-teal-700">{copy.eyebrow}</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[0.65rem] font-bold text-teal-800">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-teal-500 motion-safe:animate-pulse" />
              {copy.updated}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-black tracking-[-0.025em] text-slate-950 sm:text-2xl">{copy.title}</h2>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:min-w-[18rem]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2.5">
            <dt className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-slate-500">{copy.total}</dt>
            <dd className="mt-1 text-sm font-black tabular-nums text-slate-950 sm:text-base">{formatUsd(totalValueUsd, locale)}</dd>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-teal-50/80 px-3 py-2.5">
            <dt className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-teal-700">{copy.cash}</dt>
            <dd className="mt-1 text-sm font-black tabular-nums text-teal-950 sm:text-base">{formatUsd(cashValueUsd, locale)}</dd>
            <p className="mt-0.5 text-[0.65rem] font-bold tabular-nums text-teal-700">{formatPercent(cashShare)}</p>
          </div>
        </dl>
      </header>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(19rem,1.08fr)] xl:items-start">
        <figure className="min-w-0 rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
          <figcaption className="mb-3">
            <p className="text-sm font-black text-slate-950">{copy.allocation}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{copy.allocationDescription}</p>
          </figcaption>

          {visibleItems.length > 0 && safeTotal > 0 ? (
            <>
              <div
                role="img"
                aria-label={`${copy.allocation}: ${allocationSummary}`}
                className="rounded-2xl border border-white bg-white/80 p-2"
              >
                <PortfolioDonut items={visibleItems} total={safeTotal} size="sm" animated showLegend={false} maxLegendItems={8} />
              </div>
              <ul className="mt-3 grid gap-2" aria-label={copy.allocation}>
                {visibleItems.map((item, index) => {
                  const allocation = safeTotal > 0 ? (item.value / safeTotal) * 100 : 0;

                  return (
                    <li key={`${item.label}-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getDonutColor(index) }} />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-slate-900">{item.label}</span>
                        {item.detail ? (
                          <span className="block truncate text-[0.65rem] text-slate-500">
                            {item.label === copy.other ? `${item.detail} ${copy.itemCount}` : item.detail}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-right">
                        <span className="block text-xs font-black tabular-nums text-slate-900">{formatPercent(allocation)}</span>
                        <span className="block text-[0.65rem] font-semibold tabular-nums text-slate-500">{formatUsd(item.value, locale)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 text-center text-sm leading-6 text-slate-600">
              {copy.empty}
            </div>
          )}
        </figure>

        <div className="min-w-0 rounded-[1.4rem] border border-slate-200 bg-slate-950 p-3 text-white sm:p-4">
          <div className="px-1 pb-3">
            <h3 className="text-sm font-black">{copy.performance}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">{copy.performanceDescription}</p>
          </div>
          <dl className="grid gap-2">
            {periodDefinitions.map((definition) => {
              const period = performancePeriods.find((candidate) => candidate.key === definition.key);
              const coveragePercent = Math.max(0, Math.min(100, period?.coveragePercent ?? 0));
              const coverageLabel = `${new Intl.NumberFormat(tr ? "tr-TR" : "en-US", { maximumFractionDigits: 0 }).format(coveragePercent)}% ${copy.coverage}`;
              const hasHistory = period?.source === "history"
                && typeof period.change === "number"
                && Number.isFinite(period.change)
                && typeof period.changeUsd === "number"
                && Number.isFinite(period.changeUsd);
              const label = tr ? definition.tr : definition.en;

              if (!hasHistory || period.change === null || period.changeUsd === null) {
                return (
                  <div key={definition.key} className="grid min-h-14 grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5">
                    <dt className="text-xs font-bold text-slate-300">{label}</dt>
                    <dd className="text-right text-[0.7rem] font-semibold leading-4 text-slate-400">
                      {copy.insufficient}
                      {coveragePercent > 0 ? <span className="mt-0.5 block text-[0.62rem] text-slate-500">{coverageLabel}</span> : null}
                    </dd>
                  </div>
                );
              }

              const tone = getTone(period.change);

              return (
                <div key={definition.key} className={`grid min-h-14 grid-cols-[minmax(0,0.58fr)_minmax(0,1.42fr)] items-center gap-3 rounded-xl border px-3 py-2.5 ${tone.shell}`}>
                  <dt className="flex items-center gap-2 text-xs font-black text-slate-800">
                    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                    {label}
                  </dt>
                  <dd className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 text-right tabular-nums">
                    <strong className={`text-sm font-black ${tone.text}`}>{formatPercent(period.change, true)}</strong>
                    <span className={`text-[0.7rem] font-bold ${tone.text}`}>{formatUsd(period.changeUsd, locale, true)}</span>
                    <span className={`basis-full text-[0.6rem] font-black uppercase tracking-[0.08em] ${period.isPartial ? "text-amber-700" : "text-slate-500"}`}>
                      {period.isPartial ? copy.partial : copy.full} · {coverageLabel}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}
