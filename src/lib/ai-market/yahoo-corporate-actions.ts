import { fetchJsonWithFallback } from "@/lib/http-json";
import { getYahooProviderSymbolCandidates } from "@/lib/ai-market/yahoo-symbols";

const DAY_MS = 86_400_000;
const YAHOO_CHART_HOSTS = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"] as const;

type YahooSplitPayload = {
  date?: number;
  numerator?: number;
  denominator?: number;
  splitRatio?: string;
};

type YahooCorporateActionResponse = {
  chart?: {
    result?: Array<{
      meta?: { symbol?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
        adjclose?: Array<{ adjclose?: Array<number | null> }>;
      };
      events?: {
        splits?: Record<string, YahooSplitPayload>;
      };
    }>;
  };
};

export const YAHOO_VIP_RETURN_BASIS = "SPLIT_ADJUSTED_PRICE_RETURN" as const;

export type YahooSplitEvent = {
  effectiveAt: Date;
  numerator: number;
  denominator: number;
  factor: number;
  ratio: string;
};

export type YahooCorporateActionQuote = {
  symbol: string;
  providerSymbol: string;
  price: number;
  priceAsOf: Date;
  adjustedClose: number | null;
  splitEvents: YahooSplitEvent[];
  returnBasis: typeof YAHOO_VIP_RETURN_BASIS;
  dividendsIncluded: false;
};

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function parseYahooSplitEvents(
  value: Record<string, YahooSplitPayload> | null | undefined,
  fromExclusive?: Date,
  toInclusive?: Date,
) {
  const fromTime = fromExclusive?.getTime() ?? Number.NEGATIVE_INFINITY;
  const toTime = toInclusive?.getTime() ?? Number.POSITIVE_INFINITY;

  return Object.values(value ?? {})
    .flatMap((event): YahooSplitEvent[] => {
      const effectiveAtMs = Number(event.date) * 1000;
      const numerator = Number(event.numerator);
      const denominator = Number(event.denominator);

      if (
        !Number.isFinite(effectiveAtMs) ||
        effectiveAtMs <= fromTime ||
        effectiveAtMs > toTime ||
        !isPositiveFinite(numerator) ||
        !isPositiveFinite(denominator)
      ) {
        return [];
      }

      return [{
        effectiveAt: new Date(effectiveAtMs),
        numerator,
        denominator,
        factor: numerator / denominator,
        ratio: event.splitRatio?.trim() || `${numerator}:${denominator}`,
      }];
    })
    .sort((left, right) => left.effectiveAt.getTime() - right.effectiveAt.getTime());
}

export function getYahooCumulativeSplitFactor(events: YahooSplitEvent[]) {
  return events.reduce((factor, event) => factor * event.factor, 1);
}

export function calculateYahooSplitAdjustedPriceReturn(input: {
  referencePrice: number;
  currentPrice: number;
  splitEvents: YahooSplitEvent[];
}) {
  if (!isPositiveFinite(input.referencePrice) || !isPositiveFinite(input.currentPrice)) {
    return null;
  }

  const splitFactor = getYahooCumulativeSplitFactor(input.splitEvents);

  if (!isPositiveFinite(splitFactor)) {
    return null;
  }

  const splitAdjustedReferencePrice = input.referencePrice / splitFactor;
  const returnPercent = ((input.currentPrice - splitAdjustedReferencePrice) / splitAdjustedReferencePrice) * 100;

  return {
    currentPrice: input.currentPrice,
    splitFactor,
    splitAdjustedReferencePrice,
    returnPercent,
    returnBasis: YAHOO_VIP_RETURN_BASIS,
    dividendsIncluded: false as const,
  };
}

function latestPricePoint(result: NonNullable<NonNullable<YahooCorporateActionResponse["chart"]>["result"]>[number], asOf: Date) {
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const adjustedCloses = result.indicators?.adjclose?.[0]?.adjclose ?? [];
  const asOfTime = asOf.getTime();

  for (let index = timestamps.length - 1; index >= 0; index -= 1) {
    const timestampMs = Number(timestamps[index]) * 1000;
    const close = closes[index];

    if (timestampMs <= asOfTime && isPositiveFinite(close)) {
      return {
        price: close,
        priceAsOf: new Date(timestampMs),
        adjustedClose: isPositiveFinite(adjustedCloses[index]) ? adjustedCloses[index] : null,
      };
    }
  }

  return null;
}

export async function fetchYahooCorporateActionQuote(input: {
  symbol: string;
  providerSymbol?: string;
  from: Date;
  asOf?: Date;
  timeoutMs?: number;
}): Promise<YahooCorporateActionQuote> {
  const asOf = input.asOf ?? new Date();
  const providerCandidates = Array.from(new Set([
    input.providerSymbol?.trim(),
    ...getYahooProviderSymbolCandidates(input.symbol),
  ].filter((value): value is string => Boolean(value))));
  const errors: string[] = [];
  const period1 = Math.max(0, Math.floor((input.from.getTime() - DAY_MS) / 1000));
  const period2 = Math.floor((asOf.getTime() + DAY_MS) / 1000);

  for (const providerSymbol of providerCandidates) {
    for (const host of YAHOO_CHART_HOSTS) {
      try {
        const url = new URL(`https://${host}/v8/finance/chart/${encodeURIComponent(providerSymbol)}`);
        url.searchParams.set("period1", String(period1));
        url.searchParams.set("period2", String(period2));
        url.searchParams.set("interval", "1d");
        url.searchParams.set("events", "div,splits");
        url.searchParams.set("includeAdjustedClose", "true");
        const payload = await fetchJsonWithFallback<YahooCorporateActionResponse>(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          },
          next: { revalidate: 3600 },
          timeoutMs: input.timeoutMs ?? 8_000,
        });
        const result = payload.chart?.result?.[0];
        const pricePoint = result ? latestPricePoint(result, asOf) : null;

        if (!result || !pricePoint) {
          errors.push(`${providerSymbol}@${host}: fiyat bulunamadı`);
          continue;
        }

        return {
          symbol: input.symbol,
          providerSymbol: result.meta?.symbol ?? providerSymbol,
          ...pricePoint,
          splitEvents: parseYahooSplitEvents(result.events?.splits, input.from, asOf),
          returnBasis: YAHOO_VIP_RETURN_BASIS,
          dividendsIncluded: false,
        };
      } catch (error) {
        errors.push(`${providerSymbol}@${host}: ${error instanceof Error ? error.message : "Yahoo verisi alınamadı"}`);
      }
    }
  }

  throw new Error(errors.join("; ") || "Yahoo kurumsal aksiyon verisi alınamadı.");
}
