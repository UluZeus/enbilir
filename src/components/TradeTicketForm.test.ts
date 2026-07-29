import { describe, expect, it } from "vitest";
import { getTradeExecutionStatus } from "@/components/TradeTicketForm";
import type { MarketItem } from "@/lib/market-data";

function marketItem(overrides: Partial<MarketItem> = {}): MarketItem {
  return {
    symbol: "BRONZE",
    dataSymbol: "bronze",
    name: "Bronz",
    market: "Emtia",
    category: "COMMODITY",
    dataStatus: "representative",
    source: "representative",
    price: "$4.08",
    priceUsd: 4.08,
    changePercent: 0.74,
    executionEligible: false,
    ...overrides,
  };
}

describe("getTradeExecutionStatus", () => {
  it("keeps representative commodity prices viewable but marks execution unavailable", () => {
    expect(getTradeExecutionStatus(marketItem(), "tr")).toEqual({
      eligible: false,
      label: "Doğrulanmış işlem kaynağı yok",
    });
  });

  it("reports closed and stale verified-source quotes without enabling execution", () => {
    expect(
      getTradeExecutionStatus(
        marketItem({
          symbol: "GC=F",
          source: "yahoo",
          dataStatus: "close",
          marketState: "CLOSED",
        }),
        "en",
      ),
    ).toEqual({ eligible: false, label: "Market closed" });

    expect(
      getTradeExecutionStatus(
        marketItem({
          symbol: "GC=F",
          source: "yahoo",
          dataStatus: "delayed",
          marketState: "REGULAR",
        }),
        "en",
      ),
    ).toEqual({ eligible: false, label: "Price is stale" });
  });

  it("marks only execution-eligible quotes active", () => {
    expect(
      getTradeExecutionStatus(
        marketItem({
          symbol: "GC=F",
          source: "yahoo",
          dataStatus: "live",
          marketState: "REGULAR",
          executionEligible: true,
        }),
        "en",
      ),
    ).toEqual({ eligible: true, label: "Active" });
  });
});
