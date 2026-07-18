import { NextResponse } from "next/server";
import { getAssetPerformance } from "@/lib/ai-market/asset-performance";
import type { MarketExchange } from "@/lib/ai-market/types";

export const dynamic = "force-dynamic";

type PerformanceExchange = MarketExchange | "yahoo";

function getExchange(value: string | null): PerformanceExchange {
  if (value === "yahoo") {
    return "yahoo";
  }

  return value === "gate" ? "gate" : "binance";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") ?? "BTCUSDT";
  const exchange = getExchange(url.searchParams.get("exchange"));

  try {
    return NextResponse.json(await getAssetPerformance(symbol, exchange));
  } catch (error) {
    return NextResponse.json(
      {
        symbol: symbol.trim().toUpperCase(),
        providerSymbol: symbol.trim().toUpperCase(),
        price: null,
        changes: {
          "1h": null,
          "1d": null,
          "1w": null,
          "1m": null,
          "3m": null,
          "6m": null,
          "1y": null,
        },
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Performans verisi alinamadi.",
      },
      { status: 200 },
    );
  }
}
