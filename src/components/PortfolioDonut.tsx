type DonutItem = {
  label: string;
  value: number;
  detail?: string;
  profitLossPercent?: number | null;
};

const colors = ["#0f766e", "#f5a623", "#2563eb", "#dc2626", "#7c3aed", "#0891b2", "#65a30d", "#ea580c"];

type PortfolioDonutProps = {
  items: DonutItem[];
  total: number;
  size?: "sm" | "md";
  animated?: boolean;
  showLegend?: boolean;
  labels?: {
    allocation: string;
    profitLoss: string;
  };
};

function formatAllocation(value: number, total: number) {
  if (total <= 0) {
    return "0.00%";
  }

  return `${((value / total) * 100).toFixed(2)}%`;
}

function formatProfitLossPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  const decimals = Math.abs(value) > 0 && Math.abs(value) < 1 ? 4 : 2;
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function PortfolioDonut({
  items,
  total,
  size = "md",
  animated = false,
  showLegend = true,
  labels = { allocation: "Ağırlık", profitLoss: "K/Z" },
}: PortfolioDonutProps) {
  const positiveItems = items.filter((item) => item.value > 0);
  const shellSize = size === "sm" ? "h-32 w-32" : "h-44 w-44";
  const centerSize = size === "sm" ? "h-16 w-16" : "h-24 w-24";

  if (positiveItems.length === 0 || total <= 0) {
    return (
      <div className="grid place-items-center rounded-lg bg-[#f8fafc] p-5">
        <div className={`grid ${shellSize} place-items-center rounded-full border-[22px] border-slate-200`}>
          <span className="text-center text-xs font-bold text-slate-500">Pozisyon yok</span>
        </div>
      </div>
    );
  }

  const gradientStops = positiveItems
    .reduce<{ stops: string[]; cumulative: number }>(
      (accumulator, item, index) => {
        const start = accumulator.cumulative;
        const end = start + (item.value / total) * 100;
        const color = colors[index % colors.length];

        return {
          stops: [...accumulator.stops, `${color} ${start}% ${end}%`],
          cumulative: end,
        };
      },
      { stops: [], cumulative: 0 },
    )
    .stops
    .join(", ");

  return (
    <div className="portfolio-donut-card grid gap-4 rounded-lg bg-[#f8fafc] p-5">
      <div
        className={`portfolio-donut mx-auto grid ${shellSize} place-items-center rounded-full ${animated ? "portfolio-donut--animated" : ""}`}
        style={{ background: `conic-gradient(${gradientStops})` }}
      >
        <div className={`grid ${centerSize} place-items-center rounded-full bg-white text-center shadow-sm`}>
          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">USD</span>
        </div>
      </div>
      {showLegend ? (
        <div className="portfolio-donut-legend grid gap-2">
          {positiveItems.map((item, index) => {
            const profitLossTone =
              typeof item.profitLossPercent === "number"
                ? item.profitLossPercent >= 0
                  ? "text-emerald-700"
                  : "text-red-600"
                : "text-slate-500";

            return (
              <div key={`${item.label}-${index}`} className="grid gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: getDonutColor(index) }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-[#152033]">{item.label}</p>
                    {item.detail ? <p className="truncate text-[10px] font-bold text-slate-500">{item.detail}</p> : null}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-slate-50 px-2 py-1">
                    <p className="font-bold uppercase tracking-[0.08em] text-slate-500">{labels.allocation}</p>
                    <p className="font-black text-[#152033]">{formatAllocation(item.value, total)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-1 text-right">
                    <p className="font-bold uppercase tracking-[0.08em] text-slate-500">{labels.profitLoss}</p>
                    <p className={`font-black ${profitLossTone}`}>{formatProfitLossPercent(item.profitLossPercent)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function getDonutColor(index: number) {
  return colors[index % colors.length];
}
