import { describe, expect, it } from "vitest";
import { combineNasdaqDebt } from "@/lib/vip-research/nasdaq-research";

describe("Nasdaq fundamental debt normalization", () => {
  it("keeps debt unknown when both debt rows are missing", () => {
    expect(combineNasdaqDebt(null, null)).toBeNull();
  });

  it("uses the available debt row without inventing the missing component", () => {
    expect(combineNasdaqDebt(null, 125)).toBe(125);
    expect(combineNasdaqDebt(25, null)).toBe(25);
  });

  it("preserves a reported zero-debt balance", () => {
    expect(combineNasdaqDebt(0, 0)).toBe(0);
  });
});
