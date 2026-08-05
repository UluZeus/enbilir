import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/live-market", () => ({ getLiveMarketItemsForSymbols: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/portfolio-corporate-actions", () => ({ syncPortfolioCorporateActions: vi.fn() }));
vi.mock("@/lib/serializable-transaction", () => ({ withSerializableTransaction: vi.fn() }));

import { calculateCompetitionPositionCosts } from "@/lib/portfolio";

describe("competition open-position cost", () => {
  it("releases sold cost basis before deciding whether a later buy uses bonus capital", () => {
    const costs = calculateCompetitionPositionCosts([
      { symbol: "AAA", side: "BUY", quantity: 10, totalUsd: 1_000_000 },
      { symbol: "AAA", side: "SELL", quantity: 5, totalUsd: 500_000 },
      { symbol: "BBB", side: "BUY", quantity: 5, totalUsd: 500_000 },
    ]);

    expect(costs.get("AAA")?.toString()).toBe("500000");
    expect(costs.get("BBB")?.toString()).toBe("500000");
  });

  it("removes only the proportional cost of a partial lot sale", () => {
    const costs = calculateCompetitionPositionCosts([
      { symbol: "AAA", side: "BUY", quantity: 3, totalUsd: 900_000 },
      { symbol: "AAA", side: "SELL", quantity: 1, totalUsd: 400_000 },
      { symbol: "BBB", side: "BUY", quantity: 2, totalUsd: 400_000 },
    ]);

    expect(costs.get("AAA")?.toString()).toBe("600000");
    expect(costs.get("BBB")?.toString()).toBe("400000");
  });

  it("uses the portfolio's average remaining cost basis after unequal-price buys", () => {
    const costs = calculateCompetitionPositionCosts([
      { symbol: "AAA", side: "BUY", quantity: 1, totalUsd: 400_000 },
      { symbol: "AAA", side: "BUY", quantity: 1, totalUsd: 800_000 },
      { symbol: "AAA", side: "SELL", quantity: 1, totalUsd: 700_000 },
      { symbol: "BBB", side: "BUY", quantity: 1, totalUsd: 400_000 },
    ]);

    expect(costs.get("AAA")?.toString()).toBe("500000");
    expect(costs.get("BBB")?.toString()).toBe("400000");
  });
});
