type MiniLineChartProps = {
  points: number[];
};

export function MiniLineChart({ points }: MiniLineChartProps) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);
  const polyline = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 44 - ((point - min) / range) * 36;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 48" className="h-16 w-full" aria-hidden="true">
      <polyline points={polyline} fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
