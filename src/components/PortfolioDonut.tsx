type DonutItem = {
  label: string;
  value: number;
};

const colors = ["#0f766e", "#f5a623", "#2563eb", "#dc2626", "#7c3aed", "#0891b2", "#65a30d", "#ea580c"];

type PortfolioDonutProps = {
  items: DonutItem[];
  total: number;
};

export function PortfolioDonut({ items, total }: PortfolioDonutProps) {
  const positiveItems = items.filter((item) => item.value > 0);

  if (positiveItems.length === 0 || total <= 0) {
    return (
      <div className="grid place-items-center rounded-lg bg-[#f8fafc] p-5">
        <div className="grid h-44 w-44 place-items-center rounded-full border-[26px] border-slate-200">
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
    <div className="grid place-items-center rounded-lg bg-[#f8fafc] p-5">
      <div
        className="grid h-44 w-44 place-items-center rounded-full"
        style={{ background: `conic-gradient(${gradientStops})` }}
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-sm">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">USD</span>
        </div>
      </div>
    </div>
  );
}

export function getDonutColor(index: number) {
  return colors[index % colors.length];
}
