import { describe, expect, it } from "vitest";
import { partitionLeaderboardValuations } from "./leaderboard-valuation";

describe("live leaderboard valuation eligibility", () => {
  it("keeps only reliable portfolios in the live ranking", () => {
    const result = partitionLeaderboardValuations([
      { id: "reliable-low", totalValueUsd: 1_010_000, hasUnreliableValuation: false },
      { id: "unreliable-high", totalValueUsd: 9_999_999, hasUnreliableValuation: true },
      { id: "reliable-high", totalValueUsd: 1_020_000, hasUnreliableValuation: false },
    ]);

    expect(result.rankedRows.map((row) => row.id)).toEqual(["reliable-high", "reliable-low"]);
    expect(result.excludedRows.map((row) => row.id)).toEqual(["unreliable-high"]);
  });
});
