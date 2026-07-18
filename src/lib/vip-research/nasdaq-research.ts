import { fetchJsonWithFallback } from "@/lib/http-json";
import type {
  VipFundamentalSnapshot,
  VipInstitutionalSnapshot,
  VipShortInterestSnapshot,
} from "@/lib/vip-research/types";

type NasdaqRow = Record<string, string | number | null | undefined>;
type NasdaqTable = { headers?: NasdaqRow; rows?: NasdaqRow[] };
type NasdaqResponse<T> = { data?: T | null };

const headers = {
  Accept: "application/json, text/plain, */*",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
};

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || !value.trim() || value === "--") {
    return null;
  }

  const negative = value.trim().startsWith("-");
  const parsed = Number(value.replace(/[^0-9.]/g, ""));

  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : null;
}

function percentChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) {
    return null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function rowByLabel(table: NasdaqTable | undefined, labels: string[]) {
  const normalized = labels.map((label) => label.toLowerCase());
  return table?.rows?.find((row) => normalized.includes(String(row.value1 ?? "").trim().toLowerCase()));
}

function values(row: NasdaqRow | undefined) {
  return [parseNumber(row?.value2), parseNumber(row?.value3), parseNumber(row?.value4), parseNumber(row?.value5)];
}

export async function fetchNasdaqFundamentals(symbol: string): Promise<VipFundamentalSnapshot | null> {
  type FinancialData = {
    incomeStatementTable?: NasdaqTable;
    balanceSheetTable?: NasdaqTable;
    cashFlowTable?: NasdaqTable;
  };
  const url = `https://api.nasdaq.com/api/company/${encodeURIComponent(symbol)}/financials?frequency=1`;

  try {
    const payload = await fetchJsonWithFallback<NasdaqResponse<FinancialData>>(url, { headers, next: { revalidate: 21600 }, timeoutMs: 12000 });
    const data = payload.data;

    if (!data) {
      return null;
    }

    const revenue = values(rowByLabel(data.incomeStatementTable, ["Total Revenue"]));
    const netIncome = values(rowByLabel(data.incomeStatementTable, ["Net Income", "Net Income Available to Common"]));
    const researchAndDevelopment = values(rowByLabel(data.incomeStatementTable, ["Research and Development"]));
    const operatingCash = values(rowByLabel(data.cashFlowTable, ["Net Cash Flow-Operating"]));
    const capitalExpenditures = values(rowByLabel(data.cashFlowTable, ["Capital Expenditures"]));
    const totalAssets = values(rowByLabel(data.balanceSheetTable, ["Total Assets"]));
    const shortDebt = values(rowByLabel(data.balanceSheetTable, ["Short-Term Debt / Current Portion of Long-Term Debt"]));
    const longDebt = values(rowByLabel(data.balanceSheetTable, ["Long-Term Debt"]));
    const currentFcf = operatingCash[0] !== null && capitalExpenditures[0] !== null ? operatingCash[0] + capitalExpenditures[0] : null;
    const previousFcf = operatingCash[1] !== null && capitalExpenditures[1] !== null ? operatingCash[1] + capitalExpenditures[1] : null;
    const currentDebt = (shortDebt[0] ?? 0) + (longDebt[0] ?? 0);
    const currentNetMargin = revenue[0] && netIncome[0] !== null ? (netIncome[0] / revenue[0]) * 100 : null;
    const previousNetMargin = revenue[1] && netIncome[1] !== null ? (netIncome[1] / revenue[1]) * 100 : null;
    const periodEnd = String(data.incomeStatementTable?.headers?.value2 ?? "") || null;

    return {
      periodEnd,
      revenue: revenue[0],
      revenueGrowthPct: percentChange(revenue[0], revenue[1]),
      freeCashFlow: currentFcf,
      freeCashFlowGrowthPct: percentChange(currentFcf, previousFcf),
      netMarginPct: currentNetMargin,
      netMarginExpansionBps: currentNetMargin !== null && previousNetMargin !== null ? (currentNetMargin - previousNetMargin) * 100 : null,
      totalDebt: currentDebt || null,
      debtToAssetsPct: totalAssets[0] ? (currentDebt / totalAssets[0]) * 100 : null,
      debtToFreeCashFlow: currentFcf && currentFcf > 0 ? currentDebt / currentFcf : null,
      researchAndDevelopment: researchAndDevelopment[0],
      researchAndDevelopmentGrowthPct: percentChange(researchAndDevelopment[0], researchAndDevelopment[1]),
      sourceUrl: `https://www.nasdaq.com/market-activity/stocks/${symbol.toLowerCase()}/financials`,
    };
  } catch {
    return null;
  }
}

function findPositionRow(table: NasdaqTable | undefined, label: string) {
  return table?.rows?.find((row) => String(row.positions ?? "").toLowerCase() === label.toLowerCase());
}

export async function fetchNasdaqInstitutional(symbol: string): Promise<VipInstitutionalSnapshot | null> {
  type InstitutionalData = {
    ownershipSummary?: { SharesOutstandingPCT?: { value?: string } };
    activePositions?: NasdaqTable;
    newSoldOutPositions?: NasdaqTable;
  };
  const url = `https://api.nasdaq.com/api/company/${encodeURIComponent(symbol)}/institutional-holdings?limit=5&type=TOTAL&sortColumn=marketValue&sortOrder=DESC`;

  try {
    const payload = await fetchJsonWithFallback<NasdaqResponse<InstitutionalData>>(url, { headers, next: { revalidate: 21600 }, timeoutMs: 12000 });
    const data = payload.data;

    if (!data) {
      return null;
    }

    const increased = parseNumber(findPositionRow(data.activePositions, "Increased Positions")?.holders);
    const decreased = parseNumber(findPositionRow(data.activePositions, "Decreased Positions")?.holders);
    const newPositions = parseNumber(findPositionRow(data.newSoldOutPositions, "New Positions")?.holders);
    const soldOut = parseNumber(findPositionRow(data.newSoldOutPositions, "Sold Out Positions")?.holders);
    const perception = increased !== null && decreased !== null
      ? increased > decreased * 1.15 ? "POSITIVE" : decreased > increased * 1.15 ? "NEGATIVE" : "NEUTRAL"
      : "UNAVAILABLE";

    return {
      ownershipPercent: parseNumber(data.ownershipSummary?.SharesOutstandingPCT?.value),
      increasedPositionHolders: increased,
      decreasedPositionHolders: decreased,
      newPositionHolders: newPositions,
      soldOutPositionHolders: soldOut,
      perception,
      sourceUrl: `https://www.nasdaq.com/market-activity/stocks/${symbol.toLowerCase()}/institutional-holdings`,
    };
  } catch {
    return null;
  }
}

export async function fetchNasdaqShortInterest(symbol: string): Promise<VipShortInterestSnapshot | null> {
  type ShortData = { shortInterestTable?: NasdaqTable };
  const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/short-interest?assetclass=stocks`;

  try {
    const payload = await fetchJsonWithFallback<NasdaqResponse<ShortData>>(url, { headers, next: { revalidate: 21600 }, timeoutMs: 12000 });
    const rows = payload.data?.shortInterestTable?.rows ?? [];
    const current = rows[0];
    const previous = rows[1];
    const currentShares = parseNumber(current?.interest);
    const previousShares = parseNumber(previous?.interest);

    return {
      settlementDate: typeof current?.settlementDate === "string" ? current.settlementDate : null,
      sharesShort: currentShares,
      changePercent: percentChange(currentShares, previousShares),
      daysToCover: parseNumber(current?.daysToCover),
      sourceUrl: `https://www.nasdaq.com/market-activity/stocks/${symbol.toLowerCase()}/short-interest`,
    };
  } catch {
    return null;
  }
}
