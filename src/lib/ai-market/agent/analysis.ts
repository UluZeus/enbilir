import { getAssetUniverseItem } from "@/lib/ai-market/asset-universe";
import { fetchBinanceCandles } from "@/lib/ai-market/binance-public";
import { fetchYahooCandles } from "@/lib/ai-market/yahoo-public";
import { calculateIndicators, calculateTechnicalSeries } from "@/lib/ai-market/indicators";
import { assessRisk } from "@/lib/ai-market/risk-engine";
import { analyzeSignal } from "@/lib/ai-market/signal-engine";
import type { AssetClass, Candle, MarketAnalysis } from "@/lib/ai-market/types";
import { REQUIRED_MACRO_ASSETS, type MacroCoverageAsset } from "@/lib/ai-market/agent/macro-coverage";

export type AgentAssetAnalysis = {
  symbol: string;
  displayName: string;
  name: string;
  assetClass: AssetClass;
  category: string;
  required: boolean;
  whyRequired?: string;
  analysis: MarketAnalysis | null;
  error?: string;
};

type AgentAssetSeed = {
  symbol: string;
  displayName: string;
  name: string;
  assetClass: AssetClass;
  category: string;
  providerSymbol: string;
  required: boolean;
  whyRequired?: string;
};

const MIN_CANDLE_COUNT = 30;
export const AI_MARKET_AGENT_INTERVAL = "1h";

function getChangePercent(candles: Candle[]) {
  const first = candles[0];
  const latest = candles[candles.length - 1];

  if (!first || !latest || first.open <= 0) {
    return null;
  }

  return ((latest.close - first.open) / first.open) * 100;
}

function getFallbackCryptoSeed(symbol: string): AgentAssetSeed | null {
  if (!symbol.endsWith("USDT") || symbol.length <= 4) {
    return null;
  }

  const baseAsset = symbol.slice(0, -4);

  return {
    symbol,
    displayName: `${baseAsset}/USDT`,
    name: baseAsset,
    assetClass: "CRYPTO",
    category: "favorite-crypto",
    providerSymbol: symbol,
    required: false,
  };
}

function toSeed(symbol: string, required = false): AgentAssetSeed | null {
  const normalized = symbol.trim().toUpperCase();
  const requiredAsset = REQUIRED_MACRO_ASSETS.find((asset) => asset.symbol.toUpperCase() === normalized);

  if (requiredAsset) {
    return toSeedFromRequired(requiredAsset);
  }

  const universeAsset = getAssetUniverseItem(normalized);

  if (universeAsset) {
    return {
      symbol: universeAsset.symbol,
      displayName: universeAsset.displayName,
      name: universeAsset.name,
      assetClass: universeAsset.assetClass,
      category: universeAsset.category.toLowerCase(),
      providerSymbol: universeAsset.providerSymbol,
      required,
    };
  }

  return getFallbackCryptoSeed(normalized);
}

function toSeedFromRequired(asset: MacroCoverageAsset): AgentAssetSeed {
  return {
    symbol: asset.symbol,
    displayName: asset.displayName,
    name: asset.name,
    assetClass: asset.assetClass,
    category: asset.category,
    providerSymbol: asset.providerSymbol,
    required: true,
    whyRequired: asset.whyRequired,
  };
}

async function loadCandles(seed: AgentAssetSeed) {
  if (seed.assetClass === "CRYPTO") {
    return fetchBinanceCandles(seed.providerSymbol, AI_MARKET_AGENT_INTERVAL, 220, 6000);
  }

  return fetchYahooCandles(seed.providerSymbol, AI_MARKET_AGENT_INTERVAL);
}

function buildAnalysis(seed: AgentAssetSeed, candles: Candle[]): MarketAnalysis {
  const indicators = calculateIndicators(candles);
  const signal = analyzeSignal(candles, indicators);
  const risk = assessRisk(candles, indicators);
  const latest = candles[candles.length - 1];

  return {
    symbol: seed.symbol,
    name: seed.name,
    exchange: seed.assetClass === "CRYPTO" ? "binance" : "binance",
    interval: AI_MARKET_AGENT_INTERVAL,
    lastPrice: latest?.close ?? null,
    changePercent: getChangePercent(candles),
    volume: latest?.volume ?? null,
    indicators,
    signal,
    risk,
    explanation: "",
    disclaimer: "",
    updatedAt: new Date().toISOString(),
    dataStatus: "live",
    technicalSeries: calculateTechnicalSeries(candles, 120),
  };
}

export function getAgentAssetSeeds(favoriteSymbols: string[]) {
  const requiredSeeds = REQUIRED_MACRO_ASSETS.map(toSeedFromRequired);
  const favoriteSeeds = favoriteSymbols.map((symbol) => toSeed(symbol)).filter((seed): seed is AgentAssetSeed => seed !== null);
  const bySymbol = new Map<string, AgentAssetSeed>();

  for (const seed of [...requiredSeeds, ...favoriteSeeds]) {
    const existing = bySymbol.get(seed.symbol);
    bySymbol.set(seed.symbol, existing ? { ...seed, required: existing.required || seed.required, whyRequired: existing.whyRequired ?? seed.whyRequired } : seed);
  }

  return Array.from(bySymbol.values()).slice(0, 60);
}

export async function analyzeAgentAssets(favoriteSymbols: string[]): Promise<AgentAssetAnalysis[]> {
  const seeds = getAgentAssetSeeds(favoriteSymbols);
  const settled = await Promise.allSettled(
    seeds.map(async (seed) => {
      const candles = await loadCandles(seed);

      if (candles.length < MIN_CANDLE_COUNT) {
        throw new Error("Yeterli mum verisi bulunamadi.");
      }

      return {
        symbol: seed.symbol,
        displayName: seed.displayName,
        name: seed.name,
        assetClass: seed.assetClass,
        category: seed.category,
        required: seed.required,
        whyRequired: seed.whyRequired,
        analysis: buildAnalysis(seed, candles),
      } satisfies AgentAssetAnalysis;
    }),
  );

  return settled.map((result, index) => {
    const seed = seeds[index];

    if (result.status === "fulfilled") {
      return result.value;
    }

    return {
      symbol: seed.symbol,
      displayName: seed.displayName,
      name: seed.name,
      assetClass: seed.assetClass,
      category: seed.category,
      required: seed.required,
      whyRequired: seed.whyRequired,
      analysis: null,
      error: result.reason instanceof Error ? result.reason.message : "Analiz alinamadi.",
    };
  });
}
