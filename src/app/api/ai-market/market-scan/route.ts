import { NextResponse } from "next/server";
import { normalizeMarketScanExchange, normalizeMarketScanIntervals, runMarketScan } from "@/lib/ai-market/market-scan-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const exchange = normalizeMarketScanExchange(url.searchParams.get("exchange"));
  const intervals = normalizeMarketScanIntervals(url.searchParams.get("interval"));

  try {
    const result = await runMarketScan(exchange, intervals);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        scannedAt: new Date().toISOString(),
        exchange,
        candidateCount: 0,
        processedCount: 0,
        intervalsChecked: intervals,
        alerts: [],
        errors: [error instanceof Error ? error.message : "Piyasa taraması sırasında hata oluştu."],
      },
      { status: 502 },
    );
  }
}
