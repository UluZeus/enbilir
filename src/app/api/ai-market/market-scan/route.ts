import { NextResponse } from "next/server";
import { normalizeMarketScanExchange, normalizeMarketScanIntervals, runMarketScan } from "@/lib/ai-market/market-scan-engine";
import { getRecommendationText, logAiSignal } from "@/lib/ai-market/signal-logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const exchange = normalizeMarketScanExchange(url.searchParams.get("exchange"));
  const intervals = normalizeMarketScanIntervals(url.searchParams.get("interval"));

  try {
    const result = await runMarketScan(exchange, intervals);
    await Promise.all(
      result.alerts.map((alert) =>
        logAiSignal({
          symbol: alert.symbol,
          displayName: alert.displayName,
          exchange: alert.exchange,
          interval: alert.interval,
          signalType: alert.alertType,
          recommendationText: getRecommendationText(alert.alertType),
          confidence: alert.confidence,
          riskScore: alert.riskScore,
          opportunityScore: alert.recommendationScore,
          priceAtSignal: alert.price,
          currency: alert.symbol.endsWith("USDT") ? "USDT" : undefined,
          source: "market-scan",
          reason: alert.reason,
          rawPayload: {
            alertType: alert.alertType,
            label: alert.label,
            message: alert.message,
            priority: alert.priority,
            soundLevel: alert.soundLevel,
          },
        }),
      ),
    );
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
