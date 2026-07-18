import { describe, expect, it } from "vitest";
import {
  calculateYahooSplitAdjustedPriceReturn,
  getYahooCumulativeSplitFactor,
  parseYahooSplitEvents,
  YAHOO_VIP_RETURN_BASIS,
} from "./yahoo-corporate-actions";

describe("Yahoo corporate action normalization", () => {
  it("parses and time-filters forward and reverse stock splits", () => {
    const events = parseYahooSplitEvents({
      before: { date: 1_700_000_000, numerator: 2, denominator: 1, splitRatio: "2:1" },
      forward: { date: 1_710_000_000, numerator: 20, denominator: 1, splitRatio: "20:1" },
      reverse: { date: 1_720_000_000, numerator: 1, denominator: 10, splitRatio: "1:10" },
      invalid: { date: 1_725_000_000, numerator: 0, denominator: 1 },
    }, new Date(1_705_000_000_000), new Date(1_725_000_000_000));

    expect(events.map((event) => event.ratio)).toEqual(["20:1", "1:10"]);
    expect(getYahooCumulativeSplitFactor(events)).toBe(2);
  });

  it("removes a 20:1 split discontinuity from recommendation price return", () => {
    const splitEvents = parseYahooSplitEvents({
      split: { date: 1_710_000_000, numerator: 20, denominator: 1, splitRatio: "20:1" },
    });
    const result = calculateYahooSplitAdjustedPriceReturn({
      referencePrice: 2_000,
      currentPrice: 110,
      splitEvents,
    });

    expect(result).toMatchObject({
      splitFactor: 20,
      splitAdjustedReferencePrice: 100,
      returnPercent: 10,
      returnBasis: YAHOO_VIP_RETURN_BASIS,
      dividendsIncluded: false,
    });
  });

  it("handles reverse splits and rejects unusable prices", () => {
    const splitEvents = parseYahooSplitEvents({
      split: { date: 1_710_000_000, numerator: 1, denominator: 10, splitRatio: "1:10" },
    });
    const result = calculateYahooSplitAdjustedPriceReturn({ referencePrice: 2, currentPrice: 22, splitEvents });

    expect(result?.splitAdjustedReferencePrice).toBe(20);
    expect(result?.returnPercent).toBe(10);
    expect(calculateYahooSplitAdjustedPriceReturn({ referencePrice: 0, currentPrice: 22, splitEvents })).toBeNull();
  });
});
