export type VipAgentStrategy = {
  id: string;
  slug: "sabit" | "olgun" | "yildirim";
  name: "SABİT" | "OLGUN" | "YILDIRIM";
  riskProfile: "MUHAFAZAKAR" | "DENGELI" | "AGRESIF";
  description: string;
  minimumConfidence: number;
  maximumRisk: number;
  maximumPositions: number;
  maximumPositionPercent: number;
  minimumActiveCashPercent: number;
  entryTolerancePercent: number;
};

export const VIP_AGENT_STARTING_BALANCE_USD = 1_100_000;
export const VIP_AGENT_PERFORMANCE_BASE_USD = 1_000_000;
export const VIP_AGENT_RESERVE_USD = 100_000;

export const VIP_AGENT_STRATEGIES: VipAgentStrategy[] = [
  {
    id: "vip-agent-sabit",
    slug: "sabit",
    name: "SABİT",
    riskProfile: "MUHAFAZAKAR",
    description: "Yüksek güven, düşük risk ve güçlü nakit koruması arar. Portföy yoğunlaşmasını sıkı biçimde sınırlar.",
    minimumConfidence: 82,
    maximumRisk: 38,
    maximumPositions: 4,
    maximumPositionPercent: 12,
    minimumActiveCashPercent: 50,
    entryTolerancePercent: 0,
  },
  {
    id: "vip-agent-olgun",
    slug: "olgun",
    name: "OLGUN",
    riskProfile: "DENGELI",
    description: "Güven, risk ve çeşitlendirme arasında denge kurar. Makul fiyat sapmalarına sınırlı tolerans gösterir.",
    minimumConfidence: 72,
    maximumRisk: 58,
    maximumPositions: 6,
    maximumPositionPercent: 16,
    minimumActiveCashPercent: 20,
    entryTolerancePercent: 1,
  },
  {
    id: "vip-agent-yildirim",
    slug: "yildirim",
    name: "YILDIRIM",
    riskProfile: "AGRESIF",
    description: "Yüksek asimetri için daha geniş risk aralığını kabul eder; yine de VIP stop ve hedef disiplininden ayrılmaz.",
    minimumConfidence: 62,
    maximumRisk: 78,
    maximumPositions: 8,
    maximumPositionPercent: 22,
    minimumActiveCashPercent: 5,
    entryTolerancePercent: 3,
  },
];

export function getVipAgentStrategy(slug: string) {
  return VIP_AGENT_STRATEGIES.find((strategy) => strategy.slug === slug);
}
