import { getAssetUniverseItem } from "@/lib/ai-market/asset-universe";
import { DEFAULT_AI_MARKET_FAVORITES } from "@/lib/ai-market/favorite-defaults";
import { prisma } from "@/lib/prisma";

export const MAX_AI_MARKET_FAVORITES = 30;

export function normalizeFavoriteSymbols(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_AI_MARKET_FAVORITES;
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, MAX_AI_MARKET_FAVORITES);
}

export async function getUserFavoriteSymbols(userId: string) {
  const favorites = await prisma.aiMarketFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { symbol: true },
  });

  return favorites.length > 0 ? favorites.map((favorite) => favorite.symbol) : DEFAULT_AI_MARKET_FAVORITES;
}

export async function replaceUserFavorites(userId: string, symbols: string[]) {
  const normalizedSymbols = normalizeFavoriteSymbols(symbols);

  await prisma.$transaction(async (tx) => {
    await tx.aiMarketFavorite.deleteMany({ where: { userId } });

    if (normalizedSymbols.length === 0) {
      return;
    }

    await tx.aiMarketFavorite.createMany({
      data: normalizedSymbols.map((symbol) => {
        const asset = getAssetUniverseItem(symbol);

        return {
          userId,
          symbol,
          displayName: asset?.displayName,
          assetClass: asset?.assetClass,
        };
      }),
    });
  });

  return normalizedSymbols;
}
