export const MACRO_REPORT_CHART_SELECTION = [
  { symbol: "XAGUSD", label: "XAG/USD" },
  { symbol: "XAUUSD", label: "XAU/USD" },
  { symbol: "NVDA", label: "NVDA" },
  { symbol: "BTCUSDT", label: "BTC" },
  { symbol: "ETHUSDT", label: "ETH" },
  { symbol: "BZ=F", label: "Brent" },
  { symbol: "USDTRY", label: "USD/TRY" },
  { symbol: "CCJ", label: "CCJ" },
  { symbol: "XU100.IS", label: "BIST 100" },
  { symbol: "^DJI", label: "Dow Jones" },
  { symbol: "^IXIC", label: "Nasdaq" },
] as const;

type ReportChartAsset = {
  symbol: string;
  displayName: string;
};

export function selectMacroReportChartAssets<T extends ReportChartAsset>(assets: T[]) {
  const assetBySymbol = new Map(assets.map((asset) => [asset.symbol.toUpperCase(), asset]));

  return MACRO_REPORT_CHART_SELECTION.flatMap((selection) => {
    const asset = assetBySymbol.get(selection.symbol.toUpperCase());
    return asset ? [{ ...asset, displayName: selection.label }] : [];
  });
}
