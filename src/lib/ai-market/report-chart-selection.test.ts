import { describe, expect, it } from "vitest";
import {
  MACRO_REPORT_CHART_SELECTION,
  selectMacroReportChartAssets,
} from "@/lib/ai-market/report-chart-selection";

describe("macro report chart selection", () => {
  it("uses the requested chart order and excludes the former automatic picks", () => {
    const requested = MACRO_REPORT_CHART_SELECTION.map((item) => ({
      symbol: item.symbol,
      displayName: `Stored ${item.symbol}`,
      id: item.symbol,
    }));
    const selected = selectMacroReportChartAssets([
      { symbol: "AMD", displayName: "AMD", id: "amd" },
      { symbol: "MSFT", displayName: "MSFT", id: "msft" },
      { symbol: "000001.SS", displayName: "Shanghai Composite", id: "shanghai" },
      ...requested.reverse(),
    ]);

    expect(selected.map((asset) => asset.symbol)).toEqual(MACRO_REPORT_CHART_SELECTION.map((item) => item.symbol));
    expect(selected.map((asset) => asset.displayName)).toEqual(MACRO_REPORT_CHART_SELECTION.map((item) => item.label));
    expect(selected.some((asset) => ["AMD", "MSFT", "000001.SS"].includes(asset.symbol))).toBe(false);
  });

  it("keeps the requested order when an older report is missing a selected asset", () => {
    const selected = selectMacroReportChartAssets([
      { symbol: "^IXIC", displayName: "Nasdaq Composite" },
      { symbol: "XAGUSD", displayName: "Silver" },
      { symbol: "NVDA", displayName: "Nvidia" },
    ]);

    expect(selected).toEqual([
      { symbol: "XAGUSD", displayName: "XAG/USD" },
      { symbol: "NVDA", displayName: "NVDA" },
      { symbol: "^IXIC", displayName: "Nasdaq" },
    ]);
  });
});
