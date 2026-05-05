import { getDonutColor } from "@/components/PortfolioDonut";
import type { PortfolioBreakdownItem } from "@/components/PortfolioBreakdown";
import type { getPortfolioSnapshot } from "@/lib/portfolio";

type PortfolioSnapshot = Awaited<ReturnType<typeof getPortfolioSnapshot>>;

export function getPortfolioBreakdownItems(snapshot: PortfolioSnapshot): PortfolioBreakdownItem[] {
  const total = snapshot.totalValueUsd;
  const percentOfTotal = (value: number) => (total > 0 ? (value / total) * 100 : 0);
  const cashItem: PortfolioBreakdownItem = {
    label: snapshot.cashCurrency,
    symbol: `Nakit / ${snapshot.cashCurrency}`,
    value: snapshot.cashValueUsd,
    percent: percentOfTotal(snapshot.cashValueUsd),
    color: getDonutColor(0),
  };
  const positionItems = snapshot.positions
    .map((position, index) => ({
      label: position.name,
      symbol: position.symbol,
      value: position.valueUsd,
      percent: percentOfTotal(position.valueUsd),
      color: getDonutColor(index + 1),
    }))
    .sort((a, b) => b.value - a.value);

  return [cashItem, ...positionItems];
}
